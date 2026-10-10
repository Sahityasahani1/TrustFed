import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Search, 
  Sun, 
  Moon, 
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';

export interface TopNavHUDProps {
  pageMode: 'intro' | 'features';
  activeMainTab?: string;
  onGoToIntro: () => void;
  onGoToFeatures?: () => void;
  onSelectDomain?: (domain: 'intro' | 'intelligence' | 'creditfraud' | 'insurance') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  isRunningPitch: boolean;
  onTogglePitch: () => void;
}

export const TopNavHUD: React.FC<TopNavHUDProps> = ({
  pageMode,
  activeMainTab = 'intelligence',
  onGoToIntro,
  onGoToFeatures,
  onSelectDomain,
  isDark,
  onToggleTheme,
  onOpenCommandPalette,
  isRunningPitch,
  onTogglePitch,
}) => {
  const domains = [
    { id: 'intro', label: 'Overview', isIntro: true },
    { id: 'intelligence', label: 'Banks', badge: 'PaySim' },
    { id: 'creditfraud', label: 'Lenders', badge: 'Credit' },
    { id: 'insurance', label: 'Insurers', badge: 'Claims' },
  ];

  const handleDomainClick = (dId: string) => {
    if (dId === 'intro') {
      if (onSelectDomain) onSelectDomain('intro');
      else onGoToIntro();
    } else {
      if (onSelectDomain) onSelectDomain(dId as any);
      else if (onGoToFeatures) onGoToFeatures();
    }
  };

  const activeId = pageMode === 'intro' ? 'intro' : activeMainTab;

  return (
    <header className="sticky top-3 z-50 flex items-center justify-between h-12 px-3 sm:px-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-xs transition-colors">
      
      {/* 1. LEFT: MINIMALIST BRAND & CONSENSUS INDICATOR */}
      <div className="flex items-center gap-3">
        <button
          onClick={onGoToIntro}
          className="flex items-center gap-2 cursor-pointer group text-left"
          title="Return to TrustFed Command Overview"
        >
          <div className="w-6 h-6 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-mono font-bold text-xs tracking-tighter shadow-xs">
            TF
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            Trust<span className="text-zinc-500 dark:text-zinc-400 font-normal">Fed</span>
          </span>
        </button>

        {/* Live SecAgg Consensus Indicator */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>SecAgg 3/3</span>
        </div>
      </div>

      {/* 2. CENTER: LINEAR-STYLE SEGMENTED DOMAIN SELECTOR */}
      <nav className="flex items-center p-0.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 text-xs font-medium">
        {domains.map((dom) => {
          const isActive = activeId === dom.id;
          return (
            <button
              key={dom.id}
              onClick={() => handleDomainClick(dom.id)}
              className={`relative px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer select-none text-xs flex items-center gap-1.5 ${
                isActive
                  ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeDomainPill"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-700/90 shadow-xs border border-zinc-200/80 dark:border-white/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{dom.label}</span>
              {dom.badge && (
                <span className="relative z-10 hidden md:inline text-[10px] font-mono text-zinc-400 dark:text-zinc-400">
                  {dom.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. RIGHT: ⌘K SEARCH, THEME TOGGLE, SIMULATION ACTION */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Command Bar Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
          title="Open Command Palette (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <kbd className="hidden sm:inline text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-400">
            ⌘K
          </kbd>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          title={isDark ? 'Switch to Studio Light Theme' : 'Switch to Obsidian Dark Theme'}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-zinc-300" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-zinc-600" />
          )}
        </button>

        {/* Simulation / Demo Pitch Action */}
        <button
          onClick={onTogglePitch}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
            isRunningPitch
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs'
          }`}
          title="Interactive Platform Demo"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">
            {isRunningPitch ? 'Pitch Playing...' : 'Run Demo'}
          </span>
        </button>
      </div>

    </header>
  );
};
