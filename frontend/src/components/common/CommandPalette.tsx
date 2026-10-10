import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ShieldCheck, 
  CreditCard, 
  Umbrella, 
  Upload, 
  Sparkles, 
  Moon, 
  Sun, 
  FileSpreadsheet, 
  Network, 
  Terminal, 
  Copy,
  ArrowRight,
  X
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (mainId: string, subId?: string) => void;
  onToggleTheme: () => void;
  isDark: boolean;
  onStartPitch: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onToggleTheme,
  isDark,
  onStartPitch,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global key listener for Escape and Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const commands = [
    {
      category: 'Vertical Sandboxes',
      items: [
        {
          id: 'pay-single',
          title: 'PaySim Banking • Single Transaction Showdown',
          desc: 'Analyze wire transfer amount, drainage ratio & destination mule flags',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          action: () => { onSelectTab('intelligence', 'showdown'); onClose(); },
          badge: 'Tab 1: Banks',
        },
        {
          id: 'pay-batch',
          title: 'PaySim Banking • 40-TX Batch Screening Workbench',
          desc: 'High-throughput vectorized PaySim triage table with AI drawer',
          icon: <Upload className="w-4 h-4 text-emerald-400" />,
          action: () => { onSelectTab('intelligence', 'batch'); onClose(); },
          badge: '⚡ 40-TX Batch',
        },
        {
          id: 'cred-single',
          title: 'Digital Lenders • Loan Application Showdown',
          desc: 'XGBoost evaluation on credit amount, annuities & rating scores',
          icon: <CreditCard className="w-4 h-4 text-blue-400" />,
          action: () => { onSelectTab('creditfraud', 'cf-showdown'); onClose(); },
          badge: 'Tab 2: Lenders',
        },
        {
          id: 'cred-batch',
          title: 'Digital Lenders • 20-Loan Batch Screening',
          desc: 'Vectorized loan applicant triage queue with default risk indicators',
          icon: <Upload className="w-4 h-4 text-blue-400" />,
          action: () => { onSelectTab('creditfraud', 'cf-batch'); onClose(); },
          badge: '⚡ 20-Loan Batch',
        },
        {
          id: 'ins-single',
          title: 'Insurance Claims • SIU Claim Fraud Showdown',
          desc: 'Calibrated detection for low-tenure inflated losses & staged claims',
          icon: <Umbrella className="w-4 h-4 text-teal-400" />,
          action: () => { onSelectTab('insurance', 'ins-showdown'); onClose(); },
          badge: 'Tab 3: Insurers',
        },
        {
          id: 'ins-batch',
          title: 'Insurance Claims • 20-Claim Batch Screening',
          desc: 'Special Investigative Unit (SIU) claims fraud bulk intake',
          icon: <Upload className="w-4 h-4 text-teal-400" />,
          action: () => { onSelectTab('insurance', 'ins-batch'); onClose(); },
          badge: '⚡ 20-Claim Batch',
        },
      ],
    },
    {
      category: 'Federated Infrastructure & Telemetry',
      items: [
        {
          id: 'theme-toggle',
          title: isDark ? 'Switch to Studio Light Theme' : 'Switch to Obsidian Dark Theme',
          desc: 'Toggle platform surface lighting and glassmorphism',
          icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
          action: () => { onToggleTheme(); onClose(); },
          badge: isDark ? '☀️ Studio' : '🌙 Obsidian',
        },
        {
          id: 'run-pitch',
          title: 'Execute 3-Minute Executive Pitch Script',
          desc: 'Auto-play guided walkthrough across data silos, FedAvg & inference',
          icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
          action: () => { onStartPitch(); onClose(); },
          badge: 'Pitch Demo',
        },
        {
          id: 'pay-specs',
          title: 'View PaySim Feature Technical Dictionary',
          desc: 'Inspect feature descriptions, expected value ranges and definitions',
          icon: <FileSpreadsheet className="w-4 h-4 text-slate-400" />,
          action: () => { onSelectTab('intelligence', 'dictionary'); onClose(); },
          badge: 'Feature Specs',
        },
        {
          id: 'cred-metrics',
          title: 'View Digital Lenders 307k Benchmark Metrics',
          desc: 'ROC-AUC 0.7687, PR-AUC 0.2588, calibrated cutoff threshold 0.1557',
          icon: <FileSpreadsheet className="w-4 h-4 text-slate-400" />,
          action: () => { onSelectTab('creditfraud', 'cf-metrics'); onClose(); },
          badge: 'Metrics',
        },
      ],
    },
  ];

  const filteredCommands = commands.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.badge?.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
              <Search className="w-5 h-5 text-cyan-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, search vertical sandbox or press ESC..."
                className="w-full bg-transparent text-sm sm:text-base font-sans text-white placeholder-slate-400 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  ESC
                </span>
                <button
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Command Results List */}
            <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-mono">
                  No matching command or module found for "{query}".
                </div>
              ) : (
                filteredCommands.map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      {cat.category}
                    </div>
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={item.action}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/90 text-left transition-all duration-150 cursor-pointer group border border-transparent hover:border-slate-700/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 group-hover:bg-slate-700 group-hover:border-slate-600 transition-colors">
                            {item.icon}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer Quick Shortcuts */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950 border-t border-slate-800/90 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span>Navigate: <kbd className="text-slate-300">↑↓</kbd></span>
                <span>Select: <kbd className="text-slate-300">↵</kbd></span>
              </div>
              <span className="text-cyan-400/90 font-bold">TrustFed Cryptographic Command Center</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
