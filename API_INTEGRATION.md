# 📡 TrustFed Unified Risk API & Integration Specification

> **Version:** 2.0.0 (Production Master)  
> **Base URL:** `http://localhost:8000` (or `https://api.trustfed.internal`)  
> **Protocols:** HTTP/1.1, HTTP/2, WebSockets (`/ws/stream/clearinghouse`)  
> **Interactive OpenAPI Docs:** `http://localhost:8000/docs`

---

## 📌 Table of Contents
1. [Authentication & Authorization (RBAC)](#1-authentication--authorization-rbac)
2. [Health, Liveness & Platform Status Probes](#2-health-liveness--platform-status-probes)
3. [Single-Record Risk Assessment (`POST /api/assess`)](#3-single-record-risk-assessment-post-apiassess)
4. [High-Throughput Vectorized Batch Screening](#4-high-throughput-vectorized-batch-screening)
5. [Asynchronous Batch Jobs & Worker Pool](#5-asynchronous-batch-jobs--worker-pool)
6. [Real-Time Clearinghouse Live Stream (`WebSocket`)](#6-real-time-clearinghouse-live-stream-websocket)
7. [Regulatory Compliance & Adverse Action Notices](#7-regulatory-compliance--adverse-action-notices)
8. [Senior Investigator Human-in-the-Loop Overrides](#8-senior-investigator-human-in-the-loop-overrides)
9. [Hardware Enclaves (TEE) & Federated Computing](#9-hardware-enclaves-tee--federated-computing)
10. [Feature Flags Management](#10-feature-flags-management)
11. [Administrative Disaster Recovery & Migrations](#11-administrative-disaster-recovery--migrations)
12. [Third-Party Institutional Webhook Verification](#12-third-party-institutional-webhook-verification)
13. [Client SDK Integration (`risk_api_client.js`)](#13-client-sdk-integration-risk_api_clientjs)

---

## 1. Authentication & Authorization (RBAC)

TrustFed enforces a 4-tier Role-Based Access Control (RBAC) architecture. All API requests (except public telemetry and health probes) must authenticate via **API Key** or **JWT Bearer Token**.

### RBAC Roles:
- **`admin`**: Full access to all endpoints, disaster recovery drills, feature flag overrides, and migrations.
- **`operator`**: Inference evaluation, batch screening, asynchronous jobs, and streaming feeds.
- **`auditor`**: Read-only compliance ledgers, NIST SP 1270 certificates, and override logs.
- **`public`**: Health probes (`/healthz`, `/readyz`, `/health`) and platform telemetry (`/api/status`).

### 1.1 Authenticate via API Key Header
Include the `X-API-Key` header on all protected requests:
```http
X-API-Key: tf_dev_operator_key_01
```

### 1.2 Exchange API Key for a JWT Bearer Token (`POST /api/auth/token`)
```http
POST /api/auth/token
Content-Type: application/json

{
  "api_key": "tf_dev_operator_key_01"
}
```
**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "role": "operator",
  "identity": "dev-operator"
}
```

---

## 2. Health, Liveness & Platform Status Probes

### 2.1 Kubernetes Liveness Probe (`GET /healthz`)
Verifies that the API container process is alive. Returns `200 OK` in $<5\text{ms}$.
```json
{
  "status": "alive",
  "timestamp": "2026-11-21T04:20:00Z"
}
```

### 2.2 Kubernetes Readiness Probe (`GET /readyz`)
Verifies that model artifacts, database state, and feature flag stores are reachable.
```json
{
  "status": "ready",
  "database": "connected",
  "artifacts_loaded": 5
}
```

### 2.3 Deep Health Diagnostics (`GET /health`)
```json
{
  "status": "ok",
  "models": {
    "paysim": "loaded",
    "creditfraud": "loaded",
    "insurance": "loaded",
    "anomaly": "loaded"
  },
  "onnx_engine": "active",
  "gemini_api": "configured",
  "system_memory_mb": 434.93
}
```

### 2.4 Public Platform Telemetry & SLA Status (`GET /api/status`)
```json
{
  "status": "ALL_SYSTEMS_OPERATIONAL",
  "uptime_pct": 99.98,
  "system_time": "2026-11-21T04:20:00Z",
  "subsystems": {
    "gateway_api": "healthy",
    "paysim_model": "healthy",
    "credit_model": "healthy",
    "insurance_model": "healthy",
    "gemini_reasoning": "healthy",
    "hardware_enclaves": "healthy"
  },
  "recent_incidents": []
}
```

---

## 3. Single-Record Risk Assessment (`POST /api/assess`)

Evaluates a single transaction, loan application, or insurance claim. Runs the authoritative machine learning model, computes top SHAP drivers, and conditionally generates Google Gemini regulatory audit briefs.

### 3.1 Banks & Mobile Wallets (`banks`)
```http
POST /api/assess
Content-Type: application/json
X-API-Key: tf_dev_operator_key_01

{
  "domain": "banks",
  "user_input": {
    "step": 295,
    "type": "CASH_OUT",
    "amount": 172344.30,
    "oldbalanceOrg": 172344.30,
    "oldbalanceDest": 0.0
  },
  "include_ai_reasoning": true
}
```

### 3.2 Digital Lenders & Credit Default Risk (`lenders`)
```http
POST /api/assess
Content-Type: application/json
X-API-Key: tf_dev_operator_key_01

{
  "domain": "lenders",
  "user_input": {
    "amt_income_total": 65000.0,
    "amt_credit": 250000.0,
    "amt_annuity": 12500.0,
    "amt_goods_price": 225000.0,
    "ext_source_2": 0.35,
    "ext_source_3": 0.28,
    "days_birth": -14500,
    "days_employed": -2500,
    "name_contract_type": "Cash loans",
    "code_gender": "M"
  },
  "include_ai_reasoning": false
}
```

### 3.3 Insurance Claims SIU (`insurers`)
```http
POST /api/assess
Content-Type: application/json
X-API-Key: tf_dev_operator_key_01

{
  "domain": "insurers",
  "user_input": {
    "claim_type": "auto",
    "state": "CA",
    "policyholder_tenure_years": 1.2,
    "previous_claims_count": 2,
    "claim_amount": 45000.0,
    "deductible": 500.0,
    "filing_delay_days": 1
  },
  "include_ai_reasoning": true
}
```

### 3.4 Single Assessment Response Format
```json
{
  "domain": "banks",
  "ml_risk_json": {
    "transaction_id": "TX-PAY-0001",
    "model": { "name": "PaySim Transaction Risk Model", "artifact": "artifacts/paysim/model.joblib" },
    "risk": {
      "fraud_probability": 0.8267,
      "risk_score": 82.67,
      "decision_threshold": 0.40,
      "classification": "fraud",
      "anomaly_score": 0.9842
    },
    "risk_factors": [
      { "feature": "drain_ratio", "impact_log_odds": 0.245, "direction": "increases_risk" },
      { "feature": "type_CASH_OUT", "impact_log_odds": 0.182, "direction": "increases_risk" }
    ],
    "interpretation": "Fraud means the score met the model threshold under Differential Privacy."
  },
  "ai_reasoning": {
    "source": "gemini",
    "model": "gemini-2.5-flash",
    "text": "**Executive Summary**: Flagged for immediate containment due to 100% liquidity drain..."
  },
  "operator": "dev-operator"
}
```

---

## 4. High-Throughput Vectorized Batch Screening

Screens hundreds of records in bulk with sub-second execution (**3,369 rec/s throughput**) without invoking LLM during bulk scoring.

### 4.1 JSON Batch Scoring (`POST /api/assess/batch`)
```http
POST /api/assess/batch?domain=banks
Content-Type: application/json
X-API-Key: tf_dev_operator_key_01

{
  "domain": "banks",
  "records": [
    { "transaction_id": "TX-01", "step": 142, "type": "PAYMENT", "amount": 120.5, "oldbalanceOrg": 4500.0, "oldbalanceDest": 0.0 },
    { "transaction_id": "TX-02", "step": 147, "type": "TRANSFER", "amount": 185000.0, "oldbalanceOrg": 185000.0, "oldbalanceDest": 0.0 }
  ]
}
```

### 4.2 Multipart File Upload (`POST /api/assess/upload`)
Accepts direct `.csv` or `.json` file streams (up to 50MB):
- **Form Data:** `file` (binary stream), `domain` (`banks` | `lenders` | `insurers`).

### 4.3 Preloaded Demo Samples & Templates
- `GET /api/samples/{domain}`: Retrieves verified demo batches (40 PaySim TXs, 20 Home Credit loans, 20 insurance claims).
- `GET /api/samples/download/{filename}`: Downloads blank CSV templates (e.g. `template_banks.csv`).

---

## 5. Asynchronous Batch Jobs & Worker Pool

For large batch files ($>500$ records), submit tasks asynchronously to the background worker pool:

- **Submit Async Job:** `POST /api/assess/batch/async` $\rightarrow$ Returns HTTP `202 Accepted` with `job_id`.
- **Poll Job Status:** `GET /api/jobs/{job_id}` $\rightarrow$ Returns execution progress (0–100%), status (`queued`, `processing`, `completed`, `cancelled`), and elapsed time.
- **Fetch Job Results:** `GET /api/jobs/{job_id}/results?page=1&limit=50&status=flagged` $\rightarrow$ Paginated record retrieval.
- **Cancel Active Job:** `POST /api/jobs/{job_id}/cancel`.
- **List Recent Jobs:** `GET /api/jobs`.

---

## 6. Real-Time Clearinghouse Live Stream (`WebSocket`)

Connect to the live high-frequency transaction feed:
```text
ws://localhost:8000/ws/stream/clearinghouse
```
- **Broadcasting Rate:** 10–50 TPS with ONNX FP16 sub-2ms scoring.
- **Adversarial Injection:** `POST /api/stream/inject-anomaly` injects synthetic flash-drain attack patterns into the live feed.

---

## 7. Regulatory Compliance & Adverse Action Notices

### 7.1 Generate FCRA § 615(a) Adverse Action Notice (`POST /api/compliance/fcra-notice`)
```http
POST /api/compliance/fcra-notice
Content-Type: application/json
X-API-Key: tf_dev_operator_key_01

{
  "applicant_id": "APP-LN-307511",
  "domain": "lenders",
  "risk_score": 88.5,
  "top_factors": [
    { "feature": "EXT_SOURCE_2", "impact_log_odds": 0.42 },
    { "feature": "CREDIT_TERM", "impact_log_odds": 0.28 }
  ]
}
```
**Response includes:** Statutory reason codes (`C-201`, `C-204`), 60-day dispute disclosure, CRA contact details, and HMAC-SHA256 seal.

### 7.2 Generate NIST SP 1270 Explainability Certificate (`POST /api/compliance/nist-certificate`)
Generates cryptographic audit certificate with TreeSHAP local fidelity metrics ($R^2 \ge 0.94$), zero-raw-data transmission certification, and continuous DP budget proofs.

### 7.3 Verify Certificate Seal (`POST /api/compliance/certificate/verify`)
Verifies cryptographic digital seal against payload tampering.

---

## 8. Senior Investigator Human-in-the-Loop Overrides

- **Submit Override:** `POST /api/governance/override`
  - Body: `record_id`, `domain`, `original_classification`, `override_decision` (`approve` | `quarantine` | `reject`), `reason_code` (`OVR-01` to `OVR-05`), `investigator_notes`.
- **Retrieve Override Ledger:** `GET /api/governance/overrides` (Audit role required).
- **Consolidated Governance Report:** `GET /api/governance/compliance-report`.

---

## 9. Hardware Enclaves (TEE) & Federated Computing

- **Retrieve Enclave Attestation:** `GET /api/federated/enclave/attestation?nonce=...`
  - Returns AWS Nitro / Intel SGX attestation document with PCR0 (enclave image), PCR1 (kernel), PCR2 (app), public key, and signature.
- **Verify Enclave Measurement:** `POST /api/federated/enclave/verify`
  - Validates PCR measurement match and cryptographic digital seal.
- **Continuous Rényi DP Accountant:** `GET /api/federated/privacy/accountant`
  - Reports cumulative $\epsilon$ budget across numerical orders $\alpha \in [1.25, 64.0]$.
- **Execute Distributed Federated Round:** `POST /api/federated/round/execute`
  - Orchestrates TEE SecAgg round with institutional nodes (`Bank Alpha`, `Lender Beta`, `Insurer Gamma`).
- **Cryptographic Audit Packet:** `GET /api/federated/audit-packet`.

---

## 10. Feature Flags Management

- **List Active Flags:** `GET /api/flags`
  - Returns flags: `STREAMING_ENABLED`, `HARDWARE_ENCLAVES_ENABLED`, `GEMINI_REASONING_ENABLED`, `RATE_LIMITING_STRICT`, `EXPAND_CONTRACT_SCHEMA_V2`.
- **Runtime Flag Override:** `POST /api/flags/override` (Admin only)
  - Instantly toggles subsystem kill-switches without server restart.

---

## 11. Administrative Disaster Recovery & Migrations

- **Create Backup Snapshot:** `POST /api/admin/backup/create` (Admin only).
- **Run Non-Destructive Restore Drill:** `POST /api/admin/backup/restore_drill` (Admin only).
- **Dry-Run Schema Migrations:** `POST /api/admin/migrations/dry_run` (Admin only).
- **Inspect Synthetic Alerts:** `GET /api/admin/alerts/recent` (Admin only).
- **Trigger Test Alert Drill:** `POST /api/admin/alerts/test` (Admin only).

---

## 12. Third-Party Institutional Webhook Verification

Validates incoming institutional event payloads against HMAC-SHA256 signatures and timestamp drift:
```http
POST /api/webhooks/verify
Content-Type: application/json
X-Signature: sha256=abcdef123456...
X-Timestamp: 1774182000

{
  "event": "transaction_settled",
  "amount": 50000.0,
  "institution_id": "BANK_ALPHA"
}
```

---

## 13. Client SDK Integration (`risk_api_client.js`)

```javascript
import {
  assessRisk,
  assessBatchRisk,
  checkBackendHealth,
  fetchPlatformStatus,
  fetchFeatureFlags,
  createStateBackup,
  runRestoreDrill
} from './risk_api_client';

// 1. Single Risk Assessment with Gemini Reasoning
const result = await assessRisk("banks", {
  step: 100,
  type: "TRANSFER",
  amount: 80000.0,
  oldbalanceOrg: 80000.0,
  oldbalanceDest: 0.0
}, true);
console.log("Risk Score:", result.ml_risk_json.risk.risk_score);
console.log("AI Brief:", result.ai_reasoning.text);

// 2. High-Throughput Batch Screening
const batch = await assessBatchRisk("banks", transactionsList);
console.log(`Processed ${batch.batch_summary.total_records} rows in ${batch.batch_summary.processing_time_ms}ms`);

// 3. Platform Health & Uptime
const status = await fetchPlatformStatus();
console.log("Uptime:", status.uptime_pct, "Status:", status.status);
```