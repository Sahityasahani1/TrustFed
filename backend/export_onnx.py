"""Standalone ONNX FP16 Export Pipeline for TrustFed Models.

Converts scikit-learn & XGBoost .joblib models to optimized ONNX FP16
execution graphs with CPU execution graph optimizations.
Generates onnx_metadata.json manifests for each domain.
"""

import copy
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import onnx
import onnxruntime as ort
import skl2onnx
from skl2onnx.common.data_types import FloatTensorType as SkFloatTensorType
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType as XgFloatTensorType
from onnxconverter_common import float16


ARTIFACTS_DIR = Path(__file__).parent / "artifacts"


def export_paysim(domain_dir: Path) -> dict:
    """Export PaySim RandomForestClassifier model to ONNX FP16."""
    joblib_path = domain_dir / "model.joblib"
    if not joblib_path.is_file():
        raise FileNotFoundError(f"Missing PaySim bundle at {joblib_path}")

    print(f"\n[PaySim] Loading bundle from {joblib_path}...")
    bundle = joblib.load(joblib_path)
    model = bundle["model"]
    feature_cols = list(bundle["feature_columns"])
    threshold = float(bundle.get("decision_threshold", 0.40))
    n_features = len(feature_cols)

    print(f"[PaySim] Converting RandomForestClassifier ({n_features} features)...")
    initial_types = [("float_input", SkFloatTensorType([None, n_features]))]
    
    # zipmap=False produces a direct (N, 2) tensor output instead of sequence of maps
    onnx_fp32 = skl2onnx.convert_sklearn(
        model,
        initial_types=initial_types,
        options={"zipmap": False},
        target_opset=17,
    )

    print("[PaySim] Converting graph to FP16...")
    onnx_fp16 = float16.convert_float_to_float16(onnx_fp32)

    onnx_out_path = domain_dir / "model_fp16.onnx"
    with open(onnx_out_path, "wb") as f:
        f.write(onnx_fp16.SerializeToString())
    print(f"[PaySim] Exported ONNX FP16 model to {onnx_out_path} ({onnx_out_path.stat().st_size / 1024:.1f} KB)")

    # Validation against joblib
    sess = ort.InferenceSession(str(onnx_out_path), providers=["CPUExecutionProvider"])
    test_input = np.random.randn(20, n_features).astype(np.float32)
    orig_probs = model.predict_proba(test_input)[:, 1]
    onnx_out = sess.run(None, {"float_input": test_input.astype(np.float16)})
    onnx_probs = onnx_out[1][:, 1].astype(np.float32)
    max_diff = float(np.max(np.abs(orig_probs - onnx_probs)))
    print(f"[PaySim] Validation verification: Max probability delta = {max_diff:.6f}")

    meta = {
        "domain": "banks",
        "model_type": type(model).__name__,
        "source_artifact": "model.joblib",
        "onnx_artifact": "model_fp16.onnx",
        "precision": "float16",
        "input_tensor_name": "float_input",
        "output_tensor_names": [o.name for o in sess.get_outputs()],
        "feature_count": n_features,
        "feature_columns": feature_cols,
        "decision_threshold": threshold,
        "has_calibrator": bundle.get("calibrator") is not None,
        "has_anomaly_model": bundle.get("anomaly_model") is not None,
        "validation_max_diff": max_diff,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "onnx_version": onnx.__version__,
        "onnxruntime_version": ort.__version__,
    }

    meta_path = domain_dir / "onnx_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"[PaySim] Metadata written to {meta_path}")
    return meta


