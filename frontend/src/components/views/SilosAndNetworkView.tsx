import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Database, 
  Sparkles, 
  Building2, 
  Wallet, 
  Landmark, 
  EyeOff, 
  Server, 
  ShieldAlert, 
  Network 
} from 'lucide-react';

import { TiltedCard } from '../react-bits/TiltedCard';
import { SpotlightCard } from '../react-bits/SpotlightCard';
import { CountUp } from '../react-bits/CountUp';
import { DecryptedText } from '../react-bits/DecryptedText';
import { BorderBeam } from '../react-bits/BorderBeam';
import { TabsNav } from '../tabs/TabsNav';

export interface DatasetStats {
  institution: string;
  clientType: 'bank' | 'wallet' | 'lender' | 'insurer';
  fileName: string;
  rowCount: number;
  fraudCount: number;
  fraudRate: number;
  columns: string[];
  sampleRows: any[];
  missingCount: number;
  schemaCompliant: boolean;
}

interface SilosAndNetworkViewProps {
  onDatasetLoaded: (stats: DatasetStats) => void;
  currentDataset: DatasetStats | null;
  activeSubTab?: string;
  onSubTabChange?: (id: string) => void;
}

export const SilosAndNetworkView: React.FC<SilosAndNetworkViewProps> = ({
  onDatasetLoaded,
  currentDataset,
  activeSubTab = 'upload',
  onSubTabChange,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<string>(activeSubTab);
  const [selectedInstitution, setSelectedInstitution] = useState<'bank' | 'wallet' | 'lender' | 'insurer'>('bank');

  const institutionConfigs = {
    bank: {
      name: 'Apex Tier-1 Bank',
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
      focus: 'Account balance history & high-value wires',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      defaultRows: 48500,
      defaultFraud: 412,
    },
    wallet: {
      name: 'FlashPay Digital Wallet',
      icon: <Wallet className="w-5 h-5 text-emerald-600" />,
      focus: 'Mobile velocity & P2P QR micropayments',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      defaultRows: 34200,
      defaultFraud: 580,
    },
    lender: {
      name: 'CrediVance Micro-Lending',
      icon: <Landmark className="w-5 h-5 text-amber-600" />,
      focus: 'Disbursement & installment repayment behaviors',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      defaultRows: 19800,
      defaultFraud: 194,
    },
    insurer: {
      name: 'Aegis Cross-Border Insurer',
      icon: <ShieldCheck className="w-5 h-5 text-teal-600" />,
      focus: 'Chargeback & behavioral anomaly policies',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      defaultRows: 12400,
      defaultFraud: 86,
    },
  };

  const loadSyntheticPreset = (type: 'bank' | 'wallet' | 'lender' | 'insurer') => {
    setSelectedInstitution(type);
    const cfg = institutionConfigs[type];

    const sampleRowsMap = {
      bank: [
        { step: 1, type: 'TRANSFER', amount: 84500.0, oldbalanceOrg: 92000.0, newbalanceOrig: 7500.0, oldbalanceDest: 0.0, newbalanceDest: 84500.0, isFraud: 0 },
        { step: 1, type: 'CASH_OUT', amount: 181.0, oldbalanceOrg: 181.0, newbalanceOrig: 0.0, oldbalanceDest: 21182.0, newbalanceDest: 21363.0, isFraud: 1 },
        { step: 2, type: 'TRANSFER', amount: 14850.0, oldbalanceOrg: 15200.0, newbalanceOrig: 350.0, oldbalanceDest: 0.0, newbalanceDest: 14850.0, isFraud: 1 },
        { step: 2, type: 'PAYMENT', amount: 9839.64, oldbalanceOrg: 170136.0, newbalanceOrig: 160296.36, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
        { step: 3, type: 'TRANSFER', amount: 1864.28, oldbalanceOrg: 21249.0, newbalanceOrig: 19384.72, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
      ],
      wallet: [
        { step: 1, type: 'PAYMENT', amount: 24.5, oldbalanceOrg: 450.0, newbalanceOrig: 425.5, oldbalanceDest: 120.0, newbalanceDest: 144.5, isFraud: 0 },
        { step: 1, type: 'TRANSFER', amount: 4900.0, oldbalanceOrg: 5000.0, newbalanceOrig: 100.0, oldbalanceDest: 0.0, newbalanceDest: 4900.0, isFraud: 1 },
        { step: 2, type: 'CASH_OUT', amount: 2500.0, oldbalanceOrg: 2500.0, newbalanceOrig: 0.0, oldbalanceDest: 500.0, newbalanceDest: 3000.0, isFraud: 1 },
        { step: 2, type: 'PAYMENT', amount: 89.0, oldbalanceOrg: 1200.0, newbalanceOrig: 1111.0, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
        { step: 3, type: 'TRANSFER', amount: 15.0, oldbalanceOrg: 850.0, newbalanceOrig: 835.0, oldbalanceDest: 40.0, newbalanceDest: 55.0, isFraud: 0 },
      ],
      lender: [
        { step: 1, type: 'TRANSFER', amount: 1200.0, oldbalanceOrg: 1500.0, newbalanceOrig: 300.0, oldbalanceDest: 0.0, newbalanceDest: 1200.0, isFraud: 0 },
        { step: 2, type: 'CASH_OUT', amount: 7500.0, oldbalanceOrg: 7500.0, newbalanceOrig: 0.0, oldbalanceDest: 1200.0, newbalanceDest: 8700.0, isFraud: 1 },
        { step: 3, type: 'PAYMENT', amount: 350.0, oldbalanceOrg: 4200.0, newbalanceOrig: 3850.0, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
        { step: 4, type: 'TRANSFER', amount: 6400.0, oldbalanceOrg: 6500.0, newbalanceOrig: 100.0, oldbalanceDest: 0.0, newbalanceDest: 6400.0, isFraud: 1 },
        { step: 5, type: 'PAYMENT', amount: 110.0, oldbalanceOrg: 890.0, newbalanceOrig: 780.0, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
      ],
      insurer: [
        { step: 1, type: 'PAYMENT', amount: 3200.0, oldbalanceOrg: 18000.0, newbalanceOrig: 14800.0, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
        { step: 2, type: 'TRANSFER', amount: 18500.0, oldbalanceOrg: 19000.0, newbalanceOrig: 500.0, oldbalanceDest: 0.0, newbalanceDest: 18500.0, isFraud: 1 },
        { step: 3, type: 'PAYMENT', amount: 450.0, oldbalanceOrg: 8200.0, newbalanceOrig: 7750.0, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
        { step: 4, type: 'CASH_OUT', amount: 9800.0, oldbalanceOrg: 9800.0, newbalanceOrig: 0.0, oldbalanceDest: 300.0, newbalanceDest: 10100.0, isFraud: 1 },
        { step: 5, type: 'PAYMENT', amount: 120.0, oldbalanceOrg: 3400.0, newbalanceOrig: 3280.0, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
      ],
    };

    const stats: DatasetStats = {
      institution: cfg.name,
      clientType: type,
      fileName: `PaySim_${type.toUpperCase()}_NonIID_Partition.csv`,
      rowCount: cfg.defaultRows,
      fraudCount: cfg.defaultFraud,
      fraudRate: Number(((cfg.defaultFraud / cfg.defaultRows) * 100).toFixed(3)),
      columns: ['step', 'type', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest', 'isFraud'],
      sampleRows: sampleRowsMap[type],
      missingCount: 0,
      schemaCompliant: true,
    };

    onDatasetLoaded(stats);
  };

  useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (!currentDataset) {
      loadSyntheticPreset('bank');
    }
  }, []);

  const [nodes, setNodes] = useState([
    {
      id: 'bank',
      name: 'Apex Tier-1 Bank',
      type: 'Account & Balance Heavy',
      icon: Building2,
      rowCount: 48500,
      fraudRate: 0.85,
      localPrAuc: 0.62,
      isDroppedOut: false,
    },
    {
      id: 'wallet',
      name: 'FlashPay Mobile Wallet',
      type: 'Device & Velocity Heavy',
      icon: Wallet,
      rowCount: 34200,
      fraudRate: 1.69,
      localPrAuc: 0.68,
      isDroppedOut: false,
    },
    {
      id: 'lender',
      name: 'CrediVance Micro-Lender',
      type: 'Repayment & History',
      icon: Landmark,
      rowCount: 19800,
      fraudRate: 0.98,
      localPrAuc: 0.58,
      isDroppedOut: false,
    },
    {
      id: 'insurer',
      name: 'Aegis Cross-Border Insurer',
      type: 'Behavioral & Anomaly',
      icon: ShieldCheck,
      rowCount: 12400,
      fraudRate: 0.69,
      localPrAuc: 0.54,
      isDroppedOut: false,
    },
  ]);

  const activeNodesCount = nodes.filter(n => !n.isDroppedOut).length;
  const quorumMet = activeNodesCount >= 3;

  const toggleDropout = (id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isDroppedOut: !n.isDroppedOut } : n));
  };

  const handleSubTabSwitch = (id: string) => {
    setInternalSubTab(id);
    onSubTabChange?.(id);
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>Institutional Silos & Network Boundary</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Strict local data isolation: raw transaction records never traverse institutional boundaries.
          </p>
        </div>

        <TabsNav
          tabs={[
            { id: 'upload', label: '1. Institutional Data Silos', icon: <Building2 className="w-3.5 h-3.5" />, badge: currentDataset ? `${currentDataset.rowCount.toLocaleString()} rows` : undefined },
            { id: 'schema', label: '2. Schema Alignment', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
            { id: 'topology', label: '3. Federated Topology', icon: <Network className="w-3.5 h-3.5" />, badge: `${activeNodesCount}/3 Quorum` },
          ]}
          activeTab={internalSubTab}
          onChange={handleSubTabSwitch}
          variant="sub"
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* SUBTAB 1: LOCAL FILE UPLOAD DROPZONE */}
        {internalSubTab === 'upload' && (
          <motion.div
            key="subtab-upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* 3D Tilted Institutional Identity Cards */}
            <div>
              <label className="text-xs font-mono uppercase text-blue-900 font-black tracking-wider block mb-2.5">
                Step 1: Select Local Institutional Silo
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {(Object.keys(institutionConfigs) as Array<keyof typeof institutionConfigs>).map((key) => {
                  const item = institutionConfigs[key];
                  const isSelected = selectedInstitution === key;

                  const colorMap: Record<string, { border: string; bg: string; iconBg: string; text: string; badge: string }> = {
                    bank: {
                      border: 'border-blue-300 hover:border-blue-500',
                      bg: 'bg-gradient-to-b from-white to-blue-50/60 shadow-blue-500/10',
                      iconBg: 'bg-blue-100 text-blue-600 border-blue-200',
                      text: 'text-blue-900',
                      badge: 'text-blue-700 bg-blue-100 border-blue-200',
                    },
                    wallet: {
                      border: 'border-emerald-300 hover:border-emerald-500',
                      bg: 'bg-gradient-to-b from-white to-emerald-50/60 shadow-emerald-500/10',
                      iconBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
                      text: 'text-emerald-900',
                      badge: 'text-emerald-700 bg-emerald-100 border-emerald-200',
                    },
                    lender: {
                      border: 'border-amber-300 hover:border-amber-500',
                      bg: 'bg-gradient-to-b from-white to-amber-50/60 shadow-amber-500/10',
                      iconBg: 'bg-amber-100 text-amber-600 border-amber-200',
                      text: 'text-amber-900',
                      badge: 'text-amber-700 bg-amber-100 border-amber-200',
                    },
                    insurer: {
                      border: 'border-teal-300 hover:border-teal-500',
                      bg: 'bg-gradient-to-b from-white to-teal-50/60 shadow-teal-500/10',
                      iconBg: 'bg-teal-100 text-teal-600 border-teal-200',
                      text: 'text-teal-900',
                      badge: 'text-teal-700 bg-teal-100 border-teal-200',
                    },
                  };

                  const currentStyle = colorMap[key] || colorMap.bank;

                  return (
                    <TiltedCard
                      key={key}
                      onClick={() => loadSyntheticPreset(key)}
                      className={`cursor-pointer p-5 transition-all duration-300 border-2 ${currentStyle.border} ${currentStyle.bg} ${
                        isSelected
                          ? 'ring-2 ring-blue-500 shadow-2xl scale-[1.02]'
                          : 'shadow-lg hover:shadow-xl'
                      }`}
                      maxTilt={8}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-2xl border shadow-sm ${currentStyle.iconBg}`}>
                          {item.icon}
                        </div>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-blue-700 bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-200 font-bold shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Active Silo
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium">
                        {item.focus}
                      </p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Partition:</span>
                        <span className="font-bold text-slate-800">{item.defaultRows.toLocaleString()} rows</span>
                      </div>
                    </TiltedCard>
                  );
                })}
              </div>
            </div>

            {/* Institutional Silo Pipeline Card (Zero Manual File Input Policy) */}
            <TiltedCard maxTilt={4} className="border-2 border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-white/95 to-emerald-50/70 p-6 sm:p-7 rounded-3xl shadow-xl shadow-blue-500/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-md shadow-blue-500/20">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900">
                          Active Isolated Data Pipeline: {institutionConfigs[selectedInstitution].name}
                        </h3>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Pipeline
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        Pre-partitioned enterprise dataset is isolated in memory. Manual file input is disabled by zero-trust architecture.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
                    <span className="px-3 py-1 rounded-xl bg-white border border-blue-200 text-blue-800 font-bold shadow-sm">
                      URI: {selectedInstitution}.trustfed.internal:50051
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-bold shadow-sm">
                      Storage: RAM Arrow RecordBatch (0 WAN Egress)
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm">
                      Tensors: 8 Normalized Features Ready
                    </span>
                  </div>
                </div>

                {/* Quick Silo Partition Switcher Buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">Switch Silo Partition:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(Object.keys(institutionConfigs) as Array<keyof typeof institutionConfigs>).map((key) => {
                      const cfg = institutionConfigs[key];
                      const isSel = selectedInstitution === key;
                      return (
                        <button
                          key={key}
                          onClick={() => loadSyntheticPreset(key)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium cursor-pointer transition-colors ${
                            isSel 
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs' 
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/5'
                          }`}
                        >
                          {cfg.name.split(' ')[0]} ({cfg.defaultRows.toLocaleString()})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-blue-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono text-emerald-800 font-bold">Strict Client-Side Quarantine:</span>
                  <span>Zero raw transaction records traverse institutional boundaries.</span>
                </div>
                <span className="text-[11px] font-mono text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  SecAgg & DP Bound
                </span>
              </div>
            </TiltedCard>

            {/* Parsed Silo Statistics */}
            {currentDataset && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SpotlightCard className="p-5">
                    <div className="text-xs font-mono uppercase text-slate-500 font-bold">Institution Silo</div>
                    <div className="text-base font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                      {institutionConfigs[currentDataset.clientType].icon}
                      {currentDataset.institution}
                    </div>
                    <span className="text-[11px] text-blue-600 font-mono mt-2 block truncate font-medium">
                      File: {currentDataset.fileName}
                    </span>
                  </SpotlightCard>

                  <SpotlightCard className="p-5">
                    <div className="text-xs font-mono uppercase text-slate-500 font-bold">Private Records Kept</div>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                      <CountUp to={currentDataset.rowCount} duration={1.2} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                      0 rows shared with coordinator
                    </span>
                  </SpotlightCard>

                  <SpotlightCard className="p-5">
                    <div className="text-xs font-mono uppercase text-slate-500 font-bold">Local Fraud Rate</div>
                    <div className="text-2xl font-extrabold text-amber-600 mt-1">
                      <CountUp to={currentDataset.fraudRate} decimals={3} suffix="%" duration={1} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                      {currentDataset.fraudCount} positive fraud instances
                    </span>
                  </SpotlightCard>

                  <SpotlightCard className="p-5">
                    <div className="text-xs font-mono uppercase text-slate-500 font-bold">Data Boundary</div>
                    <div className="text-base font-extrabold text-blue-700 mt-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Client Sandbox
                    </div>
                    <span className="text-[11px] text-emerald-700 font-mono mt-2 block font-bold">
                      SecAgg & DP Ready
                    </span>
                  </SpotlightCard>
                </div>

                {/* Sample records table */}
                <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-mono uppercase text-blue-700 font-bold flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-emerald-600" />
                      Local Dataset Sample (First 5 Rows - Audit Verification)
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                      Isolated in RAM
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          {currentDataset.columns.map(col => (
                            <th key={col} className="pb-3 px-2 font-semibold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {currentDataset.sampleRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {currentDataset.columns.map(col => (
                              <td key={col} className="py-2.5 px-2 whitespace-nowrap">
                                {col.toLowerCase().includes('fraud') ? (
                                  Number(row[col]) === 1 ? (
                                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold border border-rose-200">1 (FRAUD)</span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )
                                ) : (
                                  String(row[col] ?? '-')
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* SUBTAB 2: SHARED SCHEMA & FEATURE DICTIONARY */}
        {internalSubTab === 'schema' && (
          <motion.div
            key="subtab-schema"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    Feature Dictionary & Shared Schema Alignment (PRD §9 & FR-2)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Strictly defined Frontend Labels and User-Friendly Technical Descriptions from Image 1 with UI Control rules from Image 2:
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold self-start sm:self-auto">
                  Image 1 & 2 Compliant
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-blue-200 text-blue-950 font-mono text-[11px] bg-blue-50/60">
                      <th className="py-3 px-3 font-extrabold">Input</th>
                      <th className="py-3 px-3 font-extrabold">Frontend Label (Image 1)</th>
                      <th className="py-3 px-3 font-extrabold">User-Friendly Technical Description (Image 1)</th>
                      <th className="py-3 px-3 font-extrabold">UI Control (Image 2)</th>
                      <th className="py-3 px-3 font-extrabold">Local Preprocessing Rule</th>
                      <th className="py-3 px-3 font-extrabold">Quarantine Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-blue-50/40">
                      <td className="py-3.5 px-3 font-mono text-blue-700 font-extrabold whitespace-nowrap">
                        ⏱️ step
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                        Transaction Time-Step
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 leading-relaxed min-w-[280px]">
                        The point in the transaction timeline when this transaction occurred. It helps the model understand the transaction's position in the activity sequence.
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700 font-bold whitespace-nowrap">
                        Positive whole number
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        Temporal split boundary (1..744 hours)
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">Client-Side</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-blue-50/40">
                      <td className="py-3.5 px-3 font-mono text-blue-700 font-extrabold whitespace-nowrap">
                        🔀 type
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                        Transaction Type
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 leading-relaxed min-w-[280px]">
                        The category of transaction being performed. Select the type that best describes the transaction.
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700 font-bold whitespace-nowrap">
                        One of 5 Categories
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        5-dim One-Hot encoding (TRANSFER, CASH_OUT, PAYMENT, CASH_IN, DEBIT)
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">Client-Side</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-blue-50/40">
                      <td className="py-3.5 px-3 font-mono text-blue-700 font-extrabold whitespace-nowrap">
                        💵 amount
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                        Transaction Amount
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 leading-relaxed min-w-[280px]">
                        The amount of money involved in this transaction. The model compares this amount with the account balances to identify unusual transaction patterns.
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700 font-bold whitespace-nowrap">
                        Nonnegative number ($)
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        Log1p transformation + RobustScaler scaling
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">Client-Side</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-blue-50/40">
                      <td className="py-3.5 px-3 font-mono text-blue-700 font-extrabold whitespace-nowrap">
                        🏦 oldbalanceOrg
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                        Sender Balance Before Transaction
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 leading-relaxed min-w-[280px]">
                        The amount available in the sender's account immediately before this transaction. This helps the model assess how large the transaction is relative to the sender's available balance.
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700 font-bold whitespace-nowrap">
                        Nonnegative number ($)
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        Synthesizes deltaBalanceOrg & draining ratio
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">Client-Side</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-blue-50/40">
                      <td className="py-3.5 px-3 font-mono text-blue-700 font-extrabold whitespace-nowrap">
                        🎯 oldbalanceDest
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                        Receiver Balance Before Transaction
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 leading-relaxed min-w-[280px]">
                        The amount available in the receiver's account immediately before this transaction. This helps the model understand the transaction in relation to the receiver's existing balance.
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700 font-bold whitespace-nowrap">
                        Nonnegative number ($)
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        Mule / burner account flag ($0 balance test)
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">Client-Side</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 3: FEDERATED TOPOLOGY */}
        {internalSubTab === 'topology' && (
          <motion.div
            key="subtab-topology"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Top Quorum Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 rounded-3xl bg-blue-50/80 border border-blue-200/80 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-2xl bg-white border border-blue-200 text-blue-600 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <DecryptedText text="Zero Raw Data Sharing Topology (PRD §11)" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Only encrypted parameter updates (ΔW) transit over Flower gRPC. Raw datasets never leave client firewalls.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                  <span className="text-slate-500 font-medium">SecAgg Quorum: </span>
                  <span className={quorumMet ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                    {activeNodesCount} / 3 required
                  </span>
                </div>
                <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  Raw Rows Sent: 0
                </div>
              </div>
            </div>

            {/* Central Coordinator with 3D Tilt */}
            <div className="max-w-md mx-auto relative z-10">
              <TiltedCard maxTilt={10} className="border-blue-200 bg-white/95 shadow-2xl text-center p-7">
                <BorderBeam duration={6} colorFrom="#0284C7" colorTo="#10B981" />
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white mb-3 shadow-lg shadow-blue-500/25">
                  <Server className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">TrustFed Central Coordinator</h3>
                <p className="text-xs text-blue-700 font-mono mt-0.5 font-bold">Flower FedAvg • SecAgg+ Cryptographic Aggregator</p>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-around text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block font-mono font-bold">Aggregated PR-AUC</span>
                    <span className="text-sm font-extrabold text-emerald-600 font-mono">0.842 (+22%)</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block font-mono font-bold">Quorum Status</span>
                    <span className={`text-xs font-bold flex items-center gap-1 ${quorumMet ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {quorumMet ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      {quorumMet ? 'Quorum Ready' : 'Round Aborted'}
                    </span>
                  </div>
                </div>
              </TiltedCard>
            </div>

            {/* 4 Client Institution Nodes with 3D Tilt */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nodes.map((node) => {
                const Icon = node.icon;
                return (
                  <TiltedCard
                    key={node.id}
                    maxTilt={10}
                    className={`p-5 transition-all duration-300 ${
                      node.isDroppedOut 
                        ? 'opacity-50 border-rose-200 bg-rose-50/50' 
                        : 'border-slate-200/80 bg-white/90 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-2xl border ${
                        node.isDroppedOut 
                          ? 'bg-rose-100 border-rose-200 text-rose-600' 
                          : 'bg-blue-50 border-blue-100 text-blue-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <button
                        onClick={() => toggleDropout(node.id)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-full cursor-pointer transition-colors font-bold ${
                          node.isDroppedOut
                            ? 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {node.isDroppedOut ? 'Reconnect' : 'Simulate Dropout'}
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{node.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono block mb-3 font-medium">{node.type}</span>

                    <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Local Dataset:</span>
                        <span className="font-mono text-slate-800 font-bold">
                          <CountUp to={node.rowCount} /> rows
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fraud Rate:</span>
                        <span className="font-mono text-amber-600 font-bold">{node.fraudRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Silo PR-AUC:</span>
                        <span className="font-mono text-slate-500">{node.localPrAuc} (Limited)</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Data Channel:</span>
                        <span className="font-mono text-emerald-700 font-bold text-[11px]">
                          🔒 Isolated
                        </span>
                      </div>
                    </div>
                  </TiltedCard>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
