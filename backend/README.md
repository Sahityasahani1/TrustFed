# ⚙️ TrustFed Backend — Risk Inference & Explainability Engine

High-performance FastAPI service providing federated machine learning risk assessments, vectorized high-throughput batch screening, SHAP driver attributions, and Google Gemini LLM audit brief explanations for financial fraud detection.

---

## 📂 Architecture & Directory Layout

```
backend/
├── artifacts/                  # Serialized trained models & metadata
│   ├── creditfraud/            # XGBoost GBDT (307k Home Credit applications)
│   ├── insurance/              # 54-Feature GBDT (1M policy records) + 20 federated client silos
│   └── paysim/                 # Platt-calibrated GBDT (PaySim financial transactions)
├── samples/                    # Production sample batches & CSV templates
│   ├── sample_banks_batch.csv      # 40 PaySim transactions (safe + 4 attacks)
│   ├── sample_lenders_batch.csv    # 20 Loan applications (prime + high risk)
│   ├── sample_insurers_batch.csv   # 20 Claims (standard + SIU spikes)
│   ├── template_banks.csv          # Blank CSV template with headers
│   ├── template_lenders.csv        # Blank CSV template with headers
│   └── template_insurers.csv       # Blank CSV template with headers
├── check_gemini_models.py      # Diagnostic script to list & probe available Gemini models
├── check_insurance_ml.py       # Validation suite for insurance ML bundle
├── check_paysim_dataset.py     # PaySim data verification helper
├── datasets.py                 # Dataset streaming and ETL pipeline
├── paysim_input_examples.txt   # Test payloads for transaction risk evaluation
├── predict_paysim.py           # Core PaySim inference and validation module
├── requirements.txt            # Unified Python dependencies
├── requirements-api.txt        # FastAPI & web server dependencies
├── requirements-ml.txt         # Scikit-learn, XGBoost & SHAP dependencies
├── risk_api.py                 # Primary entry point exporting FastAPI `app`
├── risks_api.py                # Comprehensive FastAPI route handlers & inference pipelines
├── test_batch_api.py           # Automated test suite and latency benchmark for batch screening
├── train_demo_models.py        # Demo model generator
├── train_insurance.py          # Insurance model training runner
├── train_paysim.py             # PaySim model training runner
└── train_risk_models.py        # Full federated risk model training suite
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Virtual environment (recommended)

### 2. Installation
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file with your configuration:
```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
FRONTEND_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### 4. Running the Server
```bash
uvicorn risk_api:app --host 0.0.0.0 --port 8000 --reload
```
The API will be available at `http://localhost:8000`.  
Interactive documentation at `http://localhost:8000/docs`.

### 5. Running the Batch Test Suite
Verify all single and batch inference endpoints with latency benchmarks:
```bash
python test_batch_api.py
```

---

## 📡 API Endpoints

### 1. `GET /health`
Returns system status, model artifact availability, and Gemini configuration status.

### 2. `POST /api/assess` (Single Record)
Single transaction/application/claim risk assessment. Runs the authoritative ML model first, extracts top SHAP drivers, and queries Google Gemini for plain-English regulatory explainability.

### 3. `POST /api/assess/batch` (Vectorized Batch Ingestion)
High-throughput screening accepting JSON arrays of transactions or applications. Preprocesses and screens hundreds of records in bulk (<200ms) with zero LLM bottleneck.
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

### 4. `POST /api/assess/upload` (File Upload Screening)
Accepts `.csv` or `.json` file uploads via multipart form data (`file` and `domain`). Parses and screens all records vectorized, returning summary KPIs and flagged alerts.

### 5. `GET /api/samples/{domain}`
Fetches preloaded sample records for `banks`, `lenders`, or `insurers` as JSON for instant 1-click testing in the UI.

### 6. `GET /api/samples/download/{filename}`
Serves downloadable CSV templates or sample batch files (e.g. `template_banks.csv`, `sample_banks_batch.csv`).
