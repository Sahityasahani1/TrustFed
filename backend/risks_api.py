"""Central backend: UI input -> saved ML model -> Gemini/local explanation -> UI.

Run with: uvicorn risk_api:app --reload (or uvicorn risks_api:app --reload)

The browser must call this backend. Keep GEMINI_API_Key in the server .env,
never in frontend JavaScript. ML output remains authoritative; Gemini explains it.
"""
import asyncio
import io
import json
import os
import time
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
import pandas as pd
import requests
import shap
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
import sys

ROOT = Path(__file__).parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from predict_paysim import assess_transaction
except ImportError:
    from backend.predict_paysim import assess_transaction

try:
    from onnx_engine import onnx_hub
except ImportError:
    from backend.onnx_engine import onnx_hub
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / ".env")

ARTIFACTS_DIR = (ROOT / "artifacts") if (ROOT / "artifacts").exists() else (ROOT.parent / "artifacts")
SAMPLES_DIR = (ROOT / "samples") if (ROOT / "samples").exists() else (ROOT.parent / "backend" / "samples")
MODEL_PATHS = {
    "banks": ARTIFACTS_DIR / "paysim" / "model.joblib",
    "creditfraud": ARTIFACTS_DIR / "creditfraud" / "model.joblib",
    "lenders": ARTIFACTS_DIR / "creditfraud" / "model.joblib",
    "insurance": ARTIFACTS_DIR / "insurance" / "model.joblib",
    "insurers": ARTIFACTS_DIR / "insurance" / "model.joblib",
}

GEMINI_MODEL_PREFERENCE = [
    # Proven generation models in priority order
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
]
_GEMINI_MODELS_CACHE = None

app = FastAPI(title="ENIGMA Risk Inference API", version="1.0.0")
origins = [value.strip() for value in os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:3000,http://localhost:5173"
).split(",") if value.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class TelemetryBroadcaster:
    """Manages WebSocket connections and broadcasts real-time inference telemetry."""
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.active_streams: int = 0

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)
        try:
            await ws.send_text(json.dumps(self.get_payload()))
        except Exception:
            pass

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    def get_payload(self) -> dict[str, Any]:
        snap = onnx_hub.get_telemetry_snapshot()
        snap["active_streams"] = self.active_streams
        snap["active_connections"] = len(self.active_connections)
        snap["timestamp"] = time.time()
        return snap

    async def broadcast(self):
        if not self.active_connections:
            return
        payload_str = json.dumps(self.get_payload())
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_text(payload_str)
            except Exception:
                dead.append(conn)
        for d in dead:
            if d in self.active_connections:
                self.active_connections.remove(d)

    def schedule_broadcast(self):
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast())
        except RuntimeError:
            pass


telemetry_hub = TelemetryBroadcaster()


@app.on_event("startup")
async def startup_telemetry_ticker():
    async def ticker():
        while True:
            await asyncio.sleep(1.5)
            await telemetry_hub.broadcast()
    asyncio.create_task(ticker())


class AssessRequest(BaseModel):
    domain: Literal["banks", "lenders", "insurers", "creditfraud", "insurance"]
    user_input: dict[str, Any] = Field(..., description="Input values for that domain's trained model")
    include_ai_reasoning: bool = True


def _finite_number(payload, name, minimum=None):
    if name not in payload:
        raise ValueError(f"Missing required field: {name}")
    try:
        value = float(payload[name])
    except (TypeError, ValueError):
        raise ValueError(f"{name} must be numeric") from None
    if not np.isfinite(value):
        raise ValueError(f"{name} must be finite")
    if minimum is not None and value < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return value


_PAYSIM_BUNDLE = None
_PAYSIM_EXPLAINER = None

def get_paysim_bundle():
    global _PAYSIM_BUNDLE, _PAYSIM_EXPLAINER
    if _PAYSIM_BUNDLE is None:
        path = MODEL_PATHS["banks"]
        if not path.is_file():
            raise FileNotFoundError(f"PaySim model missing: {path}")
        _PAYSIM_BUNDLE = joblib.load(path)
        _PAYSIM_EXPLAINER = shap.TreeExplainer(_PAYSIM_BUNDLE["model"])
    return _PAYSIM_BUNDLE, _PAYSIM_EXPLAINER


_INS_BUNDLE = None
_INS_EXPLAINER = None

def get_insurance_bundle():
    global _INS_BUNDLE, _INS_EXPLAINER
    if _INS_BUNDLE is None:
        path = MODEL_PATHS["insurance"]
        if not path.is_file():
            raise FileNotFoundError(f"Insurance model missing: {path}")
        _INS_BUNDLE = joblib.load(path)
        _INS_EXPLAINER = shap.TreeExplainer(_INS_BUNDLE["model"])
    return _INS_BUNDLE, _INS_EXPLAINER


