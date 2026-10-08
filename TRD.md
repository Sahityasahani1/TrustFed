# 📋 Technical Requirements Document (TRD)
## TrustFed — Privacy-Preserving Federated Fraud Intelligence & Compliance Platform

---

| **Document Metadata** | **Specification** |
| :--- | :--- |
| **Document Version** | 1.1.0 |
| **Project Code** | `TRUSTFED-CORE` |
| **Target Audience** | Engineering, MLOps, Security, Data Protection Officers (DPO), Fraud Operations |
| **Status** | Phase 1 Part 1 Completed — Part 2 In Progress |
| **Classification** | Enterprise Confidential / Technical Specification |

---

## 1. Executive Summary & System Objectives

### 1.1 Problem Statement
Modern financial crime networks exploit institutional silos across commercial banks, digital lenders, and insurance carriers. While fraudsters coordinate cross-institutional attacks (e.g. rapid fund siphoning, synthetic identity loan stacking, and cross-carrier claim inflation), institutions cannot pool raw customer records due to strict data privacy regulations (**GDPR**, **DPDP**, **GLBA**, **FCRA**). Isolated institutions suffer from high false-negative rates and fragmented intelligence.

### 1.2 System Vision
**TrustFed** is an enterprise-grade federated fraud intelligence architecture that enables financial institutions to train and evaluate shared machine learning models collaboratively **without ever pooling or transmitting raw customer records**. 

### 1.3 Dual-AI Technical Architecture
The platform establishes a strict separation of concerns between two distinct AI tiers:
1. **Authoritative Predictive Layer (Federated ML):** Gradient Boosted Decision Trees (GBDT / XGBoost) trained locally across client silos with Diffie-Hellman pairwise masking (**SecAgg+**) and calibrated mathematical noise (**Rényi Differential Privacy**, $\epsilon=2.45$, $\delta=10^{-5}$).
2. **Contextual Explainability & Governance Layer (Generative AI):** An enterprise LLM reasoning engine (Google Gemini 2.5 Flash) that transforms statistical attributions (SHAP TreeExplainer log-odds) into human-defensible audit reports compliant with **NIST AI RMF**, **NIST SP 1270**, and **EU AI Act Title III**.

---

## 2. System Architecture & Component Interaction

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER (React 19 + TypeScript)                          │
│   • Tab 1: Banks / PaySim       • Tab 2: Lenders / Credit       • Tab 3: Insurers / SIU     │
│   • Batch File Dropzone         • Triage Risk Table             • 1-Click AI Audit Drawer   │
└──────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                               │ HTTP (JSON / Multipart CSV)
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                               GATEWAY & API TIER (FastAPI + Uvicorn)                         │
│   • POST /api/assess (Single)   • POST /api/assess/batch (Vectorized)   • GET /health        │
│   • Input Validation (Pydantic v2)                               • CORS & Origin Security    │
└──────────────────────┬───────────────────────────────────────────────┬───────────────────────┘
                       │                                               │
                       ▼                                               ▼
