import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Wallet, 
  Umbrella, 
  Lock, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Activity, 
  Database,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export interface SiloDetails {
  id: 'bank' | 'wallet' | 'insurer';
  name: string;
  tag: string;
  badgeColor: string;
  icon: React.ReactNode;
  records: string;
  fraudRate: string;
  features: number;
  localAuc: number;
  federatedAuc: number;
  lift: string;
  privacyNoise: string;
  focus: string;
  sampleAttack: string;
}

const SILOS: Record<'bank' | 'wallet' | 'insurer', SiloDetails> = {
  bank: {
    id: 'bank',
    name: 'Apex Tier-1 Bank (Bank Alpha)',
    tag: 'Silo #1: Banking Wire Core',
    badgeColor: 'border-blue-500/50 text-blue-400 bg-blue-950/60',
    icon: <Building2 className="w-5 h-5 text-blue-400" />,
    records: '6,362,620 transactions',
    fraudRate: '0.129% (imbalanced)',
    features: 5,
    localAuc: 0.742,
    federatedAuc: 0.998,
    lift: '+34.5% ROC-AUC',
    privacyNoise: 'Rényi DP: ε=0.245, δ=1e-5',
    focus: 'Large balance drainage, wire clearing, rapid transfer-to-cashout sequences.',
    sampleAttack: 'Coordinated account takeover draining $84,500 via newly minted mule destination.'
  },
  wallet: {
    id: 'wallet',
    name: 'FlashPay Digital Wallet (Wallet Beta)',
    tag: 'Silo #2: Mobile P2P Clearing',
    badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/60',
    icon: <Wallet className="w-5 h-5 text-emerald-400" />,
    records: '307,511 credit loan events',
    fraudRate: '8.07% default',
    features: 8,
    localAuc: 0.612,
    federatedAuc: 0.769,
    lift: '+25.7% ROC-AUC',
    privacyNoise: 'Rényi DP: ε=0.312, δ=1e-5',
    focus: 'Mobile SIM swaps, velocity bursts, rapid cross-merchant synthetic identities.',
    sampleAttack: 'Synthetic ID profile churning high credit limits across isolated fintech apps.'
  },
  insurer: {
    id: 'insurer',
    name: 'Guardian Mutual Insurance (Insure Gamma)',
    tag: 'Silo #3: Underwriting & SIU',
    badgeColor: 'border-teal-500/50 text-teal-400 bg-teal-950/60',
    icon: <Umbrella className="w-5 h-5 text-teal-400" />,
    records: '1,000,000 policy records',
    fraudRate: '4.80% staged',
    features: 7,
    localAuc: 0.658,
    federatedAuc: 0.793,
    lift: '+185% PR-AUC',
    privacyNoise: 'Rényi DP: ε=0.210, δ=1e-5',
    focus: 'Low policyholder tenure spikes, inflated loss-to-deductible claims, organized rings.',
    sampleAttack: 'Policy opened 6 days prior submitting $38,500 total loss on $500 deductible.'
  }
};