def _insurance_assessment(payload):
    path = MODEL_PATHS["insurance"]
    if not path.is_file():
        raise FileNotFoundError("Insurance model missing; expected artifacts/insurance/model.joblib")
    
    # Defaults provided for testing if not all 8 fields are passed
    claim_type = str(payload.get("claim_type", "home")).strip()
    state = str(payload.get("state", "ID")).strip()
    tenure = float(payload.get("policyholder_tenure_years", 0.2))
    previous = float(payload.get("previous_claims_count", 0))
    amount = float(payload.get("claim_amount", 23607.73))
    deductible = float(payload.get("deductible", 2500.0))
    
    incident = pd.to_datetime(payload.get("incident_date", "2022-08-28"), errors="coerce")
    filed = pd.to_datetime(payload.get("claim_filed_date", "2022-09-03"), errors="coerce")
    filing_delay = int((filed - incident).days) if pd.notna(filed) and pd.notna(incident) else int(payload.get("filing_delay_days", 6))

    features = pd.DataFrame([{
        "claim_type": claim_type,
        "state": state,
        "policyholder_tenure_years": tenure,
        "previous_claims_count": previous,
        "claim_amount": amount,
        "deductible": deductible,
        "filing_delay_days": filing_delay,
        "claim_to_deductible_ratio": amount / (deductible + 1.0),
        "claim_amount_log": float(np.log1p(amount)),
    }])
    
    bundle, explainer = get_insurance_bundle()
    categories = list(features.select_dtypes(include=["object"]).columns)
    encoded = pd.get_dummies(features, columns=categories, dummy_na=True, dtype=np.uint8)
    encoded = encoded.reindex(columns=bundle["feature_columns"], fill_value=0)
    encoded = encoded.replace([np.inf, -np.inf], np.nan).fillna(0)

    raw = float(bundle["model"].predict_proba(encoded)[0, 1])
    if bundle.get("calibrator") is not None:
        clipped = float(np.clip(raw, 1e-6, 1 - 1e-6))
        raw = float(bundle["calibrator"].predict_proba([[np.log(clipped / (1 - clipped))]])[0, 1])
    threshold = float(bundle.get("decision_threshold", 0.1798))
    anomaly_score = None
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        score = float(bundle["anomaly_model"].decision_function(encoded)[0])
        reference = np.asarray(bundle["anomaly_reference_scores"])
        anomaly_score = float(1.0 - np.searchsorted(reference, score, side="right") / len(reference))

    shap_values = explainer(encoded)
    values = np.asarray(shap_values.values)
    impacts = values[0, :, -1] if values.ndim == 3 else values[0]
    top_indices = np.argsort(np.abs(impacts))[::-1][:5]
    names = list(bundle["feature_columns"])
    factors = [{"feature": names[int(i)], "impact_log_odds": float(impacts[i]),
                "direction": "increases_risk" if impacts[i] > 0 else "decreases_risk"}
               for i in top_indices]
    return {
        "claim_id": payload.get("claim_id", "CLM-INS-9821"),
        "model": {"name": "Insurance Claims Risk Model (1M Policies)", "artifact": "artifacts/insurance/model.joblib"},
        "risk": {"fraud_probability": round(raw, 4), "risk_score": round(raw * 100, 2),
                 "decision_threshold": round(threshold, 4),
                 "classification": "fraud" if raw >= threshold else "safe",
                 "anomaly_score": round(anomaly_score, 4) if anomaly_score is not None else None},
        "risk_factors": factors,
        "interpretation": "Federated Insurance model screening result. Evaluated under differential privacy.",
    }


_CF_BUNDLE = None
_CF_EXPLAINER = None

def get_creditfraud_bundle():
    global _CF_BUNDLE, _CF_EXPLAINER
    if _CF_BUNDLE is None:
        path = MODEL_PATHS["creditfraud"]
        if not path.is_file():
            raise FileNotFoundError(f"CreditFraud model missing: {path}")
        _CF_BUNDLE = joblib.load(path)
        _CF_EXPLAINER = shap.TreeExplainer(_CF_BUNDLE["model"])
    return _CF_BUNDLE, _CF_EXPLAINER


def _creditfraud_assessment(payload):
    bundle, explainer = get_creditfraud_bundle()
    
    income = float(payload.get("amt_income_total", payload.get("AMT_INCOME_TOTAL", 270000.0)))
    credit = float(payload.get("amt_credit", payload.get("AMT_CREDIT", 1031053.5)))
    annuity = float(payload.get("amt_annuity", payload.get("AMT_ANNUITY", 34204.5)))
    goods_price = float(payload.get("amt_goods_price", payload.get("AMT_GOODS_PRICE", credit * 0.9)))
    ext_source_2 = float(payload.get("ext_source_2", payload.get("EXT_SOURCE_2", 0.55)))
    ext_source_3 = float(payload.get("ext_source_3", payload.get("EXT_SOURCE_3", 0.45)))
    days_birth = float(payload.get("days_birth", payload.get("DAYS_BIRTH", -14500)))
    days_employed = float(payload.get("days_employed", payload.get("DAYS_EMPLOYED", -2500)))
    contract_type = str(payload.get("contract_type", payload.get("NAME_CONTRACT_TYPE", "Cash loans"))).strip()
    gender = str(payload.get("code_gender", payload.get("CODE_GENDER", "M"))).strip().upper()
    
    row = pd.DataFrame([{col: 0.0 for col in bundle["feature_columns"]}])
    row["AMT_INCOME_TOTAL"] = income
    row["AMT_CREDIT"] = credit
    row["AMT_ANNUITY"] = annuity
    row["AMT_GOODS_PRICE"] = goods_price
    row["EXT_SOURCE_2"] = ext_source_2
    row["EXT_SOURCE_3"] = ext_source_3
    row["DAYS_BIRTH"] = days_birth
    row["DAYS_EMPLOYED"] = days_employed
    row["CREDIT_TERM"] = annuity / (credit + 1.0)
    row["ANNUITY_INCOME_RATIO"] = annuity / (income + 1.0)
    if f"NAME_CONTRACT_TYPE_{contract_type}" in row.columns:
        row[f"NAME_CONTRACT_TYPE_{contract_type}"] = 1.0
    if f"CODE_GENDER_{gender}" in row.columns:
        row[f"CODE_GENDER_{gender}"] = 1.0
        
    encoded = row.reindex(columns=bundle["feature_columns"], fill_value=0.0).fillna(0.0)
    
    raw = float(bundle["model"].predict_proba(encoded)[0, 1])
    if bundle.get("calibrator") is not None:
        clipped = float(np.clip(raw, 1e-6, 1 - 1e-6))
        raw = float(bundle["calibrator"].predict_proba([[np.log(clipped / (1 - clipped))]])[0, 1])
        
    threshold = float(bundle.get("decision_threshold", 0.15566))
    anomaly_score = None
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        score = float(bundle["anomaly_model"].decision_function(encoded)[0])
        reference = np.asarray(bundle["anomaly_reference_scores"])
        anomaly_score = float(1.0 - np.searchsorted(reference, score, side="right") / len(reference))
        
    shap_values = explainer(encoded)
    values = np.asarray(shap_values.values)
    impacts = values[0, :, -1] if values.ndim == 3 else values[0]
    top_indices = np.argsort(np.abs(impacts))[::-1][:5]
    names = list(bundle["feature_columns"])
    factors = [
        {
            "feature": names[int(i)],
            "impact_log_odds": float(impacts[i]),
            "direction": "increases_risk" if impacts[i] > 0 else "decreases_risk"
        }
        for i in top_indices
    ]
    
    return {
        "applicant_id": payload.get("applicant_id", "APP-CF-307511"),
        "model": {"name": "Credit Fraud & Default Risk XGBoost Model (307k Records)", "artifact": "artifacts/creditfraud/model.joblib"},
        "risk": {
            "fraud_probability": round(raw, 4),
            "risk_score": round(raw * 100, 2),
            "decision_threshold": round(threshold, 4),
            "classification": "fraud" if raw >= threshold else "safe",
            "anomaly_score": round(anomaly_score, 4) if anomaly_score is not None else None
        },
        "risk_factors": factors,
        "interpretation": "Federated Credit Fraud model screening result. Evaluated under differential privacy."
    }


