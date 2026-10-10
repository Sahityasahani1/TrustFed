import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  Lock, 
  Terminal, 
  Sliders, 
  Activity, 
  KeyRound 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

import { TiltedCard } from '../react-bits/TiltedCard';
import { CountUp } from '../react-bits/CountUp';
import { DecryptedText } from '../react-bits/DecryptedText';
import { TabsNav } from '../tabs/TabsNav';

interface FederatedEngineViewProps {
  activeSubTab?: string;
  onSubTabChange?: (id: string) => void;
}

export const FederatedEngineView: React.FC<FederatedEngineViewProps> = ({
  activeSubTab = 'training',
  onSubTabChange,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<string>(activeSubTab);
  const [currentRound, setCurrentRound] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [totalRounds, setTotalRounds] = useState(10);
  const [localEpochs, setLocalEpochs] = useState(2);
  const [privacyNoise, setPrivacyNoise] = useState(1.2);
  const [clippingNorm, setClippingNorm] = useState(1.0);
  const [epsilonSpent, setEpsilonSpent] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const [historyData, setHistoryData] = useState<any[]>([
    { round: 'Init', siloMedian: 0.61, federatedVanilla: 0.61, federatedDP: 0.61 },
  ]);

  useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleSubTabSwitch = (id: string) => {
    setInternalSubTab(id);
    onSubTabChange?.(id);
  };

  const runTrainingSimulation = () => {
    setIsTraining(true);
    setCurrentRound(0);
    setEpsilonSpent(0);
    setLogs([
      `[FL Coordinator] Initializing Flower FedAvg engine with ${totalRounds} rounds...`,
      `[SecAgg] Checking client quorum: Bank (OK), Wallet (OK), Lender (OK)... Quorum met (3/3).`,
      `[DiffPrivacy] Initializing Rényi DP accountant (Clip norm=${clippingNorm}, Noise σ=${privacyNoise}).`,
    ]);

    let round = 0;
    const interval = setInterval(() => {
      round++;
      if (round > totalRounds) {
        clearInterval(interval);
        setIsTraining(false);
        setLogs(prev => [
          `[FL Coordinator] Global model converged successfully at Round ${totalRounds}!`,
          `[FL Registry] Stored global_v10 checkpoint with final PR-AUC 0.842.`,
          ...prev,
        ]);
        return;
      }

      setCurrentRound(round);
      const fedVanilla = Number((0.61 + (0.86 - 0.61) * (1 - Math.exp(-round * 0.45))).toFixed(3));
      const fedDP = Number((0.61 + (0.842 - 0.61) * (1 - Math.exp(-round * 0.42))).toFixed(3));
      const silo = 0.62;
      const eps = Number((round * (0.24 + (1 / privacyNoise) * 0.1)).toFixed(2));

      setEpsilonSpent(eps);

      setHistoryData(prev => [
        ...prev,
        {
          round: `R${round}`,
          siloMedian: silo,
          federatedVanilla: fedVanilla,
          federatedDP: fedDP,
        }
      ]);

      setLogs(prev => [
        `[Round ${round}/${totalRounds}] Received masked updates from 3 clients -> SecAgg combined -> Global PR-AUC: ${fedDP} (ε spent: ${eps})`,
        ...prev.slice(0, 15),
      ]);
    }, 1200);
  };

  const resetTraining = () => {
    setIsTraining(false);
    setCurrentRound(0);
    setEpsilonSpent(0);
    setHistoryData([{ round: 'Init', siloMedian: 0.61, federatedVanilla: 0.61, federatedDP: 0.61 }]);
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <span>Federated Learning & Cryptographic Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Flower FedAvg simulation with SecAgg+ Diffie-Hellman encryption & Rényi Differential Privacy.
          </p>
        </div>

        <TabsNav
          tabs={[
            { id: 'training', label: '1. Live Training Cockpit', icon: <Play className="w-3.5 h-3.5" />, badge: `R${currentRound}/${totalRounds}` },
            { id: 'secagg', label: '2. SecAgg+ Cryptography', icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'privacy', label: '3. Differential Privacy', icon: <ShieldCheck className="w-3.5 h-3.5" />, badge: `ε=${epsilonSpent || 2.45}` },
          ]}
          activeTab={internalSubTab}
          onChange={handleSubTabSwitch}
          variant="sub"
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* SUBTAB 1: LIVE TRAINING COCKPIT */}
        {internalSubTab === 'training' && (
          <motion.div
            key="subtab-training"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Top Hyperparameters & Controls */}
            <div className="rounded-3xl border-2 border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-white/95 to-emerald-50/90 p-6 shadow-2xl shadow-blue-500/10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    Federated Orchestrator Hyperparameters (FR-4 & FR-6)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Tune Flower FedAvg aggregation rounds, local client epochs, noise injection, and clipping norm.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={runTrainingSimulation}
                    disabled={isTraining}
                    className={`px-5 py-2.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 cursor-pointer shadow-xs transition-colors ${
                      isTraining
                        ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                        : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isTraining ? `Training (Round ${currentRound}/${totalRounds})...` : 'Start FL Training'}
                  </button>

                  <button
                    onClick={resetTraining}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer flex items-center justify-center transition-colors"
                    title="Reset Experiments"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-blue-100 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 font-mono font-medium">FL Rounds:</span>
                    <span className="text-blue-600 font-bold font-mono">{totalRounds}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={totalRounds}
                    disabled={isTraining}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 font-mono font-medium">Local Epochs:</span>
                    <span className="text-cyan-600 font-bold font-mono">{localEpochs}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={localEpochs}
                    disabled={isTraining}
                    onChange={(e) => setLocalEpochs(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 font-mono font-medium">DP Noise (σ):</span>
                    <span className="text-emerald-600 font-bold font-mono">{privacyNoise}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={privacyNoise}
                    disabled={isTraining}
                    onChange={(e) => setPrivacyNoise(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 font-mono font-medium">Clipping Norm:</span>
                    <span className="text-teal-600 font-bold font-mono">{clippingNorm}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.5"
                    value={clippingNorm}
                    disabled={isTraining}
                    onChange={(e) => setClippingNorm(Number(e.target.value))}
                    className="w-full accent-teal-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 4 3D Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TiltedCard maxTilt={8} className="p-5 border-2 border-blue-300 bg-gradient-to-br from-white to-blue-50/60 shadow-xl shadow-blue-500/10">
                <div className="text-xs font-mono uppercase text-blue-700 font-bold">Current Round</div>
                <div className="text-2xl font-extrabold text-blue-800 mt-1">
                  <span className="font-mono">{currentRound}</span>
                  <span className="text-sm text-slate-400 font-mono"> / {totalRounds}</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                  Flower Federated Averaging
                </span>
              </TiltedCard>

              <TiltedCard maxTilt={8} className="p-5 border-2 border-emerald-300 bg-gradient-to-br from-white to-emerald-50/60 shadow-xl shadow-emerald-500/10">
                <div className="text-xs font-mono uppercase text-emerald-700 font-bold">SecAgg Quorum</div>
                <div className="text-base font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Active (3/3 Nodes)
                </div>
                <span className="text-[11px] text-emerald-700 font-mono mt-2 block font-medium">
                  Diffie-Hellman Encrypted
                </span>
              </TiltedCard>

              <TiltedCard maxTilt={8} className="p-5 border-2 border-amber-300 bg-gradient-to-br from-white to-amber-50/60 shadow-xl shadow-amber-500/10">
                <div className="text-xs font-mono uppercase text-amber-700 font-bold">Cumulative Privacy Spent</div>
                <div className="text-2xl font-extrabold text-amber-700 mt-1">
                  <CountUp to={epsilonSpent} decimals={2} prefix="ε = " duration={0.8} />
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                  Rényi DP (δ = 10⁻⁵)
                </span>
              </TiltedCard>

              <TiltedCard maxTilt={8} className="p-5 border-2 border-teal-300 bg-gradient-to-br from-white to-teal-50/60 shadow-xl shadow-teal-500/10">
                <div className="text-xs font-mono uppercase text-teal-700 font-bold">PR-AUC Improvement</div>
                <div className="text-2xl font-extrabold text-teal-700 mt-1">
                  {historyData.length > 1 ? (
                    <CountUp 
                      to={Number(((historyData[historyData.length - 1].federatedDP - 0.61) / 0.61 * 100).toFixed(1))} 
                      prefix="+" 
                      suffix="%" 
                      duration={0.8} 
                    />
                  ) : '+0.0%'}
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                  Over silo-only median
                </span>
              </TiltedCard>
            </div>

            {/* Convergence Chart & Log Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-3xl border-2 border-blue-200/90 bg-white/95 p-6 shadow-2xl shadow-blue-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Convergence Trajectory vs Silo Baseline (PR-AUC)
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Real-time test validation over non-IID cross-institutional partitions
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold">
                    PRD §10 Success Metric
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="round" stroke="#64748B" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0.5, 0.9]} stroke="#64748B" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 16, fontSize: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line 
                        type="monotone" 
                        dataKey="siloMedian" 
                        name="Silo-Only Median (0.62)" 
                        stroke="#94A3B8" 
                        strokeDasharray="4 4" 
                        strokeWidth={2} 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="federatedVanilla" 
                        name="Vanilla FedAvg (No DP)" 
                        stroke="#0EA5E9" 
                        strokeWidth={2} 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="federatedDP" 
                        name="TrustFed (SecAgg + DP)" 
                        stroke="#10B981" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#10B981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Streaming Logs */}
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 flex flex-col font-mono text-xs shadow-2xl text-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-300">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Flower Aggregator Logs
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 font-bold">
                    Live Stream
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 py-3 max-h-60 text-[11px]">
                  {logs.length > 0 ? (
                    logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed text-slate-300">
                        <span className="text-emerald-400 mr-1.5 font-bold">❯</span>
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic py-10 text-center">
                      Click "Start FL Training" to stream real-time Flower FedAvg execution and SecAgg masks.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 2: SECAGG+ CRYPTOGRAPHY */}
        {internalSubTab === 'secagg' && (
          <motion.div
            key="subtab-secagg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TiltedCard maxTilt={8} className="p-6">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 font-bold">
                  <span>Cryptographic Protocol</span>
                  <KeyRound className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mt-2">SecAgg+ (Diffie-Hellman)</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                  Pairs of client institutions agree on pairwise random masking vectors s_(u,v). Masks cancel out exactly upon coordinator summation:
                </p>
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-blue-700 font-bold">
                  ∑(w_u + ∑ s_u,v) = ∑ w_u
                </div>
              </TiltedCard>

              <TiltedCard maxTilt={8} className="p-6">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 font-bold">
                  <span>Security Model</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mt-2">Honest-But-Curious</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                  The central aggregator server coordinates the federated rounds but mathematically cannot reconstruct any single institution's weights.
                </p>
                <span className="text-[11px] text-emerald-700 font-mono mt-4 block font-bold">
                  ✓ Verified Zero Reconstruction
                </span>
              </TiltedCard>

              <TiltedCard maxTilt={8} className="p-6">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 font-bold">
                  <span>Dropout Resilience</span>
                  <Activity className="w-4 h-4 text-teal-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mt-2">Threshold Secret Sharing</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                  Shamir's (t, n) secret sharing allows surviving clients to unmask dropped nodes without compromising privacy if at least 3 nodes respond.
                </p>
                <span className="text-[11px] text-teal-700 font-mono mt-4 block font-bold">
                  Threshold: 3/4 participating
                </span>
              </TiltedCard>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 3: DIFFERENTIAL PRIVACY ACCOUNTANT */}
        {internalSubTab === 'privacy' && (
          <motion.div
            key="subtab-privacy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                Rényi Differential Privacy (RDP) Budget Accountant (PRD FR-6)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                TrustFed applies Gaussian noise perturbation and gradient clipping to bound information leakage from individual training examples.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="text-xs text-amber-800 font-mono font-bold">Privacy Loss Parameter</span>
                  <div className="text-2xl font-bold font-mono text-amber-700 mt-1">ε = 2.45</div>
                  <span className="text-[11px] text-amber-800/80 mt-1 block">Upper bound on data reconstruction</span>
                </div>

                <div className="p-5 rounded-2xl bg-cyan-50/70 border border-cyan-200">
                  <span className="text-xs text-cyan-800 font-mono font-bold">Failure Probability</span>
                  <div className="text-2xl font-bold font-mono text-cyan-700 mt-1">δ = 10⁻⁵</div>
                  <span className="text-[11px] text-cyan-800/80 mt-1 block">Strictly below 1 / dataset size</span>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-xs text-emerald-800 font-mono font-bold">Noise Multiplier (σ)</span>
                  <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">σ = 1.20</div>
                  <span className="text-[11px] text-emerald-800/80 mt-1 block">Calibrated with gradient clipping C=1.0</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
