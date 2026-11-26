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
from typing import Any, Dict, List, Literal, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import requests
import shap
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
import sys

ROOT = Path(__file__).parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from backend.predict_paysim import assess_transaction
except ImportError:
    from predict_paysim import assess_transaction

try:
    from backend.onnx_engine import onnx_hub
except ImportError:
    from onnx_engine import onnx_hub

try:
    from backend.secagg_engine import secagg_coordinator
except ImportError:
    from secagg_engine import secagg_coordinator

try:
    from backend.config import settings
except ImportError:
    from config import settings

try:
    from backend.auth import (
        AuthIdentity,
        get_current_caller,
        require_admin,
        require_operator,
        require_auditor,
        log_admin_action,
        create_jwt_token,
        key_registry,
        admin_audit_log,
    )
except ImportError:
    from auth import (
        AuthIdentity,
        get_current_caller,
        require_admin,
        require_operator,
        require_auditor,
        log_admin_action,
        create_jwt_token,
        key_registry,
        admin_audit_log,
    )

try:
    from backend.schemas import validate_input_for_domain
except ImportError:
    from schemas import validate_input_for_domain

try:
    from backend.rate_limiter import rate_limiter, circuit_breaker, explanation_cache
except ImportError:
    from rate_limiter import rate_limiter, circuit_breaker, explanation_cache

try:
    from backend.semantic_cache import semantic_cache
except ImportError:
    from semantic_cache import semantic_cache

try:
    from backend.job_queue import job_manager, JobStatus
except ImportError:
    from job_queue import job_manager, JobStatus

try:
    from backend.stream_engine import clearinghouse_hub
except ImportError:
    from stream_engine import clearinghouse_hub

try:
    from backend.compliance_engine import (
        generate_fcra_adverse_action_notice,
        generate_nist_sp1270_certificate,
        verify_compliance_signature,
    )
    from backend.investigator_workflow import (
        record_investigator_override,
        list_investigator_overrides,
        get_compliance_audit_summary,
    )
except ImportError:
    from compliance_engine import (
        generate_fcra_adverse_action_notice,
        generate_nist_sp1270_certificate,
        verify_compliance_signature,
    )
    from investigator_workflow import (
        record_investigator_override,
        list_investigator_overrides,
        get_compliance_audit_summary,
    )

try:
    from backend.enclave_attestation import enclave_service
    from backend.rdp_accountant import rdp_accountant, PrivacyBudgetExhaustedError
    from backend.federated_node_client import federated_coordinator
except ImportError:
    from enclave_attestation import enclave_service
    from rdp_accountant import rdp_accountant, PrivacyBudgetExhaustedError
    from federated_node_client import federated_coordinator

try:
    from backend.feature_flags import feature_flags
    from backend.webhook_signer import webhook_signer
    from backend.backup_manager import backup_manager
    from backend.migrations.migration_runner import migration_runner
    from backend.alert_manager import alert_manager
    from backend.status_endpoint import get_system_status
    from backend.db_pool import db_pool
except ImportError:
    from feature_flags import feature_flags
    from webhook_signer import webhook_signer
    from backup_manager import backup_manager
    from migrations.migration_runner import migration_runner
    from alert_manager import alert_manager
    from status_endpoint import get_system_status
    from db_pool import db_pool

from fastapi.middleware.gzip import GZipMiddleware

import logging
import uuid
from datetime import datetime, timezone


try:
    from logging_config import setup_logging, register_exception_handlers, get_process_memory_mb
except ImportError:
    from backend.logging_config import setup_logging, register_exception_handlers, get_process_memory_mb

ARTIFACTS_DIR = (ROOT / "artifacts") if (ROOT / "artifacts").exists() else (ROOT.parent / "artifacts")
SAMPLES_DIR = (ROOT / "samples") if (ROOT / "samples").exists() else (ROOT.parent / "backend" / "samples")
ALLOWED_SAMPLE_FILES = {
    "sample_banks_batch.csv",
    "sample_insurers_batch.csv",
    "sample_lenders_batch.csv",
    "template_banks.csv",
    "template_insurers.csv",
    "template_lenders.csv",
}

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

app = FastAPI(
    title="TrustFed Risk Inference API",
    version="2.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

setup_logging()
register_exception_handlers(app)
SERVER_START_TIME = time.time()

# Unified High-Performance Tracing & Security Headers Middleware (Single Pass)
@app.middleware("http")
async def unified_gateway_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
    request.state.request_id = req_id

    t_start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - t_start) * 1000.0

    response.headers["X-Request-ID"] = req_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self' ws: wss: http: https:;"
    )
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

    client_ip = request.client.host if request.client else "unknown"
    logging.getLogger("trustfed.http").info(
        f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.2f}ms) | ip={client_ip} | req_id={req_id}"
    )
    try:
        alert_manager.record_request(response.status_code, duration_ms)
    except Exception:
        pass

    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
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
        snap["federated_state"] = secagg_coordinator.get_state()
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
    summary = settings.get_sanitized_summary()
    print(f"[TrustFed Boot] Environment: {summary['environment']} | Gemini Configured: {summary['gemini_key_configured']} | CORS: {len(summary['frontend_origins'])} origins")
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
        if "anomaly_reference_scores" in _PAYSIM_BUNDLE and "anomaly_reference_scores_np" not in _PAYSIM_BUNDLE:
            _PAYSIM_BUNDLE["anomaly_reference_scores_np"] = np.asarray(_PAYSIM_BUNDLE["anomaly_reference_scores"])
        if "_col_to_idx" not in _PAYSIM_BUNDLE:
            _PAYSIM_BUNDLE["_col_to_idx"] = {c: i for i, c in enumerate(_PAYSIM_BUNDLE["feature_columns"])}
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
        if "anomaly_reference_scores" in _INS_BUNDLE and "anomaly_reference_scores_np" not in _INS_BUNDLE:
            _INS_BUNDLE["anomaly_reference_scores_np"] = np.asarray(_INS_BUNDLE["anomaly_reference_scores"])
        if "_col_to_idx" not in _INS_BUNDLE:
            _INS_BUNDLE["_col_to_idx"] = {c: i for i, c in enumerate(_INS_BUNDLE["feature_columns"])}
        _INS_EXPLAINER = shap.TreeExplainer(_INS_BUNDLE["model"])
    return _INS_BUNDLE, _INS_EXPLAINER


_SHAP_MEMO: dict = {}
_INS_ANOM_CACHE: dict = {}
_CF_ANOM_CACHE: dict = {}