def run_ml(domain, user_input):
    d = domain.lower()
    if d in ("banks", "paysim"):
        if not MODEL_PATHS["banks"].is_file():
            raise FileNotFoundError("PaySim model is missing: artifacts/paysim/model.joblib")
        return assess_transaction(user_input)
    if d in ("creditfraud", "lenders"):
        return _creditfraud_assessment(user_input)
    if d in ("insurance", "insurers"):
        return _insurance_assessment(user_input)
    raise ValueError(f"Unknown domain: {domain}. Must be one of: banks, creditfraud, insurance")


def _batch_assess_banks(records: list[dict[str, Any]]) -> dict[str, Any]:
    t0 = time.perf_counter()
    if not records:
        return {
            "domain": "banks",
            "batch_summary": {"total_records": 0, "flagged_count": 0, "cleared_count": 0, "fraud_rate": 0.0, "mean_risk_score": 0.0, "p95_risk_score": 0.0, "decision_threshold": 0.40, "processing_time_ms": 0.0},
            "records": []
        }
    
    bundle, explainer = get_paysim_bundle()
    model = bundle["model"]
    cols = bundle["feature_columns"]
    threshold = float(bundle.get("decision_threshold", 0.40))
    
    df = pd.DataFrame(records)
    steps = pd.to_numeric(df.get("step", 1), errors="coerce").fillna(1).astype(int)
    amounts = pd.to_numeric(df.get("amount", 0.0), errors="coerce").fillna(0.0).astype(float)
    old_orgs = pd.to_numeric(df.get("oldbalanceOrg", 0.0), errors="coerce").fillna(0.0).astype(float)
    old_dests = pd.to_numeric(df.get("oldbalanceDest", 0.0), errors="coerce").fillna(0.0).astype(float)
    types = df.get("type", "PAYMENT").astype(str).str.strip().str.upper()
    
    drain_ratios = np.where(old_orgs > 0, amounts / (old_orgs + 1.0), 0.0)
    is_dest_zeros = (old_dests == 0.0).astype(int)
    
    features = pd.DataFrame({
        "step": steps,
        "amount": amounts,
        "oldbalanceOrg": old_orgs,
        "oldbalanceDest": old_dests,
        "drain_ratio": drain_ratios,
        "is_dest_zero": is_dest_zeros,
    })
    for cat in ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]:
        features[f"type_{cat}"] = (types == cat).astype(int)
        
    encoded = features.reindex(columns=cols, fill_value=0.0).fillna(0.0)
    probs, onnx_stats = onnx_hub.predict_proba_batch("banks", encoded)
        
    scores = np.round(probs * 100.0, 2)
    is_flagged = probs >= threshold
    
    anomaly_scores = [None] * len(records)
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        raw_anom = bundle["anomaly_model"].decision_function(encoded)
        ref = np.asarray(bundle["anomaly_reference_scores"])
        anomaly_scores = np.round(1.0 - (np.searchsorted(ref, raw_anom, side="right") / len(ref)), 4)
        
    shap_vals = explainer(encoded)
    vals = np.asarray(shap_vals.values)
    if vals.ndim == 3:
        vals = vals[:, :, -1]
    top_indices = np.argmax(np.abs(vals), axis=1)
    
    results = []
    for i, r in enumerate(records):
        rec_id = str(r.get("transaction_id", f"TX-B-{i+1:04d}"))
        top_col = cols[top_indices[i]]
        top_imp = float(vals[i, top_indices[i]])
        results.append({
            "row_index": i,
            "record_id": rec_id,
            "fraud_probability": round(float(probs[i]), 4),
            "risk_score": float(scores[i]),
            "decision_threshold": round(threshold, 4),
            "classification": "fraud" if bool(is_flagged[i]) else "safe",
            "anomaly_score": float(anomaly_scores[i]) if anomaly_scores[i] is not None else None,
            "top_factor": {
                "feature": top_col,
                "impact_log_odds": round(top_imp, 3),
                "direction": "increases_risk" if top_imp > 0 else "decreases_risk"
            },
            "summary": f"{types.iloc[i]} ${amounts.iloc[i]:,.2f} (Drain: {drain_ratios[i]:.0%})",
            "raw_record": r
        })
        
    elapsed_ms = (time.perf_counter() - t0) * 1000
    n = len(records)
    flagged_sum = int(np.sum(is_flagged))
    
    return {
        "domain": "banks",
        "batch_summary": {
            "total_records": n,
            "flagged_count": flagged_sum,
            "cleared_count": n - flagged_sum,
            "fraud_rate": round(flagged_sum / max(n, 1), 4),
            "mean_risk_score": round(float(np.mean(scores)), 2),
            "p95_risk_score": round(float(np.percentile(scores, 95)), 2) if n > 0 else 0.0,
            "decision_threshold": round(threshold, 4),
            "processing_time_ms": round(elapsed_ms, 2),
            "inference_engine": onnx_stats.get("engine", "ONNX_FP16"),
            "throughput_rps": onnx_stats.get("throughput_rps", 0.0),
        },
        "records": results
    }


