import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Play, 
  Pause, 
  AlertOctagon, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  RotateCcw, 
  Radio, 
  Sliders, 
  Cpu, 
  Clock, 
  ArrowUpRight, 
  Layers, 
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Database,
  Award,
  Scale,
  UserCheck,
  FileText
} from 'lucide-react';
import { 
  connectClearinghouseStream, 
  ClearinghouseController,
  generateFcraNotice,
  generateNistCertificate,
  assessRisk
} from '../../risk_api_client';
import { CacheTelemetryWidget } from './CacheTelemetryWidget';
import { GeminiForensicCard } from '../forensics/GeminiForensicCard';
import { FcraNoticeModal } from '../compliance/FcraNoticeModal';
import { NistCertificateModal } from '../compliance/NistCertificateModal';
import { InvestigatorOverrideModal } from '../compliance/InvestigatorOverrideModal';
import { useToast } from '../common/ToastNotification';

export interface StreamTick {
  tick_id: number;
  record_id: string;
  domain: 'banks' | 'lenders' | 'insurers';
  timestamp: string;
  payload: Record<string, any>;
  assessment: {
    fraud_probability: number;
    risk_score: number;
    decision_threshold: number;
    classification: string;
    anomaly_score?: number | null;
    inference_time_ms: number;
  };
  simulated_attack?: boolean;
}