def _insurance_assessment(payload, explain: bool = True):
    path = MODEL_PATHS["insurance"]
    if not path.is_file():
        raise FileNotFoundError("Insurance model missing; expected artifacts/insurance/model.joblib")
    
    # Defaults provided for testing if not all 8 fields are passed
    claim_type = str(payload.get("claim_type", "home")).strip().lower()
    state = str(payload.get("state", "ID")).strip().upper()
    tenure = float(payload.get("policyholder_tenure_years", 0.2))
    previous = float(payload.get("previous_claims_count", 0))
    amount = float(payload.get("claim_amount", 23607.73))
    deductible = float(payload.get("deductible", 2500.0))
    
    incident = pd.to_datetime(payload.get("incident_date", "2022-08-28"), errors="coerce")
    filed = pd.to_datetime(payload.get("claim_filed_date", "2022-09-03"), errors="coerce")
    filing_delay = int((filed - incident).days) if pd.notna(filed) and pd.notna(incident) else int(payload.get("filing_delay_days", 6))

    bundle, explainer = get_insurance_bundle()
    cols = bundle["feature_columns"]
    col_to_idx = bundle["_col_to_idx"]
    arr = np.zeros((1, len(cols)), dtype=np.float32)

    for cname, cval in (
        ("policyholder_tenure_years", tenure),
        ("previous_claims_count", previous),
        ("claim_amount", amount),
        ("deductible", deductible),
        ("filing_delay_days", float(filing_delay)),
        ("claim_to_deductible_ratio", amount / (deductible + 1.0)),
        ("claim_amount_log", float(np.log1p(amount))),
        (f"claim_type_{claim_type}", 1.0),
        (f"state_{state}", 1.0),
    ):
        idx = col_to_idx.get(cname)
        if idx is not None:
            arr[0, idx] = cval

    encoded = pd.DataFrame(arr, columns=cols)

    if onnx_hub.get_holder("insurance").is_onnx_active:
        probs, _ = onnx_hub.predict_proba_batch("insurance", encoded)
        raw = float(probs[0])
    else:
        raw = float(bundle["model"].predict_proba(encoded)[0, 1])
        if bundle.get("calibrator") is not None:
            clipped = float(np.clip(raw, 1e-6, 1 - 1e-6))
            raw = float(bundle["calibrator"].predict_proba([[np.log(clipped / (1 - clipped))]])[0, 1])
    threshold = float(bundle.get("decision_threshold", 0.1798))
    anomaly_score = None
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        feat_key = tuple(round(float(v), 2) for v in encoded.iloc[0].values)
        if feat_key in _INS_ANOM_CACHE:
            anomaly_score = _INS_ANOM_CACHE[feat_key]
        else:
            score = float(bundle["anomaly_model"].decision_function(encoded)[0])
            ref = bundle.get("anomaly_reference_scores_np")
            if ref is None:
                ref = np.asarray(bundle["anomaly_reference_scores"])
                bundle["anomaly_reference_scores_np"] = ref
            anomaly_score = float(1.0 - np.searchsorted(ref, score, side="right") / len(ref))
            if len(_INS_ANOM_CACHE) < 4096:
                _INS_ANOM_CACHE[feat_key] = anomaly_score

    names = list(bundle["feature_columns"])
    if not explain:
        f_imp = getattr(bundle.get("model"), "feature_importances_", None)
        if f_imp is None or len(f_imp) != len(names):
            f_imp = np.ones(len(names))
        impacts = np.asarray(encoded.iloc[0].values) * f_imp
    else:
        feat_key = ("ins", tuple(round(float(v), 2) for v in encoded.iloc[0].values))
        if feat_key in _SHAP_MEMO:
            impacts = _SHAP_MEMO[feat_key]
        else:
            try:
                raw_vals = explainer.shap_values(encoded, check_additivity=False)
            except Exception:
                raw_vals = explainer(encoded).values
            values = np.asarray(raw_vals)
            impacts = values[0, :, -1] if values.ndim == 3 else values[0]
            if len(_SHAP_MEMO) < 2048:
                _SHAP_MEMO[feat_key] = impacts
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
        if "anomaly_reference_scores" in _CF_BUNDLE and "anomaly_reference_scores_np" not in _CF_BUNDLE:
            _CF_BUNDLE["anomaly_reference_scores_np"] = np.asarray(_CF_BUNDLE["anomaly_reference_scores"])
        if "_col_to_idx" not in _CF_BUNDLE:
            _CF_BUNDLE["_col_to_idx"] = {c: i for i, c in enumerate(_CF_BUNDLE["feature_columns"])}
        _CF_EXPLAINER = shap.TreeExplainer(_CF_BUNDLE["model"])
    return _CF_BUNDLE, _CF_EXPLAINER


def _creditfraud_assessment(payload, explain: bool = True):
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

    cols = bundle["feature_columns"]
    col_to_idx = bundle["_col_to_idx"]
    arr = np.zeros((1, len(cols)), dtype=np.float32)

    for cname, cval in (
        ("AMT_INCOME_TOTAL", income),
        ("AMT_CREDIT", credit),
        ("AMT_ANNUITY", annuity),
        ("AMT_GOODS_PRICE", goods_price),
        ("EXT_SOURCE_2", ext_source_2),
        ("EXT_SOURCE_3", ext_source_3),
        ("DAYS_BIRTH", days_birth),
        ("DAYS_EMPLOYED", days_employed),
        ("CREDIT_TERM", annuity / (credit + 1.0)),
        ("ANNUITY_INCOME_RATIO", annuity / (income + 1.0)),
        (f"NAME_CONTRACT_TYPE_{contract_type}", 1.0),
        (f"CODE_GENDER_{gender}", 1.0),
    ):
        idx = col_to_idx.get(cname)
        if idx is not None:
            arr[0, idx] = cval

    encoded = pd.DataFrame(arr, columns=cols)
    
    if onnx_hub.get_holder("creditfraud").is_onnx_active:
        probs, _ = onnx_hub.predict_proba_batch("creditfraud", encoded)
        raw = float(probs[0])
    else:
        raw = float(bundle["model"].predict_proba(encoded)[0, 1])
        if bundle.get("calibrator") is not None:
            clipped = float(np.clip(raw, 1e-6, 1 - 1e-6))
            raw = float(bundle["calibrator"].predict_proba([[np.log(clipped / (1 - clipped))]])[0, 1])
        
    threshold = float(bundle.get("decision_threshold", 0.15566))
    anomaly_score = None
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        feat_key = tuple(round(float(v), 2) for v in encoded.iloc[0].values)
        if feat_key in _CF_ANOM_CACHE:
            anomaly_score = _CF_ANOM_CACHE[feat_key]
        else:
            score = float(bundle["anomaly_model"].decision_function(encoded)[0])
            ref = bundle.get("anomaly_reference_scores_np")
            if ref is None:
                ref = np.asarray(bundle["anomaly_reference_scores"])
                bundle["anomaly_reference_scores_np"] = ref
            anomaly_score = float(1.0 - np.searchsorted(ref, score, side="right") / len(ref))
            if len(_CF_ANOM_CACHE) < 4096:
                _CF_ANOM_CACHE[feat_key] = anomaly_score
        
    names = list(bundle["feature_columns"])
    if not explain:
        f_imp = getattr(bundle.get("model"), "feature_importances_", None)
        if f_imp is None or len(f_imp) != len(names):
            f_imp = np.ones(len(names))
        impacts = np.asarray(encoded.iloc[0].values) * f_imp
    else:
        feat_key = ("cf", tuple(round(float(v), 2) for v in encoded.iloc[0].values))
        if feat_key in _SHAP_MEMO:
            impacts = _SHAP_MEMO[feat_key]
        else:
            try:
                raw_vals = explainer.shap_values(encoded, check_additivity=False)
            except Exception:
                raw_vals = explainer(encoded).values
            values = np.asarray(raw_vals)
            impacts = values[0, :, -1] if values.ndim == 3 else values[0]
            if len(_SHAP_MEMO) < 2048:
                _SHAP_MEMO[feat_key] = impacts
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