def _batch_assess_creditfraud(records: list[dict[str, Any]]) -> dict[str, Any]:
    t0 = time.perf_counter()
    if not records:
        return {
            "domain": "lenders",
            "batch_summary": {"total_records": 0, "flagged_count": 0, "cleared_count": 0, "fraud_rate": 0.0, "mean_risk_score": 0.0, "p95_risk_score": 0.0, "decision_threshold": 0.1557, "processing_time_ms": 0.0},
            "records": []
        }
    
    bundle, explainer = get_creditfraud_bundle()
    model = bundle["model"]
    cols = bundle["feature_columns"]
    threshold = float(bundle.get("decision_threshold", 0.15566))
    
    df = pd.DataFrame(records)
    income = pd.to_numeric(df.get("amt_income_total", df.get("AMT_INCOME_TOTAL", 270000.0)), errors="coerce").fillna(270000.0).astype(float)
    credit = pd.to_numeric(df.get("amt_credit", df.get("AMT_CREDIT", 1031053.5)), errors="coerce").fillna(1031053.5).astype(float)
    annuity = pd.to_numeric(df.get("amt_annuity", df.get("AMT_ANNUITY", 34204.5)), errors="coerce").fillna(34204.5).astype(float)
    goods_price = pd.to_numeric(df.get("amt_goods_price", df.get("AMT_GOODS_PRICE", credit * 0.9)), errors="coerce").fillna(credit * 0.9).astype(float)
    ext2 = pd.to_numeric(df.get("ext_source_2", df.get("EXT_SOURCE_2", 0.55)), errors="coerce").fillna(0.55).astype(float)
    ext3 = pd.to_numeric(df.get("ext_source_3", df.get("EXT_SOURCE_3", 0.45)), errors="coerce").fillna(0.45).astype(float)
    days_birth = pd.to_numeric(df.get("days_birth", df.get("DAYS_BIRTH", -14500)), errors="coerce").fillna(-14500).astype(float)
    days_employed = pd.to_numeric(df.get("days_employed", df.get("DAYS_EMPLOYED", -2500)), errors="coerce").fillna(-2500).astype(float)
    contract_types = df.get("contract_type", df.get("NAME_CONTRACT_TYPE", "Cash loans")).astype(str).str.strip()
    genders = df.get("code_gender", df.get("CODE_GENDER", "M")).astype(str).str.strip().str.upper()
    
    feat_df = pd.DataFrame(0.0, index=df.index, columns=cols)
    feat_df["AMT_INCOME_TOTAL"] = income
    feat_df["AMT_CREDIT"] = credit
    feat_df["AMT_ANNUITY"] = annuity
    feat_df["AMT_GOODS_PRICE"] = goods_price
    feat_df["EXT_SOURCE_2"] = ext2
    feat_df["EXT_SOURCE_3"] = ext3
    feat_df["DAYS_BIRTH"] = days_birth
    feat_df["DAYS_EMPLOYED"] = days_employed
    feat_df["CREDIT_TERM"] = annuity / (credit + 1.0)
    feat_df["ANNUITY_INCOME_RATIO"] = annuity / (income + 1.0)
    
    for idx, ctype in enumerate(contract_types):
        col = f"NAME_CONTRACT_TYPE_{ctype}"
        if col in feat_df.columns:
            feat_df.loc[idx, col] = 1.0
    for idx, g in enumerate(genders):
        col = f"CODE_GENDER_{g}"
        if col in feat_df.columns:
            feat_df.loc[idx, col] = 1.0
            
    encoded = feat_df.fillna(0.0)
    probs, onnx_stats = onnx_hub.predict_proba_batch("creditfraud", encoded)
        
    scores = np.round(probs * 100.0, 2)
    is_flagged = probs >= threshold
    
    anomaly_scores = [None] * len(records)
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        raw_anom = bundle["anomaly_model"].decision_function(encoded)
        ref = np.asarray(bundle["anomaly_reference_scores"])
        anomaly_scores = np.round(1.0 - (np.searchsorted(ref, raw_anom, side="right") / len(ref)), 4)
        
    shap_vals = explainer(encoded)
    vals = np.asarray(shap_vals.values)
    if vals.ndim == 3:
        vals = vals[:, :, -1]
    top_indices = np.argmax(np.abs(vals), axis=1)
    
    results = []
    for i, r in enumerate(records):
        rec_id = str(r.get("applicant_id", f"APP-LN-{i+1:04d}"))
        top_col = cols[top_indices[i]]
        top_imp = float(vals[i, top_indices[i]])
        results.append({
            "row_index": i,
            "record_id": rec_id,
            "fraud_probability": round(float(probs[i]), 4),
            "risk_score": float(scores[i]),
            "decision_threshold": round(threshold, 4),
            "classification": "fraud" if bool(is_flagged[i]) else "safe",
            "anomaly_score": float(anomaly_scores[i]) if anomaly_scores[i] is not None else None,
            "top_factor": {
                "feature": top_col,
                "impact_log_odds": round(top_imp, 3),
                "direction": "increases_risk" if top_imp > 0 else "decreases_risk"
            },
            "summary": f"${credit.iloc[i]:,.0f} Credit | Income ${income.iloc[i]:,.0f} | Ext2: {ext2.iloc[i]:.2f}",
            "raw_record": r
        })
        
    elapsed_ms = (time.perf_counter() - t0) * 1000
    n = len(records)
    flagged_sum = int(np.sum(is_flagged))
    
    return {
        "domain": "lenders",
        "batch_summary": {
            "total_records": n,
            "flagged_count": flagged_sum,
            "cleared_count": n - flagged_sum,
            "fraud_rate": round(flagged_sum / max(n, 1), 4),
            "mean_risk_score": round(float(np.mean(scores)), 2),
            "p95_risk_score": round(float(np.percentile(scores, 95)), 2) if n > 0 else 0.0,
            "decision_threshold": round(threshold, 4),
            "processing_time_ms": round(elapsed_ms, 2),
            "inference_engine": onnx_stats.get("engine", "ONNX_FP16"),
            "throughput_rps": onnx_stats.get("throughput_rps", 0.0),
        },
        "records": results
    }


