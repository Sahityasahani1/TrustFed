import React from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, ShieldCheck, ChevronRight, ArrowRight } from 'lucide-react';
import { DecryptedText } from '../react-bits/DecryptedText';

interface JudgeDemoBarProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  isRunningAutoDemo: boolean;
  onToggleAutoDemo: () => void;
}

export const JudgeDemoBar: React.FC<JudgeDemoBarProps> = ({
  currentStep,
  onSelectStep,
  isRunningAutoDemo,
  onToggleAutoDemo,
}) => {
  const steps = [
    {
      num: 1,
      time: 'Domain 1',
      title: 'PaySim Banking Fraud',
      desc: 'Account drain, mule cash-out & synthetic fraud detection with 10k transactions',
    },
    {
      num: 2,
      time: 'Domain 2',
      title: 'Credit Default Risk',
      desc: '307k real loan cohort • 500-Tree XGBoost GBDT with debt-to-income analysis',
    },
    {
      num: 3,
      time: 'Domain 3',
      title: 'SIU Insurance Claims',
      desc: '1M policyholder cohort • Group-disjoint 54-feature SIU audit model',
    },
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-6 border border-white/10">
      {/* Luminous Cosmic Dark Banner */}
      <div className="relative p-6 sm:p-8 bg-gradient-to-r from-[#060D1E] via-[#09152B] to-[#041D18] text-white">
        {/* Soft Radial Glow Specks */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Row: Eyebrow Tag + Main Headline */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/5 backdrop-blur-md border border-white/10 text-cyan-300 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>PRD §15 Hackathon Pitch Walkthrough</span>
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span className="text-slate-300">3-Minute Live Script</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                Institutions collaborate on intelligence, never on customer records.
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
                TrustFed enables banks, digital wallets, lenders, and insurers to train joint fraud models with mathematical zero-knowledge privacy guarantees.
              </p>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={onToggleAutoDemo}
              className={`shrink-0 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full text-sm font-bold transition-all duration-300 cursor-pointer shadow-xl ${
                isRunningAutoDemo
                  ? 'bg-amber-400 text-slate-950 shadow-amber-400/30 hover:bg-amber-300'
                  : 'bg-white text-slate-950 hover:bg-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.03]'
              }`}
            >
              {isRunningAutoDemo ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
                  </span>
                  Auto Playing Walkthrough...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-cyan-600" />
                  <span>Start 3-Min Pitch</span>
                  <ArrowRight className="h-4 w-4 text-cyan-500" />
                </>
              )}
            </button>
          </div>

          {/* 3 Step Interactive Cards: Frosted Glass */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {steps.map((s) => {
              const isCurrent = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => onSelectStep(s.num)}
                  className={`relative flex items-start gap-3.5 p-3.5 rounded-2xl text-left transition-all duration-300 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#060D1E] text-white border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] scale-[1.02]'
                      : 'bg-[#030713]/70 hover:bg-[#030713] text-white/90 border border-white/10 backdrop-blur-md'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-mono font-bold shadow-sm ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    0{s.num}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold truncate text-white">
                        {s.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                          isCurrent
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {s.time}
                      </span>
                    </div>
                    <span className="text-[11px] block mt-1 line-clamp-2 leading-snug text-slate-400">
                      {s.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
