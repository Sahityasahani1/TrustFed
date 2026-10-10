import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  Search, 
  Sun, 
  Moon, 
  ArrowRight, 
  ArrowLeft, 
  Activity, 
  Terminal, 
  Info, 
  Layers,
  HelpCircle,
  Play,
  CheckCircle2
} from 'lucide-react';

interface TopNavHUDProps {
  pageMode: 'intro' | 'features';
  onGoToIntro: () => void;
  onGoToFeatures: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  isRunningPitch: boolean;
  onTogglePitch: () => void;
}

export const TopNavHUD: React.FC<TopNavHUDProps> = ({
  pageMode,
  onGoToIntro,
  onGoToFeatures,
  isDark,
  onToggleTheme,
  onOpenCommandPalette,
  isRunningPitch,
  onTogglePitch,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<'privacy' | 'secagg' | 'dp' | null>(null);

  return (
    <header className="sticky top-3 z-40 flex items-center justify-between p-2.5 px-4 sm:px-6 rounded-full bg-[#050B1B]/85 backdrop-blur-2xl border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.6)] transition-all duration-200">
      
      {/* 1. CELESTIAL ORB BRAND LOGO (AETHER STYLE) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onGoToIntro}
          className="flex items-center gap-2.5 cursor-pointer group text-left"
          title="Return to TrustFed Command Overview"
        >
          {/* Luminous Celestial Orb */}
          <div className="relative h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-300 p-0.5 shadow-md shadow-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-[#030712] rounded-full flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-blue-500 to-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
            </div>
            {/* Subtle orbital ping */}
            <span className="absolute -inset-0.5 rounded-full border border-sky-400/30 animate-ping opacity-60 pointer-events-none" />
          </div>

          <span className="text-base font-bold tracking-tight text-white font-display">
            Trust<span className="text-sky-400">Fed</span>
          </span>
        </button>
      </div>

      {/* 2. CENTER CAPSULE NAVBAR (AETHER STYLE) */}
      <nav className="hidden md:flex items-center gap-1 px-1.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-inner text-xs font-medium text-slate-300">
        <button
          onClick={onGoToIntro}
          className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
            pageMode === 'intro'
              ? 'bg-white/15 text-white font-semibold shadow-sm'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          Platform
        </button>
        <button
          onClick={onGoToFeatures}
          className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
            pageMode === 'features'
              ? 'bg-white/15 text-white font-semibold shadow-sm'
              : 'hover:text-white hover:bg-white/5'
          }`}
        >
          Bank Silos
        </button>
        <button
          onClick={onGoToFeatures}
          className="px-3 py-1 rounded-full hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          Lenders
        </button>
        <button
          onClick={onGoToFeatures}
          className="px-3 py-1 rounded-full hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          Insurers
        </button>
        <button
          onClick={onGoToFeatures}
          className="px-3 py-1 rounded-full hover:text-white hover:bg-white/5 transition-all cursor-pointer text-sky-300 font-mono text-[11px]"
        >
          SecAgg+ 3/3
        </button>
      </nav>

      {/* 3. RIGHT ACTIONS: ⌘K, THEME, AND WHITE PILL CTA */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Command Bar Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
          title="Open Command Palette (⌘K / Ctrl+K)"
        >
          <Search className="w-3 h-3 text-slate-400" />
          <kbd className="text-[10px] text-slate-400 font-mono">⌘K</kbd>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
          title={isDark ? 'Switch to Studio Light Theme' : 'Switch to Cosmic Dark Theme'}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-sky-400" />
          )}
        </button>

        {/* Aether-style White Pill Button */}
        {pageMode === 'intro' ? (
          <button
            onClick={onGoToFeatures}
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-white/10"
          >
            <span>Deploy SecAgg+</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onTogglePitch}
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{isRunningPitch ? 'Pitch Playing...' : 'Run Simulation'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