def _batch_assess_insurance(records: list[dict[str, Any]]) -> dict[str, Any]:
    t0 = time.perf_counter()
    if not records:
        return {
            "domain": "insurers",
            "batch_summary": {"total_records": 0, "flagged_count": 0, "cleared_count": 0, "fraud_rate": 0.0, "mean_risk_score": 0.0, "p95_risk_score": 0.0, "decision_threshold": 0.1798, "processing_time_ms": 0.0},
            "records": []
        }
    
    bundle, explainer = get_insurance_bundle()
    model = bundle["model"]
    cols = bundle["feature_columns"]
    threshold = float(bundle.get("decision_threshold", 0.1798))
    
    df = pd.DataFrame(records)
    claim_types = df.get("claim_type", "home").astype(str).str.strip().str.lower()
    states = df.get("state", "CA").astype(str).str.strip().str.upper()
    tenure = pd.to_numeric(df.get("policyholder_tenure_years", 1.0), errors="coerce").fillna(1.0).astype(float)
    previous = pd.to_numeric(df.get("previous_claims_count", 0), errors="coerce").fillna(0).astype(float)
    amount = pd.to_numeric(df.get("claim_amount", 5000.0), errors="coerce").fillna(5000.0).astype(float)
    deductible = pd.to_numeric(df.get("deductible", 1000.0), errors="coerce").fillna(1000.0).astype(float)
    
    incidents = pd.to_datetime(df.get("incident_date", "2025-01-01"), errors="coerce")
    fileds = pd.to_datetime(df.get("claim_filed_date", "2025-01-05"), errors="coerce")
    filing_delay = (fileds - incidents).dt.days.fillna(4).astype(int)
    
    features = pd.DataFrame({
        "policyholder_tenure_years": tenure,
        "previous_claims_count": previous,
        "claim_amount": amount,
        "deductible": deductible,
        "filing_delay_days": filing_delay,
        "claim_to_deductible_ratio": amount / (deductible + 1.0),
        "claim_amount_log": np.log1p(amount),
    })
    
    for ct in ["auto", "business", "home", "property", "renters", "nan"]:
        features[f"claim_type_{ct}"] = (claim_types == ct).astype(np.uint8)
        
    for st in ["AL", "AR", "AZ", "CA", "CO", "CT", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "MI", "MN", "MO", "MS", "NC", "NE", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "SC", "TN", "TX", "UT", "VA", "WA", "WI", "WV", "nan"]:
        features[f"state_{st}"] = (states == st).astype(np.uint8)
        
    encoded = features.reindex(columns=cols, fill_value=0).fillna(0)
    probs, onnx_stats = onnx_hub.predict_proba_batch("insurance", encoded)
        
    scores = np.round(probs * 100.0, 2)
    is_flagged = probs >= threshold
    
    anomaly_scores = [None] * len(records)
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        raw_anom = bundle["anomaly_model"].decision_function(encoded)
        ref = np.asarray(bundle["anomaly_reference_scores"])
        anomaly_scores = np.round(1.0 - (np.searchsorted(ref, raw_anom, side="right") / len(ref)), 4)
        
    shap_vals = explainer(encoded)
    vals = np.asarray(shap_vals.values)
    if vals.ndim == 3:
        vals = vals[:, :, -1]
    top_indices = np.argmax(np.abs(vals), axis=1)
    
    results = []
    for i, r in enumerate(records):
        rec_id = str(r.get("claim_id", f"CLM-IN-{i+1:04d}"))
        top_col = cols[top_indices[i]]
        top_imp = float(vals[i, top_indices[i]])
        results.append({
            "row_index": i,
            "record_id": rec_id,
            "fraud_probability": round(float(probs[i]), 4),
            "risk_score": float(scores[i]),
            "decision_threshold": round(threshold, 4),
            "classification": "fraud" if bool(is_flagged[i]) else "safe",
            "anomaly_score": float(anomaly_scores[i]) if anomaly_scores[i] is not None else None,
            "top_factor": {
                "feature": top_col,
                "impact_log_odds": round(top_imp, 3),
                "direction": "increases_risk" if top_imp > 0 else "decreases_risk"
            },
            "summary": f"{claim_types.iloc[i].upper()} Claim ${amount.iloc[i]:,.2f} ({states.iloc[i]})",
            "raw_record": r
        })
        
    elapsed_ms = (time.perf_counter() - t0) * 1000
    n = len(records)
    flagged_sum = int(np.sum(is_flagged))
    
    return {
        "domain": "insurers",
        "batch_summary": {
            "total_records": n,
            "flagged_count": flagged_sum,
            "cleared_count": n - flagged_sum,
            "fraud_rate": round(flagged_sum / max(n, 1), 4),
            "mean_risk_score": round(float(np.mean(scores)), 2),
            "p95_risk_score": round(float(np.percentile(scores, 95)), 2) if n > 0 else 0.0,
            "decision_threshold": round(threshold, 4),
            "processing_time_ms": round(elapsed_ms, 2),
            "inference_engine": onnx_stats.get("engine", "ONNX_FP16"),
            "throughput_rps": onnx_stats.get("throughput_rps", 0.0),
        },
        "records": results
    }


