import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles,
  ArrowUpRight,
  Database
} from 'lucide-react';

import { JudgeDemoBar } from './components/demo/JudgeDemoBar';

import { IntelligenceAndGovView } from './components/views/IntelligenceAndGovView';
import { CreditFraudView } from './components/views/CreditFraudView';
import { InsuranceClaimsView } from './components/views/InsuranceClaimsView';
import { ClearinghouseStreamWorkbench } from './components/views/ClearinghouseStreamWorkbench';
import { ComplianceLedgerWorkbench } from './components/views/ComplianceLedgerWorkbench';
import { HardwareEnclaveWorkbench } from './components/views/HardwareEnclaveWorkbench';
import { StatusPageView } from './components/views/StatusPageView';
import { PrivacyPolicyView } from './components/views/PrivacyPolicyView';
import { TermsOfServiceView } from './components/views/TermsOfServiceView';

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
    
    const validMains = ['intelligence', 'creditfraud', 'insurance', 'clearinghouse', 'compliance', 'enclaves', 'status', 'privacy', 'terms'];
    const main = validMains.includes(part1) ? part1 : 'intelligence';

    let sub = part2;
    if (!sub) {
      if (main === 'creditfraud') sub = 'cf-showdown';
      else if (main === 'insurance') sub = 'ins-showdown';
      else if (main === 'clearinghouse') sub = 'stream';
      else if (main === 'compliance') sub = 'overrides';
      else if (main === 'enclaves') sub = 'enclave';
      else if (main === 'status' || main === 'privacy' || main === 'terms') sub = 'default';
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
      else if (mainTabId === 'clearinghouse') resolvedSubTab = 'stream';
      else if (mainTabId === 'compliance') resolvedSubTab = 'overrides';
      else if (mainTabId === 'enclaves') resolvedSubTab = 'enclave';
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
    if (step === 1) handleSelectTab('intelligence', 'showdown');
    if (step === 2) handleSelectTab('creditfraud', 'cf-showdown');
    if (step === 3) handleSelectTab('insurance', 'ins-showdown');
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
    handleSelectTab('intelligence', 'showdown');
  };

  return (
    <ToastProvider>
      <div className="relative min-h-screen bg-transparent text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-900 transition-colors duration-200">
        
        {/* Global Command Palette Modal */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectTab={handleSelectTab}
          onToggleTheme={() => setIsDark((prev) => !prev)}
          isDark={isDark}
          onStartPitch={handleToggleAutoDemo}
        />

        {/* Main Application Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
          
          {/* Floating Top Navigation Island Header */}
          <TopNavHUD
            pageMode={pageMode}
            activeMainTab={activeMainTab}
            onGoToIntro={handleGoToIntro}
            onGoToFeatures={handleGoToFeatures}
            onSelectDomain={(domain) => {
              if (domain === 'intro') {
                handleGoToIntro();
              } else {
                handleSelectTab(domain);
              }
            }}
            isDark={isDark}
            onToggleTheme={() => setIsDark((prev) => !prev)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            isRunningPitch={isRunningAutoDemo}
            onTogglePitch={handleToggleAutoDemo}
          />

          {/* Page View Routing: Intro Overview vs Domain Features */}
          <AnimatePresence mode="wait" initial={false}>
            {pageMode === 'intro' ? (
              <motion.div
                key="intro-page-container"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Active Domain Viewport */}
                <main className="min-h-[520px]">
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
                  {activeMainTab === 'clearinghouse' && (
                    <ClearinghouseStreamWorkbench />
                  )}
                  {activeMainTab === 'compliance' && (
                    <ComplianceLedgerWorkbench />
                  )}
                  {activeMainTab === 'enclaves' && (
                    <HardwareEnclaveWorkbench />
                  )}
                  {activeMainTab === 'status' && (
                    <StatusPageView />
                  )}
                  {activeMainTab === 'privacy' && (
                    <PrivacyPolicyView />
                  )}
                  {activeMainTab === 'terms' && (
                    <TermsOfServiceView />
                  )}
                </main>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimalist Enterprise Footer */}
          <footer className="pt-10 pb-6 border-t border-zinc-200 dark:border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Customer Records Shared: 0
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                Multi-Institution Encryption: Active
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Enterprise Privacy Protection: Certified
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Regulatory Compliance: Verified
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <button 
                onClick={() => handleSelectTab('status')} 
                className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                System Status (99.98%)
              </button>
              <span>•</span>
              <button 
                onClick={() => handleSelectTab('privacy')} 
                className="hover:text-cyan-400 transition cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button 
                onClick={() => handleSelectTab('terms')} 
                className="hover:text-indigo-400 transition cursor-pointer"
              >
                Terms of Service
              </button>
            </div>

            <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              TrustFed Collaborative Defense Platform • Zero Customer Data Exposure • Press ⌘K for Command Bar
            </div>
          </footer>

        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