┌──────────────────────────────────────────────┐ ┌─────────────────────────────────────────────┐
│          INFERENCE & ML ENGINE               │ │         EXPLAINABILITY & LLM ENGINE         │
│  • PaySim GBDT (artifacts/paysim)            │ │  • SHAP TreeExplainer (In-Memory Cache)     │
│  • XGBoost 500-Tree (artifacts/creditfraud)  │ │  • Google Gemini 2.5 Flash (thinkingBudget:0)│
│  • 54-Feature GBDT (artifacts/insurance)     │ │  • Multi-Model Fallback Cascade             │
│  • Platt Probability Calibrator              │ │  • Deterministic Rule-Based Fallback        │
│  • Isolation Forest Anomaly Engine           │ │  • Regulatory Audit Brief Formatter         │
└──────────────────────────────────────────────┘ └─────────────────────────────────────────────┘
```

---

## 3. Detailed Technical Requirements (By Phase)

### 📌 Phase 1: Production Batch Ingestion, Vectorized Scoring & Triage Workbench (Immediate Scope)

#### 3.1 Objective
Transition TrustFed from a single-record form tester into an operational batch screening workbench capable of processing bulk files with instant ML triage and on-demand LLM explanations.

#### 3.2 Functional Requirements

##### FR-1.1: Bulk File Ingestion Endpoint
* **Method:** `POST /api/assess/batch`
* **Input Formats:** Accepts either:
  1. A `multipart/form-data` file upload (`.csv` or `.json` up to 50MB).
  2. A direct JSON payload containing `domain` and an array `records: List[Dict[str, Any]]`.
* **Supported Domains:** `banks` (PaySim), `lenders` (CreditFraud), `insurers` (Insurance Claims).

##### FR-1.2: Vectorized Batch Machine Learning Inference
* The backend MUST parse incoming records directly into a vectorized `pandas.DataFrame`.
* Preprocessing, one-hot encoding reindexing, and feature imputation MUST execute in bulk memory buffers.
* Bulk predictions MUST run via `model.predict_proba()` without looping single rows.
* Platt probability calibration and anomaly percentiles MUST be computed vectorized.
* **LLM Separation:** The batch scoring pipeline **MUST NOT** invoke Google Gemini during bulk screening. Bulk execution time must remain under 2.0 seconds for 5,000 records.

##### FR-1.3: Batch Triage Response Schema
The endpoint must return an aggregated summary alongside row-level results:
```json
{
  "domain": "banks",
  "batch_summary": {
    "total_records": 1000,
    "flagged_count": 42,
    "cleared_count": 958,
    "fraud_rate": 0.042,
    "mean_risk_score": 14.8,
    "processing_time_ms": 145
  },
  "records": [
    {
      "record_id": "TX-0001",
      "risk_score": 92.4,
      "fraud_probability": 0.9240,
      "decision_threshold": 0.4000,
      "classification": "fraud",
      "anomaly_score": 0.812,
      "top_driver": "drain_ratio: 0.985",
      "raw_preview": { "type": "TRANSFER", "amount": 182400.0, "step": 312 }
    }
  ]
}
```

##### FR-1.4: Frontend Triage Workbench
* Provide a **Batch Ingestion Dropzone** within each domain tab supporting drag-and-drop `.csv` uploads with downloadable template files (`template_paysim.csv`, `template_credit.csv`, `template_insurance.csv`).
* Implement a **Triage Summary Ribbon**:
  * Total Records Screened
  * Quarantined / Flagged Count (Red alert)
  * Cleared Transactions (Green check)
  * Anomaly Outlier Rate
* Implement a **Filterable Data Grid**:
  * Sortable by `risk_score` descending.
  * Status filter toggles: `[All]`, `[Flagged Only]`, `[Cleared]`.
* **On-Demand AI Inspection Drawer:**
  * Clicking any row opens a slide-over panel.
  * The frontend triggers an on-demand single assessment (`POST /api/assess` with `include_ai_reasoning: true`).
  * Renders the complete **Google Gemini Audit Narrative**, SHAP driver breakdown, and recommended human verification steps.
* **1-Click Audit Export:**
  * Allows downloading a stamped `.csv` containing input features, calculated risk scores, decision classifications, and primary risk drivers.

---

### 📌 Phase 2: Asynchronous Queuing, Redis Caching & Real-Time Streaming

#### 4.1 Objective
Support continuous, high-volume production transaction streams with sub-50ms inference latency and semantic caching for LLM costs.

#### 4.2 Technical Requirements
* **Decoupled Async Architecture:** Introduce Redis + Celery / RQ. Immediate scoring responses are returned synchronously in `<30ms`; detailed LLM audit narratives are generated asynchronously in worker threads.
* **Semantic Explanation Caching:** Implement an in-memory/Redis semantic cache for Gemini reasoning. If a transaction exhibits an identical SHAP driver fingerprint to a recent evaluation, the cached explanation is served instantly, cutting LLM token costs by over 75%.
* **Live WebSocket Stream Simulation:** Provide a mock enterprise transaction stream in the UI simulating real-time clearinghouse feeds (e.g. 50 transactions/second) with live anomaly pulses.

---

### 📌 Phase 3: Regulatory Compliance Exporters & Enterprise RBAC

#### 5.1 Objective
Deliver formal legal defensibility for financial institutions facing regulatory audits (**CFPB**, **ECB**, **FINRA**, **NIST**).

#### 5.2 Technical Requirements
* **1-Click FCRA Adverse Action Notice Generator:**
  * For credit denials or insurance cancellations, produce a regulatory-formatted PDF detailing the specific principal reasons for denial under US Equal Credit Opportunity Act (ECOA) / Regulation B.
* **NIST SP 1270 Explainability Certificate:**
  * Generate cryptographic audit receipts containing model checksum, dataset version, SHAP attribution matrix, and differential privacy bounds ($\epsilon, \delta$).
* **Role-Based Access Control (RBAC):**
  * `Analyst`: View triage feed, inspect transactions, export CSV.
  * `Senior Investigator`: Override decisions, mark false-positives for feedback loop.
  * `Compliance Auditor`: Access model governance, privacy ledger, and drift logs.

---

### 📌 Phase 4: Production Distributed Federated Framework & Hardware Enclaves

#### 6.1 Objective
Migrate from simulated file-based client silos to physically distributed cross-institutional federated learning nodes.

#### 6.2 Technical Requirements
* **Framework Migration:** Deploy [**Flower (flwr)**](https://flower.ai) or **NVIDIA FLARE** client containers.
* **Client Distribution:** Partner institutions run a lightweight Dockerized agent behind their firewalls.
* **Confidential Computing (TEE):** Deploy the central aggregation coordinator inside **AWS Nitro Enclaves** or **Azure Confidential Computing (Intel SGX)**, cryptographically proving that even the host operator cannot inspect participant model weights.
* **Continuous DP Accountant:** Enforce formal moment accountant tracking for Rényi DP to automatically halt training if the cumulative epsilon threshold ($\epsilon_{\max} = 5.0$) is reached.

---

## 4. API Interface Specifications

### 4.1 Existing Endpoint: Single Record Assessment
* **Endpoint:** `POST /api/assess`
* **Request Contract:**
```json
{
  "domain": "banks",
  "user_input": {
    "step": 295,
    "type": "CASH_OUT",
    "amount": 172344.3,
    "oldbalanceOrg": 172344.3,
    "oldbalanceDest": 0
  },
  "include_ai_reasoning": true
}
```
* **Response Contract:**
```json
{
  "domain": "banks",
  "ml_risk_json": {
    "transaction_id": "TX-PAYSIM-5421",
    "model": { "name": "PaySim Federated GBDT Model", "artifact": "artifacts/paysim/model.joblib" },
    "risk": {
      "fraud_probability": 0.8421,
      "risk_score": 84.21,
      "decision_threshold": 0.4000,
      "classification": "fraud",
      "anomaly_score": 0.7812
    },
    "risk_factors": [
      { "feature": "drain_ratio", "impact_log_odds": 1.421, "direction": "increases_risk" },
      { "feature": "is_dest_zero", "impact_log_odds": 0.892, "direction": "increases_risk" }
    ]
  },
  "ai_reasoning": {
    "source": "gemini",
    "model": "gemini-2.5-flash",
    "text": "**Assessment Summary**: Flagged for Human Review...\n\n**Key Feature Evidence (SHAP Drivers)**: ..."
  }
}
```

### 4.2 New Endpoint: Batch Assessment (Phase 1)
* **Endpoint:** `POST /api/assess/batch`
* **Request Headers:** `Content-Type: application/json` or `multipart/form-data`
* **Query Parameters:** `domain=banks|lenders|insurers`
* **SLA:** $\le 2000$ ms for 5,000 records.

### 4.3 Health & Telemetry Endpoint
* **Endpoint:** `GET /health`
* **Response Contract:**
```json
{
  "status": "ok",
  "models": {
    "banks": { "available": true, "artifact": "artifacts/paysim/model.joblib" },
    "creditfraud": { "available": true, "artifact": "artifacts/creditfraud/model.joblib" },
    "insurance": { "available": true, "artifact": "artifacts/insurance/model.joblib" }
  },
  "gemini_configured": true,
  "privacy_guarantees": {
    "renyi_dp_epsilon": 2.45,
    "renyi_dp_delta": 1e-5,
    "secagg_protocol": "Diffie-Hellman Shamir SecAgg+",
    "quorum_minimum": 3
  }
}
```

---

## 5. Non-Functional Requirements (NFRs)

| Metric | Target Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Inference Latency (ML only)** | $\le 15\text{ ms}$ (Single record) | Pre-warmed in-memory Joblib models |
| **Batch Inference Throughput** | $\ge 2,500\text{ records/sec}$ | Vectorized Pandas + XGBoost DMatrix evaluation |
| **LLM Narrative Response Time** | $\le 4.5\text{ s}$ | `gemini-2.5-flash` with `thinkingBudget: 0` |
| **Privacy Guarantee** | $\epsilon = 2.45, \delta = 10^{-5}$ | Calibrated Gaussian noise addition during training |
| **Data Leakage Guarantee** | **0 raw customer records** | Local firewall silo training; encrypted updates only |
| **Frontend Rendering** | 60 FPS under 10k rows | Virtualized table rendering (TanStack Table or equivalent) |
| **Availability** | 99.9% Uptime | Multi-model fallback cascade + local deterministic explainability |

---

## 6. Implementation Deliverables & Verification Checklist for Phase 1

### Part 1: Backend Batch Engine & Sample Datasets (Completed ✅)
- [x] **Backend Vectorized Engine:** Implemented `_batch_assess_banks`, `_batch_assess_creditfraud`, and `_batch_assess_insurance` in [`backend/risks_api.py`](file:///c:/sahityaa/TrustFed%20Project/backend/risks_api.py) with vectorized Pandas processing.
- [x] **Batch Inference Endpoint:** Implemented `POST /api/assess/batch` accepting JSON array payloads.
- [x] **Multipart Upload Endpoint:** Implemented `POST /api/assess/upload` accepting direct `.csv` or `.json` file streams.
- [x] **Data Validation:** Implemented Pydantic schema validation for batch payloads across `banks`, `lenders`, and `insurers`.
- [x] **Demo Datasets & Templates:** Generated 3 production-grade sample batch files and downloadable CSV templates in [`backend/samples/`](file:///c:/sahityaa/TrustFed%20Project/backend/samples/):
  - `sample_banks_batch.csv` (40 records with mule drainage attacks) + `template_banks.csv`
  - `sample_lenders_batch.csv` (20 records with synthetic ID & default risks) + `template_lenders.csv`
  - `sample_insurers_batch.csv` (20 records with low-tenure inflated claims) + `template_insurers.csv`
- [x] **Sample Retrieval Endpoints:** Implemented `GET /api/samples/{domain}` and `GET /api/samples/download/{filename}`.
- [x] **Automated Test Suite:** Created [`backend/test_batch_api.py`](file:///c:/sahityaa/TrustFed%20Project/backend/test_batch_api.py); verified 100% test pass rate with sub-second batch latency across all domains.

### Part 2: Frontend Dropzone & Triage Table (Completed ✅)
- [x] **Universal Batch Screening Workbench:** Built [`frontend/src/components/views/BatchScreeningWorkbench.tsx`](file:///c:/sahityaa/TrustFed%20Project/frontend/src/components/views/BatchScreeningWorkbench.tsx) with drag-and-drop file ingestion dropzone and client-side PapaParse CSV parser.
- [x] **Quick Demo Loader:** Implemented "⚡ Load Demo Batch" 1-click button fetching domain-specific batches from `GET /api/samples/{domain}` (40 PaySim TXs for Banks, 20 Home Credit applications for Lenders, 20 claims for Insurers).
- [x] **Downloadable Templates:** Added 1-click "Download Blank CSV Template" linking to `GET /api/samples/download/{filename}`.
- [x] **Triage KPI Ribbon:** Rendered real-time dynamic KPI metrics: Total Screened, Flagged Quarantined, Cleared, Flagged Rate %, and Vectorized Latency (ms).
- [x] **Filterable & Searchable Results Grid:** Built sortable triage table with search-by-ID, sort by Risk Probability / Amount, and status filter pills (`[All]`, `[Flagged (Quarantined)]`, `[Cleared]`).
- [x] **Vertical Navigation Integration:** Integrated batch workbench as subtab 2 across:
  - Banking Transactions: [`frontend/src/components/views/IntelligenceAndGovView.tsx`](file:///c:/sahityaa/TrustFed%20Project/frontend/src/components/views/IntelligenceAndGovView.tsx) (`batch` subtab)
  - Digital Lenders: [`frontend/src/components/views/CreditFraudView.tsx`](file:///c:/sahityaa/TrustFed%20Project/frontend/src/components/views/CreditFraudView.tsx) (`cf-batch` subtab)
  - Insurance Claims: [`frontend/src/components/views/InsuranceClaimsView.tsx`](file:///c:/sahityaa/TrustFed%20Project/frontend/src/components/views/InsuranceClaimsView.tsx) (`ins-batch` subtab)
- [x] **Header Tab Navigation:** Added subtab quick-links with badges (`⚡ 40-TX Demo`, `⚡ 20-Loan Demo`, `⚡ 20-Claim Demo`) in [`frontend/src/components/tabs/ModernTabsWithHover.tsx`](file:///c:/sahityaa/TrustFed%20Project/frontend/src/components/tabs/ModernTabsWithHover.tsx).

### Part 3: AI Inspection Drawer & 1-Click Export (Completed ✅)
- [x] **On-Demand AI Drawer:** Connected slide-over panel in `BatchScreeningWorkbench.tsx` that triggers on-demand `assessRisk(domain, record, true)` to fetch full Google Gemini AI audit narratives and latency metrics.
- [x] **SHAP Factor Waterfall:** Visualized top driving factors with impact badges, log-odds direction, and feature values.
- [x] **Human Verification Protocol:** Displayed recommended triage verification steps (SAR filing recommendations, KYC/AML cross-checks, manual SIU inspection recommendations).
- [x] **1-Click Stamped CSV Export:** Built formatted client-side CSV download featuring timestamped risk scores, decision classifications, and primary risk drivers for compliance records.