def run_batch_ml(domain: str, records: list[dict[str, Any]]) -> dict[str, Any]:
    d = domain.lower()
    if d in ("banks", "paysim"):
        result = _batch_assess_banks(records)
    elif d in ("creditfraud", "lenders"):
        result = _batch_assess_creditfraud(records)
    elif d in ("insurance", "insurers"):
        result = _batch_assess_insurance(records)
    else:
        raise ValueError(f"Unknown domain: {domain}. Must be one of: banks, lenders, insurers")
    
    telemetry_hub.schedule_broadcast()
    return result


def local_reasoning(domain, ml_json):
    risk = ml_json.get("risk", {})
    probability = risk.get("fraud_probability", 0.0)
    score = risk.get("risk_score", round(probability * 100, 2))
    decision = risk.get("classification", "safe")
    threshold = risk.get("decision_threshold", 0.40)
    anomaly = risk.get("anomaly_score", 0.15)
    factors = ml_json.get("risk_factors", [])

    top_factors = []
    for f in factors[:3]:
        feat = f.get('feature', 'feature')
        imp = f.get('impact_log_odds', 0.0)
        direction = f.get('direction', 'affects risk')
        top_factors.append(f"{feat} ({direction}, impact {imp:+.3f})")
    factor_str = ", ".join(top_factors) or "Standard baseline profile"

    if decision == "fraud":
        summary = (
            f"Flagged for Human Review. The model assigned an elevated fraud probability of {probability:.1%} "
            f"(calibrated risk score {score:.1f}/100), exceeding the decision threshold of {threshold:.2f}."
        )
        guidance = (
            "Route transaction to Tier-2 fraud operations. Re-verify sender device token and cross-examine "
            "recipient beneficiary account age and velocity before fund settlement."
        )
    else:
        summary = (
            f"Passed Routine Screening. The calibrated fraud probability of {probability:.1%} "
            f"(score {score:.1f}/100) remains well below the decision cutoff of {threshold:.2f}."
        )
        guidance = "Maintain standard automated continuous transaction monitoring; no adverse customer intervention required."

    text = (
        f"**Assessment Summary**:\n{summary}\n\n"
        f"**Key Feature Evidence (SHAP Drivers)**:\nTop statistical drivers influencing this evaluation: {factor_str}.\n\n"
        f"**Network Context & Silo Parity**:\n"
        f"Isolated bank silos often miss cross-silo destination burner patterns due to lack of network counterparty history. "
        f"The federated model provides cross-institution defense while keeping raw financial data completely quarantined.\n\n"
        f"**Anomaly Signal**:\nAnomaly score is {anomaly:.3f}, measuring behavioral unusualness relative to historical baseline distributions (unusualness indicator, not fraud confirmation).\n\n"
        f"**Recommended Verification Checks**:\n{guidance}\n\n"
        f"**Governance & Limitations**:\nThis evaluation represents decision support trained on benchmark synthetic data under Differential Privacy (ε=2.45) and SecAgg+ encryption. Human oversight is required prior to any adverse customer action."
    )

    return {
        "source": "local_fallback",
        "text": text,
    }


def discover_gemini_models(api_key):
    """Get this key's generateContent models once; never log or return the key."""
    global _GEMINI_MODELS_CACHE
    if _GEMINI_MODELS_CACHE is not None:
        return _GEMINI_MODELS_CACHE
    try:
        response = requests.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            headers={"x-goog-api-key": api_key},
            timeout=15,
        )
        response.raise_for_status()
        models = response.json().get("models", [])
        blocked = ["image", "tts", "transcribe", "robotics", "computer-use", "customtools"]
        available = {
            item.get("name", "").removeprefix("models/")
            for item in models
            if "generateContent" in item.get("supportedGenerationMethods", [])
            and "gemini" in item.get("name", "").lower()
            and not any(term in item.get("name", "").lower() for term in blocked)
        }
        _GEMINI_MODELS_CACHE = available
        return available
    except (requests.RequestException, ValueError, KeyError):
        return set()


def gemini_model_order(api_key):
    configured = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    configured_fallbacks = [name.strip() for name in
                            os.getenv("GEMINI_FALLBACK_MODELS", "").split(",") if name.strip()]
    available = discover_gemini_models(api_key)
    discovered_order = [name for name in GEMINI_MODEL_PREFERENCE if name in available]
    ordered = [configured, *configured_fallbacks, *discovered_order]
    deduplicated = list(dict.fromkeys(name for name in ordered if name))
    return [name for name in deduplicated if not available or name in available]