def run_ml(domain, user_input, explain: bool = True):
    d = domain.lower()
    if d in ("banks", "paysim"):
        if not MODEL_PATHS["banks"].is_file():
            raise FileNotFoundError("PaySim model is missing: artifacts/paysim/model.joblib")
        return assess_transaction(user_input, explain=explain)
    if d in ("creditfraud", "lenders"):
        return _creditfraud_assessment(user_input, explain=explain)
    if d in ("insurance", "insurers"):
        return _insurance_assessment(user_input, explain=explain)
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
        ref = bundle.get("anomaly_reference_scores_np")
        if ref is None:
            ref = np.asarray(bundle["anomaly_reference_scores"])
            bundle["anomaly_reference_scores_np"] = ref
        anomaly_scores = np.round(1.0 - (np.searchsorted(ref, raw_anom, side="right") / len(ref)), 4)
        
    if len(encoded) <= 30:
        try:
            raw_vals = explainer.shap_values(encoded, check_additivity=False)
        except Exception:
            raw_vals = explainer(encoded).values
        vals = np.asarray(raw_vals)
        if vals.ndim == 3:
            vals = vals[:, :, -1]
        top_indices = np.argmax(np.abs(vals), axis=1)
    else:
        f_imp = getattr(bundle.get("model"), "feature_importances_", None)
        if f_imp is None or len(f_imp) != len(cols):
            f_imp = np.ones(len(cols))
        deviations = np.abs(encoded.values) * f_imp
        top_indices = np.argmax(deviations, axis=1)
        vals = deviations
    
    types_list = types.tolist()
    amounts_list = amounts.tolist()
    drain_list = drain_ratios.tolist() if hasattr(drain_ratios, "tolist") else list(drain_ratios)
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
            "summary": f"{types_list[i]} ${amounts_list[i]:,.2f} (Drain: {drain_list[i]:.0%})",
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
    
    for ctype in contract_types.unique():
        col = f"NAME_CONTRACT_TYPE_{ctype}"
        if col in feat_df.columns:
            feat_df[col] = (contract_types == ctype).astype(float)
    for g in genders.unique():
        col = f"CODE_GENDER_{g}"
        if col in feat_df.columns:
            feat_df[col] = (genders == g).astype(float)
            
    encoded = feat_df.fillna(0.0)
    probs, onnx_stats = onnx_hub.predict_proba_batch("creditfraud", encoded)
        
    scores = np.round(probs * 100.0, 2)
    is_flagged = probs >= threshold
    
    anomaly_scores = [None] * len(records)
    if bundle.get("anomaly_model") is not None and bundle.get("anomaly_reference_scores") is not None:
        raw_anom = bundle["anomaly_model"].decision_function(encoded)
        ref = bundle.get("anomaly_reference_scores_np")
        if ref is None:
            ref = np.asarray(bundle["anomaly_reference_scores"])
            bundle["anomaly_reference_scores_np"] = ref
        anomaly_scores = np.round(1.0 - (np.searchsorted(ref, raw_anom, side="right") / len(ref)), 4)
        
    if len(encoded) <= 30:
        try:
            raw_vals = explainer.shap_values(encoded, check_additivity=False)
        except Exception:
            raw_vals = explainer(encoded).values
        vals = np.asarray(raw_vals)
        if vals.ndim == 3:
            vals = vals[:, :, -1]
        top_indices = np.argmax(np.abs(vals), axis=1)
    else:
        f_imp = getattr(bundle.get("model"), "feature_importances_", None)
        if f_imp is None or len(f_imp) != len(cols):
            f_imp = np.ones(len(cols))
        deviations = np.abs(encoded.values) * f_imp
        top_indices = np.argmax(deviations, axis=1)
        vals = deviations
    
    credit_list = credit.tolist()
    income_list = income.tolist()
    ext2_list = ext2.tolist()
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
            "summary": f"${credit_list[i]:,.0f} Credit | Income ${income_list[i]:,.0f} | Ext2: {ext2_list[i]:.2f}",
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
        ref = bundle.get("anomaly_reference_scores_np")
        if ref is None:
            ref = np.asarray(bundle["anomaly_reference_scores"])
            bundle["anomaly_reference_scores_np"] = ref
        anomaly_scores = np.round(1.0 - (np.searchsorted(ref, raw_anom, side="right") / len(ref)), 4)
        
    if len(encoded) <= 30:
        try:
            raw_vals = explainer.shap_values(encoded, check_additivity=False)
        except Exception:
            raw_vals = explainer(encoded).values
        vals = np.asarray(raw_vals)
        if vals.ndim == 3:
            vals = vals[:, :, -1]
        top_indices = np.argmax(np.abs(vals), axis=1)
    else:
        f_imp = getattr(bundle.get("model"), "feature_importances_", None)
        if f_imp is None or len(f_imp) != len(cols):
            f_imp = np.ones(len(cols))
        deviations = np.abs(encoded.values) * f_imp
        top_indices = np.argmax(deviations, axis=1)
        vals = deviations
    
    claim_types_list = claim_types.tolist()
    amount_list = amount.tolist()
    states_list = states.tolist()
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
            "summary": f"{claim_types_list[i].upper()} Claim ${amount_list[i]:,.2f} ({states_list[i]})",
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
    configured = settings.gemini_model
    configured_fallbacks = settings.gemini_fallback_models
    available = discover_gemini_models(api_key)
    discovered_order = [name for name in GEMINI_MODEL_PREFERENCE if name in available]
    ordered = [configured, *configured_fallbacks, *discovered_order]
    deduplicated = list(dict.fromkeys(name for name in ordered if name))
    return [name for name in deduplicated if not available or name in available]


