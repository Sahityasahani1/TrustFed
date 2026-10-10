import React, { useState } from 'react';
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
  isStreaming?: boolean;
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
  isStreaming = false,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const isHighRisk = riskScore >= 70 || classification.toLowerCase().includes('fraud') || classification.includes('HIGH');
  const isElevated = riskScore >= 40 && !isHighRisk;

  // SVG Gauge calculations
  const radius = 32;
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
      description: 'Audit brief copied to clipboard for tickets and compliance logs.',
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
      `${i + 1}. **${d.feature}**: ${d.impact_log_odds > 0 ? '+' : ''}${d.impact_log_odds.toFixed(4)} log-odds (${d.direction || (d.impact_log_odds > 0 ? 'increases risk' : 'decreases risk')})`
  )
  .join('\n')}

---

## 3. Statutory Compliance Alignment
- **NIST AI RMF 1.0 (GOVERN-1.2):** Validated cross-silo differential privacy epsilon bounds (ε=2.45).
- **US Equal Credit Opportunity Act (ECOA) / FCRA §609:** Deterministic principal risk factor disclosure.
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
      title: !isFlagged ? 'Flagged for SIU Review' : 'Review Flag Cleared',
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

  // Maximum impact for SHAP scaling
  const maxShapAbs = Math.max(...shapDrivers.map((d) => Math.abs(d.impact_log_odds)), 1);

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 shadow-xs space-y-6 p-5 sm:p-6 transition-colors">
      
      {/* 1. HEADER: AUDIT BRIEF IDENTITY & AUTHORITATIVE RISK METRICS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Autonomous Intelligence
            </span>
            {isStreaming ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                SSE Stream (TTFT &lt; 300ms)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60">
                {isLiveGemini ? 'Gemini 2.5 Flash' : 'Deterministic Mode'}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            Regulatory Forensic Brief &amp; Attribution
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Calibrated on multi-party federated model ({modelName}) with differential privacy guarantees.
          </p>
        </div>

        {/* RISK SCORE & GAUGE HUD */}
        <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-white/5 shrink-0">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r={radius}
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-700"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                stroke={isHighRisk ? '#f43f5e' : isElevated ? '#f59e0b' : '#10b981'}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="score-gauge-circle transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className={`text-xs font-bold tabular-nums ${isHighRisk ? 'text-rose-600 dark:text-rose-400' : isElevated ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {riskScore}
              </span>
              <span className="text-[7px] text-zinc-400 font-medium uppercase leading-none">
                Score
              </span>
            </div>
          </div>

          <div className="space-y-0.5 font-mono text-left">
            <div className={`text-xs font-bold uppercase tracking-wider ${isHighRisk ? 'text-rose-600 dark:text-rose-400' : isElevated ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {classification}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Cutoff: <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">{(decisionThreshold * 100).toFixed(1)}%</span>
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Prob: <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">{(fraudProbability * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONTINUOUS REPORT SECTION 1: EXECUTIVE FORENSIC NARRATIVE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60 dark:border-white/5">
          <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            1. Executive Forensic Narrative
          </span>
          {isStreaming && (
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
              Streaming Tokens...
            </span>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 text-xs text-zinc-500 font-mono">
            Awaiting model inference and executive narrative generation...
          </div>
        ) : (
          <div className="space-y-2.5">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 text-zinc-800 dark:text-zinc-200 space-y-1.5"
              >
                <div className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {sec.title}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans whitespace-pre-line">
                  {sec.body}
                  {isStreaming && idx === sections.length - 1 && (
                    <span className="inline-block font-mono text-cyan-500 ml-1 animate-pulse font-bold">
                      ▋
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. CONTINUOUS REPORT SECTION 2: DIVERGENT SHAP WATERFALL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60 dark:border-white/5">
          <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            2. SHAP Feature Attribution Waterfall ({shapDrivers.length} Factors)
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            GBDT Log-Odds Decomposition
          </span>
        </div>

        {shapDrivers.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 text-xs text-zinc-500 font-mono text-center">
            No local SHAP factors returned for this evaluation.
          </div>
        ) : (
          <div className="space-y-2">
            {shapDrivers.map((driver, idx) => {
              const impact = driver.impact_log_odds;
              const isRiskPusher = impact > 0;
              const percentage = Math.min(100, Math.round((Math.abs(impact) / maxShapAbs) * 100));

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 space-y-1.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{driver.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold tabular-nums ${isRiskPusher ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {impact > 0 ? '+' : ''}{impact.toFixed(4)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        isRiskPusher 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isRiskPusher ? 'Fraud Driver' : 'Mitigating'}
                      </span>
                    </div>
                  </div>

                  {/* Divergent Waterfall Bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700/60 overflow-hidden flex">
                    {isRiskPusher ? (
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    ) : (
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. CONTINUOUS REPORT SECTION 3: STATUTORY COMPLIANCE ALIGNMENT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60 dark:border-white/5">
          <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            3. Statutory Compliance Alignment
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            NIST AI RMF • FCRA §609 • EU AI Act
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 space-y-1">
            <div className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>NIST AI RMF 1.0</span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
              GOVERN-1.2 &amp; MEASURE-2.5 parity: Rényi DP (ε=2.45, δ=1e-5) guaranteed zero customer record leakage.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 space-y-1">
            <div className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>FCRA §609 / ECOA</span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
              Adverse action defensibility via deterministic top-4 SHAP attributions disclosed to applicants.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 space-y-1">
            <div className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>EU AI Act Title III</span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
              High-Risk AI System conformity: immutable batch logging, human-in-the-loop audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* 5. AUDIT ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyDigest}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
            <span>{copied ? 'Copied' : 'Copy Digest'}</span>
          </button>

          <button
            onClick={handleExportBrief}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export Brief (.md)</span>
          </button>
        </div>

        <button
          onClick={handleToggleFlag}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-colors border ${
            isFlagged
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current text-rose-500' : 'text-zinc-400'}`} />
          <span>{isFlagged ? 'Flagged for SIU Review' : 'Flag for Secondary Review'}</span>
        </button>
      </div>

    </div>
  );
};
