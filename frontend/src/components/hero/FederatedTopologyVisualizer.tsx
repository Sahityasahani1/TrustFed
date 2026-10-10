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
    <div className="relative rounded-3xl border border-white/10 bg-[#060D1E]/85 text-slate-100 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden space-y-6">
      {/* Background Subtle Cyber Matrix Grid & Cosmic Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf808_1px,transparent_1px),linear-gradient(to_bottom,#38bdf808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Multi-Party Federated Topology Visualizer</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
              SecAgg+ Round {roundNumber}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero customer records leave local firewalls. Encrypted gradient masks cancel out at aggregator.
          </p>
        </div>

        {/* Pulse Interactive Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePulseRound}
            className="px-4 py-2 rounded-full text-xs font-mono font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95 border border-white/10 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ Pulse Aggregation Wave</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas & Particle Streams (Left 7 Cols) + Silo Forensic Inspector (Right 5 Cols) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* LEFT: SVG Interactive Canvas */}
        <div className="lg:col-span-7 relative min-h-[360px] sm:min-h-[420px] rounded-2xl bg-[#030713]/90 border border-white/10 p-4 flex items-center justify-center overflow-hidden shadow-inner">
          
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
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Connecting Beams with Animated Dashes */}
            {/* Beam 1: Bank (top-left) -> Center */}
            <path
              d="M 120 90 Q 200 160, 260 210"
              stroke="url(#beamBank)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray={isPulsing ? '6,6' : 'none'}
              className={isPulsing ? 'animate-pulse' : ''}
              filter="url(#glowEffect)"
            />

            {/* Beam 2: Wallet (top-right) -> Center */}
            <path
              d="M 400 90 Q 320 160, 260 210"
              stroke="url(#beamWallet)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray={isPulsing ? '6,6' : 'none'}
              className={isPulsing ? 'animate-pulse' : ''}
              filter="url(#glowEffect)"
            />

            {/* Beam 3: Insurer (bottom-center) -> Center */}
            <path
              d="M 260 340 L 260 210"
              stroke="url(#beamInsure)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray={isPulsing ? '6,6' : 'none'}
              className={isPulsing ? 'animate-pulse' : ''}
              filter="url(#glowEffect)"
            />

            {/* Encrypted Delta Particle Dots */}
            {isPulsing && (
              <>
                <circle cx="190" cy="150" r="3.5" fill="#38bdf8" className="animate-ping" />
                <circle cx="330" cy="150" r="3.5" fill="#34d399" className="animate-ping" />
                <circle cx="260" cy="275" r="3.5" fill="#2dd4bf" className="animate-ping" />
              </>
            )}
          </svg>

          {/* Interactive Silo Nodes Placed Absolutely Over Canvas */}
          
          {/* Silo 1: Bank Alpha (Top-Left) */}
          <div className="absolute top-6 left-6 z-20">
            <button
              onClick={() => setSelectedSilo('bank')}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex items-center gap-3 backdrop-blur-xl ${
                selectedSilo === 'bank'
                  ? 'bg-[#0A1633] border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.3)] scale-105'
                  : 'bg-[#060D1E]/90 border-white/10 hover:border-white/25 hover:bg-[#0C162E]'
              }`}
            >
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Bank Alpha</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">6.3M Wire TXs</div>
              </div>
            </button>
          </div>

          {/* Silo 2: FlashPay Wallet Beta (Top-Right) */}
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={() => setSelectedSilo('wallet')}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex items-center gap-3 backdrop-blur-xl ${
                selectedSilo === 'wallet'
                  ? 'bg-[#062419] border-emerald-400 ring-2 ring-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-105'
                  : 'bg-[#060D1E]/90 border-white/10 hover:border-white/25 hover:bg-[#0C162E]'
              }`}
            >
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Wallet Beta</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">307k Loans</div>
              </div>
            </button>
          </div>

          {/* Central Core: SecAgg+ Aggregator Coordinator */}
          <div className="relative z-30 flex flex-col items-center justify-center">
            <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#080E21] via-[#101E42] to-[#080E21] border border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.35)] flex flex-col items-center text-center max-w-[200px] backdrop-blur-xl">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-500 text-white shadow-lg mb-2">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-xs font-black font-mono text-white tracking-wider uppercase">
                SecAgg+ Coordinator
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
                Masked Sum: Σ(ΔW)
              </span>
              <div className="mt-2 text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                0 Bytes Raw Records
              </div>
            </div>
          </div>

          {/* Silo 3: Insure Gamma (Bottom-Center) */}
          <div className="absolute bottom-6 z-20">
            <button
              onClick={() => setSelectedSilo('insurer')}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex items-center gap-3 backdrop-blur-xl ${
                selectedSilo === 'insurer'
                  ? 'bg-[#042426] border-teal-400 ring-2 ring-teal-500/30 shadow-[0_0_25px_rgba(20,184,166,0.3)] scale-105'
                  : 'bg-[#060D1E]/90 border-white/10 hover:border-white/25 hover:bg-[#0C162E]'
              }`}
            >
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Umbrella className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Insure Gamma</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">1.0M SIU Claims</div>
              </div>
            </button>
          </div>

        </div>

        {/* RIGHT: Selected Silo Deep Inspection Bento Panel */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-[#060D1E]/90 border border-white/10 space-y-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                {silo.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">{silo.name}</h4>
                <span className={`inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-mono font-bold border ${silo.badgeColor}`}>
                  {silo.tag}
                </span>
              </div>
            </div>
          </div>

          {/* Metric Comparison Badges */}
          <div className="grid grid-cols-2 gap-2.5 font-mono">
            <div className="p-3 rounded-xl bg-[#030713]/80 border border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase">Local Silo AUC:</span>
              <span className="text-base font-bold text-rose-400 tabular-nums">
                {silo.localAuc.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-500 block">Baseline in isolation</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
              <span className="text-[10px] text-emerald-400 block uppercase">TrustFed Lift:</span>
              <span className="text-base font-black text-emerald-300 tabular-nums">
                {silo.federatedAuc.toFixed(3)} ({silo.lift})
              </span>
              <span className="text-[10px] text-emerald-400 block">Cross-institution consensus</span>
            </div>
          </div>

          {/* Silo Telemetry Stats */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#030713]/60 border border-white/10">
              <span className="text-slate-400">Dataset Volume:</span>
              <span className="text-white font-bold">{silo.records}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#030713]/60 border border-white/10">
              <span className="text-slate-400">Silo Fraud Rate:</span>
              <span className="text-amber-400 font-bold">{silo.fraudRate}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#030713]/60 border border-white/10">
              <span className="text-slate-400">DP Noise Budget:</span>
              <span className="text-cyan-400 font-bold">{silo.privacyNoise}</span>
            </div>
          </div>

          {/* Real Attack Vector Context */}
          <div className="p-3 rounded-xl bg-[#030713]/80 border border-white/10 space-y-1">
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">
              Silo Attack Vector Vulnerability:
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
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
              className="w-full py-2.5 px-4 rounded-full text-xs font-mono font-bold bg-white/10 hover:bg-white/15 text-white border border-white/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
              <span>Inspect {silo.name.split(' ')[0]} in Sandbox</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