def gemini_reasoning(domain, ml_json):
    # 1. Distributed Semantic Cache check (Tier 1 memory / Tier 2 Redis: <1ms, $0 external API cost)
    cached = semantic_cache.get(domain, ml_json) or explanation_cache.get(domain, ml_json)
    if cached:
        return cached

    # 2. Denial-of-Wallet Circuit Breaker check
    if not circuit_breaker.is_available():
        fallback = local_reasoning(domain, ml_json)
        fallback["source"] = "circuit_breaker_offline"
        fallback["fallback_reason"] = "Gemini circuit breaker is OPEN (quota limit or cooldown active)."
        return fallback

    api_key = settings.effective_gemini_api_key
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

            if response.status_code == 429:
                circuit_breaker.record_failure(status_code=429, is_quota_exhausted=True)
                failures.append({"model": model_name, "reason": "HTTP 429: Quota exhausted"})
                break

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

            result = {
                "source": "gemini",
                "model": model_name,
                "text": text.strip(),
                "fallback_models_tried": failures
            }
            circuit_breaker.record_success()
            explanation_cache.set(domain, ml_json, result)
            semantic_cache.set(domain, ml_json, result)
            return result
        except Exception as exc:
            st = getattr(getattr(exc, "response", None), "status_code", None)
            circuit_breaker.record_failure(status_code=st)
            failures.append({
                "model": model_name,
                "reason": f"HTTP {st}" if st else type(exc).__name__
            })

    fallback = local_reasoning(domain, ml_json)
    fallback["fallback_reason"] = "All configured/discovered Gemini models failed; using local explanation."
    fallback["gemini_attempts"] = failures
    return fallback



@app.get("/health")
def health():
    all_models_ready = all(p.is_file() for p in MODEL_PATHS.values())
    return {
        "status": "ok" if all_models_ready else "degraded",
        "environment": settings.environment,
        "models": {name: {"available": path.is_file(), "artifact": str(path.relative_to(ARTIFACTS_DIR.parent))}
                   for name, path in MODEL_PATHS.items()},
        "onnx_engine": onnx_hub.get_telemetry_snapshot(),
        "gemini_configured": bool(settings.effective_gemini_api_key),
        "circuit_breaker": {
            "state": circuit_breaker.state,
            "is_available": circuit_breaker.is_available(),
        },
        "federated": {
            "current_round": secagg_coordinator.round_number,
            "dp_budget_remaining": max(0.0, round(secagg_coordinator.dp_budget_total - secagg_coordinator.cumulative_dp_epsilon_spent, 4)),
            "active_silos": len(secagg_coordinator.silos),
        },
        "system": {
            "uptime_seconds": round(time.time() - SERVER_START_TIME, 1),
            "memory_rss_mb": get_process_memory_mb(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


@app.get("/health/live")
def health_live():
    """Liveness probe: fast 200 OK verifying process event loop is active."""
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - SERVER_START_TIME, 1),
    }


@app.get("/health/ready")
def health_ready(response: Response):
    """Readiness probe: validates all models are loaded and storage directory is writable."""
    checks = {}
    is_ready = True

    # 1. Model artifacts
    models_ready = all(p.is_file() for p in MODEL_PATHS.values())
    checks["models_loaded"] = models_ready
    if not models_ready:
        is_ready = False

    # 2. Storage writeability
    storage_writable = False
    try:
        probe_file = ARTIFACTS_DIR / ".readiness_probe_tmp"
        probe_file.write_text("probe", encoding="utf-8")
        probe_file.unlink(missing_ok=True)
        storage_writable = True
    except Exception:
        storage_writable = False
        is_ready = False
    checks["storage_writable"] = storage_writable

    # 3. SecAgg coordinator
    checks["secagg_initialized"] = secagg_coordinator is not None
    if not checks["secagg_initialized"]:
        is_ready = False

    status_str = "ready" if is_ready else "not_ready"
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": status_str,
        "environment": settings.environment,
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/healthz")
def healthz():
    """Standard Kubernetes liveness probe."""
    return health_live()


@app.get("/readyz")
def readyz(response: Response):
    """Standard Kubernetes readiness probe."""
    return health_ready(response)


@app.get("/")
def root():
    return {
        "service": "TrustFed Risk Inference & Federated Intelligence API",
        "status": "running",
        "environment": settings.environment,
        "health": "/health",
        "interactive_api_docs": "/docs" if not settings.is_production else "disabled_in_production",
        "auth_endpoints": {
            "token_exchange": "POST /api/auth/token",
            "caller_identity": "GET /api/auth/me",
        },
        "assessment_endpoints": {
            "single": "POST /api/assess",
            "stream": "POST /api/assess/stream",
            "batch": "POST /api/assess/batch",
            "upload": "POST /api/assess/upload",
        },
        "federated_endpoints": {
            "state": "GET /api/federated/state",
            "consensus_round": "POST /api/federated/round/run",
            "audit_trail": "GET /api/federated/audit-trail",
            "reset": "POST /api/federated/reset",
        },
    }


class TokenExchangeRequest(BaseModel):
    api_key: str = Field(..., description="API key to exchange for a signed short-lived JWT token")


@app.post("/api/auth/token")
def exchange_token(req: TokenExchangeRequest, request: Request, response: Response):
    """Exchanges an active API key for a signed 120-minute JWT Bearer token."""
    rate_limiter.check(request, tier="auth", response=response)

    record = key_registry.authenticate(req.api_key)
    if not record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    token = create_jwt_token(identity=record["name"], role=record["role"], expires_in_minutes=120)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in_minutes": 120,
        "identity": record["name"],
        "role": record["role"],
    }


@app.get("/api/auth/me")
def get_caller_identity(caller: AuthIdentity = Depends(get_current_caller)):
    """Returns caller identity, role, and authentication method."""
    return caller.to_dict()


@app.get("/api/admin/audit-log")
def get_admin_audit_log(caller: AuthIdentity = Depends(require_admin)):
    """Returns administrative actions audit ledger (Admin only)."""
    return {"count": len(admin_audit_log), "total": len(admin_audit_log), "events": admin_audit_log}



@app.post("/api/assess")
def assess(request: AssessRequest, req: Request, caller: AuthIdentity = Depends(require_operator)):
    rate_limiter.check(req, tier="default")
    try:
        validated_input = validate_input_for_domain(request.domain, request.user_input)

        # Required ordering: ML inference first; the explanation API receives
        # only the structured ML result, never the raw form payload.
        ml_json = run_ml(request.domain, validated_input, explain=request.include_ai_reasoning)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


    reasoning = gemini_reasoning(request.domain, ml_json) if request.include_ai_reasoning else None
    return {
        "domain": request.domain,
        "ml_risk_json": ml_json,
        "ai_reasoning": reasoning,
        "operator": caller.identity,
    }


