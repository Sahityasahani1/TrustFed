# ⚙️ TrustFed Backend — Enterprise Risk Inference & Explainability Engine

High-performance, federated machine learning and regulatory explainability backend built with **FastAPI**, **ONNX Runtime**, **XGBoost**, **SHAP**, and **Google Gemini 2.5 Flash**. Engineered for sub-25ms single-record risk scoring, 3,300+ records/sec vectorized batch screening, continuous Rényi Differential Privacy ($\epsilon=2.45$, $\delta=10^{-5}$), and automated institutional compliance audits (FCRA Adverse Action & NIST SP 1270).

---

## 📂 Architecture & Directory Layout

```
backend/
├── artifacts/                  # Serialized trained models & metadata
│   ├── creditfraud/            # XGBoost GBDT (307k Home Credit applications)
│   ├── insurance/              # 54-Feature GBDT (1M policy records) + 20 federated client silos
│   └── paysim/                 # Platt-calibrated GBDT (PaySim financial transactions)
├── migrations/                 # Zero-downtime database schema migrations
│   ├── 001_initial_schema.sql  # Production tables (assessments, audit_events, overrides, jobs)
│   └── 002_add_feedback_cols.sql # Expand-and-contract column backfills
├── samples/                    # Production sample batches & CSV templates
│   ├── sample_banks_batch.csv      # 40 PaySim transactions (safe + attacks)
│   ├── sample_lenders_batch.csv    # 20 Loan applications (prime + high risk)
│   ├── sample_insurers_batch.csv   # 20 Claims (standard + SIU fraud spikes)
│   ├── template_banks.csv          # Blank CSV template with headers
│   ├── template_lenders.csv        # Blank CSV template with headers
│   └── template_insurers.csv       # Blank CSV template with headers
├── tests/                      # Automated pytest verification test suite
│   ├── __init__.py
│   ├── test_phase1_baseline.py # Phase 1: Unit, API, build, and CVE audit gates
│   ├── test_phase2_config.py   # Phase 2: Schema validation, vault, error handling, flags
│   ├── test_phase3_security.py # Phase 3: HTTPS, headers, RBAC negative tests, rate limits, PII
│   ├── test_phase4_database.py # Phase 4: Backups, migrations, and connection pooling
│   └── test_phase5_phase6.py   # Phases 5 & 6: Sentry, JSON logs, health probes, rollback
├── alert_manager.py            # Phase 5: Multi-channel alerting (Slack, PagerDuty, Webhook)
├── backup_manager.py           # Phase 4: Automated PITR snapshot & restore drill manager
├── check_gemini_models.py      # Diagnostic script to list & probe available Gemini models
├── check_insurance_ml.py       # Validation suite for insurance ML bundle
├── check_paysim_dataset.py     # PaySim data verification helper
├── compliance_ledger.py        # Append-only SHA-256 tamper-evident compliance audit trail
├── config.py                   # Phase 2: Pydantic BaseSettings strict env validation
├── datasets.py                 # Dataset streaming and ETL pipeline
├── db_pool.py                  # Phase 4: Thread-safe connection pool with circuit breaker
├── enclave_attestation.py      # AWS Nitro Enclave PCR0 cryptographic attestation validator
├── feature_flags.py            # Phase 2: Dynamic runtime feature flag manager
├── job_queue.py                # Asynchronous batch processing queue with worker thread
├── logging_config.py           # Phase 5: Structured JSON logger with correlation IDs & PII scrubbing
├── migration_runner.py         # Phase 4: Expand-and-contract migration runner & dry-run engine
├── paysim_input_examples.txt   # Test payloads for transaction risk evaluation
├── predict_paysim.py           # Core PaySim inference and validation module
├── rdp_accountant.py           # Continuous Rényi Differential Privacy budget tracker
├── requirements.txt            # Unified production dependencies
├── requirements-api.txt        # FastAPI & web server dependencies
├── requirements-ml.txt         # Scikit-learn, XGBoost & SHAP dependencies
├── risk_api.py                 # Primary entry point exporting FastAPI `app`
├── risks_api.py                # Comprehensive FastAPI route handlers & inference pipelines
├── sentry_integration.py       # Phase 5: Sentry error tracking & release tagging wrapper
├── status_endpoint.py          # Phase 5: Real-time public status page JSON endpoint
├── stream_engine.py            # Real-time WebSocket clearinghouse broadcast engine
├── test_batch_api.py           # Automated test suite and latency benchmark for batch screening
├── train_demo_models.py        # Demo model generator
├── train_insurance.py          # Insurance model training runner
├── train_paysim.py             # PaySim model training runner
├── train_risk_models.py        # Full federated risk model training suite
└── webhook_signer.py           # Phase 2: HMAC-SHA256 signature generator & validator
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10, 3.11, 3.12, or 3.13
- Virtual environment (`venv` recommended)

### 2. Installation
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate

# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Configuration
Configuration is managed strictly via `config.py` using Pydantic `BaseSettings`. Create a `.env` file in the project root or configure cloud environment secrets:

```env
# Application Runtime
NODE_ENV=production
DEBUG=false
SECRET_KEY=prod-secret-key-at-least-32-chars-long-123456789
HOST=0.0.0.0
PORT=8000