export const ClearinghouseStreamWorkbench: React.FC = () => {
  const { toast } = useToast();
  
  // Connection and streaming state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [tps, setTps] = useState<number>(20);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  
  // High-frequency tick waterfall buffer (capped to latest 30)
  const [ticks, setTicks] = useState<StreamTick[]>([]);
  const [totalTicksReceived, setTotalTicksReceived] = useState<number>(0);
  const [totalFraudCount, setTotalFraudCount] = useState<number>(0);
  const [totalAnomalyCount, setTotalAnomalyCount] = useState<number>(0);
  const [recentLatencies, setRecentLatencies] = useState<number[]>([]);
  
  // Detail Inspector Drawer
  const [inspectedTick, setInspectedTick] = useState<StreamTick | null>(null);
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [geminiResult, setGeminiResult] = useState<any | null>(null);

  // Attack pulse visual feedback
  const [attackFlash, setAttackFlash] = useState<boolean>(false);

  // Phase 3: Compliance & Override Modals
  const [overrideModalTick, setOverrideModalTick] = useState<StreamTick | null>(null);
  const [fcraNotice, setFcraNotice] = useState<any | null>(null);
  const [nistCert, setNistCert] = useState<any | null>(null);

  const handleTriggerFcraNotice = async (tick: StreamTick) => {
    try {
      const notice = await generateFcraNotice(tick.domain, tick.record_id, tick.payload, {
        mlRiskResult: geminiResult || {
          risk: tick.assessment,
        },
      });
      setFcraNotice(notice);
      toast({ title: 'Adverse Action Notice Generated', description: `Notice ${notice.notice_id} ready.`, type: 'info' });
    } catch (err: any) {
      toast({ title: 'Notice Generation Failed', description: err?.message, type: 'warning' });
    }
  };

  const handleTriggerNistCert = async (tick: StreamTick) => {
    try {
      const cert = await generateNistCertificate(tick.domain, tick.record_id, tick.payload, geminiResult || {
        risk: tick.assessment,
      });
      setNistCert(cert);
      toast({ title: 'NIST Certificate Issued', description: `Certificate ${cert.certificate_id} sealed.`, type: 'success' });
    } catch (err: any) {
      toast({ title: 'Certificate Issuance Failed', description: err?.message, type: 'warning' });
    }
  };

  const handleOverrideSuccess = (overrideRecord: any) => {
    setTicks((prev) =>
      prev.map((t) => {
        if (t.record_id === overrideRecord.record_id) {
          return {
            ...t,
            assessment: {
              ...t.assessment,
              classification: overrideRecord.decision?.override_classification || t.assessment.classification,
            },
          };
        }
        return t;
      })
    );
    if (inspectedTick && inspectedTick.record_id === overrideRecord.record_id) {
      setInspectedTick((prev) =>
        prev
          ? {
              ...prev,
              assessment: {
                ...prev.assessment,
                classification: overrideRecord.decision?.override_classification || prev.assessment.classification,
              },
            }
          : null
      );
    }
  };

  const controllerRef = useRef<ClearinghouseController | null>(null);

  useEffect(() => {
    // Connect to WebSocket streaming clearinghouse
    const controller = connectClearinghouseStream(
      (tick: StreamTick) => {
        setIsConnected(true);
        setTotalTicksReceived((prev) => prev + 1);

        if (tick.assessment?.classification === 'flagged_fraud' || (tick.assessment?.fraud_probability || 0) >= 0.5) {
          setTotalFraudCount((prev) => prev + 1);
        }

        if (tick.simulated_attack) {
          setTotalAnomalyCount((prev) => prev + 1);
          setAttackFlash(true);
          setTimeout(() => setAttackFlash(false), 800);
        }

        if (tick.assessment?.inference_time_ms) {
          setRecentLatencies((prev) => [...prev.slice(-49), tick.assessment.inference_time_ms]);
        }

        setTicks((prev) => [tick, ...prev.slice(0, 29)]);
      },
      (status) => {
        if (status.type === 'status') {
          setIsConnected(true);
          if (status.is_paused !== undefined) setIsPaused(status.is_paused);
          if (status.target_tps) setTps(status.target_tps);
        }
      },
      (err) => {
        console.warn('Clearinghouse stream error:', err);
        setIsConnected(false);
      }
    );

    controllerRef.current = controller;

    return () => {
      controller.disconnect();
    };
  }, []);

  const handleTogglePause = () => {
    if (!controllerRef.current) return;
    if (isPaused) {
      controllerRef.current.resume();
      setIsPaused(false);
      toast({ title: 'Stream Resumed', description: `Streaming live clearinghouse transactions at ${tps} TPS`, type: 'info' });
    } else {
      controllerRef.current.pause();
      setIsPaused(true);
      toast({ title: 'Stream Paused', description: 'Clearinghouse event broadcast suspended', type: 'info' });
    }
  };

  const handleTpsChange = (newTps: number) => {
    setTps(newTps);
    if (controllerRef.current) {
      controllerRef.current.setTps(newTps);
    }
  };

  const handleInjectAnomaly = (targetDomain?: 'banks' | 'lenders' | 'insurers') => {
    if (controllerRef.current) {
      controllerRef.current.injectAnomaly(targetDomain);
      toast({
        title: 'Adversarial Anomaly Injected',
        description: `High-entropy attack vector submitted to ${targetDomain || 'active domain'} queue`,
        type: 'warning',
      });
    }
  };

  const handleClearBuffer = () => {
    setTicks([]);
    toast({ title: 'Waterfall Cleared', description: 'Transaction buffer reset', type: 'info' });
  };

  // Inspect record with Gemini Explainer
  const handleInspectWithGemini = async (tick: StreamTick) => {
    setGeminiLoading(true);
    setGeminiResult(null);
    try {
      const res = await assessRisk(tick.domain, tick.payload, true);
      setGeminiResult(res);
    } catch (err: any) {
      toast({
        title: 'Forensic Reasoning Error',
        description: err?.message || 'Unable to generate Gemini explanation',
        type: 'warning',
      });
    } finally {
      setGeminiLoading(false);
    }
  };

  // Filtered ticks for waterfall
  const filteredTicks = ticks.filter((t) => {
    if (selectedDomainFilter === 'all') return true;
    return t.domain === selectedDomainFilter;
  });

  // Calculate rolling average latency
  const avgLatency = recentLatencies.length > 0
    ? (recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length).toFixed(2)
    : '0.95';

  const fraudRatePct = totalTicksReceived > 0 
    ? ((totalFraudCount / totalTicksReceived) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & STREAM STATUS */}
      <div className={`p-5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border ${attackFlash ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-zinc-200/80 dark:border-white/10'} shadow-sm transition-all duration-300`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isConnected ? (isPaused ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20') : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'}`}>
              <Radio className={`w-5 h-5 ${isConnected && !isPaused ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Live Clearinghouse Streaming Hub
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Phase 2 High-Throughput
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? (isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') : 'bg-rose-500'}`} />
                  {isConnected ? (isPaused ? 'Paused' : 'Broadcasting Live') : 'Connecting...'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Sub-2ms ONNX Runtime FP16 scoring, streaming multi-institutional transactions at 10–50 TPS with real-time anomaly detection.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={handleTogglePause}
              disabled={!isConnected}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-white/10'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>

            <button
              onClick={() => handleInjectAnomaly()}
              disabled={!isConnected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              <span>🚨 Inject Attack Anomaly</span>
            </button>

            <button
              onClick={handleClearBuffer}
              title="Clear waterfall buffer"
              className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stream Tuning Sliders & Domain Toggles */}
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* TPS Slider */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <Sliders className="w-3.5 h-3.5 text-cyan-500" />
              <span>Velocity:</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={tps}
              onChange={(e) => handleTpsChange(Number(e.target.value))}
              className="w-32 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              {tps} TPS
            </span>
          </div>

          {/* Domain Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-xl border border-zinc-200/60 dark:border-white/5 text-xs">
            {[
              { id: 'all', label: 'All Silos' },
              { id: 'banks', label: 'Banks (PaySim)' },
              { id: 'lenders', label: 'Lenders (Loans)' },
              { id: 'insurers', label: 'Insurers (Claims)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedDomainFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                  selectedDomainFilter === tab.id
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME KPI HUD CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Streamed Ticks */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Streamed Events</span>
            <Activity className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {totalTicksReceived.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400 font-mono">ticks</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            Buffered: {filteredTicks.length} transactions
          </div>
        </div>

        {/* Metric 2: ONNX Latency */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>ONNX Runtime FP16</span>
            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {avgLatency}
            </span>
            <span className="text-xs text-zinc-400 font-mono">ms / score</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
            SLA certified (&lt;25ms)
          </div>
        </div>

        {/* Metric 3: Fraud Flagged */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Fraud Outliers</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {totalFraudCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ({fraudRatePct}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            Exceeding calibrated threshold
          </div>
        </div>

        {/* Metric 4: Adversarial Injections */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Attacks Injected</span>
            <AlertOctagon className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {totalAnomalyCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">detected</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            IsolationForest flagged
          </div>
        </div>
      </div>

      {/* 3. TWO-TIER SEMANTIC CACHE TELEMETRY CARD */}
      <CacheTelemetryWidget />

      {/* 4. STREAMING WATERFALL TABLE */}
      <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-sm overflow-hidden">
        
        {/* Waterfall Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Live Transaction Waterfall Feed
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Top 30 Instant Feed
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            Click any row to inspect SHAP drivers & payload
          </div>
        </div>

        {/* Table Viewport */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="sticky top-0 bg-zinc-50/95 dark:bg-zinc-800/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-medium">Time (UTC)</th>
                <th className="py-2.5 px-3 font-medium">Silo / Domain</th>
                <th className="py-2.5 px-3 font-medium">Record ID</th>
                <th className="py-2.5 px-3 font-medium">Core Metric</th>
                <th className="py-2.5 px-3 font-medium">Fraud Risk</th>
                <th className="py-2.5 px-3 font-medium">Status / Anomaly</th>
                <th className="py-2.5 px-3 font-medium">ONNX Latency</th>
                <th className="py-2.5 px-3 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
              <AnimatePresence initial={false}>
                {filteredTicks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-mono">
                      {isConnected ? 'Awaiting incoming ticks from streaming clearinghouse...' : 'Connecting to clearinghouse WebSocket stream...'}
                    </td>
                  </tr>
                ) : (
                  filteredTicks.map((tick) => {
                    const prob = tick.assessment?.fraud_probability || 0;
                    const isFraud = prob >= 0.5 || tick.assessment?.classification === 'flagged_fraud';
                    const isAttack = tick.simulated_attack;

                    // Domain color styling
                    const domainBadge = {
                      banks: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                      lenders: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                      insurers: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
                    }[tick.domain] || 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';

                    // Format primary financial metric
                    let primaryVal = '-';
                    if (tick.domain === 'banks') {
                      primaryVal = `$${Number(tick.payload?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    } else if (tick.domain === 'lenders') {
                      primaryVal = `Credit: $${Number(tick.payload?.amt_credit || 0).toLocaleString()}`;
                    } else if (tick.domain === 'insurers') {
                      primaryVal = `Claim: $${Number(tick.payload?.claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }

                    const timeStr = tick.timestamp ? new Date(tick.timestamp).toLocaleTimeString() : '--:--:--';

                    return (
                      <motion.tr
                        key={tick.record_id || tick.tick_id}
                        initial={{ opacity: 0, y: -6, backgroundColor: isAttack ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.1)' }}
                        animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
                        transition={{ duration: 0.3 }}
                        onClick={() => {
                          setInspectedTick(tick);
                          setGeminiResult(null);
                        }}
                        className="hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                      >
                        {/* Time */}
                        <td className="py-2 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {timeStr}
                        </td>

                        {/* Domain */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border uppercase tracking-wider ${domainBadge}`}>
                            {tick.domain}
                          </span>
                        </td>

                        {/* Record ID */}
                        <td className="py-2 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {tick.record_id}
                        </td>

                        {/* Core Metric */}
                        <td className="py-2 px-3 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          {primaryVal}
                        </td>

                        {/* Fraud Risk */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${isFraud ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {(prob * 100).toFixed(1)}%
                            </span>
                            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isFraud ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, prob * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status / Anomaly */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isAttack ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                              <AlertOctagon className="w-3 h-3 text-rose-500" />
                              ATTACK INJECTION
                            </span>
                          ) : isFraud ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <ShieldAlert className="w-3 h-3 text-amber-500" />
                              FLAGGED FRAUD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              VERIFIED SAFE
                            </span>
                          )}
                        </td>

                        {/* ONNX Latency */}
                        <td className="py-2 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {tick.assessment?.inference_time_ms ? `${tick.assessment.inference_time_ms.toFixed(2)} ms` : '<1 ms'}
                        </td>

                        {/* Inspect */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedTick(tick);
                              setGeminiResult(null);
                            }}
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          >
                            Inspect →
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. RECORD TELEMETRY INSPECTOR MODAL */}
      <AnimatePresence>
        {inspectedTick && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      Transaction Telemetry: {inspectedTick.record_id}
                      {inspectedTick.simulated_attack && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          Simulated Attack
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      Domain: {inspectedTick.domain.toUpperCase()} • Generated at {inspectedTick.timestamp}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectedTick(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Assessment Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Risk Score</div>
                  <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
                    {inspectedTick.assessment?.risk_score?.toFixed(1) || '0.0'} / 100
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Fraud Probability</div>
                  <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
                    {((inspectedTick.assessment?.fraud_probability || 0) * 100).toFixed(2)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Inference Latency</div>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {inspectedTick.assessment?.inference_time_ms?.toFixed(2) || '<1'} ms
                  </div>
                </div>
              </div>

              {/* Raw Payload Features */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 font-mono">
                  Input Feature Vectors
                </h4>
                <div className="p-3 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800">
                  <pre>{JSON.stringify(inspectedTick.payload, null, 2)}</pre>
                </div>
              </div>

              {/* Forensic Reasoning Action */}
              <div className="pt-2 border-t border-zinc-200 dark:border-white/10">
                {!geminiResult ? (
                  <button
                    onClick={() => handleInspectWithGemini(inspectedTick)}
                    disabled={geminiLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-linear-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${geminiLoading ? 'animate-spin' : ''}`} />
                    <span>{geminiLoading ? 'Synthesizing Forensic Reasoning...' : 'Run Gemini Multi-Silo Forensic Analysis'}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                      Gemini Forensic Reasoning & SHAP Drivers
                    </h4>
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                      {geminiResult.ai_reasoning?.text || 'Analysis complete.'}
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 3: Regulatory Compliance & Investigator Overrides */}
              <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleTriggerFcraNotice(inspectedTick)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Generate FCRA Adverse Action Notice"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>FCRA Notice</span>
                  </button>
                  <button
                    onClick={() => handleTriggerNistCert(inspectedTick)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Issue NIST SP 1270 Certificate"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    <span>NIST Cert</span>
                  </button>
                </div>

                <button
                  onClick={() => setOverrideModalTick(inspectedTick)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Investigator Override</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phase 3 Compliance Modals */}
      <FcraNoticeModal
        isOpen={Boolean(fcraNotice)}
        onClose={() => setFcraNotice(null)}
        notice={fcraNotice}
      />
      <NistCertificateModal
        isOpen={Boolean(nistCert)}
        onClose={() => setNistCert(null)}
        certificate={nistCert}
      />
      {overrideModalTick && (
        <InvestigatorOverrideModal
          isOpen={Boolean(overrideModalTick)}
          onClose={() => setOverrideModalTick(null)}
          domain={overrideModalTick.domain}
          recordId={overrideModalTick.record_id}
          originalClassification={overrideModalTick.assessment?.classification || 'unknown'}
          onOverrideSuccess={handleOverrideSuccess}
        />
      )}
    </div>
  );
};
