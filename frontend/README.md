# 🖥️ TrustFed Frontend — Enterprise Risk Governance Platform

Modern, responsive web platform built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4**. Delivers real-time federated risk assessments, high-throughput batch transaction screening, automated FCRA/NIST compliance auditing, cryptographic hardware enclave verification, and interactive streaming transaction feeds.

---

## 🛠️ Tech Stack & Capabilities

- **UI Framework:** React 19 + TypeScript (Strict mode, zero `any` types)
- **Bundler & Dev Server:** Vite 5 (HMR sub-50ms reload)
- **Styling:** Tailwind CSS v4 + PostCSS
- **Animations & Micro-interactions:** Framer Motion, Canvas Confetti, HTML5 Particle Canvases
- **Icons & Typography:** Lucide React, Auge Enterprise Typography
- **Data Visualization:** Recharts (Interactive radar, line, bar, and area charts)
- **Data Ingestion:** PapaParse (Vectorized CSV client-side parsing & template downloads)
- **Real-Time Streaming:** Native WebSockets with automatic reconnection and heartbeat ping/pong

---

## 📂 Architecture & Directory Layout

```
frontend/
├── public/                 # Static assets, branding logos, and typography fonts
├── src/
│   ├── assets/             # Brand graphics, institutional badges, and vectors
│   ├── components/         # Modular React components
│   │   ├── demo/           # 3-minute executive pitch helper bar (JudgeDemoBar.tsx)
│   │   ├── hero/           # Interactive 3D particle stage (Hero3DStage.tsx)
│   │   ├── pages/          # Landing problem pitch & executive summary (IntroPage.tsx)
│   │   ├── react-bits/     # Specialized UI animations, glassmorphism cards & particle backgrounds
│   │   ├── tabs/           # Top navigation bar with hover previews (ModernTabsWithHover.tsx)
│   │   └── views/          # Nine Enterprise Mission-Critical Workbenches:
│   │       ├── IntelligenceAndGovView.tsx   # Workbench 1: PaySim Retail Banking Transactions
│   │       ├── CreditFraudView.tsx          # Workbench 2: Digital Lenders Credit Default & Adverse Action
│   │       ├── InsuranceClaimsView.tsx      # Workbench 3: P&C Insurers SIU Claims Fraud
│   │       ├── BatchScreeningWorkbench.tsx  # Workbench 4: Universal Batch Triage Dropzone & AI Drawer
│   │       ├── ComplianceLedgerWorkbench.tsx# Workbench 5: Immutable FCRA & NIST SP 1270 Audit Trail
│   │       ├── HardwareEnclaveWorkbench.tsx # Workbench 6: AWS Nitro Enclave PCR0 Attestation Hub
│   │       ├── ClearinghouseStreamWorkbench.tsx # Workbench 7: Real-Time WebSocket Streaming Feed
│   │       ├── SilosAndNetworkView.tsx      # Workbench 8: Silo Isolation vs Federated Defense Showdown
│   │       ├── FederatedEngineView.tsx      # Workbench 9: Continuous Rényi Differential Privacy Engine
│   │       ├── StatusPageView.tsx           # Production Uptime, SLA Metrics & Incident Status
│   │       ├── PrivacyPolicyView.tsx        # Institutional GLBA / FCRA Privacy Policy
│   │       └── TermsOfServiceView.tsx       # Institutional Terms of Service & SLA Agreements
│   ├── constants/          # Static feature dictionaries (PaySim, Credit Fraud, Insurance)
│   ├── services/           # Backend API communication clients
│   ├── risk_api_client.js  # Primary backend fetch gateway with latency instrumentation & correlation IDs
│   ├── App.tsx             # Root router, telemetry header, Command Palette (Ctrl+K), and modal handlers
│   ├── main.tsx            # React 19 DOM bootstrap
│   └── index.css           # Global stylesheet, CSS variables, and Tailwind directives
├── package.json            # Node dependencies and scripts
├── tsconfig.json           # Strict TypeScript configuration
└── vite.config.ts          # Vite build and development configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.x, 20.x, or 22.x LTS
- npm (v9+), pnpm, or yarn

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Development Server
Start the local development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
- Local URL: `http://localhost:5173`
- Network URL: Accessible over LAN for cross-device testing