# Google Gemini LLM Explainability Tier
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Security & CORS
FRONTEND_ORIGINS=http://localhost:3000,http://localhost:5173,https://trustfed.prod.internal
CORS_ALLOW_CREDENTIALS=true

# Database & Storage
DATABASE_URL=sqlite:///./production.db
DB_POOL_MIN_SIZE=5
DB_POOL_MAX_SIZE=20
DB_TIMEOUT_SECONDS=30

# Feature Flags
FLAG_STREAMING_ENABLED=true
FLAG_GEMINI_REASONING_ENABLED=true
FLAG_HARDWARE_ENCLAVES_ENABLED=true

# Monitoring & Alerting
SENTRY_DSN=
ALERT_SLACK_WEBHOOK_URL=
ALERT_PAGERDUTY_ROUTING_KEY=
```

### 4. Running the Server
```bash
# Standard uvicorn launcher:
uvicorn risk_api:app --host 0.0.0.0 --port 8000 --workers 4

# Or python direct entry:
python -m uvicorn risk_api:app --host 0.0.0.0 --port 8000
```
- API Base URL: `http://localhost:8000`
- OpenAPI Swagger UI: `http://localhost:8000/docs`
- Interactive ReDoc: `http://localhost:8000/redoc`

---

## 🧪 Automated Testing & Verification Suite

TrustFed includes a comprehensive test and validation harness covering all 6 phases:

### 1. Pytest Test Suite (56/56 Passing)
Executes all unit, integration, RBAC authorization, PII scrubbing, migration, and rollback tests:
```bash
pytest backend/ -v
# Output: 56 passed in 25.13s
```

### 2. Official SLA Latency & Throughput Benchmark
Measures p95 latency across all three financial domains, batch throughput, and concurrency:
```bash
python scripts/benchmark_suite.py
```

**Verified SLA Benchmark Results:**
| Benchmark Metric | Target SLA | Verified Result | Status |
| :--- | :--- | :--- | :--- |
| **Single Record Banks (PaySim) p95** | $\le 25.00$ ms | **24.15 ms** | ✅ PASS |
| **Single Record Lenders p95** | $\le 80.00$ ms | **17.33 ms** | ✅ PASS |
| **Single Record Insurers p95** | $\le 85.00$ ms | **21.10 ms** | ✅ PASS |
| **Batch 500 Records p95** | $\le 250.00$ ms | **229.55 ms** | ✅ PASS |
| **Vectorized Batch Throughput** | $\ge 2,500.0$ rec/s | **3,369.93 rec/s** | ✅ PASS |
| **Concurrent Load Error Rate** | $0.00\%$ | **0.00%** | ✅ PASS |

