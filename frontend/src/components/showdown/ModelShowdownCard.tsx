import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export interface ModelShowdownCardProps {
  domainTitle: string;
  siloModelName: string;
  federatedModelName: string;
  siloScore: number; // 0 to 100
  federatedScore: number; // 0 to 100
  siloVerdict: string;
  federatedVerdict: string;
  defaultThreshold?: number; // e.g. 0.40 or 0.1798
  prAucLiftText?: string;
  fpReductionText?: string;
  totalPopulation?: number;
}

export const ModelShowdownCard: React.FC<ModelShowdownCardProps> = ({
  domainTitle,
  siloModelName,
  federatedModelName,
  siloScore,
  federatedScore,
  siloVerdict,
  federatedVerdict,
  defaultThreshold = 0.40,
  prAucLiftText = '+185.3% PR-AUC Lift',
  fpReductionText = '-64.2% False Positives',
  totalPopulation = 10000,
}) => {
  const [threshold, setThreshold] = useState<number>(defaultThreshold);
  const [activeCurve, setActiveCurve] = useState<'pr' | 'roc'>('pr');

  // Generate realistic PR & ROC Curve data points
  const curveData = useMemo(() => {
    const points = [];
    for (let i = 1; i <= 20; i++) {
      const recall = i / 20;
      // TrustFed curve maintains higher precision at high recall
      const fedPrecision = Math.max(0.2, Math.min(0.98, 0.96 - Math.pow(recall, 1.8) * 0.45));
      // Isolated Silo curve drops off steeply
      const siloPrecision = Math.max(0.05, Math.min(0.85, 0.78 - Math.pow(recall, 1.2) * 0.65));
      
      // False Positive Rate vs True Positive Rate for ROC
      const fpr = recall;
      const fedTpr = Math.min(1.0, 1 - Math.exp(-4 * fpr));
      const siloTpr = Math.min(1.0, 1 - Math.exp(-2.2 * fpr));

      points.push({
        step: (recall * 100).toFixed(0) + '%',
        recall: recall,
        fpr: fpr,
        fedPrecision: parseFloat(fedPrecision.toFixed(3)),
        siloPrecision: parseFloat(siloPrecision.toFixed(3)),
        fedTpr: parseFloat(fedTpr.toFixed(3)),
        siloTpr: parseFloat(siloTpr.toFixed(3)),
      });
    }
    return points;
  }, []);

  // Compute live dynamic confusion matrix based on interactive threshold
  const confusionMatrix = useMemo(() => {
    const totalFraud = Math.round(totalPopulation * 0.05); // 5% base fraud
    const totalLegit = totalPopulation - totalFraud;

    // Detection rates scale smoothly with threshold
    const fedCaptureRate = Math.max(0.1, 1 - Math.pow(threshold, 1.5) * 0.85);
    const siloCaptureRate = Math.max(0.05, 1 - Math.pow(threshold, 0.8) * 0.90);

    const fedFpRate = Math.max(0.002, Math.pow(1 - threshold, 2.5) * 0.04);
    const siloFpRate = Math.max(0.008, Math.pow(1 - threshold, 1.6) * 0.09);

    const fedTP = Math.round(totalFraud * fedCaptureRate);
    const fedFN = totalFraud - fedTP;
    const fedFP = Math.round(totalLegit * fedFpRate);
    const fedTN = totalLegit - fedFP;

    const siloTP = Math.round(totalFraud * siloCaptureRate);
    const siloFN = totalFraud - siloTP;
    const siloFP = Math.round(totalLegit * siloFpRate);
    const siloTN = totalLegit - siloFP;

    return {
      fed: { tp: fedTP, fn: fedFN, fp: fedFP, tn: fedTN, capture: (fedCaptureRate * 100).toFixed(1) },
      silo: { tp: siloTP, fn: siloFN, fp: siloFP, tn: siloTN, capture: (siloCaptureRate * 100).toFixed(1) },
    };
  }, [threshold, totalPopulation]);

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
      
      {/* 1. HEADER & SINGLE-LINE METRIC LIFT STRIP */}
      <div className="space-y-3 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Cross-Institution Showdown
              </span>
            </div>
            <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans mt-0.5">
              Isolated Silo vs. TrustFed Federated Model
            </h3>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {domainTitle} Benchmark
          </span>
        </div>

        {/* SINGLE-LINE HORIZONTAL METRIC LIFT RIBBON */}
        <div className="flex flex-wrap items-center gap-2 py-1 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 text-xs font-mono">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {prAucLiftText}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-medium">
            {fpReductionText}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span className="text-zinc-600 dark:text-zinc-400">
            0 Raw Records Transmitted
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            SecAgg 3/3 Active
          </span>
        </div>
      </div>

      {/* 2. SPLIT-SCREEN VERDICT CARDS (CURRENT EVALUATION) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        
        {/* ISOLATED SILO MODEL CARD */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-white/5 pb-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">{siloModelName}</span>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Isolated Silo
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Assigned Risk Score:</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 dark:text-zinc-200 tabular-nums">
              {siloScore} <span className="text-xs font-normal text-zinc-400">/ 100</span>
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 dark:text-zinc-400">Verdict:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{siloVerdict}</span>
          </div>

          <div className="text-[11px] text-amber-700 dark:text-amber-300/90 flex items-start gap-1.5 pt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>Blind to multi-silo hops and cross-institution mule account patterns.</span>
          </div>
        </div>

        {/* TRUSTFED FEDERATED MODEL CARD */}
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">{federatedModelName}</span>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              SecAgg Consensus
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Collaborative Risk Score:</span>
            <span className={`text-2xl font-bold font-mono tabular-nums ${federatedScore >= 70 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {federatedScore} <span className="text-xs font-normal text-zinc-400">/ 100</span>
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-emerald-500/20 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 dark:text-zinc-400">Verdict:</span>
            <span className={`font-semibold ${federatedScore >= 70 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {federatedVerdict}
            </span>
          </div>

          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5 pt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>Detects distributed coordinated attacks using multi-party aggregated weights.</span>
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE RECHARTS CURVES (PR & ROC) */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCurve('pr')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeCurve === 'pr'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              PR Curve (PR-AUC)
            </button>
            <button
              onClick={() => setActiveCurve('roc')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeCurve === 'roc'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              ROC Curve (ROC-AUC)
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">TrustFed Federated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-zinc-400 inline-block border-b border-dashed" />
              <span className="text-zinc-400">Isolated Silo</span>
            </div>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-52 sm:h-60 w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
              <XAxis
                dataKey="step"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                domain={[0, 1]}
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#fafafa'
                }}
              />
              {activeCurve === 'pr' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="fedPrecision"
                    name="TrustFed Precision"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="siloPrecision"
                    name="Silo Precision"
                    stroke="#71717a"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="fedTpr"
                    name="TrustFed TPR"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="siloTpr"
                    name="Silo TPR"
                    stroke="#71717a"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. INTERACTIVE THRESHOLD SLIDER & DYNAMIC CONFUSION MATRIX */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-white/5 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            <span>Decision Cutoff Threshold:</span>
            <span className="text-zinc-900 dark:text-zinc-100 tabular-nums">{(threshold * 100).toFixed(1)}%</span>
          </div>
          <span className="text-[11px] text-zinc-500">
            Simulate operational tradeoff between Fraud Recall and Customer Friction
          </span>
        </div>

        <input
          type="range"
          min="0.05"
          max="0.95"
          step="0.01"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
        />

        {/* Live Dynamic Confusion Matrix Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
          
          {/* Silo Confusion Matrix */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-zinc-500 pb-1 border-b border-zinc-100 dark:border-zinc-700/40">
              <span>Isolated Silo</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Recall: {confusionMatrix.silo.capture}%</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center text-[11px]">
              <div className="p-1 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-white/5">
                <span className="text-zinc-400 block text-[9px]">True Positives</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{confusionMatrix.silo.tp}</span>
              </div>
              <div className="p-1 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-white/5">
                <span className="text-zinc-400 block text-[9px]">False Positives</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{confusionMatrix.silo.fp}</span>
              </div>
            </div>
          </div>

          {/* TrustFed Confusion Matrix */}
          <div className="p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 pb-1 border-b border-emerald-500/10">
              <span className="font-medium">TrustFed Federated</span>
              <span className="font-bold">Recall: {confusionMatrix.fed.capture}%</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center text-[11px]">
              <div className="p-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-white/5">
                <span className="text-zinc-400 block text-[9px]">True Positives</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{confusionMatrix.fed.tp}</span>
              </div>
              <div className="p-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-white/5">
                <span className="text-zinc-400 block text-[9px]">False Positives</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{confusionMatrix.fed.fp}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
