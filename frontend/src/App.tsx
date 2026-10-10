import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles,
  ArrowUpRight,
  Database
} from 'lucide-react';

import { ParticlesBackground } from './components/react-bits/ParticlesBackground';
import { ModernTabsWithHover } from './components/tabs/ModernTabsWithHover';
import { JudgeDemoBar } from './components/demo/JudgeDemoBar';

import { IntelligenceAndGovView } from './components/views/IntelligenceAndGovView';
import { CreditFraudView } from './components/views/CreditFraudView';
import { InsuranceClaimsView } from './components/views/InsuranceClaimsView';

import { Hero3DStage } from './components/hero/Hero3DStage';
import { IntroPage } from './components/pages/IntroPage';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { TopNavHUD } from './components/navigation/TopNavHUD';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastProvider } from './components/common/ToastNotification';

export function App() {
  const parseHash = () => {
    if (typeof window === 'undefined') return { page: 'intro', main: 'intelligence', sub: 'showdown' };
    const raw = window.location.hash.replace('#', '');
    const [part1, part2] = raw.split('/');
    
    if (part1 === 'intro' || !part1) {
      return { page: 'intro', main: 'intelligence', sub: 'showdown' };
    }
    
    const validMains = ['intelligence', 'creditfraud', 'insurance'];
    const main = validMains.includes(part1) ? part1 : 'intelligence';

    let sub = part2;
    if (!sub) {
      if (main === 'creditfraud') sub = 'cf-showdown';
      else if (main === 'insurance') sub = 'ins-showdown';
      else sub = (part1 === 'dictionary' ? 'dictionary' : 'showdown');
    }
    return { page: 'features', main, sub };
  };

  const initialParsed = parseHash();
  const [pageMode, setPageMode] = useState<'intro' | 'features'>(initialParsed.page as 'intro' | 'features');
  const [activeMainTab, setActiveMainTab] = useState<string>(initialParsed.main);
  const [activeSubTab, setActiveSubTab] = useState<string>(initialParsed.sub);

  // Dark Mode / Studio Light Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trustfed-theme');
      if (saved) return saved === 'dark';
    }
    return true; // Default to Obsidian command center theme
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('trustfed-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('trustfed-theme', 'light');
    }
  }, [isDark]);

  // Blue & Green Color Theme Palette Vibe
  const [colorVibe, setColorVibe] = useState<'ocean-mint' | 'emerald-cyan'>('ocean-mint');

  // 3-Minute Demo State
  const [demoStep, setDemoStep] = useState<number>(1);
  const [isRunningAutoDemo, setIsRunningAutoDemo] = useState<boolean>(false);

  // Listen to hash change from browser or deep link
  React.useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash();
      setPageMode(parsed.page as 'intro' | 'features');
      setActiveMainTab(parsed.main);
      setActiveSubTab(parsed.sub);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectTab = (mainTabId: string, subTabId?: string) => {
    setPageMode('features');
    setActiveMainTab(mainTabId);

    let resolvedSubTab = subTabId;
    if (!resolvedSubTab) {
      if (mainTabId === 'creditfraud') resolvedSubTab = 'cf-showdown';
      else if (mainTabId === 'insurance') resolvedSubTab = 'ins-showdown';
      else resolvedSubTab = 'showdown';
    }

    setActiveSubTab(resolvedSubTab);

    if (typeof window !== 'undefined') {
      window.location.hash = `${mainTabId}/${resolvedSubTab}`;
    }
  };

  const handleGoToIntro = () => {
    setPageMode('intro');
    if (typeof window !== 'undefined') {
      window.location.hash = 'intro';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoToFeatures = () => {
    setPageMode('features');
    if (typeof window !== 'undefined') {
      window.location.hash = activeSubTab ? `${activeMainTab}/${activeSubTab}` : activeMainTab;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectDemoStep = (step: number) => {
    setDemoStep(step);
    if (step === 1) handleSelectTab('silos', 'upload');
    if (step === 2) handleSelectTab('engine', 'training');
    if (step === 3) handleSelectTab('intelligence', 'showdown');
  };

  const handleToggleAutoDemo = () => {
    if (pageMode !== 'features') {
      setPageMode('features');
    }

    if (isRunningAutoDemo) {
      setIsRunningAutoDemo(false);
      return;
    }

    setIsRunningAutoDemo(true);
    handleSelectDemoStep(1);

    setTimeout(() => {
      handleSelectDemoStep(2);
    }, 4500);

    setTimeout(() => {
      handleSelectDemoStep(3);
      setIsRunningAutoDemo(false);
    }, 10000);
  };

  const handleRunSimulationFromHero = () => {
    handleSelectTab('engine', 'training');
  };

  return (
    <ToastProvider>
      <div className={`relative min-h-screen bg-transparent text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-900 transition-colors duration-200`}>
        {/* Dynamic Luminous Floating Particles */}
        <ParticlesBackground quantity={isDark ? 30 : 45} />

        {/* Global Command Palette Modal */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectTab={handleSelectTab}
          onToggleTheme={() => setIsDark((prev) => !prev)}
          isDark={isDark}
          onStartPitch={handleToggleAutoDemo}
        />

        {/* Main Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
          
          {/* Floating Top Navigation HUD */}
          <TopNavHUD
            pageMode={pageMode}
            onGoToIntro={handleGoToIntro}
            onGoToFeatures={handleGoToFeatures}
            isDark={isDark}
            onToggleTheme={() => setIsDark((prev) => !prev)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            isRunningPitch={isRunningAutoDemo}
            onTogglePitch={handleToggleAutoDemo}
          />

        {/* PAGE CONTENT ROUTER: INTRO PAGE VS FEATURES PLATFORM */}
        <AnimatePresence mode="wait" initial={false}>
          {pageMode === 'intro' ? (
            <motion.div
              key="intro-page-container"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <IntroPage
                onStart={handleGoToFeatures}
                onRunSimulation={handleRunSimulationFromHero}
                onInspectDomain={(domain) => handleSelectTab(domain)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="features-page-container"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* 3 Main Tabs with Floating Hover Subtab Mega-Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-mono uppercase text-blue-700 dark:text-cyan-400 font-bold tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
                    Interactive Platform Modules (Hover to preview all subtabs)
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    Zero Raw Customer Records Shared • PRD §9-§13
                  </span>
                </div>

                <ModernTabsWithHover
                  activeMainTab={activeMainTab}
                  activeSubTab={activeSubTab}
                  onSelectTab={handleSelectTab}
                />
              </div>

              {/* Dynamic Main View: Tab 1 (PaySim), Tab 2 (CreditFraud), Tab 3 (Insurance) */}
              <main className="min-h-[520px] pt-2">
                {activeMainTab === 'intelligence' && (
                  <IntelligenceAndGovView
                    activeSubTab={activeSubTab}
                    onSubTabChange={(subId) => {
                      setActiveSubTab(subId);
                      if (typeof window !== 'undefined') window.location.hash = `intelligence/${subId}`;
                    }}
                  />
                )}
                {activeMainTab === 'creditfraud' && (
                  <CreditFraudView
                    activeSubTab={activeSubTab}
                    onSubTabChange={(subId) => {
                      setActiveSubTab(subId);
                      if (typeof window !== 'undefined') window.location.hash = `creditfraud/${subId}`;
                    }}
                  />
                )}
                {activeMainTab === 'insurance' && (
                  <InsuranceClaimsView
                    activeSubTab={activeSubTab}
                    onSubTabChange={(subId) => {
                      setActiveSubTab(subId);
                      if (typeof window !== 'undefined') window.location.hash = `insurance/${subId}`;
                    }}
                  />
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sleek Modern Footer with High-Tech Telemetry Badges */}
        <footer className="pt-12 pb-8 border-t border-slate-200/80 dark:border-white/10 space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Zero Customer Records Transmitted
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Diffie-Hellman SecAgg+ Masking
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Rényi DP Differential Privacy (ε=2.45)
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              NIST AI RMF Fairness & Drift Monitored
            </span>
          </div>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              TrustFed • Privacy-Preserving Federated Fraud Intelligence Command Center
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              "Institutions collaborate on intelligence, never on customer records." Press ⌘K for Command Bar.
            </p>
          </div>
        </footer>

      </div>
    </div>
    </ToastProvider>
  );
}

export default App;
