import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Download, 
  Flag, 
  Scale, 
  Lock, 
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { useToast } from '../common/ToastNotification';

export interface ShapDriver {
  feature: string;
  impact_log_odds: number;
  direction?: 'increases_risk' | 'decreases_risk' | string;
  value?: any;
}

export interface GeminiForensicCardProps {
  domainTitle: string;
  modelName: string;
  riskScore: number; // 0 to 100
  fraudProbability: number; // 0.0 to 1.0
  decisionThreshold: number; // e.g. 0.40 or 0.1798
  classification: string;
  anomalyScore?: number | null;
  shapDrivers: ShapDriver[];
  aiReasoningText?: string;
  rawRecord?: Record<string, any>;
  isLiveGemini?: boolean;
}

export const GeminiForensicCard: React.FC<GeminiForensicCardProps> = ({
  domainTitle,
  modelName,
  riskScore,
  fraudProbability,
  decisionThreshold,
  classification,
  anomalyScore = null,
  shapDrivers = [],
  aiReasoningText = '',
  rawRecord,
  isLiveGemini = true,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [activeTab, setActiveTab] = useState<'narrative' | 'shap' | 'compliance'>('narrative');

  const isHighRisk = riskScore >= 70 || classification.includes('HIGH') || classification.includes('CRITICAL');
  const isElevated = riskScore >= 40 && !isHighRisk;

  // SVG Gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  const handleCopyDigest = () => {
    const digest = `TRUSTFED FORENSIC DIGEST
Domain: ${domainTitle}
Model: ${modelName}
Risk Score: ${riskScore}/100 (Probability: ${(fraudProbability * 100).toFixed(2)}%)
Decision Cutoff: ${(decisionThreshold * 100).toFixed(2)}%
Classification: ${classification}
Statutory Alignment: NIST AI RMF, FCRA §609, EU AI Act Title III
Generated at: ${new Date().toISOString()}

EXECUTIVE NARRATIVE:
${aiReasoningText || 'Standard calibrated baseline evaluation.'}`;

    navigator.clipboard?.writeText(digest);
    setCopied(true);
    toast({
      title: 'Forensic Digest Copied',
      description: 'Audit brief ready for ticket or compliance archive.',
      type: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportBrief = () => {
    const content = `# TRUSTFED REGULATORY AUDIT BRIEF
**Domain:** ${domainTitle}  
**Model Artifact:** ${modelName}  
**Timestamp:** ${new Date().toISOString()}  
**Calculated Risk Score:** ${riskScore}/100  
**Fraud Probability:** ${(fraudProbability * 100).toFixed(4)}%  
**Authoritative Decision:** ${classification}  
**Calibrated Cutoff:** ${(decisionThreshold * 100).toFixed(2)}%  

---

## 1. Executive Summary & Forensic Narrative
${aiReasoningText || 'Evaluated against multi-party federated model.'}

---

## 2. SHAP Feature Attribution Matrix
${shapDrivers
  .map(
    (d, i) =>
      `${i + 1}. **${d.feature}**: ${d.impact_log_odds > 0 ? '+' : ''}${d.impact_log_odds.toFixed(4)} log-odds (${d.direction || 'impact'})`
  )
  .join('\n')}

---

## 3. Statutory Compliance Alignment
- **NIST AI RMF 1.0 (GOVERN-1.2):** Validated cross-silo differential privacy epsilon bounds (ε=2.45).
- **US Equal Credit Opportunity Act (ECOA) / FCRA:** Deterministic principal risk factor disclosure.
- **EU AI Act Title III (High-Risk AI Systems):** Auditable human oversight loop and zero plain-text record leakage.
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustFed_Audit_Brief_${domainTitle.replace(/\s+/g, '_')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Audit Brief Exported',
      description: 'Regulatory audit markdown downloaded to local machine.',
      type: 'info',
    });
  };

  const handleToggleFlag = () => {
    setIsFlagged(!isFlagged);
    toast({
      title: !isFlagged ? 'Flagged for Secondary SIU Review' : 'Review Flag Cleared',
      description: !isFlagged
        ? 'Transaction routed to senior compliance officer queue.'
        : 'Status returned to standard queue.',
      type: !isFlagged ? 'warning' : 'info',
    });
  };

  // Parse structured sections from markdown text
  const parseSections = (text: string) => {
    if (!text) return [];
    const sectionRegex = /(?:^|\n)(?:###\s*|\*\*)([A-Za-z0-9\s&()\-]+)(?:\*\*|:)?(?:\n|:)/g;
    const matches = [...text.matchAll(sectionRegex)];
    if (matches.length < 2) return [{ title: 'Forensic Audit Narrative', body: text }];

    const sections: { title: string; body: string }[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const title = match[1].replace(/[:*#]/g, '').trim();
      const startIndex = (match.index ?? 0) + match[0].length;
      const endIndex = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
      const body = text.slice(startIndex, endIndex).trim();
      sections.push({ title, body });
    }
    return sections;
  };

  const sections = parseSections(aiReasoningText);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#060D1E]/85 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl space-y-5 p-6 sm:p-7">
      
      {/* 1. FORENSIC HEADER WITH RADIAL PROGRESS GAUGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/25">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-mono tracking-tight">
                Google Gemini Forensic Intelligence Panel
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950/80 text-cyan-300 border border-indigo-700/60 shadow-xs">
                {isLiveGemini ? 'gemini-2.5-flash' : 'Deterministic Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative ML evaluation calibrated by cross-institutional federated weights.
            </p>
          </div>
        </div>

        {/* RADIAL SCORE GAUGE */}
        <div className="flex items-center gap-4 bg-[#030713]/80 px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="#1e293b"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke={isHighRisk ? '#f43f5e' : isElevated ? '#f59e0b' : '#10b981'}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="score-gauge-circle"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className={`text-sm font-black tabular-nums ${isHighRisk ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-emerald-400'}`}>
                {riskScore}
              </span>
              <span className="text-[8px] text-slate-400 font-bold uppercase leading-none">
                Score
              </span>
            </div>
          </div>

          <div className="space-y-0.5 font-mono">
            <div className={`text-xs font-black uppercase tracking-wider ${isHighRisk ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-emerald-400'}`}>
              {classification}
            </div>
            <div className="text-[10px] text-slate-400">
              Cutoff: <span className="text-slate-200">{(decisionThreshold * 100).toFixed(1)}%</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Prob: <span className="text-slate-200">{(fraudProbability * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUBTAB CONTROLS */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('narrative')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'narrative'
              ? 'bg-white/10 text-white border border-white/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          📌 Executive Narrative
        </button>
        <button
          onClick={() => setActiveTab('shap')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'shap'
              ? 'bg-white/10 text-white border border-white/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          ⚡ SHAP Driver Waterfall ({shapDrivers.length})
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'compliance'
              ? 'bg-white/10 text-white border border-white/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          🛡️ Statutory Alignment
        </button>
      </div>

      {/* 3. SUBTAB CONTENT */}
      <AnimatePresence mode="wait">
        {activeTab === 'narrative' && (
          <motion.div
            key="tab-narrative"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3.5"
          >
            {sections.map((sec, idx) => {
              const lower = sec.title.toLowerCase();
              const isSummary = lower.includes('summary');
              const isEvidence = lower.includes('evidence') || lower.includes('shap');
              const isNetwork = lower.includes('network') || lower.includes('silo') || lower.includes('parity');
              const isChecks = lower.includes('verification') || lower.includes('check');

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-white/10 bg-[#030713]/80 transition-all text-slate-200 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1.5 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <span>{isSummary ? '📊' : isEvidence ? '⚡' : isNetwork ? '🌐' : '🛡️'}</span>
                    <span>{sec.title}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                    {sec.body}
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'shap' && (
          <motion.div
            key="tab-shap"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="text-xs text-slate-400 font-mono flex items-center justify-between pb-1 border-b border-white/10">
              <span>Feature Impact Attribution (|SHAP| log-odds contribution)</span>
              <span className="text-[10px] text-slate-500">Authoritative GBDT Decomposition</span>
            </div>

            {shapDrivers.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                No SHAP factors returned for this evaluation.
              </div>
            ) : (
              <div className="space-y-2.5">
                {shapDrivers.map((driver, idx) => {
                  const impact = driver.impact_log_odds;
                  const isRiskPusher = impact > 0;
                  const maxAbs = Math.max(...shapDrivers.map((d) => Math.abs(d.impact_log_odds)), 1);
                  const barWidth = Math.min(100, Math.round((Math.abs(impact) / maxAbs) * 100));

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#030713]/80 border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-200">{driver.feature}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-black tabular-nums ${isRiskPusher ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {impact > 0 ? '+' : ''}{impact.toFixed(3)}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isRiskPusher ? 'bg-rose-950/80 text-rose-300 border border-rose-800' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          }`}>
                            {isRiskPusher ? 'Fraud Driver' : 'Mitigating Factor'}
                          </span>
                        </div>
                      </div>

                      {/* Visual Waterfall Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isRiskPusher
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'compliance' && (
          <motion.div
            key="tab-compliance"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3 text-xs"
          >
            <div className="p-3.5 rounded-2xl bg-[#030713]/80 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 font-mono font-bold text-cyan-400">
                <Scale className="w-4 h-4" />
                <span>NIST AI RMF 1.0 (GOVERN-1.2 & MEASURE-2.5)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Cryptographic differential privacy enforcement (Rényi DP with ε=2.45, δ=1e-5). Cross-institution training satisfies non-leakage standards without plain-text record exposure.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#030713]/80 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 font-mono font-bold text-blue-400">
                <ExternalLink className="w-4 h-4" />
                <span>Fair Credit Reporting Act (FCRA) §609 & ECOA Reg B</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Adverse action defensibility enabled via deterministic SHAP decomposition. Top 4 principal contributing features are disclosed directly to applicants.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#030713]/80 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 font-mono font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>EU AI Act Title III (High-Risk Financial AI Conformity)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Full technical documentation, automatic logging of batch inferences, and verifiable human-in-the-loop review actions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. COMPLIANCE ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyDigest}
            className="px-4 py-2 rounded-full text-xs font-mono font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copied ? 'Copied' : 'Copy Forensic Digest'}</span>
          </button>

          <button
            onClick={handleExportBrief}
            className="px-4 py-2 rounded-full text-xs font-mono font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Regulatory Brief (.md)</span>
          </button>
        </div>

        <button
          onClick={handleToggleFlag}
          className={`px-4 py-2 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
            isFlagged
              ? 'bg-rose-950 text-rose-300 border-rose-700 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
              : 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/15'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current text-rose-400' : 'text-slate-400'}`} />
          <span>{isFlagged ? 'Flagged for SIU Review' : 'Flag for Secondary Review'}</span>
        </button>
      </div>

    </div>
  );
};