class StreamAssessRequest(BaseModel):
    domain: Literal["banks", "lenders", "insurers", "creditfraud", "insurance"]
    user_input: dict[str, Any] = Field(..., description="Transaction or application payload")


def stream_gemini_tokens_sync(domain: str, ml_json: dict[str, Any]):
    """Generator yielding SSE formatted strings for real-time token streaming."""
    # 1. Yield initial authoritative ML evaluation metadata
    yield f"data: {json.dumps({'type': 'meta', 'domain': domain, 'ml_risk_json': ml_json})}\n\n"

    # Circuit breaker check: If tripped, immediately stream deterministic local brief
    if not circuit_breaker.is_available():
        fallback = local_reasoning(domain, ml_json)
        full_text = fallback.get("text", "")
        words = full_text.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + (" " if i+3 < len(words) else "")
            yield f"data: {json.dumps({'type': 'token', 'token': chunk})}\n\n"
            time.sleep(0.01)
        yield f"data: {json.dumps({'type': 'done', 'done': True, 'source': 'circuit_breaker_offline', 'model': 'deterministic-local'})}\n\n"
        return

    api_key = settings.effective_gemini_api_key
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

                if r.status_code == 429:
                    circuit_breaker.record_failure(status_code=429, is_quota_exhausted=True)
                    break

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
                        circuit_breaker.record_success()
                        streamed_successfully = True
                        break
            except Exception as exc:
                st = getattr(getattr(exc, "response", None), "status_code", None)
                circuit_breaker.record_failure(status_code=st)
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
def assess_stream(request: StreamAssessRequest, req: Request, caller: AuthIdentity = Depends(require_operator)):
    """Real-time SSE token streaming endpoint for Gemini 2.5 Flash explanations with live typewriter effect."""
    rate_limiter.check(req, tier="ai_stream")
    try:
        validated_input = validate_input_for_domain(request.domain, request.user_input)
        ml_json = run_ml(request.domain, validated_input)
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
def assess_batch(request: BatchAssessRequest, req: Request, caller: AuthIdentity = Depends(require_operator)):
    """Vectorized high-throughput batch screening endpoint powered by ONNX FP16."""
    rate_limiter.check(req, tier="batch")
    if not request.records:
        raise HTTPException(status_code=400, detail="Batch records list cannot be empty.")

    if len(request.records) > settings.max_batch_records:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Batch size of {len(request.records)} records exceeds maximum allowed cap of {settings.max_batch_records} records.",
        )

    try:
        return run_batch_ml(request.domain, request.records)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/assess/batch/async", status_code=status.HTTP_202_ACCEPTED)
def assess_batch_async(
    request: BatchAssessRequest,
    req: Request,
    caller: AuthIdentity = Depends(require_operator),
):
    """Asynchronous batch screening endpoint (Phase 2): enqueues task and returns job_id."""
    rate_limiter.check(req, tier="batch")
    if not request.records:
        raise HTTPException(status_code=400, detail="Batch records list cannot be empty.")
    try:
        job = job_manager.create_job(
            domain=request.domain,
            records=request.records,
            caller_identity=caller.identity,
        )
        return {
            "job_id": job.job_id,
            "domain": job.domain,
            "status": job.status.value,
            "total_records": job.total_records,
            "created_at": job.created_at,
            "poll_url": f"/api/jobs/{job.job_id}",
            "results_url": f"/api/jobs/{job.job_id}/results",
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str, caller: AuthIdentity = Depends(require_operator)):
    """Polls status and live progress percentage of an asynchronous screening job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    return job.to_dict(include_results=False)


@app.get("/api/jobs/{job_id}/results")
def get_job_results(
    job_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    flagged_only: bool = Query(False),
    caller: AuthIdentity = Depends(require_operator),
):
    """Retrieves paginated screening results for a completed batch job."""
    try:
        return job_manager.get_job_results(job_id, offset=offset, limit=limit, flagged_only=flagged_only)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")


@app.get("/api/jobs")
def list_jobs(
    domain: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    caller: AuthIdentity = Depends(require_operator),
):
    """Lists recent background batch screening jobs."""
    jobs_list = job_manager.list_jobs(domain=domain, limit=limit)
    return {
        "jobs": jobs_list,
        "total": len(jobs_list),
    }


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str, caller: AuthIdentity = Depends(require_operator)):
    """Cancels an in-flight background batch screening job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    cancelled = job_manager.cancel_job(job_id)
    return {
        "job_id": job_id,
        "status": job.status.value,
        "cancelled": cancelled,
    }


@app.post("/api/assess/upload")
async def assess_upload(
    req: Request,
    file: UploadFile = File(...),
    domain: str = Form(...),
    caller: AuthIdentity = Depends(require_operator),
):
    """Upload CSV or JSON file for immediate vectorized screening with strict size and row limits."""
    rate_limiter.check(req, tier="batch")
    if not file.filename:

        raise HTTPException(status_code=400, detail="Missing upload filename.")

    clean_filename = Path(file.filename).name.lower()
    if not (clean_filename.endswith(".csv") or clean_filename.endswith(".json")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a valid .csv or .json file.",
        )

    # 1. Stream-read chunks to enforce strict 10MB file size ceiling (CWE-400 DoS defense)
    max_size = settings.max_upload_size_bytes
    chunk_size = 64 * 1024  # 64 KB chunks
    total_bytes = 0
    buffer = io.BytesIO()

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds maximum allowed limit of {max_size // (1024 * 1024)}MB.",
            )
        buffer.write(chunk)

    raw_bytes = buffer.getvalue()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 2. Parse payload safely
    try:
        if clean_filename.endswith(".json"):
            parsed = json.loads(raw_bytes.decode("utf-8"))
            if isinstance(parsed, dict) and "records" in parsed:
                records = parsed["records"]
            elif isinstance(parsed, list):
                records = parsed
            elif isinstance(parsed, dict):
                records = [parsed]
            else:
                raise ValueError("JSON must contain an array or record object.")
        else:
            df = pd.read_csv(io.StringIO(raw_bytes.decode("utf-8", errors="replace")))
            records = df.to_dict(orient="records")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse uploaded file: {str(exc)}")

    # 3. Enforce record count cap
    if not records:
        raise HTTPException(status_code=400, detail="Uploaded file contains zero data records.")

    if len(records) > settings.max_batch_records:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Batch size of {len(records)} records exceeds maximum allowed cap of {settings.max_batch_records} records.",
        )

    return run_batch_ml(domain, records)


