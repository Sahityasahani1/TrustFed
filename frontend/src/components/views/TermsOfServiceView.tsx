import React from "react";
import { Scale, ShieldAlert, CheckCircle2, FileCode2, Landmark } from "lucide-react";

export const TermsOfServiceView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in text-slate-200">
      <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 border border-slate-700/60 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Scale className="w-8 h-8 text-indigo-400" />
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            INSTITUTIONAL TERMS OF SERVICE
          </span>
        </div>
        <h1 className="text-3xl font-black text-white">TrustFed Platform Terms of Service</h1>
        <p className="text-sm text-slate-400 mt-2">
          Master Institutional Service Agreement for Member Banks, Digital Lenders, and Insurance Carriers.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-cyan-400" />
            1. Institutional Participation & Federated Network Membership
          </h2>
          <p className="text-slate-300">
            By connecting to the TrustFed clearinghouse, participating institutions agree to compute local gradient perturbations strictly within their authorized VPC boundaries and contribute zero-sum masked updates ($∑ m_i = 0$) to the aggregation coordinator.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            2. Dual-AI Predictive vs. Generative Explainability Separation
          </h2>
          <p className="text-slate-300">
            The platform’s predictive machine learning models (XGBoost, GBDT, ONNX FP16) are mathematically authoritative. Generative AI regulatory audit narratives (Google Gemini 2.5 Flash) provide explanatory context and human-readable formatting, but do not override calibrated machine learning risk probability outputs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            3. Limitation of Liability & Fraud Loss Allocation
          </h2>
          <p className="text-slate-300">
            TrustFed provides privacy-preserving risk attribution and anomaly detection scoring as an institutional intelligence tool. Final transaction approvals, account freezing, loan denials, and claims payments remain the sole responsibility of each member institution’s authorized fraud officers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            4. Service Level Agreements (SLAs) & High-Availability
          </h2>
          <p className="text-slate-300">
            TrustFed maintains a 99.95% target platform availability with sub-50ms inference latency SLAs and a maximum 5-second disaster recovery time objective (RTO). 
          </p>
        </section>
      </div>
    </div>
  );
};
