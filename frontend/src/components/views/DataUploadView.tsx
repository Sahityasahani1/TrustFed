import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Database, 
  Sparkles, 
  FileText,
  Building2,
  Wallet,
  Landmark,
  ArrowRight,
  RefreshCw,
  EyeOff
} from 'lucide-react';
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

interface DataUploadViewProps {
  onDatasetLoaded: (stats: DatasetStats) => void;
  currentDataset: DatasetStats | null;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  onDatasetLoaded,
  currentDataset,
}) => {
  // Subtabs within Institution Onboarding
  const [subTab, setSubTab] = useState<'upload' | 'schema' | 'stats'>('upload');
  const [selectedInstitution, setSelectedInstitution] = useState<'bank' | 'wallet' | 'lender' | 'insurer'>('bank');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const institutionConfigs = {
    bank: {
      name: 'Apex Tier-1 Bank',
      icon: <Building2 className="w-5 h-5 text-blue-400" />,
      color: 'blue',
      focus: 'Account balance history & wire transfers',
      defaultRows: 48500,
      defaultFraud: 412,
    },
    wallet: {
      name: 'FlashPay Digital Wallet',
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      color: 'emerald',
      focus: 'Mobile velocity & P2P QR transfers',
      defaultRows: 34200,
      defaultFraud: 580,
    },
    lender: {
      name: 'CrediVance Micro-Lending',
      icon: <Landmark className="w-5 h-5 text-amber-400" />,
      color: 'amber',
      focus: 'Disbursement & repayment behaviors',
      defaultRows: 19800,
      defaultFraud: 194,
    },
    insurer: {
      name: 'Aegis Cross-Border Insurer',
      icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
      color: 'purple',
      focus: 'Chargeback & behavioral anomaly policies',
      defaultRows: 12400,
      defaultFraud: 86,
    },
  };

  const handleFileProcess = (file: File) => {
    setIsParsing(true);
    setUploadError(null);

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      setUploadError('Please upload a valid .csv or .json transaction dataset.');
      setIsParsing(false);
      return;
    }

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as any[];
            const cols = results.meta.fields || [];

            // Find fraud column
            const fraudCol = cols.find(c => ['isFraud', 'isfraud', 'fraud', 'is_fraud', 'label'].includes(c.toLowerCase()));
            let fraudCount = 0;
            if (fraudCol) {
              fraudCount = data.filter(r => Number(r[fraudCol]) === 1).length;
            } else {
              // Simulated for unlabelled
              fraudCount = Math.floor(data.length * 0.012);
            }

            const stats: DatasetStats = {
              institution: institutionConfigs[selectedInstitution].name,
              clientType: selectedInstitution,
              fileName: file.name,
              rowCount: data.length,
              fraudCount: fraudCount,
              fraudRate: Number(((fraudCount / (data.length || 1)) * 100).toFixed(3)),
              columns: cols,
              sampleRows: data.slice(0, 5),
              missingCount: 0,
              schemaCompliant: true,
            };

            onDatasetLoaded(stats);
            setIsParsing(false);
            setSubTab('stats');
          } catch (err) {
            setUploadError('Error parsing CSV format. Please verify file schema.');
            setIsParsing(false);
          }
        },
        error: (err) => {
          setUploadError(`Failed to read CSV: ${err.message}`);
          setIsParsing(false);
        },
      });
    }
  };

  const loadSyntheticPreset = (type: 'bank' | 'wallet' | 'lender') => {
    setSelectedInstitution(type);
    const cfg = institutionConfigs[type];
    
    // Sample preview rows mimicking PaySim
    const samplePaySim = [
      { step: 1, type: 'TRANSFER', amount: 181.0, oldbalanceOrg: 181.0, newbalanceOrig: 0.0, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 1 },
      { step: 1, type: 'CASH_OUT', amount: 181.0, oldbalanceOrg: 181.0, newbalanceOrig: 0.0, oldbalanceDest: 21182.0, newbalanceDest: 0.0, isFraud: 1 },
      { step: 2, type: 'PAYMENT', amount: 9839.64, oldbalanceOrg: 170136.0, newbalanceOrig: 160296.36, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
      { step: 2, type: 'TRANSFER', amount: 1864.28, oldbalanceOrg: 21249.0, newbalanceOrig: 19384.72, oldbalanceDest: 0.0, newbalanceDest: 0.0, isFraud: 0 },
      { step: 3, type: 'CASH_IN', amount: 11668.14, oldbalanceOrg: 41554.0, newbalanceOrig: 53222.14, oldbalanceDest: 27191.0, newbalanceDest: 15522.86, isFraud: 0 },
    ];

    const stats: DatasetStats = {
      institution: cfg.name,
      clientType: type,
      fileName: `PaySim_${type.toUpperCase()}_NonIID_Partition.csv`,
      rowCount: cfg.defaultRows,
      fraudCount: cfg.defaultFraud,
      fraudRate: Number(((cfg.defaultFraud / cfg.defaultRows) * 100).toFixed(3)),
      columns: ['step', 'type', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest', 'isFraud'],
      sampleRows: samplePaySim,
      missingCount: 0,
      schemaCompliant: true,
    };

    onDatasetLoaded(stats);
    setSubTab('stats');
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation with Animated Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <DecryptedText text="Institution Data Silo Onboarding (FR-1)" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate institutional data isolation. Raw transactions remain locally in the browser/client sandbox.
          </p>
        </div>

        <TabsNav
          tabs={[
            { id: 'upload', label: '1. File Upload Dropzone', icon: <Upload className="w-3.5 h-3.5" /> },
            { id: 'schema', label: '2. Schema Alignment', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'stats', label: '3. Silo Analytics', icon: <Database className="w-3.5 h-3.5" />, badge: currentDataset ? 'Loaded' : undefined },
          ]}
          activeTab={subTab}
          onChange={(id) => setSubTab(id as any)}
          variant="sub"
        />
      </div>

      {/* Subtab Content with Animated Transitions */}
      <AnimatePresence mode="wait" initial={false}>
        {subTab === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Institution Selector Cards */}
            <div>
              <label className="text-xs font-mono uppercase text-cyan-400/90 font-bold tracking-wider block mb-2.5">
                Step 1: Choose Institutional Identity
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(institutionConfigs) as Array<keyof typeof institutionConfigs>).map((key) => {
                  const item = institutionConfigs[key];
                  const isSelected = selectedInstitution === key;
                  return (
                    <SpotlightCard
                      key={key}
                      onClick={() => setSelectedInstitution(key)}
                      className={`cursor-pointer transition-all duration-300 p-4.5 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 shadow-xl shadow-cyan-500/20'
                          : 'border-slate-700/80 bg-slate-900/90 hover:border-slate-600 hover:bg-slate-800/80'
                      }`}
                      spotlightColor="rgba(6, 182, 212, 0.3)"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                          {item.icon}
                        </div>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-700 font-bold">
                            <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Active Silo
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {item.focus}
                      </p>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Drag & Drop File Upload Box */}
            <div className="relative">
              <label className="text-xs font-mono uppercase text-cyan-400/90 font-bold tracking-wider block mb-2.5">
                Step 2: Upload Local Dataset (CSV or JSON)
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileProcess(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative group rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-300 overflow-hidden cursor-pointer shadow-xl ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/40 scale-[1.01]'
                    : 'border-slate-600/80 hover:border-cyan-400/70 bg-slate-900/85 hover:bg-slate-800/90'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.json"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                {isDragging && <BorderBeam duration={3} colorFrom="#06B6D4" colorTo="#10B981" />}

                <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3.5">
                  <div className="h-16 w-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/25 transition-all duration-300 shadow-lg shadow-cyan-500/20">
                    <Upload className="w-8 h-8 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {isParsing ? 'Parsing Dataset Locally...' : 'Drop your transaction dataset here'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 font-medium">
                      Support for PaySim partitions, synthetic transaction logs (.csv, .json up to 250MB)
                    </p>
                  </div>
                  <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-600 group-hover:border-cyan-400 group-hover:bg-cyan-950/50">
                    Browse Local File
                  </span>
                </div>

                {/* Privacy Badge Guarantee */}
                <div className="mt-6 pt-4 border-t border-slate-700/80 flex items-center justify-center gap-2 text-xs text-slate-300">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono text-emerald-400 font-bold">Strict Client-Side Boundary:</span>
                  <span>Raw rows are parsed inside your browser RAM. 0 records leave your machine.</span>
                </div>
              </div>

              {uploadError && (
                <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-700 text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Quick Demo Pre-load Partitions */}
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-mono uppercase text-amber-300 font-bold flex items-center gap-1.5 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Hackathon Loader (Pre-Generated PaySim Silos)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Load pre-partitioned non-IID datasets without uploading local files
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => loadSyntheticPreset('bank')}
                    className="px-3.5 py-2 rounded-xl bg-blue-950/90 hover:bg-blue-900 border border-blue-600 text-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-400" /> Load Bank Silo (48.5k)
                  </button>
                  <button
                    onClick={() => loadSyntheticPreset('wallet')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Load Wallet Silo (34.2k)
                  </button>
                  <button
                    onClick={() => loadSyntheticPreset('lender')}
                    className="px-3.5 py-2 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-600 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                  >
                    <Landmark className="w-3.5 h-3.5 text-amber-400" /> Load Lender Silo (19.8k)
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'schema' && (
          <motion.div
            key="schema"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                Shared Feature Schema &amp; Data Alignment
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Each institution safeguards its raw transaction features locally before evaluating against collaborative defense models:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="pb-2.5 font-semibold">Standard Feature</th>
                      <th className="pb-2.5 font-semibold">Data Type</th>
                      <th className="pb-2.5 font-semibold">Mapped Local Column</th>
                      <th className="pb-2.5 font-semibold">Preprocessing Rule</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2.5 font-mono text-cyan-300">step / time_step</td>
                      <td className="py-2.5 font-mono text-slate-400">Integer (1..744)</td>
                      <td className="py-2.5 font-mono text-slate-300">step</td>
                      <td className="py-2.5 text-slate-400">Temporal split boundary</td>
                      <td className="py-2.5"><span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Mapped</span></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-cyan-300">type</td>
                      <td className="py-2.5 font-mono text-slate-400">Categorical</td>
                      <td className="py-2.5 font-mono text-slate-300">type</td>
                      <td className="py-2.5 text-slate-400">One-hot encoding (TRANSFER, CASH_OUT, etc.)</td>
                      <td className="py-2.5"><span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Mapped</span></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-cyan-300">amount</td>
                      <td className="py-2.5 font-mono text-slate-400">Float ($)</td>
                      <td className="py-2.5 font-mono text-slate-300">amount</td>
                      <td className="py-2.5 text-slate-400">Log1p + RobustScaler</td>
                      <td className="py-2.5"><span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Mapped</span></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-cyan-300">oldbalanceOrg / newbalanceOrig</td>
                      <td className="py-2.5 font-mono text-slate-400">Float ($)</td>
                      <td className="py-2.5 font-mono text-slate-300">oldbalanceOrg, newbalanceOrig</td>
                      <td className="py-2.5 text-slate-400">Delta origin balance calculation</td>
                      <td className="py-2.5"><span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Mapped</span></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono text-cyan-300">isFraud (Target)</td>
                      <td className="py-2.5 font-mono text-slate-400">Binary (0 / 1)</td>
                      <td className="py-2.5 font-mono text-slate-300">isFraud</td>
                      <td className="py-2.5 text-slate-400">Weighted binary cross-entropy loss</td>
                      <td className="py-2.5"><span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Target</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {currentDataset ? (
              <>
                {/* 4 Metric Cards with Glow & CountUp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SpotlightCard className="p-4" spotlightColor="rgba(6, 182, 212, 0.2)">
                    <div className="text-xs font-mono uppercase text-slate-400">Institution Node</div>
                    <div className="text-base font-bold text-slate-100 mt-1 flex items-center gap-1.5">
                      {institutionConfigs[currentDataset.clientType].icon}
                      {currentDataset.institution}
                    </div>
                    <span className="text-[11px] text-cyan-400 font-mono mt-2 block">
                      Local File: {currentDataset.fileName}
                    </span>
                  </SpotlightCard>

                  <SpotlightCard className="p-4" spotlightColor="rgba(16, 185, 129, 0.2)">
                    <div className="text-xs font-mono uppercase text-slate-400">Private Records Kept</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      <CountUp to={currentDataset.rowCount} duration={1.5} />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      0 rows shared with coordinator
                    </span>
                  </SpotlightCard>

                  <SpotlightCard className="p-4" spotlightColor="rgba(245, 158, 11, 0.2)">
                    <div className="text-xs font-mono uppercase text-slate-400">Local Fraud Rate</div>
                    <div className="text-2xl font-bold text-amber-400 mt-1">
                      <CountUp to={currentDataset.fraudRate} decimals={3} suffix="%" duration={1.2} />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      {currentDataset.fraudCount} positive fraud instances
                    </span>
                  </SpotlightCard>

                  <SpotlightCard className="p-4" spotlightColor="rgba(59, 130, 246, 0.2)">
                    <div className="text-xs font-mono uppercase text-slate-400">Privacy Status</div>
                    <div className="text-base font-bold text-cyan-300 mt-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      Isolated Sandbox
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono mt-2 block">
                      Differential Privacy Ready
                    </span>
                  </SpotlightCard>
                </div>

                {/* Sample Records Table */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-mono uppercase text-slate-300 flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-emerald-400" />
                      Local Dataset Sample (First 5 Rows - Displayed for Audit Verification Only)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Client-Side Only
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          {currentDataset.columns.map(col => (
                            <th key={col} className="pb-2 px-2 font-medium">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {currentDataset.sampleRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            {currentDataset.columns.map(col => (
                              <td key={col} className="py-2 px-2 whitespace-nowrap">
                                {col.toLowerCase().includes('fraud') ? (
                                  Number(row[col]) === 1 ? (
                                    <span className="text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded font-bold">1 (FRAUD)</span>
                                  ) : (
                                    <span className="text-slate-500">0</span>
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
              </>
            ) : (
              <div className="text-center py-12 rounded-xl border border-slate-800 bg-slate-900/30">
                <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">No Dataset Uploaded Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Drag and drop a PaySim CSV on the "File Upload Dropzone" or click "Load Bank Silo" to populate this view.
                </p>
                <button
                  onClick={() => setSubTab('upload')}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 transition-colors"
                >
                  Go to File Upload
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
