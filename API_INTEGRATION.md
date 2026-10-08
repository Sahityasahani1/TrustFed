# 📡 TrustFed Risk API Integration Guide

## 1. Flow Overview

TrustFed exposes high-performance risk inference endpoints for Banks (PaySim transactions), Lenders (Home Credit default risk), and Insurers (SIU claims fraud). 

The platform supports two evaluation patterns:
1. **Single-Record Evaluation (`POST /api/assess`):** Runs the saved domain ML model, computes SHAP statistical drivers, and invokes Google Gemini (or local rule fallback) to return a plain-English, regulatory-compliant audit narrative.
2. **High-Throughput Batch Screening (`POST /api/assess/batch` & `POST /api/assess/upload`):** Vectorized Pandas/XGBoost evaluation screening hundreds of records in milliseconds. Does not invoke LLM during bulk scoring to ensure sub-second throughput.

```text
Pattern 1 (Single): UI Form  -> POST /api/assess        -> Domain Model -> SHAP -> Gemini LLM -> Audit Brief
Pattern 2 (Batch):  CSV/JSON -> POST /api/assess/batch  -> Vectorized ML -> Bulk Risk Scores & KPIs (Sub-second)
```

---

## 2. Local Setup & Quickstart

### Dependencies
Install dependencies in your Python virtual environment:
```powershell
pip install -r requirements.txt
```

### Environment Variables
Configure `.env` in the project root or `backend/`:
```env
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
FRONTEND_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### Start Backend
```powershell
# From the project root or backend folder:
uvicorn risk_api:app --host 0.0.0.0 --port 8000 --reload
```
Check health at: `http://localhost:8000/health`  
Interactive OpenAPI documentation at: `http://localhost:8000/docs`

---

## 3. Single-Record Assessment (`POST /api/assess`)

### Tab 1: Banks (PaySim Transactions)
```json
POST /api/assess
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

### Tab 2: Lenders (Home Credit Default Risk)
```json
POST /api/assess
{
  "domain": "lenders",
  "user_input": {
    "amt_income_total": 270000.0,
    "amt_credit": 1031053.5,
    "amt_annuity": 34204.5,
    "amt_goods_price": 927948.15,
    "ext_source_2": 0.55,
    "ext_source_3": 0.45,
    "days_birth": -14500,
    "days_employed": -2500,
    "contract_type": "Cash loans",
    "code_gender": "M"
  },
  "include_ai_reasoning": true
}
```

### Tab 3: Insurers (SIU Claims Fraud)
```json
POST /api/assess
{
  "domain": "insurers",
  "user_input": {
    "claim_type": "home",
    "state": "CA",
    "policyholder_tenure_years": 15.4,
    "previous_claims_count": 1,
    "incident_date": "2025-07-21",
    "claim_filed_date": "2025-07-29",
    "claim_amount": 34424.99,
    "deductible": 2500.0
  },
  "include_ai_reasoning": true
}
```

### Single Response Structure
```json
{
  "domain": "banks",
  "ml_risk_json": {
    "transaction_id": "TX-PAYSIM-5421",
    "model": { "name": "PaySim Transaction Risk Model", "artifact": "artifacts/paysim/model.joblib" },
    "risk": {
      "fraud_probability": 0.7993,
      "risk_score": 79.93,
      "decision_threshold": 0.40,
      "classification": "fraud",
      "anomaly_score": 0.9963
    },
    "risk_factors": [
      { "feature": "drain_ratio", "impact_log_odds": 0.182, "direction": "increases_risk" },
      { "feature": "type_CASH_OUT", "impact_log_odds": 0.161, "direction": "increases_risk" }
    ],
    "interpretation": "Evaluated under Differential Privacy (ε=2.45)."
  },
  "ai_reasoning": {
    "source": "gemini",
    "model": "gemini-2.5-flash",
    "text": "**Assessment Summary**:\nFlagged for Human Review..."
  }
}
```

---

## 4. Batch Screening Endpoints (Phase 1 Deliverables)

### 1. Vectorized Batch Scoring (`POST /api/assess/batch`)
Screen an array of transactions/applications/claims in a single call.

```json
POST /api/assess/batch
{
  "domain": "banks",
  "records": [
    { "transaction_id": "TX-01", "step": 142, "type": "PAYMENT", "amount": 120.5, "oldbalanceOrg": 4500.0, "oldbalanceDest": 0.0 },
    { "transaction_id": "TX-02", "step": 147, "type": "TRANSFER", "amount": 185000.0, "oldbalanceOrg": 185000.0, "oldbalanceDest": 0.0 }
  ]
}
```

**Batch Response Format:**
```json
{
  "domain": "banks",
  "batch_summary": {
    "total_records": 40,
    "flagged_count": 4,
    "cleared_count": 36,
    "fraud_rate": 0.10,
    "mean_risk_score": 10.73,
    "p95_risk_score": 81.96,
    "decision_threshold": 0.40,
    "processing_time_ms": 50.1
  },
  "records": [
    {
      "row_index": 0,
      "record_id": "TX-01",
      "fraud_probability": 0.0,
      "risk_score": 0.0,
      "decision_threshold": 0.40,
      "classification": "safe",
      "anomaly_score": 0.074,
      "top_factor": { "feature": "type_PAYMENT", "impact_log_odds": -0.21, "direction": "decreases_risk" },
      "summary": "PAYMENT $120.50 (Drain: 3%)",
      "raw_record": { ... }
    }
  ]
}
```

### 2. File Upload Ingestion (`POST /api/assess/upload`)
Allows direct upload of `.csv` or `.json` files via multipart form-data.
* **Form Fields:** `file` (file stream), `domain` (`banks` | `lenders` | `insurers`).
* Returns the identical batch summary response.

### 3. Preloaded Demo Samples & Templates
* **`GET /api/samples/{domain}`**: Returns demo records for `banks`, `lenders`, or `insurers` as JSON for instant 1-click UI screening.
* **`GET /api/samples/download/{filename}`**: Downloads sample or template files (e.g. `template_banks.csv`, `sample_banks_batch.csv`).

---

## 5. Client Integration Example (`risk_api_client.js`)

```javascript
import { assessRisk, checkBackendHealth } from './risk_api_client';

// Single Assessment with AI Reasoning
const result = await assessRisk("banks", {
  step: 295,
  type: "CASH_OUT",
  amount: 172344.30,
  oldbalanceOrg: 172344.30,
  oldbalanceDest: 0.0
});

console.log("Risk Score:", result.ml_risk_json.risk.risk_score);
console.log("Gemini Audit Brief:", result.ai_reasoning.text);

// Batch Assessment
const batchRes = await fetch("http://localhost:8000/api/assess/batch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ domain: "banks", records: transactionList })
});
const batchData = await batchRes.json();
console.log(`Screened ${batchData.batch_summary.total_records} rows in ${batchData.batch_summary.processing_time_ms}ms`);
```