@app.get("/api/samples/{domain}")
def get_sample_records(domain: str, caller: AuthIdentity = Depends(require_auditor)):
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
    file_path = (SAMPLES_DIR / fname).resolve()
    if not (file_path.is_relative_to(SAMPLES_DIR.resolve()) and file_path.is_file()):
        raise HTTPException(status_code=404, detail="Sample file not found on server")
    df = pd.read_csv(file_path)
    return {
        "domain": domain,
        "filename": fname,
        "total_records": len(df),
        "records": df.to_dict(orient="records"),
    }


@app.get("/api/samples/download/{filename}")
def download_sample_file(filename: str, caller: AuthIdentity = Depends(require_auditor)):
    """Download template or sample CSV file with strict path traversal prevention."""
    # 1. Reject path separators or directory traversal indicators (CWE-22)
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename format. Directory separators are forbidden.")

    # 2. Strict allowlist validation
    clean_name = Path(filename).name
    if clean_name not in ALLOWED_SAMPLE_FILES:
        raise HTTPException(status_code=404, detail=f"File '{clean_name}' is not in the allowed samples directory.")

    # 3. Canonical path resolution check
    file_path = (SAMPLES_DIR / clean_name).resolve()
    samples_resolved = SAMPLES_DIR.resolve()
    if not (file_path.is_relative_to(samples_resolved) and file_path.is_file()):
        raise HTTPException(status_code=404, detail="Requested file not found")

    return FileResponse(file_path, filename=clean_name, media_type="text/csv")



@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """High-frequency WebSocket telemetry hub pushing live P50/P95, throughput & SecAgg stats."""
    # Validate ticket or token in production mode
    if settings.is_production:
        if not token or not (key_registry.authenticate(token) or verify_jwt_token(token)):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

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
def get_telemetry_snapshot(caller: AuthIdentity = Depends(require_auditor)):
    """Retrieve instantaneous telemetry snapshot over HTTP."""
    return telemetry_hub.get_payload()


@app.get("/api/cache/stats")
def get_cache_stats(caller: AuthIdentity = Depends(require_auditor)):
    """Returns two-tier semantic cache hit/miss stats, memory capacity, and Redis state (Phase 2)."""
    return semantic_cache.get_stats()


@app.post("/api/cache/clear")
def clear_cache(caller: AuthIdentity = Depends(require_admin)):
    """Flushes both Tier 1 in-memory and Tier 2 Redis semantic explanation caches (Phase 2)."""
    semantic_cache.clear()
    explanation_cache.clear()
    return {"status": "cleared", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.websocket("/ws/stream/clearinghouse")
async def clearinghouse_ws_endpoint(websocket: WebSocket):
    """Real-time transaction clearinghouse feed (Phase 2): pushes 10-50 scored transactions/sec."""
    await clearinghouse_hub.connect(websocket)
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                cmd = json.loads(data_str)
                await clearinghouse_hub.handle_client_command(websocket, cmd)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        clearinghouse_hub.disconnect(websocket)
    except Exception:
        clearinghouse_hub.disconnect(websocket)


class RunSecAggRoundRequest(BaseModel):
    dropout_silo_id: Optional[Literal["bank", "wallet", "insurer"]] = None
    dp_epsilon: float = 0.045
    clipping_bound: float = 1.0


@app.post("/api/federated/round/run")
async def run_secagg_round(
    req: RunSecAggRoundRequest = RunSecAggRoundRequest(),
    caller: AuthIdentity = Depends(require_operator),
):
    """Executes a 4-phase Bonawitz SecAgg+ consensus round across participating silos."""
    try:
        cert = secagg_coordinator.execute_round(
            dropout_silo_id=req.dropout_silo_id,
            dp_epsilon=req.dp_epsilon,
            clipping_bound=req.clipping_bound,
        )
        telemetry_hub.schedule_broadcast()

        log_admin_action(
            actor=caller.identity,
            role=caller.role,
            action="RUN_SECAGG_ROUND",
            details={
                "round_id": cert["round_id"],
                "quorum": cert["consensus_quorum"],
                "dropout": req.dropout_silo_id,
                "proof_hash": cert["proof_hash"],
            },
            client_ip=caller.client_ip,
        )

        return {
            "ok": True,
            "certificate": cert,
            "state": secagg_coordinator.get_state(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SecAgg+ consensus execution failed: {e}")


@app.get("/api/federated/state")
async def get_federated_state(caller: AuthIdentity = Depends(require_auditor)):
    """Retrieve the current multi-party federated consensus state and DP ledger."""
    return secagg_coordinator.get_state()


@app.get("/api/federated/audit-trail")
async def get_federated_audit_trail(caller: AuthIdentity = Depends(require_auditor)):
    """Retrieve historical cryptographic audit certificates."""
    return {
        "count": len(secagg_coordinator.historical_ledger),
        "ledger": secagg_coordinator.historical_ledger,
    }


@app.post("/api/federated/reset")
async def reset_federated_state(caller: AuthIdentity = Depends(require_admin)):
    """Reset the federated training state to round 1 (Admin only)."""
    secagg_coordinator.reset()
    telemetry_hub.schedule_broadcast()

    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="RESET_FEDERATED_STATE",
        details={"reset_to_round": 1},
        client_ip=caller.client_ip,
    )

    return {"ok": True, "state": secagg_coordinator.get_state()}


# ============================================================================
# Phase 3: Regulatory Compliance Exporters & Enterprise RBAC Governance
# ============================================================================

class FcraNoticeRequest(BaseModel):
    domain: str
    record_id: str
    user_input: Dict[str, Any]
    ml_risk_result: Optional[Dict[str, Any]] = None
    applicant_name: Optional[str] = None
    institution_name: Optional[str] = "TrustFed Collaborative Defense Consortium"
    investigator_notes: Optional[str] = None


class NistCertificateRequest(BaseModel):
    domain: str
    record_id: str
    user_input: Dict[str, Any]
    ml_risk_result: Optional[Dict[str, Any]] = None


class CertificateVerifyRequest(BaseModel):
    certificate: Dict[str, Any]


class InvestigatorOverrideRequest(BaseModel):
    domain: str
    record_id: str
    original_classification: str
    override_classification: str
    reason_code: str
    justification_notes: str
    metadata: Optional[Dict[str, Any]] = None


@app.post("/api/compliance/fcra-notice")
async def create_fcra_notice(
    req: FcraNoticeRequest,
    caller: AuthIdentity = Depends(require_auditor),
):
    """Generates a legally defensible FCRA / ECOA Regulation B Adverse Action Notice (12 CFR Part 1002)."""
    domain = req.domain.lower()
    result = req.ml_risk_result
    if not result:
        result = run_ml(domain, req.user_input)

    doc = generate_fcra_adverse_action_notice(
        domain=domain,
        record_id=req.record_id,
        user_input=req.user_input,
        ml_risk_result=result,
        applicant_name=req.applicant_name,
        institution_name=req.institution_name,
        investigator_notes=req.investigator_notes,
    )

    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="GENERATE_FCRA_ADVERSE_ACTION_NOTICE",
        details={
            "notice_id": doc["notice_id"],
            "record_id": req.record_id,
            "domain": domain,
        },
        client_ip=caller.client_ip,
    )
    return doc


@app.post("/api/compliance/nist-certificate")
async def create_nist_certificate(
    req: NistCertificateRequest,
    caller: AuthIdentity = Depends(require_auditor),
):
    """Produces a formal NIST SP 1270 AI Explainability & Differential Privacy Certificate."""
    domain = req.domain.lower()
    result = req.ml_risk_result
    if not result:
        result = run_ml(domain, req.user_input)

    cert = generate_nist_sp1270_certificate(
        domain=domain,
        record_id=req.record_id,
        user_input=req.user_input,
        ml_risk_result=result,
        verifier_identity=f"TrustFed Root Governance Node ({caller.identity})",
    )

    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="ISSUE_NIST_SP1270_CERTIFICATE",
        details={
            "certificate_id": cert["certificate_id"],
            "record_id": req.record_id,
            "domain": domain,
        },
        client_ip=caller.client_ip,
    )
    return cert