def gemini_reasoning(domain, ml_json):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_Key")
    if not api_key:
        return local_reasoning(domain, ml_json)

    explanation_json = dict(ml_json)
    for identifier in ["transaction_id", "claim_id"]:
        explanation_json.pop(identifier, None)
    if isinstance(explanation_json.get("model"), dict):
        explanation_json["model"] = {
            key: value for key, value in explanation_json["model"].items()
            if key != "artifact"
        }

    prompt = (
        "You are the authoritative explanation layer for the TrustFed / ENIGMA Financial Risk Screening Platform. "
        "Your role is to interpret the model's authoritative assessment for compliance officers, fraud analysts, and risk teams.\n\n"
        "Guidelines:\n"
        "1. Write a clear, concise, structured response using exactly these markdown labeled sections:\n"
        "   - **Assessment Summary**: State the exact fraud probability (as a percentage), calibrated risk score, and classification relative to the decision cutoff threshold. Clearly say whether this is flagged for Human Review or Routine Approval.\n"
        "   - **Key Feature Evidence (SHAP Drivers)**: Explain the top SHAP features and their exact impact direction. For Banks (PaySim), explain how transaction type (TRANSFER/CASH_OUT vs routine retail), account drainage ratio (amount relative to sender balance), and destination account balance ($0 mule/burner account vs established counterparty) drove the score.\n"
        "   - **Network Context & Silo Parity**: Briefly explain why an isolated bank silo might miss this pattern (e.g. lack of cross-silo destination visibility), whereas the collaborative federated model caught it.\n"
        "   - **Anomaly Signal**: Explain the anomaly score as an indicator of behavioral unusualness relative to historical baseline distributions (not a fraud probability).\n"
        "   - **Recommended Verification Checks**: Provide concrete domain checks (e.g., verifying multi-factor authentication, confirming recipient account tenure, reviewing velocity limits for Banks; policy/incident records for Insurers).\n"
        "   - **Governance & Limitations**: State that this assessment is decision support based on synthetic benchmark data under SecAgg+ and Differential Privacy, requiring human oversight without automated adverse action.\n\n"
        "2. Strictly use the provided assessment values (never invent numbers, thresholds, or facts).\n"
        "3. Keep the tone professional, objective, and regulatory-grade.\n\n"
        f"Domain: {domain}\n"
        f"Authoritative ML Assessment JSON:\n{json.dumps(explanation_json, ensure_ascii=False)}"
    )

    failures = []
    for model_name in gemini_model_order(api_key):
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        
        # Build payload with thinkingBudget 0 to ensure fast, complete visible responses
        gen_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1200,
                "thinkingConfig": {
                    "thinkingBudget": 0
                }
            }
        }
        
        try:
            response = requests.post(
                endpoint,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=gen_payload,
                timeout=15,
            )
            # If thinkingConfig causes an error on older models, retry without thinkingConfig
            if response.status_code == 400 and "thinkingConfig" in response.text:
                gen_payload["generationConfig"].pop("thinkingConfig", None)
                response = requests.post(
                    endpoint,
                    headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                    json=gen_payload,
                    timeout=15,
                )

            if response.status_code in (401, 403):
                failures.append({"model": model_name, "reason": f"HTTP {response.status_code}; key/authentication rejected"})
                break

            response.raise_for_status()
            body = response.json()
            candidates = body.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned")

            parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join(part.get("text", "") for part in parts if part.get("text"))
            if not text.strip():
                raise ValueError("empty response text")

            return {
                "source": "gemini",
                "model": model_name,
                "text": text.strip(),
                "fallback_models_tried": failures
            }
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            failures.append({
                "model": model_name,
                "reason": f"HTTP {status}" if status else type(exc).__name__
            })

    fallback = local_reasoning(domain, ml_json)
    fallback["fallback_reason"] = "All configured/discovered Gemini models failed; using local explanation."
    fallback["gemini_attempts"] = failures
    return fallback


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {name: {"available": path.is_file(), "artifact": str(path.relative_to(ARTIFACTS_DIR.parent))}
                   for name, path in MODEL_PATHS.items()},
        "onnx_engine": onnx_hub.get_telemetry_snapshot(),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_Key")),
    }


@app.get("/")
def root():
    return {
        "service": "ENIGMA Risk Inference API",
        "status": "running",
        "health": "/health",
        "interactive_api_docs": "/docs",
        "assessment_endpoint": "POST /api/assess",
        "streaming_endpoint": "POST /api/assess/stream",
        "telemetry_websocket": "/ws/telemetry",
        "message": "Use /docs to submit a risk assessment; the root URL does not accept prediction inputs.",
    }


@app.post("/api/assess")
def assess(request: AssessRequest):
    try:
        # Required ordering: ML inference first; the explanation API receives
        # only the structured ML result, never the raw form payload.
        ml_json = run_ml(request.domain, request.user_input)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    reasoning = gemini_reasoning(request.domain, ml_json) if request.include_ai_reasoning else None
    return {"domain": request.domain, "ml_risk_json": ml_json, "ai_reasoning": reasoning}


class StreamAssessRequest(BaseModel):
    domain: Literal["banks", "lenders", "insurers", "creditfraud", "insurance"]
    user_input: dict[str, Any] = Field(..., description="Transaction or application payload")