def export_xgboost_model(domain: str, domain_dir: Path) -> dict:
    """Export XGBoost classifier models (CreditFraud, Insurance) to ONNX FP16."""
    joblib_path = domain_dir / "model.joblib"
    if not joblib_path.is_file():
        raise FileNotFoundError(f"Missing bundle at {joblib_path}")

    print(f"\n[{domain}] Loading bundle from {joblib_path}...")
    bundle = joblib.load(joblib_path)
    orig_model = bundle["model"]
    feature_cols = list(bundle["feature_columns"])
    threshold = float(bundle.get("decision_threshold", 0.2))
    n_features = len(feature_cols)

    print(f"[{domain}] Converting XGBClassifier ({n_features} features)...")
    # Clone and remap booster feature names to f0..fn for onnxmltools compatibility
    xgb_clone = copy.deepcopy(orig_model)
    booster = xgb_clone.get_booster()
    booster.feature_names = [f"f{i}" for i in range(n_features)]

    initial_types = [("float_input", XgFloatTensorType([None, n_features]))]
    onnx_fp32 = onnxmltools.convert_xgboost(
        xgb_clone,
        initial_types=initial_types,
        target_opset=15,
    )

    print(f"[{domain}] Converting graph to FP16...")
    onnx_fp16 = float16.convert_float_to_float16(onnx_fp32)

    onnx_out_path = domain_dir / "model_fp16.onnx"
    with open(onnx_out_path, "wb") as f:
        f.write(onnx_fp16.SerializeToString())
    print(f"[{domain}] Exported ONNX FP16 model to {onnx_out_path} ({onnx_out_path.stat().st_size / 1024:.1f} KB)")

    # Validation against joblib
    sess = ort.InferenceSession(str(onnx_out_path), providers=["CPUExecutionProvider"])
    test_input = np.random.randn(20, n_features).astype(np.float32)
    orig_probs = orig_model.predict_proba(test_input)[:, 1]
    onnx_out = sess.run(None, {"float_input": test_input.astype(np.float16)})
    onnx_probs = onnx_out[1][:, 1].astype(np.float32)
    max_diff = float(np.max(np.abs(orig_probs - onnx_probs)))
    print(f"[{domain}] Validation verification: Max probability delta = {max_diff:.6f}")

    meta = {
        "domain": domain,
        "model_type": type(orig_model).__name__,
        "source_artifact": "model.joblib",
        "onnx_artifact": "model_fp16.onnx",
        "precision": "float16",
        "input_tensor_name": "float_input",
        "output_tensor_names": [o.name for o in sess.get_outputs()],
        "feature_count": n_features,
        "feature_columns": feature_cols,
        "decision_threshold": threshold,
        "has_calibrator": bundle.get("calibrator") is not None,
        "has_anomaly_model": bundle.get("anomaly_model") is not None,
        "validation_max_diff": max_diff,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "onnx_version": onnx.__version__,
        "onnxruntime_version": ort.__version__,
    }

    meta_path = domain_dir / "onnx_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"[{domain}] Metadata written to {meta_path}")
    return meta


def main():
    print("=" * 60)
    print("TrustFed ONNX FP16 Model Conversion & Validation Hub")
    print(f"Artifacts Base: {ARTIFACTS_DIR}")
    print("=" * 60)

    results = {}
    
    # 1. PaySim / Banks
    paysim_dir = ARTIFACTS_DIR / "paysim"
    if paysim_dir.exists():
        results["paysim"] = export_paysim(paysim_dir)

    # 2. CreditFraud / Lenders
    cf_dir = ARTIFACTS_DIR / "creditfraud"
    if cf_dir.exists():
        results["creditfraud"] = export_xgboost_model("creditfraud", cf_dir)

    # 3. Insurance / Insurers
    ins_dir = ARTIFACTS_DIR / "insurance"
    if ins_dir.exists():
        results["insurance"] = export_xgboost_model("insurance", ins_dir)

    print("\n" + "=" * 60)
    print("Export Summary:")
    for domain, meta in results.items():
        print(f"  [OK] {domain.upper():12} -> {meta['onnx_artifact']} (delta: {meta['validation_max_diff']:.6f})")
    print("=" * 60)


if __name__ == "__main__":
    main()
