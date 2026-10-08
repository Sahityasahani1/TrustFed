# 🖥️ TrustFed Frontend — Interactive Financial Fraud Screening Platform

React 19 + TypeScript + Vite web platform delivering real-time federated risk assessments, high-throughput batch transaction screening, interactive model showdown sandboxes, and explainable AI insights.

---

## 🛠️ Tech Stack
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion, Canvas Confetti, Particle Canvases
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Parsing & Data Handling:** PapaParse (CSV)

---

## 📂 Project Structure

```
frontend/
├── public/                 # Static assets, Auge typography fonts, and SVG icons
├── src/
│   ├── assets/             # Brand graphics and icons
│   ├── components/         # Reusable React components
│   │   ├── demo/           # 3-minute pitch helper bar (JudgeDemoBar.tsx)
│   │   ├── hero/           # Interactive 3D stage and particle visuals (Hero3DStage.tsx)
│   │   ├── pages/          # Landing problem pitch (IntroPage.tsx)
│   │   ├── react-bits/     # Specialized UI animations, cards, and particles
│   │   ├── tabs/           # Header navigation with hover previews (ModernTabsWithHover.tsx)
│   │   └── views/          # Production domain views:
│   │       ├── IntelligenceAndGovView.tsx   # Tab 1: PaySim Banking transactions
│   │       ├── CreditFraudView.tsx          # Tab 2: Digital Lenders credit default
│   │       ├── InsuranceClaimsView.tsx      # Tab 3: Insurers SIU claims fraud
│   │       ├── BatchScreeningWorkbench.tsx  # Universal batch triage dropzone & AI drawer
│   │       ├── DataUploadView.tsx           # Batch CSV dropzone & triage queue
│   │       ├── SilosAndNetworkView.tsx      # Silo isolation vs Federated defense
│   │       └── FederatedEngineView.tsx      # Privacy & round aggregation metrics
│   ├── constants/          # Static feature dictionaries (PaySim, Credit, Insurance)
│   ├── services/           # Backend API communication clients
│   ├── risk_api_client.js  # Primary backend fetch gateway with latency instrumentation
│   ├── App.tsx             # Root router, telemetry header & theme switchers
│   ├── main.tsx            # React 19 DOM bootstrap
│   └── index.css           # Global stylesheet and Tailwind directives
├── package.json            # Node dependencies and build scripts
└── vite.config.ts          # Vite configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ or 22+ LTS
- npm, pnpm, or yarn

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 4. Build for Production
```bash
npm run build
```
The compiled production bundle will be generated in `dist/`.

---

## 🔗 Backend Connectivity
The frontend communicates with the FastAPI service running at `http://localhost:8000` via `src/risk_api_client.js`. 
Ensure the backend server is running before executing live risk assessments.
