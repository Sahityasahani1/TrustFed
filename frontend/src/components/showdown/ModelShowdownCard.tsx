import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  Info,
  Layers,
  Sparkles
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

  // Generate realistic PR Curve data points
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
    <div className="rounded-3xl border border-white/10 bg-[#060D1E]/85 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 sm:p-7 space-y-6 backdrop-blur-2xl">
      
      {/* 1. HEADER & METRIC LIFT PILLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-white">
              Isolated Silo vs. TrustFed Federated Model Showdown
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare model sensitivity when defending in isolation vs collaborative consensus.
          </p>
        </div>

        {/* BOLD METRIC LIFT PILLS */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{prAucLiftText}</span>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>{fpReductionText}</span>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>0 Raw Bytes Leaked</span>
          </div>
        </div>
      </div>

      {/* 2. SPLIT-SCREEN VERDICT CARDS (CURRENT EVALUATION) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* SILO MODEL CARD */}
        <div className="p-5 rounded-2xl bg-[#030713]/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold font-mono text-slate-300">{siloModelName}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
              Isolated Silo
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-mono">Assigned Risk Score:</span>
            <span className="text-2xl font-black font-mono text-slate-300 tabular-nums">
              {siloScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Verdict:</span>
            <span className="font-bold text-slate-200">{siloVerdict}</span>
          </div>

          <div className="text-[11px] text-amber-300/80 flex items-start gap-1.5 pt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Vulnerable to cross-institution account takeover and multi-silo hops.</span>
          </div>
        </div>

        {/* TRUSTFED FEDERATED MODEL CARD */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#060D1E] via-[#081B26] to-[#04241B] border-2 border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.15)] space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold font-mono text-white">{federatedModelName}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700">
              SecAgg+ Consensus
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-mono">Collaborative Risk Score:</span>
            <span className={`text-2xl font-black font-mono tabular-nums ${federatedScore >= 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {federatedScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Verdict:</span>
            <span className={`font-bold ${federatedScore >= 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {federatedVerdict}
            </span>
          </div>

          <div className="text-[11px] text-emerald-300 flex items-start gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Identifies high-entropy cross-silo drainage and mule hops in real time.</span>
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE RECHARTS CURVES (PR & ROC) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCurve('pr')}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeCurve === 'pr'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Precision-Recall Curve (PR-AUC)
            </button>
            <button
              onClick={() => setActiveCurve('roc')}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeCurve === 'roc'
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Receiver Operating Characteristic (ROC-AUC)
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              <span className="text-emerald-400 font-bold">TrustFed Federated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-500 inline-block border-b border-dashed" />
              <span className="text-slate-400">Isolated Silo</span>
            </div>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-56 sm:h-64 w-full p-2 rounded-2xl bg-[#030713]/90 border border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="step"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                domain={[0, 1]}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#070D1E',
                  borderColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              {activeCurve === 'pr' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="fedPrecision"
                    name="TrustFed Precision"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="siloPrecision"
                    name="Silo Precision"
                    stroke="#64748b"
                    strokeWidth={1.8}
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
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="siloTpr"
                    name="Silo TPR"
                    stroke="#64748b"
                    strokeWidth={1.8}
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
      <div className="p-4 sm:p-5 rounded-2xl bg-[#030713]/90 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase">
              Dynamic Classification Threshold: <span className="text-cyan-400 tabular-nums">{(threshold * 100).toFixed(1)}%</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Drag to simulate operational trade-off between Fraud Capture and False Positive friction
          </span>
        </div>

        <input
          type="range"
          min="0.05"
          max="0.95"
          step="0.01"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />

        {/* Live Dynamic Confusion Matrix Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono">
          
          {/* Silo Confusion */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-white/10 pb-1">
              <span>Isolated Silo Matrix</span>
              <span className="text-amber-400 font-bold">Capture: {confusionMatrix.silo.capture}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="p-1.5 rounded bg-[#030713] border border-white/5">
                <span className="text-slate-500 block text-[9px]">True Positive:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{confusionMatrix.silo.tp}</span>
              </div>
              <div className="p-1.5 rounded bg-[#030713] border border-white/5">
                <span className="text-slate-500 block text-[9px]">False Positive:</span>
                <span className="font-bold text-rose-400 tabular-nums">{confusionMatrix.silo.fp}</span>
              </div>
            </div>
          </div>

          {/* TrustFed Confusion */}
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between text-emerald-300 border-b border-emerald-500/20 pb-1">
              <span>TrustFed Federated Matrix</span>
              <span className="text-emerald-300 font-bold">Capture: {confusionMatrix.fed.capture}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="p-1.5 rounded bg-[#030713] border border-white/5">
                <span className="text-slate-400 block text-[9px]">True Positive:</span>
                <span className="font-bold text-emerald-300 tabular-nums">{confusionMatrix.fed.tp}</span>
              </div>
              <div className="p-1.5 rounded bg-[#030713] border border-white/5">
                <span className="text-slate-400 block text-[9px]">False Positive:</span>
                <span className="font-bold text-cyan-300 tabular-nums">{confusionMatrix.fed.fp}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
