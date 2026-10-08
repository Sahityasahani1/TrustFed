"""Score one PaySim transaction with the already-trained artifact.

Manual use:
    python predict_paysim.py

Website/backend use:
    from predict_paysim import assess_transaction
    result = assess_transaction(form_payload)

JSON input use (one object or a list of objects):
    python predict_paysim.py --input-json paysim_input_examples.txt

The required input keys are derived from the saved model's feature list.
For the current retrained artifact these are: step, type, amount,
oldbalanceOrg, oldbalanceDest. Post-transaction balances are not requested.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap


ROOT = Path(__file__).parent
ARTIFACT = (ROOT / "artifacts" / "paysim" / "model.joblib") if (ROOT / "artifacts" / "paysim" / "model.joblib").exists() else (ROOT.parent / "artifacts" / "paysim" / "model.joblib")
ALLOWED_TYPES = {"CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"}
SOURCE_NUMBERS = ["step", "amount", "oldbalanceOrg", "oldbalanceDest",
                  "newbalanceOrig", "newbalanceDest"]


def required_input_fields(feature_columns):
    required = {"step", "amount"}
    columns = set(feature_columns)
    if columns.intersection({"oldbalanceOrg", "amount_to_origin_balance", "origin_balance_remaining_ratio"}):
        required.add("oldbalanceOrg")
    if columns.intersection({"oldbalanceDest", "balance_change_destination"}):
        required.add("oldbalanceDest")
    if columns.intersection({"newbalanceOrig", "balance_change_origin", "origin_balance_remaining_ratio"}):
        required.add("newbalanceOrig")
    if columns.intersection({"newbalanceDest", "balance_change_destination"}):
        required.add("newbalanceDest")
    if any(name.startswith("type_") for name in feature_columns):
        required.add("type")
    return [field for field in ["step", "type", "amount", "oldbalanceOrg", "oldbalanceDest",
                                "newbalanceOrig", "newbalanceDest"] if field in required]


def validate_payload(payload, feature_columns):
    if not isinstance(payload, dict):
        raise ValueError("Input must be a JSON object")
    allowed = set(SOURCE_NUMBERS) | {"type", "transaction_id"}
    extra = set(payload) - allowed
    if extra:
        raise ValueError(f"Unsupported input fields: {', '.join(sorted(extra))}. Do not send isFraud/isFlaggedFraud.")
    required = set(required_input_fields(feature_columns))
    missing = required - set(payload)
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(sorted(missing))}")

    clean = {}
    for field in SOURCE_NUMBERS:
        if field not in payload:
            continue
        value = payload[field]
        if isinstance(value, bool):
            raise ValueError(f"{field} must be a number, not true/false")
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValueError(f"{field} must be numeric") from None
        if not math.isfinite(number):
            raise ValueError(f"{field} must be finite")
        if number < 0:
            raise ValueError(f"{field} cannot be negative")
        clean[field] = number

    if "step" not in clean or not clean["step"].is_integer() or clean["step"] < 1:
        raise ValueError("step must be a positive whole number")
    clean["step"] = int(clean["step"])
    if "type" in required:
        tx_type = str(payload["type"]).strip().upper()
        if tx_type not in ALLOWED_TYPES:
            raise ValueError(f"type must be one of: {', '.join(sorted(ALLOWED_TYPES))}")
        clean["type"] = tx_type
    tx_id = payload.get("transaction_id")
    if tx_id is not None and not isinstance(tx_id, (str, int)):
        raise ValueError("transaction_id must be a string or integer")
    clean["transaction_id"] = tx_id
    return clean


def make_features(transaction, feature_columns):
    amount = float(transaction.get("amount", 0.0))
    old_org = float(transaction.get("oldbalanceOrg", 0.0))
    old_dest = float(transaction.get("oldbalanceDest", 0.0))
    
    row = {
        "step": transaction["step"],
        "amount": amount,
        "amount_log": float(np.log1p(amount)),
        "oldbalanceOrg": old_org,
        "oldbalanceDest": old_dest,
        "drain_ratio": amount / (abs(old_org) + 1.0) if old_org > 0 else 0.0,
        "is_dest_zero": 1 if old_dest == 0.0 else 0,
    }
    for name in ["newbalanceOrig", "newbalanceDest"]:
        if name in transaction:
            row[name] = transaction[name]
    if "oldbalanceOrg" in transaction:
        row["amount_to_origin_balance"] = amount / (abs(old_org) + 1.0)
    if "oldbalanceOrg" in transaction and "newbalanceOrig" in transaction:
        row["balance_change_origin"] = old_org - transaction["newbalanceOrig"]
        row["origin_balance_remaining_ratio"] = transaction["newbalanceOrig"] / (abs(old_org) + 1.0)
    if "oldbalanceDest" in transaction and "newbalanceDest" in transaction:
        row["balance_change_destination"] = transaction["newbalanceDest"] - old_dest
    for category in ALLOWED_TYPES:
        row[f"type_{category}"] = int(transaction["type"] == category)
    row["type_nan"] = 0
    return pd.DataFrame([[row.get(col, 0.0) for col in feature_columns]], columns=feature_columns)


def assess_transaction(payload, artifact_path=ARTIFACT):
    """Return a JSON-serializable risk assessment for one website form payload."""
    if not Path(artifact_path).is_file():
        raise FileNotFoundError(f"Trained PaySim model not found: {artifact_path}")
    bundle = joblib.load(artifact_path)
    model = bundle["model"]
    transaction = validate_payload(payload, bundle["feature_columns"])
    features = make_features(transaction, bundle["feature_columns"])

    raw_probability = float(model.predict_proba(features)[0, 1])
    if bundle.get("calibrator") is not None:
        clipped = float(np.clip(raw_probability, 1e-6, 1 - 1e-6))
        logit = np.array([[np.log(clipped / (1 - clipped))]])
        probability = float(bundle["calibrator"].predict_proba(logit)[0, 1])
    else:
        probability = raw_probability
    threshold = float(bundle["decision_threshold"])

    anomaly_raw = float(bundle["anomaly_model"].decision_function(features)[0])
    reference = np.asarray(bundle["anomaly_reference_scores"])
    anomaly_score = float(1.0 - np.searchsorted(reference, anomaly_raw, side="right") / len(reference))

    shap_result = shap.TreeExplainer(model)(features)
    impacts = np.asarray(shap_result.values)
    if impacts.ndim == 3:
        impacts = impacts[0, :, -1]
    else:
        impacts = impacts[0]
    names = list(bundle["feature_columns"])
    top_indices = np.argsort(np.abs(impacts))[::-1][:5]
    reasons = [{
        "feature": names[int(index)],
        "impact_log_odds": float(impacts[index]),
        "direction": "increases_risk" if impacts[index] > 0 else "decreases_risk",
    } for index in top_indices]

    is_fraud_alert = probability >= threshold
    post_transaction_features = {
        "newbalanceOrig", "newbalanceDest", "balance_change_origin",
        "balance_change_destination", "origin_balance_remaining_ratio",
    }
    uses_post_transaction_values = bool(
        post_transaction_features.intersection(bundle["feature_columns"])
    )
    if uses_post_transaction_values:
        model_limit = (
            "This artifact uses post-transaction balance features. Do not use it for pre-authorization scoring."
        )
    else:
        model_limit = (
            "This artifact excludes post-transaction balances. Its result is still a model estimate, not ground-truth confirmation."
        )
    return {
        "transaction_id": transaction["transaction_id"],
        "model": {"name": "PaySim Transaction Risk Model", "artifact": "artifacts/paysim/model.joblib"},
        "risk": {
            "fraud_probability": probability,
            # Keep enough precision that a very low but nonzero probability
            # does not display as exactly 0.0 on the risk score scale.
            "risk_score": round(probability * 100, 6),
            "decision_threshold": threshold,
            "classification": "fraud" if is_fraud_alert else "safe",
            "anomaly_score": anomaly_score,
        },
        "transaction": {
            "step": transaction["step"], "type": transaction["type"],
            "amount": transaction["amount"],
        },
        "risk_factors": reasons,
        "interpretation": "Fraud means the score met the model threshold; safe means it fell below that threshold. Neither is ground-truth confirmation. Anomaly score means unusualness, not fraud probability.",
        "model_limit": model_limit,
    }


def read_interactive_payload(feature_columns):
    required = required_input_fields(feature_columns)
    print("Enter the transaction values. Choose the transaction type from this menu:")
    type_choices = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]
    for index, choice in enumerate(type_choices, start=1):
        print(f"  {index}. {choice}")
    choice_text = input("type choice (1-5): ").strip()
    if not choice_text.isdigit() or not 1 <= int(choice_text) <= len(type_choices):
        raise ValueError("type choice must be a number from 1 to 5")
    payload = {"type": type_choices[int(choice_text) - 1]}
    for field in required:
        if field != "type":
            payload[field] = input(f"{field}: ")
    return payload


def main():
    parser = argparse.ArgumentParser(description="Score a PaySim transaction and emit a risk JSON object")
    parser.add_argument("--input-json", help="Path to a JSON file containing one transaction payload")
    args = parser.parse_args()
    try:
        if args.input_json:
            with open(args.input_json, "r", encoding="utf-8") as stream:
                payload = json.load(stream)
        elif sys.stdin.isatty():
            bundle = joblib.load(ARTIFACT)
            payload = read_interactive_payload(bundle["feature_columns"])
        else:
            payload = json.load(sys.stdin)
        if isinstance(payload, list):
            if not payload:
                raise ValueError("Input list must contain at least one transaction")
            result = [assess_transaction(item) for item in payload]
        else:
            result = assess_transaction(payload)
        print(json.dumps(result, indent=2, allow_nan=False))
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(json.dumps({"error": str(exc)}, indent=2), file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