export const FederatedTopologyVisualizer: React.FC<{
  onInspectDomain?: (domain: 'intelligence' | 'creditfraud' | 'insurance') => void;
}> = ({ onInspectDomain }) => {
  const [selectedSilo, setSelectedSilo] = useState<'bank' | 'wallet' | 'insurer'>('bank');
  const [isPulsing, setIsPulsing] = useState<boolean>(true);
  const [roundNumber, setRoundNumber] = useState<number>(10);

  const silo = SILOS[selectedSilo];

  const handlePulseRound = () => {
    setIsPulsing(false);
    setRoundNumber((prev) => prev + 1);
    setTimeout(() => setIsPulsing(true), 100);
  };

  return (
    <div className="relative rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 p-5 sm:p-6 shadow-xs backdrop-blur-xl overflow-hidden space-y-5">
      {/* Subtle Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#80808012_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 font-sans">
              <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <span>Multi-Party Federated Topology Visualizer</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
              SecAgg+ Round {roundNumber}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 font-sans">
            Zero customer records leave local firewalls. Encrypted gradient masks cancel out at aggregator.
          </p>
        </div>

        {/* Pulse Interactive Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePulseRound}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Pulse Aggregation Wave</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas & Particle Streams (Left 7 Cols) + Silo Forensic Inspector (Right 5 Cols) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        
        {/* LEFT: SVG Interactive Canvas */}
        <div className="lg:col-span-7 relative min-h-[360px] sm:min-h-[400px] rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-white/5 p-4 flex items-center justify-center overflow-hidden">
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="beamBank" x1="15%" y1="20%" x2="50%" y2="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="beamWallet" x1="85%" y1="20%" x2="50%" y2="50%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="beamInsure" x1="50%" y1="85%" x2="50%" y2="50%">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>

              {/* Glowing Filter */}
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Connecting Beams with Animated Dashes */}
            {/* Beam 1: Bank (top-left) -> Center */}
            <path
              d="M 120 90 Q 200 160, 260 210"
              stroke="url(#beamBank)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={isPulsing ? '5,5' : 'none'}
              className={isPulsing ? 'animate-pulse' : ''}
              filter="url(#glowEffect)"
            />

            {/* Beam 2: Wallet (top-right) -> Center */}
            <path
              d="M 400 90 Q 320 160, 260 210"
              stroke="url(#beamWallet)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={isPulsing ? '5,5' : 'none'}
              className={isPulsing ? 'animate-pulse' : ''}
              filter="url(#glowEffect)"
            />

            {/* Beam 3: Insurer (bottom-center) -> Center */}
            <path
              d="M 260 340 L 260 210"
              stroke="url(#beamInsure)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={isPulsing ? '5,5' : 'none'}
              className={isPulsing ? 'animate-pulse' : ''}
              filter="url(#glowEffect)"
            />

            {/* Encrypted Delta Particle Dots */}
            {isPulsing && (
              <>
                <circle cx="190" cy="150" r="3" fill="#38bdf8" />
                <circle cx="330" cy="150" r="3" fill="#34d399" />
                <circle cx="260" cy="275" r="3" fill="#2dd4bf" />
              </>
            )}
          </svg>

          {/* Interactive Silo Nodes Placed Absolutely Over Canvas */}
          
          {/* Silo 1: Bank Alpha (Top-Left) */}
          <div className="absolute top-6 left-6 z-20">
            <button
              onClick={() => setSelectedSilo('bank')}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left flex items-center gap-2.5 ${
                selectedSilo === 'bank'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${selectedSilo === 'bank' ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <span>Bank Alpha</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className={`text-[10px] font-mono ${selectedSilo === 'bank' ? 'opacity-70' : 'text-zinc-500'}`}>6.3M Wire TXs</div>
              </div>
            </button>
          </div>

          {/* Silo 2: FlashPay Wallet Beta (Top-Right) */}
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={() => setSelectedSilo('wallet')}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left flex items-center gap-2.5 ${
                selectedSilo === 'wallet'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${selectedSilo === 'wallet' ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <span>Wallet Beta</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className={`text-[10px] font-mono ${selectedSilo === 'wallet' ? 'opacity-70' : 'text-zinc-500'}`}>307k Loans</div>
              </div>
            </button>
          </div>

          {/* Central Core: SecAgg+ Aggregator Coordinator */}
          <div className="relative z-30 flex flex-col items-center justify-center">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col items-center text-center max-w-[190px]">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 mb-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-xs font-semibold font-mono text-zinc-900 dark:text-zinc-100 tracking-wider uppercase">
                SecAgg+ Coordinator
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium mt-0.5">
                Masked Sum: Σ(ΔW)
              </span>
              <div className="mt-1.5 text-[9px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                0 Bytes Raw Records
              </div>
            </div>
          </div>

          {/* Silo 3: Insure Gamma (Bottom-Center) */}
          <div className="absolute bottom-6 z-20">
            <button
              onClick={() => setSelectedSilo('insurer')}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left flex items-center gap-2.5 ${
                selectedSilo === 'insurer'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${selectedSilo === 'insurer' ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                <Umbrella className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <span>Insure Gamma</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className={`text-[10px] font-mono ${selectedSilo === 'insurer' ? 'opacity-70' : 'text-zinc-500'}`}>1.0M SIU Claims</div>
              </div>
            </button>
          </div>

        </div>

        {/* RIGHT: Selected Silo Deep Inspection Bento Panel */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/10 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5">
                {silo.icon}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{silo.name}</h4>
                <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-mono font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                  {silo.tag}
                </span>
              </div>
            </div>
          </div>

          {/* Metric Comparison Badges */}
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5">
              <span className="text-[10px] text-zinc-500 block uppercase font-medium">Local Silo AUC:</span>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                {silo.localAuc.toFixed(3)}
              </span>
              <span className="text-[9px] text-zinc-400 block">Baseline in isolation</span>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase font-medium">TrustFed Lift:</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {silo.federatedAuc.toFixed(3)} ({silo.lift})
              </span>
              <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 block">Cross-institution consensus</span>
            </div>
          </div>

          {/* Silo Telemetry Stats */}
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5">
              <span className="text-zinc-500">Dataset Volume:</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{silo.records}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5">
              <span className="text-zinc-500">Silo Fraud Rate:</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{silo.fraudRate}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5">
              <span className="text-zinc-500">DP Noise Budget:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">{silo.privacyNoise}</span>
            </div>
          </div>

          {/* Real Attack Vector Context */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 font-semibold uppercase block">
              Silo Attack Vector Vulnerability:
            </span>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              {silo.sampleAttack}
            </p>
          </div>

          {/* Jump To Sandbox Button */}
          {onInspectDomain && (
            <button
              onClick={() => {
                if (selectedSilo === 'bank') onInspectDomain('intelligence');
                else if (selectedSilo === 'wallet') onInspectDomain('creditfraud');
                else onInspectDomain('insurance');
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-mono font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <span>Inspect {silo.name.split(' ')[0]} in Sandbox</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

