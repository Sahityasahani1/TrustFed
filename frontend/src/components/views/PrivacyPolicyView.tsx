import React from "react";
import { ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in text-slate-200">
      <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 border border-slate-700/60 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ENTERPRISE COMPLIANCE NOTICE
          </span>
        </div>
        <h1 className="text-3xl font-black text-white">TrustFed Platform Privacy Policy</h1>
        <p className="text-sm text-slate-400 mt-2">
          Effective Date: November 2026 | Governing Standards: GDPR (EU) 2016/679, FCRA § 615(a), US ECOA Regulation B, DPDP Act 2023.
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            1. Core Architectural Privacy Guarantee: Zero Raw Data Pooling
          </h2>
          <p className="text-slate-300">
            TrustFed is architected on federated learning and secure confidential computing (TEE). Under no operational circumstance does TrustFed collect, centralize, pool, or persist raw customer bank statements, loan applications, insurance claims, or personally identifiable information (PII). Machine learning training and risk scoring occur strictly behind each partner institution’s firewall.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            2. Differential Privacy & Mathematical Bounds
          </h2>
          <p className="text-slate-300">
            All gradient updates transmitted to the central aggregation coordinator are perturbed with calibrated Gaussian noise ensuring strict Rényi Differential Privacy (ε ≤ 2.45, δ = 1e-5). The platform enforces a hard circuit breaker that immediately halts model training if cumulative privacy loss exceeds ε_max = 5.0.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            3. Adverse Action Rights & FCRA § 615(a) Compliance
          </h2>
          <p className="text-slate-300">
            When automated predictive risk assessments contribute to unfavorable credit or insurance decisions, applicants possess statutory rights under the US Fair Credit Reporting Act (FCRA) and Equal Credit Opportunity Act (ECOA) Regulation B to receive a formal Statement of Principal Reasons within 60 days of the adverse determination.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            4. Human-in-the-Loop Override & Dispute Resolution
          </h2>
          <p className="text-slate-300">
            Under GDPR Article 22, individuals are protected against purely automated determinations carrying significant legal consequences. Senior Fraud Investigators retain override authority (`OVR-01` to `OVR-05`) recorded in an immutable, zero-PII audit trail.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            5. Cryptographic Verification & Data Protection Officer Contact
          </h2>
          <p className="text-slate-300">
            For audit inquiries, institutions can request signed NIST SP 1270 Explainability Certificates and AWS Nitro Enclave remote attestation records. Contact the TrustFed Data Protection Officer at: <span className="font-mono text-cyan-400">dpo@trustfed.internal</span>.
          </p>
        </section>
      </div>
    </div>
  );
};
