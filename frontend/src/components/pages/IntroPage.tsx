import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Sparkles, 
  Play, 
  ArrowRight, 
  Cpu, 
  Lock, 
  Activity, 
  Building2, 
  Wallet, 
  CheckCircle2, 
  Database,
  Layers,
  Zap,
  Terminal,
  Umbrella,
  FileText
} from 'lucide-react';
import { FederatedTopologyVisualizer } from '../hero/FederatedTopologyVisualizer';

interface IntroPageProps {
  onStart: () => void;
  onRunSimulation: () => void;
  onInspectDomain?: (domain: 'intelligence' | 'creditfraud' | 'insurance') => void;
}

export const IntroPage: React.FC<IntroPageProps> = ({
  onStart,
  onRunSimulation,
  onInspectDomain,
}) => {
  return (
    <div className="space-y-10 animate-fadeIn">
      {/* MINIMALIST ENTERPRISE HERO STAGE */}
      <div className="relative rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 py-12 sm:py-16 px-6 sm:px-12 shadow-xs backdrop-blur-xl overflow-hidden">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#80808012_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6 text-center">
          {/* Announcement Capsule Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 shadow-xs">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              SECAGG+ ACTIVE
            </span>
            <span className="font-sans">Multi-institution federated consensus & ONNX FP16 engine live</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 font-sans leading-[1.1]">
              Federated intelligence,
            </h1>
            <p className="text-3xl sm:text-4xl lg:text-5xl text-zinc-500 dark:text-zinc-400 font-sans tracking-tight leading-[1.15]">
              collaborating without raw data exposure.
            </p>
          </div>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed">
            Deploy privacy-preserving AI models that evaluate, reason, and detect fraud across institutional silos.
            Zero customer records leave local firewalls — governed by SecAgg+ pairwise masking and Rényi DP guarantees.
          </p>

          {/* Integrated Minimalist Command Console */}
          <div className="pt-4 max-w-2xl mx-auto text-left">
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/70 p-4 space-y-3.5 shadow-xs">
              {/* Terminal CLI Line */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/5 font-mono text-xs text-zinc-800 dark:text-zinc-200 overflow-x-auto">
                <span className="text-zinc-400 shrink-0 select-none">$</span>
                <span className="text-zinc-600 dark:text-zinc-400 select-none">trustfed eval</span>
                <span className="text-emerald-600 dark:text-emerald-400">--silos banks,lenders,insurers</span>
                <span className="text-cyan-600 dark:text-cyan-400">--engine onnx-fp16</span>
                <span className="text-zinc-500">--privacy-dp 2.45</span>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
                <div className="flex flex-wrap items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    3 Silos Online
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-white/5">
                    <Lock className="w-3 h-3 text-cyan-500" />
                    Rényi ε=2.45
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-white/5">
                    <Zap className="w-3 h-3 text-amber-500" />
                    ORT FP16 18ms
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onRunSimulation}
                    className="px-2.5 py-1 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Activity className="w-3 h-3" />
                    <span>Pulse Wave</span>
                  </button>
                  <button
                    type="button"
                    onClick={onStart}
                    className="px-3 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Domain Router Pills */}
            {onInspectDomain && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <span className="text-[11px] font-mono text-zinc-400">Direct inspect:</span>
                <button
                  type="button"
                  onClick={() => onInspectDomain('intelligence')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Building2 className="w-3 h-3 text-blue-500" />
                  <span>Banks (PaySim)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInspectDomain('creditfraud')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Wallet className="w-3 h-3 text-emerald-500" />
                  <span>Lenders (Credit)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInspectDomain('insurance')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Umbrella className="w-3 h-3 text-cyan-500" />
                  <span>Insurers (Claims)</span>
                </button>
              </div>
            )}
          </div>

          {/* Institutional Trust Bar */}
          <div className="pt-8 border-t border-zinc-200/60 dark:border-white/5 space-y-3">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-widest block">
              Federated deployment across Tier-1 institutions
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">N</span> NORTHWIND BANK
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5">
                <span>●</span> LUMEN PAY
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5">
                <span>▲</span> KESTREL CLEARING
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5">
                <span>⁘</span> QUADRANT
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors tracking-widest font-semibold">
                VERTEX CAPITAL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE FEDERATED TOPOLOGY VISUALIZER */}
      <FederatedTopologyVisualizer onInspectDomain={onInspectDomain} />

      {/* CORE ARCHITECTURE PILLARS (BENTO GRID) */}
      <div className="space-y-6 pt-4">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Architectural Guarantees
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight font-sans">
            Collaborate on models, never on records.
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            Three cryptographic and systemic guarantees that enable secure multi-party fraud detection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Card 1: Silo Isolation */}
          <div className="p-6 rounded-2xl space-y-4 border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 shadow-xs hover:border-zinc-300 dark:hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-white/5">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">Module 01</span>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">Silo Boundary Isolation</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Raw customer ledgers, account balances, and PII remain permanently quarantined behind institutional firewalls. No raw records are pooled.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero Raw Records Shared
              </span>
            </div>
          </div>

          {/* Card 2: SecAgg+ & DP */}
          <div className="p-6 rounded-2xl space-y-4 border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 shadow-xs hover:border-zinc-300 dark:hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-white/5">
              <Cpu className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">Module 02</span>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">SecAgg+ & Rényi DP</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Flower FedAvg with Diffie-Hellman pairwise masks. Aggregator computes global weight tensors without inspecting individual partner gradients.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/20">
                <Lock className="w-3.5 h-3.5" />
                Rényi Budget: ε = 2.45
              </span>
            </div>
          </div>

          {/* Card 3: Showdown & Explainability */}
          <div className="p-6 rounded-2xl space-y-4 border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 shadow-xs hover:border-zinc-300 dark:hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-white/5">
              <Layers className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">Module 03</span>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">Showdown & Explainability</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Empirical split-screen benchmark: Silo model misses attack (13/100) vs Federated model flags it (87/100) with real-time SHAP waterfall reason codes.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                PR-AUC 0.842 (+22% Lift)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CALLOUT CARD */}
      <div className="relative overflow-hidden rounded-2xl p-8 sm:p-10 border border-zinc-200/80 dark:border-white/10 bg-zinc-900 text-zinc-100 dark:bg-zinc-900/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Ready to test private federated risk scoring?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl font-normal leading-relaxed">
            Enter the interactive workbench to run ONNX FP16 batch screening, stream real-time AI regulatory audit briefs, and inspect live confusion matrices.
          </p>
        </div>

        <button
          onClick={onStart}
          className="shrink-0 px-6 py-3 rounded-xl text-xs font-mono font-medium flex items-center gap-2 cursor-pointer bg-white text-zinc-950 hover:bg-zinc-100 transition-colors shadow-xs"
        >
          <span>Launch Workbench</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