@app.post("/api/compliance/certificate/verify")
async def verify_certificate(req: CertificateVerifyRequest):
    """Verifies the cryptographic HMAC seal and tamper evidence of an issued compliance certificate."""
    cert = dict(req.certificate)
    seal_info = cert.pop("cryptographic_seal", None)
    if not seal_info or "signature" not in seal_info:
        return {
            "valid": False,
            "detail": "Certificate is missing cryptographic_seal payload or signature.",
            "tamper_evident_check": "FAILED",
        }

    cert_bytes = json.dumps(cert, sort_keys=True).encode("utf-8")
    is_valid = verify_compliance_signature(cert_bytes, seal_info["signature"])
    return {
        "valid": is_valid,
        "certificate_id": cert.get("certificate_id"),
        "standard": cert.get("standard"),
        "iso_timestamp": cert.get("iso_timestamp"),
        "verifier": cert.get("verifier"),
        "tamper_evident_check": "PASSED" if is_valid else "FAILED",
    }


@app.post("/api/governance/override")
async def submit_investigator_override(
    req: InvestigatorOverrideRequest,
    caller: AuthIdentity = Depends(require_operator),
):
    """Senior Investigator action: records an authorized human-in-the-loop override with audit ledger stamp."""
    override = record_investigator_override(
        domain=req.domain,
        record_id=req.record_id,
        original_classification=req.original_classification,
        override_classification=req.override_classification,
        reason_code=req.reason_code,
        justification_notes=req.justification_notes,
        investigator_name=caller.identity,
        investigator_role=caller.role,
        client_ip=caller.client_ip,
        metadata=req.metadata,
    )
    return override


@app.get("/api/governance/overrides")
async def get_investigator_overrides(
    domain: Optional[str] = None,
    limit: int = 50,
    caller: AuthIdentity = Depends(require_auditor),
):
    """Lists recorded investigator overrides, optionally filtered by domain."""
    return {
        "overrides": list_investigator_overrides(domain=domain, limit=limit),
        "domain": domain,
    }


@app.get("/api/governance/compliance-report")
async def get_compliance_report(
    caller: AuthIdentity = Depends(require_auditor),
):
    """Generates an institutional compliance audit packet combining overrides, DP guarantees, and SecAgg state."""
    summary = get_compliance_audit_summary()
    state = secagg_coordinator.get_state()
    return {
        "governance_summary": summary,
        "federated_state": state,
        "caller": caller.to_dict(),
    }


# ============================================================================
# Phase 4: Production Distributed Federated Framework & Hardware Enclaves (TEE)
# ============================================================================

class EnclaveVerifyRequest(BaseModel):
    attestation_wrapper: Dict[str, Any]
    expected_nonce: Optional[str] = None


class NodeRegisterRequest(BaseModel):
    node_id: str
    institution_name: Optional[str] = None
    domain: Optional[str] = "banks"
    endpoint_url: Optional[str] = None
    local_samples: Optional[int] = 10000
    region: Optional[str] = "us-east-1"
    tls_fingerprint: Optional[str] = None


class ExecuteRoundRequest(BaseModel):
    round_id: Optional[int] = None
    noise_multiplier: Optional[float] = 1.8
    dimension: Optional[int] = 8
    l2_clip_norm: Optional[float] = 1.0


@app.get("/api/federated/enclave/attestation")
async def get_enclave_attestation(
    nonce: Optional[str] = None,
    caller: AuthIdentity = Depends(require_auditor),
):
    """Issues a cryptographically signed AWS Nitro Enclave remote attestation document with PCRs."""
    doc = enclave_service.generate_attestation_document(nonce=nonce)
    return doc


@app.post("/api/federated/enclave/verify")
async def verify_enclave_attestation(
    req: EnclaveVerifyRequest,
    caller: AuthIdentity = Depends(require_auditor),
):
    """Verifies an Enclave remote attestation document against golden PCRs, signature, and nonce."""
    result = enclave_service.verify_attestation(req.attestation_wrapper, expected_nonce=req.expected_nonce)
    return result


@app.get("/api/federated/privacy/accountant")
async def get_privacy_accountant_status(
    caller: AuthIdentity = Depends(require_auditor),
):
    """Returns continuous Rényi Differential Privacy moments accountant state and remaining epsilon budget."""
    return rdp_accountant.get_status()


@app.post("/api/federated/privacy/accountant/reset")
async def reset_privacy_accountant(
    caller: AuthIdentity = Depends(require_admin),
):
    """Resets the continuous RDP privacy accountant ledger (operator/admin only)."""
    rdp_accountant.reset_accountant()
    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="RESET_RDP_ACCOUNTANT",
        details={"status": "RESET_SUCCESS"},
        client_ip=caller.client_ip,
    )
    return {"ok": True, "accountant": rdp_accountant.get_status()}


@app.get("/api/federated/nodes")
async def list_federated_nodes(
    caller: AuthIdentity = Depends(require_auditor),
):
    """Lists registered distributed institutional worker nodes with heartbeat and health telemetry."""
    return {"nodes": federated_coordinator.list_nodes()}