### 3. Automated 5-Minute Production Smoke Test
Verifies end-to-end operational health in under 1 second:
```bash
python scripts/smoke_test.py
# Output: [PASS] 8/8 smoke test verification steps passed in 0.46s.
```

### 4. Database Restore Drill
Tests Point-in-Time Recovery (PITR) snapshot restoration into a sandboxed environment:
```bash
python scripts/backup_restore_drill.py
# Output: [SUCCESS] Recovery verified: 100/100 records restored (0.016s).
```

### 5. Migration Dry-Run Engine
Tests expand-and-contract migrations against simulated volume:
```bash
python scripts/dry_run_migrations.py
# Output: [SUCCESS] Dry-run completed: 2 migrations executed cleanly in 0.002s.
```

---

## 📡 Core API Categories

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Health Probes** | `/healthz` | GET | Kubernetes liveness probe (checks process state) |
| **Health Probes** | `/readyz` | GET | Kubernetes readiness probe (checks DB pool & models) |
| **System Health** | `/health` | GET | Detailed subsystem health, model artifacts & Gemini status |
| **Public Status** | `/api/status` | GET | Incident status, SLA uptime metrics & component states |
| **Single Assessment**| `/api/assess` | POST | Sub-25ms inference + SHAP drivers + Gemini audit brief |
| **Batch Assessment** | `/api/assess/batch` | POST | 3,300+ rec/s vectorized screening (JSON array) |
| **File Screening** | `/api/assess/upload`| POST | Vectorized CSV/JSON multipart form upload screening |
| **Async Batch Jobs** | `/api/jobs/batch` | POST | Background batch job submission (returns `job_id`) |
| **Async Status** | `/api/jobs/{job_id}` | GET | Real-time poll for async job progress & results |
| **Clearinghouse WS** | `/ws/clearinghouse` | WS | Real-time streaming fraud feed for institutional members |
| **Compliance FCRA** | `/api/compliance/fcra-notice` | POST | Adverse Action notice generation with FCRA Section 615 |
| **Compliance NIST** | `/api/compliance/nist-certificate` | POST | NIST SP 1270 cryptographic audit certificate |
| **Overrides** | `/api/investigator/override` | POST | Human-in-the-loop audit override with immutable SHA-256 log |
| **Enclave Attestation**| `/api/enclave/attestation` | POST | AWS Nitro Enclave PCR0 cryptographic verification |
| **Disaster Recovery** | `/api/admin/dr-status` | GET | RTO/RPO metrics and cold standby node health |
| **Sample Templates** | `/api/samples/{domain}` | GET | Preloaded domain test data for instant evaluation |
| **Sample Downloads** | `/api/samples/download/{fn}`| GET | Downloadable CSV templates (`template_banks.csv`, etc.) |

---

## 🔒 Security & Compliance Safeguards

- **Role-Based Access Control (RBAC):** Token authorization enforcing `admin`, `operator`, and `auditor` permission scopes with negative authorization tests.
- **Strict HTTP Security Headers:** Enforces `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
- **Zero Cleartext PII Logging:** Automated regex scrubbing sanitizes credit card numbers, SSNs, bearer tokens, passwords, and emails from all application logs.
- **Correlation ID Tracking:** Every HTTP request receives or forwards a unique `X-Request-ID` logged across all downstream services.
- **Cryptographic Webhook Signatures:** HMAC-SHA256 signature generation and validation prevents webhook tampering.
- **Tamper-Evident Audit Ledger:** All assessments and investigator overrides are appended to an immutable SHA-256 hash-chained ledger.
- **Hardware Enclave Attestation:** Validates AWS Nitro Enclave PCR0 cryptographic measurements before federated model weight aggregation.

---

## 📄 License & Regulatory Notice

Distributed under the Apache 2.0 License. Designed to satisfy consumer protection mandates under the **Fair Credit Reporting Act (FCRA)**, **Gramm-Leach-Bliley Act (GLBA)**, and **NIST SP 1270** standards for trustworthy artificial intelligence.
