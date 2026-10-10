import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  CreditCard, 
  ShieldCheck, 
  FileSpreadsheet, 
  Activity, 
  ChevronDown,
  Upload 
} from 'lucide-react';

export interface SubTabDef {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface MainTabDef {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
  subtabs: SubTabDef[];
}

export const MAIN_TABS: MainTabDef[] = [
  {
    id: 'intelligence',
    label: 'Tab 1: PaySim Transactions',
    subtitle: '5 PaySim inputs (artifacts/paysim)',
    icon: <ShieldAlert className="w-5 h-5 text-emerald-500" />,
    badge: 'Tab 1: Banks',
    subtabs: [
      {
        id: 'showdown',
        label: '1. Single Transaction Showdown',
        desc: 'Interactive sandbox testing step, type, amount, oldbalanceOrg & oldbalanceDest against Silo vs TrustFed models.',
        icon: <ShieldAlert className="w-4 h-4 text-emerald-600" />,
        badge: 'Single Calc',
      },
      {
        id: 'batch',
        label: '2. Batch Screening & Triage Queue',
        desc: 'Vectorized bulk screening for PaySim transactions with real-time KPI ribbon, anomaly flags, and demo loader.',
        icon: <Upload className="w-4 h-4 text-emerald-600" />,
        badge: '⚡ 40-TX Demo',
      },
      {
        id: 'dictionary',
        label: '3. Feature Dictionary & Technical Specs',
        desc: 'Official PaySim feature dictionary with Frontend Labels, technical descriptions, and input controls.',
        icon: <FileSpreadsheet className="w-4 h-4 text-cyan-600" />,
        badge: 'Feature Specs',
      },
    ],
  },
  {
    id: 'creditfraud',
    label: 'Tab 2: Credit Fraud Model',
    subtitle: '307k loan applications (artifacts/creditfraud)',
    icon: <CreditCard className="w-5 h-5 text-blue-500" />,
    badge: 'Tab 2: Lenders',
    subtabs: [
      {
        id: 'cf-showdown',
        label: '1. Loan Application Inputs & Showdown',
        desc: 'Test applicant income, loan amount, annuity, and external credit ratings against XGBoost GBDT.',
        icon: <CreditCard className="w-4 h-4 text-blue-600" />,
        badge: 'Single Calc',
      },
      {
        id: 'cf-batch',
        label: '2. Batch Screening & Triage Queue',
        desc: 'High-throughput vectorized applicant screening with default risk alerts and CSV export.',
        icon: <Upload className="w-4 h-4 text-blue-600" />,
        badge: '⚡ 20-Loan Demo',
      },
      {
        id: 'cf-metrics',
        label: '3. Federated Benchmark Metrics',
        desc: '307,511 loans benchmark: ROC-AUC 0.7687, PR-AUC 0.2588, optimal cutoff 0.1557.',
        icon: <FileSpreadsheet className="w-4 h-4 text-indigo-600" />,
        badge: 'ROC-AUC 0.768',
      },
    ],
  },
  {
    id: 'insurance',
    label: 'Tab 3: Insurance Fraud Model',
    subtitle: '1M policy claims (artifacts/insurance)',
    icon: <ShieldCheck className="w-5 h-5 text-teal-500" />,
    badge: 'Tab 3: Insurers',
    subtabs: [
      {
        id: 'ins-showdown',
        label: '1. Insurance Claim Inputs & Showdown',
        desc: 'Screen claim amount, deductible ratio, tenure, and filing delays against SIU fraud detection.',
        icon: <ShieldCheck className="w-4 h-4 text-teal-600" />,
        badge: 'Single Calc',
      },
      {
        id: 'ins-batch',
        label: '2. Batch Screening & Triage Queue',
        desc: 'Screen claims in bulk with automated inflation and early-churn spike detection.',
        icon: <Upload className="w-4 h-4 text-teal-600" />,
        badge: '⚡ 20-Claim Demo',
      },
      {
        id: 'ins-metrics',
        label: '3. Federated Benchmark Metrics',
        desc: '1,000,000 policies benchmark: ROC-AUC 0.7933, PR-AUC 0.3161, optimal cutoff 0.1798.',
        icon: <FileSpreadsheet className="w-4 h-4 text-teal-600" />,
        badge: 'ROC-AUC 0.793',
      },
    ],
  },
];

interface ModernTabsWithHoverProps {
  activeMainTab: string;
  activeSubTab: string;
  onSelectTab: (mainTabId: string, subTabId?: string) => void;
}

export const ModernTabsWithHover: React.FC<ModernTabsWithHoverProps> = ({
  activeMainTab,
  activeSubTab,
  onSelectTab,
}) => {
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [clickedOpenTabId, setClickedOpenTabId] = useState<string | null>(null);

  // Close clicked dropdown on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.main-tab-wrapper')) {
        setClickedOpenTabId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="relative z-30">
      {/* Main Tab Container: 3 Columns Bento Grid */}
      <div className="w-full p-2 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 backdrop-blur-2xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {MAIN_TABS.map((tab) => {
            const isActive = activeMainTab === tab.id;
            const isMenuOpen = hoveredTabId === tab.id || clickedOpenTabId === tab.id;

            const activeGradient = tab.id === 'intelligence'
              ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white shadow-lg shadow-cyan-500/25 border-cyan-400/60'
              : tab.id === 'creditfraud'
              ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border-indigo-400/60'
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/25 border-emerald-400/60';

            const inactiveStyle = 
              'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100';

            const iconColor = tab.id === 'intelligence' ? 'text-cyan-500' : tab.id === 'creditfraud' ? 'text-indigo-500' : 'text-emerald-500';
            const badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

            return (
              <div
                key={tab.id}
                className="relative main-tab-wrapper"
                onMouseEnter={() => setHoveredTabId(tab.id)}
                onMouseLeave={() => setHoveredTabId(null)}
              >
                {/* Tab Header Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTab(tab.id, tab.subtabs[0].id);
                    setClickedOpenTabId((prev) => (prev === tab.id ? null : tab.id));
                  }}
                  className={`w-full relative flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 text-left cursor-pointer group border ${
                    isActive
                      ? `${activeGradient} -translate-y-0.5`
                      : `${inactiveStyle}`
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-xl transition-transform duration-300 group-hover:scale-110 shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-inner backdrop-blur-sm'
                          : `bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 ${iconColor} shadow-sm`
                      }`}
                    >
                      {tab.icon}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs sm:text-sm font-bold tracking-tight block truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {tab.label}
                      </span>
                      <span className={`text-[10px] sm:text-[11px] block truncate mt-0.5 ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                        {tab.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {tab.badge && (
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border hidden sm:inline-block ${
                          isActive
                            ? 'bg-white/25 text-white border-white/40 backdrop-blur-sm'
                            : badgeStyle
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isActive ? 'text-white/90' : 'text-slate-400'
                      } ${isMenuOpen ? 'rotate-180 text-white' : ''}`}
                    />
                  </div>
                </button>

                {/* Hover/Click Mega-Dropdown Previewing Subtabs */}
                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute top-full left-0 right-0 mt-2 p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 backdrop-blur-3xl shadow-2xl z-50 space-y-2 min-w-[280px]"
                    >
                      <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Sub-Modules ({tab.subtabs.length})
                        </span>
                        <span className="text-slate-400 font-medium">Click to open</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {tab.subtabs.map((sub) => {
                          const isSubActive = isActive && (activeSubTab === sub.id || (tab.id === 'creditfraud' && sub.id.startsWith('cf')) || (tab.id === 'insurance' && sub.id.startsWith('ins')));

                          return (
                            <div
                              key={sub.id}
                              onClick={() => {
                                onSelectTab(tab.id, sub.id);
                                setHoveredTabId(null);
                                setClickedOpenTabId(null);
                              }}
                              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-start gap-2.5 text-left ${
                                isSubActive
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 shadow-sm'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 mt-0.5">
                                {sub.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold truncate ${isSubActive ? 'text-blue-900 dark:text-cyan-300 font-black' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {sub.label}
                                  </span>
                                  {sub.badge && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 ml-1">
                                      {sub.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-1">
                                  {sub.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