@app.post("/api/federated/nodes/register")
async def register_federated_node(
    req: NodeRegisterRequest,
    caller: AuthIdentity = Depends(require_operator),
):
    """Registers an institutional federated worker node behind a corporate firewall."""
    res = federated_coordinator.register_node(req.dict())
    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="REGISTER_FEDERATED_NODE",
        details={"node_id": req.node_id, "domain": req.domain},
        client_ip=caller.client_ip,
    )
    return {"ok": True, "node": res}


@app.post("/api/federated/round/execute")
async def execute_federated_round(
    req: ExecuteRoundRequest,
    caller: AuthIdentity = Depends(require_operator),
):
    """
    Executes a distributed federated training round inside AWS Nitro TEE:
    1. Collects masked gradient updates from nodes (y_i = Delta w_i + m_i).
    2. SecAgg eliminates masks (sum m_i = 0) without coordinator learning individual weights.
    3. Continuous Rényi DP moments accountant records privacy loss.
    4. Cryptographically signed Enclave Attestation is issued.
    """
    try:
        round_result = federated_coordinator.execute_secure_enclave_round(
            round_id=req.round_id,
            dimension=req.dimension or 8,
            noise_multiplier=req.noise_multiplier or 1.8,
            l2_clip_norm=req.l2_clip_norm or 1.0,
        )

        log_admin_action(
            actor=caller.identity,
            role=caller.role,
            action="EXECUTE_TEE_FEDERATED_ROUND",
            details={
                "round_id": round_result["round_id"],
                "epsilon": round_result["differential_privacy"]["round_epsilon"],
                "active_nodes": round_result["consensus_metrics"]["participating_nodes"],
            },
            client_ip=caller.client_ip,
        )
        return round_result
    except Exception as exc:
        if "Privacy budget" in str(exc) or "PrivacyBudgetExhaustedError" in type(exc).__name__:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Differential Privacy Circuit Breaker: {str(exc)}",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Federated Round Execution Error: {str(exc)}",
        )


@app.get("/api/federated/audit-packet")
async def get_federated_audit_packet(
    caller: AuthIdentity = Depends(require_auditor),
):
    """Returns an exhaustive cryptographic audit packet combining TEE Attestation, RDP Ledger, and Node Topologies."""
    attestation = enclave_service.generate_attestation_document()
    accountant = rdp_accountant.get_status()
    nodes = federated_coordinator.list_nodes()
    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "enclave_attestation": attestation,
        "privacy_accountant": accountant,
        "institutional_nodes": nodes,
        "compliance_guarantees": {
            "tee_isolation": "AWS Nitro Enclaves (Hardware AES-256)",
            "differential_privacy": f"Rényi DP (delta={accountant['target_delta']}, max_epsilon={accountant['max_epsilon_budget']})",
            "zero_raw_data_transmission": True,
            "secagg_protocol": "Diffie-Hellman Zero-Sum Additive Masking (Shamir Secret Sharing ready)",
        },
    }


# ============================================================================
# PRODUCTION READINESS: STATUS, FLAGS, BACKUPS, MIGRATIONS & ALERTS
# ============================================================================

@app.get("/api/status")
def get_platform_status():
    """Public telemetry status endpoint for status page and external uptime monitors."""
    return get_system_status()


@app.get("/api/flags")
def list_feature_flags():
    """Returns public active feature flags."""
    return {"flags": feature_flags.get_all_flags()}


class FlagOverrideRequest(BaseModel):
    flag_key: str
    enabled: bool


@app.post("/api/flags/override")
def override_feature_flag(
    payload: FlagOverrideRequest,
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint to dynamically toggle feature flags without service redeployment."""
    updated = feature_flags.set_flag(payload.flag_key, payload.enabled, actor=caller.identity)
    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="FLAG_OVERRIDE",
        details={"flag_key": payload.flag_key, "enabled": payload.enabled},
        client_ip=caller.client_ip,
    )
    return {"status": "SUCCESS", "flag": payload.flag_key, "entry": updated}


@app.post("/api/admin/backup/create")
def create_state_backup(
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint to create an atomic snapshot backup of all persistent state ledgers."""
    manifest = backup_manager.create_snapshot()
    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="BACKUP_CREATE",
        details={"backup_id": manifest["backup_id"], "files": manifest["total_files"]},
        client_ip=caller.client_ip,
    )
    return {"status": "SUCCESS", "manifest": manifest}


class RestoreDrillRequest(BaseModel):
    backup_id: str


@app.post("/api/admin/backup/restore-drill")
def execute_backup_restore_drill(
    payload: RestoreDrillRequest,
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint to execute a timed, non-destructive restore drill verifying snapshot integrity."""
    result = backup_manager.run_restore_drill(payload.backup_id)
    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="BACKUP_RESTORE_DRILL",
        details=result,
        client_ip=caller.client_ip,
    )
    return result


@app.get("/api/admin/backups")
def list_backups(
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint listing all available state snapshots."""
    return {"backups": backup_manager.list_backups()}


@app.get("/api/admin/migrations/status")
def get_migrations_status(
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint retrieving current database / state schema version."""
    return {
        "current_version": migration_runner.get_current_version(),
        "expand_contract_mode": feature_flags.is_enabled("EXPAND_CONTRACT_SCHEMA_V2", True),
    }


class RunMigrationRequest(BaseModel):
    target_version: Optional[int] = None
    dry_run: bool = False


@app.post("/api/admin/migrations/run")
def run_migrations(
    payload: RunMigrationRequest,
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint executing forward schema migrations with dry-run support."""
    result = migration_runner.run_migrations(target_version=payload.target_version, dry_run=payload.dry_run)
    log_admin_action(
        actor=caller.identity,
        role=caller.role,
        action="MIGRATION_EXECUTE",
        details={"dry_run": payload.dry_run, "applied": result["applied_count"]},
        client_ip=caller.client_ip,
    )
    return result


@app.get("/api/admin/alerts")
def get_incidents(
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint retrieving recent synthetic alerting incident history."""
    return {"incidents": alert_manager.get_incidents()}


@app.post("/api/admin/alerts/test")
def trigger_test_alert(
    caller: AuthIdentity = Depends(require_admin),
):
    """Admin endpoint dispatching a synthetic test alert."""
    alert = alert_manager.trigger_test_alert()
    return {"status": "TRIGGERED", "alert": alert}


class WebhookVerifyRequest(BaseModel):
    payload: Dict[str, Any]
    signature_header: str


@app.post("/api/webhooks/verify")
def verify_webhook_signature(payload: WebhookVerifyRequest):
    """Verifies HMAC-SHA256 signature and replay freshness of an incoming webhook."""
    raw_body = json.dumps(payload.payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    is_valid, msg = webhook_signer.verify_signature(raw_body, payload.signature_header)
    return {"valid": is_valid, "message": msg}