def stream_gemini_tokens_sync(domain: str, ml_json: dict[str, Any]):
    """Generator yielding SSE formatted strings for real-time token streaming."""
    # 1. Yield initial authoritative ML evaluation metadata
    yield f"data: {json.dumps({'type': 'meta', 'domain': domain, 'ml_risk_json': ml_json})}\n\n"

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_Key")
    explanation_json = dict(ml_json)
    for identifier in ["transaction_id", "claim_id"]:
        explanation_json.pop(identifier, None)
    if isinstance(explanation_json.get("model"), dict):
        explanation_json["model"] = {
            key: value for key, value in explanation_json["model"].items()
            if key != "artifact"
        }

    prompt = (
        "You are the authoritative explanation layer for the TrustFed / ENIGMA Financial Risk Screening Platform. "
        "Your role is to interpret the model's authoritative assessment for compliance officers, fraud analysts, and risk teams.\n\n"
        "Guidelines:\n"
        "1. Write a clear, concise, structured response using exactly these markdown labeled sections:\n"
        "   - **Assessment Summary**: State the exact fraud probability (as a percentage), calibrated risk score, and classification relative to the decision cutoff threshold. Clearly say whether this is flagged for Human Review or Routine Approval.\n"
        "   - **Key Feature Evidence (SHAP Drivers)**: Explain the top SHAP features and their exact impact direction. For Banks (PaySim), explain how transaction type (TRANSFER/CASH_OUT vs routine retail), account drainage ratio (amount relative to sender balance), and destination account balance ($0 mule/burner account vs established counterparty) drove the score.\n"
        "   - **Network Context & Silo Parity**: Briefly explain why an isolated bank silo might miss this pattern (e.g. lack of cross-silo destination visibility), whereas the collaborative federated model caught it.\n"
        "   - **Anomaly Signal**: Explain the anomaly score as an indicator of behavioral unusualness relative to historical baseline distributions (not a fraud probability).\n"
        "   - **Recommended Verification Checks**: Provide concrete domain checks (e.g., verifying multi-factor authentication, confirming recipient account tenure, reviewing velocity limits for Banks; policy/incident records for Insurers).\n"
        "   - **Governance & Limitations**: State that this assessment is decision support based on synthetic benchmark data under SecAgg+ and Differential Privacy, requiring human oversight without automated adverse action.\n\n"
        "2. Strictly use the provided assessment values (never invent numbers, thresholds, or facts).\n"
        "3. Keep the tone professional, objective, and regulatory-grade.\n\n"
        f"Domain: {domain}\n"
        f"Authoritative ML Assessment JSON:\n{json.dumps(explanation_json, ensure_ascii=False)}"
    )

    streamed_successfully = False
    model_used = "gemini-2.5-flash"

    if api_key:
        for model_name in gemini_model_order(api_key):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?alt=sse"
            headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1200,
                    "thinkingConfig": {"thinkingBudget": 0}
                }
            }
            try:
                r = requests.post(url, headers=headers, json=payload, stream=True, timeout=12)
                if r.status_code == 400 and "thinkingConfig" in r.text:
                    payload["generationConfig"].pop("thinkingConfig", None)
                    r = requests.post(url, headers=headers, json=payload, stream=True, timeout=12)

                if r.status_code == 200:
                    model_used = model_name
                    got_any_token = False
                    for line in r.iter_lines(decode_unicode=True):
                        if not line:
                            continue
                        if line.startswith("data: "):
                            raw_json = line[6:].strip()
                            if raw_json:
                                try:
                                    chunk = json.loads(raw_json)
                                    candidates = chunk.get("candidates", [])
                                    if candidates:
                                        parts = candidates[0].get("content", {}).get("parts", [])
                                        for part in parts:
                                            text_chunk = part.get("text", "")
                                            if text_chunk:
                                                got_any_token = True
                                                yield f"data: {json.dumps({'type': 'token', 'token': text_chunk})}\n\n"
                                except Exception:
                                    pass
                    if got_any_token:
                        streamed_successfully = True
                        break
            except Exception:
                continue

    # Fallback: progressive simulated token stream of deterministic reasoning
    if not streamed_successfully:
        model_used = "deterministic-local"
        fallback = local_reasoning(domain, ml_json)
        full_text = fallback.get("text", "")
        words = full_text.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + (" " if i+3 < len(words) else "")
            yield f"data: {json.dumps({'type': 'token', 'token': chunk})}\n\n"
            time.sleep(0.015)

    # Final event
    yield f"data: {json.dumps({'type': 'done', 'done': True, 'source': 'gemini' if streamed_successfully else 'local_fallback', 'model': model_used})}\n\n"


@app.post("/api/assess/stream")
def assess_stream(request: StreamAssessRequest):
    """Real-time SSE token streaming endpoint for Gemini 2.5 Flash explanations with live typewriter effect."""
    try:
        ml_json = run_ml(request.domain, request.user_input)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    def event_stream():
        telemetry_hub.active_streams += 1
        try:
            for event in stream_gemini_tokens_sync(request.domain, ml_json):
                yield event
        finally:
            telemetry_hub.active_streams = max(0, telemetry_hub.active_streams - 1)
            telemetry_hub.schedule_broadcast()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


class BatchAssessRequest(BaseModel):
    domain: Literal["banks", "lenders", "insurers", "creditfraud", "insurance"]
    records: list[dict[str, Any]] = Field(..., description="List of transactions/applications/claims to screen")


@app.post("/api/assess/batch")
def assess_batch(request: BatchAssessRequest):
    """Vectorized high-throughput batch screening endpoint powered by ONNX FP16."""
    try:
        return run_batch_ml(request.domain, request.records)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/assess/upload")
async def assess_upload(file: UploadFile = File(...), domain: str = Form(...)):
    """Upload CSV or JSON file for immediate vectorized screening."""
    try:
        content = await file.read()
        filename = file.filename.lower()
        if filename.endswith(".json"):
            records = json.loads(content.decode("utf-8"))
            if isinstance(records, dict) and "records" in records:
                records = records["records"]
            elif not isinstance(records, list):
                records = [records]
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.StringIO(content.decode("utf-8", errors="replace")))
            records = df.to_dict(orient="records")
        else:
            raise ValueError("Unsupported file format. Please upload a valid .csv or .json file.")

        return run_batch_ml(domain, records)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/samples/{domain}")
def get_sample_records(domain: str):
    """Retrieve preloaded demo batch records for instant 1-click testing."""
    d = domain.lower()
    mapping = {
        "banks": "sample_banks_batch.csv",
        "paysim": "sample_banks_batch.csv",
        "lenders": "sample_lenders_batch.csv",
        "creditfraud": "sample_lenders_batch.csv",
        "insurers": "sample_insurers_batch.csv",
        "insurance": "sample_insurers_batch.csv",
    }
    fname = mapping.get(d)
    if not fname:
        raise HTTPException(status_code=404, detail=f"No sample available for domain '{domain}'")
    file_path = SAMPLES_DIR / fname
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Sample file not found on server")
    df = pd.read_csv(file_path)
    return {
        "domain": domain,
        "filename": fname,
        "total_records": len(df),
        "records": df.to_dict(orient="records"),
    }


@app.get("/api/samples/download/{filename}")
def download_sample_file(filename: str):
    """Download template or sample CSV file."""
    file_path = SAMPLES_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Requested file not found")
    return FileResponse(file_path, filename=filename, media_type="text/csv")


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """High-frequency WebSocket telemetry hub pushing live P50/P95, throughput & SecAgg stats."""
    await telemetry_hub.connect(websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            if msg in ("ping", "refresh"):
                await websocket.send_text(json.dumps(telemetry_hub.get_payload()))
    except WebSocketDisconnect:
        telemetry_hub.disconnect(websocket)
    except Exception:
        telemetry_hub.disconnect(websocket)


@app.get("/api/telemetry")
def get_telemetry_snapshot():
    """Retrieve instantaneous telemetry snapshot over HTTP."""
    return telemetry_hub.get_payload()