### 4. Production Build & Type Checking
Execute full TypeScript type checking and production minification:
```bash
npm run build
```
- Output Directory: `dist/`
- Zero build or type errors enforced by CI/CD pipeline.

### 5. Preview Production Build
```bash
npm run preview
```

---

## 🎛️ Navigation & Key Interfaces

### 1. Top HUD Header & Command Palette
- **Institutional Telemetry HUD:** Displays live backend connection status, active latency measurement ($<25$ms badge), active tenant indicator, and current feature flag state.
- **Global Command Palette (`Ctrl+K` / `Cmd+K`):** Instant keyboard-driven navigation across all 9 workbenches, quick actions (e.g., "Run Banks Batch Screening", "Download Sample Template", "Verify Nitro Enclaves"), and status views.

### 2. Nine Enterprise Mission-Critical Workbenches
1. **Banking Fraud Detection (PaySim):** Real-time evaluation of wire transfers and cashouts against money-mule patterns and account-drain exploits.
2. **Digital Lending Risk (Credit Fraud):** Home Credit loan default risk assessment with automated FCRA Section 615 adverse action notice generation.
3. **P&C Insurance Fraud (SIU):** Claims triage detecting staged accidents, inflated medical invoices, and cross-carrier multi-dipping.
4. **Universal High-Throughput Batch Triage:** Vectorized CSV/JSON dropzone processing hundreds of records with interactive drill-down and instant risk scoring.
5. **Tamper-Evident Compliance Ledger:** Cryptographically verifiable SHA-256 audit ledger tracking all automated decisions, human overrides, and NIST SP 1270 certificates.
6. **Hardware Enclave Hub (AWS Nitro):** Real-time verification of cryptographic PCR0/PCR1/PCR2 measurements and TLS attestation documents.
7. **Clearinghouse Transaction Stream:** High-velocity WebSocket transaction feed visualizing streaming transactions, latency distributions, and live fraud alerts.
8. **Institutional Defense Network (Silos vs Fed):** Side-by-side comparative sandbox demonstrating zero-day fraud defense across 20 simulated institutional silos.
9. **Rényi Differential Privacy Engine:** Continuous privacy budget tracking ($\epsilon=2.45$, $\delta=10^{-5}$) guaranteeing mathematical zero-leakage of raw institutional data.

### 3. Public Status & Legal Views
- **Status Page (`/status`):** Real-time system component status (Inference Engine, Database Pool, Enclave Attestation, WebSocket Stream), active incidents, and rolling 90-day SLA uptime (99.99%).
- **Privacy Policy:** Comprehensive disclosure of GLBA, FCRA, and GDPR data handling practices.
- **Terms of Service:** Institutional SLAs, liability limits, and API consumption agreements.

---

## 🔗 Backend Connectivity & Configuration

The frontend interfaces with the backend via `src/risk_api_client.js`. Configuration options can be set via environment variables in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/clearinghouse
VITE_ENABLE_ANALYTICS=false
```

### Automatic Resilience & Fallbacks
- **Correlation ID Propagation:** Automatically generates and attaches an `X-Request-ID` UUID to all outgoing HTTP requests for end-to-end tracing.
- **Automatic WebSocket Reconnect:** Heartbeat ping/pong with exponential backoff guarantees continuous streaming updates.
- **Local Fallback Mode:** In offline or mock demo environments, high-fidelity sample records and pre-calculated SHAP drivers allow zero-failure demonstrations.

---

## 📄 License & Standards

Distributed under the Apache 2.0 License. Designed to comply with **WCAG 2.1 AA** accessibility standards, **SOC 2 Type II** controls, and **NIST SP 1270** recommendations for explainable AI interfaces.
