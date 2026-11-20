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
  RefreshCw
} from 'lucide-react';

interface Hero3DStageProps {
  onStartPitch: () => void;
  onRunSimulation: () => void;
  isRunningPitch?: boolean;
}

export const Hero3DStage: React.FC<Hero3DStageProps> = ({
  onStartPitch,
  onRunSimulation,
  isRunningPitch = false,
}) => {
  return (
    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-900/15 mb-10 avela-hero-mesh border border-white/20">
      {/* Decorative Organic 3D Floating Petals / Crystal Glyphs */}
      <div className="absolute top-12 left-8 w-28 h-28 rounded-full bg-gradient-to-tr from-pink-400/30 via-purple-300/20 to-transparent blur-2xl pointer-events-none animate-float-slow" />
      <div className="absolute bottom-16 right-12 w-44 h-44 rounded-full bg-gradient-to-bl from-indigo-300/30 via-pink-400/20 to-transparent blur-3xl pointer-events-none animate-float-reverse" />
      <div className="absolute -top-10 right-1/4 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none animate-pulse-soft" />

      <div className="relative z-10 px-6 sm:px-10 pt-12 pb-16 space-y-10">
        {/* Top Centered Header & Tag Pill */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-lg shadow-black/5 animate-float-subtle">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="tracking-wide">Interactive Enterprise Showcase</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-white/90 font-medium">Guided Product Tour</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-white leading-[1.08] drop-shadow-md">
            The intelligence layer that keeps institutions protected.
          </h1>

          <p className="text-base sm:text-lg text-white/90 font-medium max-w-2xl mx-auto leading-relaxed">
            Collaborative federated fraud intelligence across banks, digital wallets, lenders & insurers. Zero customer data exposure with multi-institution encryption and strict privacy standards.
          </p>

          {/* Action Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onStartPitch}
              className={`flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-bold transition-all duration-300 cursor-pointer shadow-xl ${
                isRunningPitch
                  ? 'bg-amber-400 text-slate-950 shadow-amber-400/30 hover:bg-amber-300'
                  : 'bg-white text-indigo-950 hover:bg-slate-50 shadow-black/10 hover:shadow-2xl hover:scale-[1.04]'
              }`}
            >
              {isRunningPitch ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
                  </span>
                  Auto-Playing Walkthrough...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-indigo-600" />
                  <span>Start Product Tour</span>
                  <ArrowRight className="h-4 w-4 text-indigo-400" />
                </>
              )}
            </button>

            <button
              onClick={onRunSimulation}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.03]"
            >
              <Cpu className="w-4 h-4 text-purple-200" />
              <span>⚡ Run Defense Simulation</span>
            </button>
          </div>
        </div>

        {/* 3D FLOATING CARDS STAGE MATCHING AVELA REFERENCE */}
        <div className="relative pt-6 max-w-5xl mx-auto">
          {/* Floating Pill Badges with Colored Pulsing Dots */}
          <div className="absolute -top-3 left-4 md:left-12 z-30 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-white shadow-xl shadow-indigo-900/10 text-xs font-bold text-slate-800 animate-float-slow">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>Zero Raw Records Shared</span>
          </div>

          <div className="absolute -top-6 right-8 md:right-16 z-30 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-white shadow-xl shadow-indigo-900/10 text-xs font-bold text-slate-800 animate-float-reverse">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span>Zero-Data Sharing Active</span>
          </div>

          <div className="absolute -bottom-4 left-1/4 z-30 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-white shadow-xl shadow-indigo-900/10 text-xs font-bold text-slate-800 animate-float-subtle">
            <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
            <span>+22% Detection Accuracy Lift</span>
          </div>

          <div className="absolute -bottom-4 right-1/4 z-30 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-white shadow-xl shadow-indigo-900/10 text-xs font-bold text-slate-800 animate-float-slow">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span>Privacy Shield Active</span>
          </div>

          {/* 3D Overlapping Floating Cards Deck */}
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-0 perspective-1500 preserve-3d py-4">
            
            {/* Card 1: Left Tilted (Apex Tier-1 Bank) */}
            <div 
              className="w-full md:w-[320px] rounded-3xl p-5 bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl shadow-indigo-950/15 transition-all duration-500 hover:scale-105 hover:z-40 order-2 md:order-1 md:-mr-8 md:rotate-[-6deg] md:-translate-y-2"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Apex Tier-1 Bank</h4>
                    <span className="text-[10px] text-slate-500">Local Silo Boundary</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-blue-100/80 text-blue-700">
                  Silo #1
                </span>
              </div>

              <div className="py-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Wire Amount:</span>
                  <span className="font-mono font-bold text-slate-900">$84,500.00</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Local Silo Score:</span>
                  <span className="font-mono font-bold text-emerald-600">18 / 100</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Local Model Verdict:</span>
                  <span className="font-semibold text-emerald-600">Approved</span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>False Negative:</strong> Silo cannot detect rapid cross-border wallet mule hops without TrustFed.
                </span>
              </div>
            </div>

            {/* Card 2: Center Elevated Hero (TrustFed Global Consensus Core) */}
            <div 
              className="w-full md:w-[380px] rounded-[2rem] p-6 bg-white/95 backdrop-blur-3xl border-2 border-purple-300 shadow-[0_25px_60px_-15px_rgba(124,58,237,0.35)] transition-all duration-500 hover:scale-105 z-20 order-1 md:order-2 md:-translate-y-5"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 font-display">
                      TrustFed Global Engine
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-purple-700 font-semibold">Collaborative Defense Core</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Global Core
                </span>
              </div>

              <div className="py-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Collaborative Fraud Risk:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-display text-rose-600">89</span>
                    <span className="text-xs text-slate-400 font-bold">/ 100</span>
                  </div>
                </div>

                {/* Risk Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 rounded-full w-[89%]" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-center font-mono">
                  <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-100">
                    <span className="text-[10px] text-slate-500 block">Accuracy Score</span>
                    <span className="text-xs font-bold text-purple-700">0.842 (+22%)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-100">
                    <span className="text-[10px] text-slate-500 block">Data Shared</span>
                    <span className="text-xs font-bold text-emerald-700">0.000 (0 bytes)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/90 border border-indigo-200/80 flex items-start gap-2.5 text-[11px] text-indigo-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Attack Blocked:</strong> Intercepted multi-institution coordinated account takeover via encrypted weights!
                </span>
              </div>
            </div>

            {/* Card 3: Right Tilted (FlashPay Digital Wallet) */}
            <div 
              className="w-full md:w-[320px] rounded-3xl p-5 bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl shadow-indigo-950/15 transition-all duration-500 hover:scale-105 hover:z-40 order-3 md:-ml-8 md:rotate-[6deg] md:-translate-y-2"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">FlashPay Wallet</h4>
                    <span className="text-[10px] text-slate-500">Local Silo Boundary</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-100/80 text-emerald-700">
                  Silo #2
                </span>
              </div>

              <div className="py-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Mobile Device Velocity:</span>
                  <span className="font-mono font-bold text-rose-600">5 SIM hops / 10m</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Encrypted Delta:</span>
                  <span className="font-mono font-bold text-purple-600">Encrypted Sync</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Privacy Protection Status:</span>
                  <span className="font-semibold text-slate-700">100% Protected</span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-600">
                <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Privacy:</strong> Raw customer details remain strictly within the institution.
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
