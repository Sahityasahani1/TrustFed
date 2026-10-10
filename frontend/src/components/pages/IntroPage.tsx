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
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  Database,
  Layers,
  Zap
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
    <div className="space-y-12 animate-fadeIn">
      {/* AETHER-INSPIRED COSMIC CELESTIAL HERO STAGE */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.8)] bg-[#02050E] border border-white/10 pt-12 pb-20 px-4 sm:px-8">
        
        {/* Subtle Starry Stardust Particles */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute top-[10%] left-[16%] w-1 h-1 bg-white rounded-full animate-ping opacity-75" />
          <div className="absolute top-[26%] left-[84%] w-1 h-1 bg-sky-300 rounded-full animate-pulse opacity-80" />
          <div className="absolute top-[14%] right-[22%] w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-90" />
          <div className="absolute top-[42%] left-[6%] w-1 h-1 bg-white rounded-full opacity-60" />
          <div className="absolute top-[60%] right-[10%] w-1 h-1 bg-sky-200 rounded-full opacity-50" />
          <div className="absolute top-[32%] right-[4%] w-1 h-1 bg-white rounded-full opacity-70" />
          <div className="absolute top-[70%] left-[20%] w-1 h-1 bg-blue-200 rounded-full opacity-40" />
          <div className="absolute top-[48%] right-[28%] w-1 h-1 bg-sky-400 rounded-full animate-ping opacity-60" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto space-y-7 text-center">
          
          {/* 1. TOP ANNOUNCEMENT CAPSULE PILL */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl text-xs text-slate-300 hover:border-white/20 transition-all cursor-pointer shadow-sm">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm">
              NEW
            </span>
            <span>TrustFed Agents 2.0: multi-institution SecAgg+ orchestration is live</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* 2. DUAL-TYPOGRAPHY HEADLINE (SANS + EDITORIAL ITALIC SERIF) */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white font-display">
              Federated intelligence,
            </h1>
            <h2 className="text-5xl sm:text-7xl lg:text-8xl text-white font-editorial-italic leading-[1.05]">
              collaborating while privacy holds
            </h2>
          </div>

          {/* 3. SUBTITLE */}
          <p className="text-sm sm:text-base text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed pt-1">
            Deploy privacy-preserving AI models that evaluate, reason and protect across institutional silos. Fully observable, governed by SecAgg+ and built to scale with zero raw customer records shared.
          </p>

          {/* 4. FLOATING ORBIT STAGE WITH WIDGETS & COMMAND CONSOLE */}
          <div className="relative pt-6 max-w-3xl mx-auto">
            
            {/* Floating Cursor Pointer 1 (Top-Left: Bank Alpha) */}
            <div className="absolute -top-3 left-2 sm:left-8 flex items-center gap-1.5 z-30 pointer-events-none animate-float-slow">
              <svg className="w-4 h-4 text-blue-500 fill-blue-500 drop-shadow-md" viewBox="0 0 24 24">
                <path d="M4 4l7 17 2-7 7-2L4 4z" />
              </svg>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 text-white shadow-lg shadow-blue-500/40">
                Bank Alpha
              </span>
            </div>

            {/* Floating Cursor Pointer 2 (Top-Right: Wallet Beta) */}
            <div className="absolute -top-1 right-2 sm:right-8 flex items-center gap-1.5 z-30 pointer-events-none animate-float-reverse">
              <svg className="w-4 h-4 text-white fill-white drop-shadow-md" viewBox="0 0 24 24">
                <path d="M4 4l7 17 2-7 7-2L4 4z" />
              </svg>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-slate-950 shadow-lg">
                Wallet Beta
              </span>
            </div>

            {/* Floating Left Glass Card (Run / Consensus Status) */}
            <div className="hidden lg:block absolute -left-44 xl:-left-56 top-1/2 -translate-y-12 w-60 p-4 rounded-2xl aether-glass-card border border-blue-500/20 text-xs font-mono space-y-2.5 z-20 text-left animate-float-subtle">
              <div className="flex items-center justify-between text-slate-400 border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Consensus #4,218</span>
                </div>
                <span className="text-[11px] text-slate-500">00:18</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Masked 10,000 PaySim records</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Clustered 9 cross-silo mule rings</span>
                </div>
                <div className="flex items-center gap-2 text-sky-400">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0" />
                  <span>Aggregating gradient tensor...</span>
                </div>
              </div>
            </div>

            {/* Floating Right Glass Card (Metric & Glowing Line Graph) */}
            <div className="hidden lg:block absolute -right-44 xl:-right-56 top-1/2 -translate-y-12 w-60 p-4 rounded-2xl aether-glass-card border border-blue-500/20 text-xs space-y-2 z-20 text-left animate-float-slow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Fraud Prevented this cohort</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">$4.8M</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  +185% PR-AUC
                </span>
              </div>
              {/* Glowing Blue Sparkline Curve */}
              <div className="h-10 w-full pt-1">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 28">
                  <defs>
                    <linearGradient id="aetherSparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,24 Q20,23 35,18 T70,12 T100,4 L100,28 L0,28 Z" fill="url(#aetherSparkGrad)" />
                  <path d="M0,24 Q20,23 35,18 T70,12 T100,4" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                  <circle cx="100" cy="4" r="3" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* CENTER AETHER WHITE COMMAND CONSOLE */}
            <div className="aether-console-card rounded-2xl p-4 sm:p-5 text-slate-900 space-y-3.5 text-left relative z-20">
              {/* Prompt Input Line */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  defaultValue="Investigate cross-institution mule ring & evaluate Home Credit default risk"
                  readOnly
                  className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none cursor-default"
                />
              </div>

              {/* Bottom Console Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onStart}
                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  >
                    +
                  </button>
                  <div className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    <span>Flower-FedAvg 2.0</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1">
                    <span>3 Silos</span>
                  </div>
                  <div className="hidden sm:flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium items-center gap-1">
                    <span>🌐 SecAgg+</span>
                  </div>
                  <div className="hidden md:flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium items-center gap-1">
                    <span>🛡️ DP ε=2.45</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>18ms</span>
                  </span>
                  <button
                    type="button"
                    onClick={onStart}
                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/40 hover:scale-105 transition-all cursor-pointer"
                    title="Launch Private Federated Inference"
                  >
                    <ArrowRight className="w-4 h-4 -rotate-45" />
                  </button>
                </div>
              </div>
            </div>

            {/* Orbiting Node Pills below console */}
            <div className="flex items-center justify-between px-4 pt-3 text-[11px] font-mono text-slate-400">
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#0A1020]/80 border border-white/10 px-2.5 py-1 rounded-full text-slate-300">
                <span className="w-3 h-3 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">B</span>
                <span>Bank Alpha • active</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#0A1020]/80 border border-white/10 px-2.5 py-1 rounded-full text-slate-300">
                <span className="w-3 h-3 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">W</span>
                <span>Wallet Beta • masking</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#0A1020]/80 border border-white/10 px-2.5 py-1 rounded-full text-slate-300">
                <span className="w-3 h-3 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">I</span>
                <span>Insure Gamma • verified</span>
              </span>
            </div>

          </div>

        </div>

        {/* 5. LUMINOUS CELESTIAL HORIZON ARC (EXACT PATTERN FROM AETHER REFERENCE) */}
        <div className="relative pt-24 overflow-hidden">
          
          {/* Glowing Atmospheric Arc Structure */}
          <div className="celestial-horizon-container">
            <div className="celestial-horizon-glow" />
            <div className="celestial-horizon-line" />
            <div className="celestial-horizon-body" />
          </div>

          {/* Institutional Trust Ribbon (Seated gracefully above the horizon) */}
          <div className="relative z-10 text-center space-y-4 pt-6">
            <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 tracking-[0.25em]">
              TRUSTED BY FINANCIAL OPERATORS AT
            </span>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-slate-400 font-bold tracking-wider text-xs sm:text-sm">
              <span className="hover:text-white transition-colors flex items-center gap-1.5">
                <span className="font-extrabold text-blue-400 font-mono">N</span> NORTHWIND
              </span>
              <span className="hover:text-white transition-colors flex items-center gap-1.5">
                <span className="text-cyan-400">●</span> LUMEN
              </span>
              <span className="hover:text-white transition-colors flex items-center gap-1.5">
                <span className="text-sky-400">▲</span> KESTREL
              </span>
              <span className="hover:text-white transition-colors text-base font-editorial-italic font-normal tracking-normal text-slate-300">
                Halcyon
              </span>
              <span className="hover:text-white transition-colors flex items-center gap-1.5">
                <span className="text-blue-400">⁘</span> QUADRANT
              </span>
              <span className="hover:text-white transition-colors tracking-widest font-mono text-slate-300">
                VERTEX
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* INTERACTIVE FEDERATED TOPOLOGY VISUALIZER */}
      <FederatedTopologyVisualizer onInspectDomain={onInspectDomain} />

      {/* CORE CAPABILITIES HIGHLIGHT SECTION */}
      <div className="space-y-6 pt-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-[11px] font-mono uppercase text-cyan-300 font-bold tracking-widest px-3.5 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            How TrustFed Works
          </span>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Collaborate on intelligence,{' '}
            <span className="font-editorial-italic font-normal text-cyan-300 text-3xl sm:text-5xl">
              never on customer records.
            </span>
          </h3>
          <p className="text-sm text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
            Explore the 3 foundational pillars of the TrustFed architecture designed specifically to solve cross-institutional financial fraud without privacy compromise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl space-y-4 border border-white/10 bg-[#070D1E]/75 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-cyan-500/40 hover:shadow-[0_12px_40px_rgba(6,182,212,0.15)] transition-all duration-300 group">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:scale-105 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider">Module 01</span>
              <h4 className="text-base font-bold text-white mt-1">Data Silos & Boundary Isolation</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Institutional silo boundaries with zero leakage. Raw customer records remain quarantined behind local bank and wallet firewalls.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-mono bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Zero Raw Records Shared
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl space-y-4 border border-white/10 bg-[#070D1E]/75 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-blue-500/40 hover:shadow-[0_12px_40px_rgba(59,130,246,0.15)] transition-all duration-300 group">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-blue-400 font-bold tracking-wider">Module 02</span>
              <h4 className="text-base font-bold text-white mt-1">Federated SecAgg+ & Rényi DP</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Flower FedAvg rounds with Diffie-Hellman pair-wise masks. Coordinator reconstructs global model weight sums without seeing client gradients.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 font-mono bg-blue-950/50 px-2.5 py-1 rounded-full border border-blue-500/30">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Rényi Budget: ε = 2.45
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl space-y-4 border border-white/10 bg-[#070D1E]/75 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-emerald-500/40 hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)] transition-all duration-300 group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">Module 03</span>
              <h4 className="text-base font-bold text-white mt-1">The Fraud Showdown & Explainability</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Direct side-by-side comparison: Bank silo misses attack (13/100) vs TrustFed catches it (87/100) with plain-language SHAP waterfall reason codes.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 font-mono bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                PR-AUC 0.842 (+22% Lift)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM "LET'S START" LAUNCH BANNER */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 border border-white/15 bg-gradient-to-b from-[#0C152E]/90 via-[#070D1F]/90 to-[#030611] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-2 text-center md:text-left">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to test{' '}
            <span className="font-editorial-italic font-normal text-cyan-300 text-3xl sm:text-4xl">
              privacy-preserving
            </span>{' '}
            federated intelligence?
          </h3>
          <p className="text-sm text-slate-300 max-w-xl font-normal leading-relaxed">
            Enter the interactive feature studio to inspect PaySim silo partitions, execute real Flower FL rounds, and test live transaction showdowns with 3D tactile controls.
          </p>
        </div>

        <button
          onClick={onStart}
          className="relative z-10 shrink-0 px-8 py-3.5 rounded-full text-sm font-bold flex items-center gap-3 cursor-pointer bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all shadow-xl shadow-white/10"
        >
          <span className="text-sm font-bold">Let's Start Now</span>
          <ArrowRight className="w-4 h-4 text-blue-600" />
        </button>
      </div>
    </div>
  );
};
