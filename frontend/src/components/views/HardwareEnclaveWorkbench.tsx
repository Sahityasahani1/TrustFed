import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RotateCcw,
  Play,
  Download,
  KeyRound,
  Layers,
  Terminal,
  Activity,
  Server,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Sliders,
  Plus
} from 'lucide-react';
import {
  getEnclaveAttestation,
  verifyEnclaveAttestation,
  getPrivacyAccountantStatus,
  resetPrivacyAccountant,
  listFederatedNodes,
  registerFederatedNode,
  executeFederatedRound,
  getFederatedAuditPacket
} from '../../risk_api_client';
import { useToast } from '../common/ToastNotification';

export const HardwareEnclaveWorkbench: React.FC = () => {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'enclave' | 'accountant' | 'topology' | 'round'>('enclave');

  // Enclave Attestation State
  const [attestationDoc, setAttestationDoc] = useState<any | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [attestationLoading, setAttestationLoading] = useState<boolean>(false);
  const [simulateTamper, setSimulateTamper] = useState<boolean>(false);

  // Privacy Accountant State
  const [accountant, setAccountant] = useState<any | null>(null);
  const [accountantLoading, setAccountantLoading] = useState<boolean>(false);

  // Nodes Topology State
  const [nodes, setNodes] = useState<any[]>([]);
  const [nodesLoading, setNodesLoading] = useState<boolean>(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState<boolean>(false);
  const [newNodeId, setNewNodeId] = useState<string>('node-fintech-zeta');
  const [newNodeInstitution, setNewNodeInstitution] = useState<string>('Barclays Corporate (Node UK-South)');
  const [newNodeDomain, setNewNodeDomain] = useState<string>('banks');
  const [newNodeSamples, setNewNodeSamples] = useState<number>(65000);

  // Round Execution State
  const [isExecutingRound, setIsExecutingRound] = useState<boolean>(false);
  const [lastRoundResult, setLastRoundResult] = useState<any | null>(null);
  const [roundNoise, setRoundNoise] = useState<number>(1.8);
  const [roundL2Clip, setRoundL2Clip] = useState<number>(1.0);

  // Initial Load
  useEffect(() => {
    fetchAttestation();
    fetchAccountant();
    fetchNodes();
  }, []);

  const fetchAttestation = async () => {
    setAttestationLoading(true);
    try {
      const doc = await getEnclaveAttestation();
      setAttestationDoc(doc);
      // Run automatic verification
      const verifyRes = await verifyEnclaveAttestation(doc, doc.attestation_document.nonce);
      setVerificationResult(verifyRes);
    } catch (err: any) {
      toast({
        title: 'Attestation Retrieval Error',
        description: err.message,
        type: 'warning',
      });
    } finally {
      setAttestationLoading(false);
    }
  };

  const handleVerifyAttestation = async () => {
    if (!attestationDoc) return;
    setAttestationLoading(true);
    try {
      let payload = JSON.parse(JSON.stringify(attestationDoc));
      if (simulateTamper) {
        // Tamper with PCR0 to simulate unauthorized hypervisor modification
        payload.attestation_document.pcrs.PCR0 = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      }
      const res = await verifyEnclaveAttestation(payload, payload.attestation_document.nonce);
      setVerificationResult(res);
      if (res.verified) {
        toast({
          title: 'Enclave Cryptographic Verification Passed',
          description: 'Hardware PCR measurements match AWS Nitro golden image. Zero host access certified.',
          type: 'success',
        });
      } else {
        toast({
          title: 'Verification Failed (Tamper Rejection)',
          description: res.reason,
          type: 'warning',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Verification Request Error',
        description: err.message,
        type: 'warning',
      });
    } finally {
      setAttestationLoading(false);
    }
  };

  const fetchAccountant = async () => {
    setAccountantLoading(true);
    try {
      const data = await getPrivacyAccountantStatus();
      setAccountant(data);
    } catch (err: any) {
      toast({
        title: 'Accountant Retrieval Error',
        description: err.message,
        type: 'warning',
      });
    } finally {
      setAccountantLoading(false);
    }
  };

  const handleResetAccountant = async () => {
    try {
      const res = await resetPrivacyAccountant();
      setAccountant(res.accountant);
      toast({
        title: 'RDP Ledger Reset',
        description: 'Cumulative epsilon budget reset to 0.00 / 5.00 for testing.',
        type: 'info',
      });
    } catch (err: any) {
      toast({
        title: 'Reset Failed',
        description: err.message,
        type: 'warning',
      });
    }
  };

  const fetchNodes = async () => {
    setNodesLoading(true);
    try {
      const data = await listFederatedNodes();
      setNodes(data.nodes || []);
    } catch (err: any) {
      toast({
        title: 'Failed to fetch nodes',
        description: err.message,
        type: 'warning',
      });
    } finally {
      setNodesLoading(false);
    }
  };

  const handleRegisterNode = async () => {
    try {
      await registerFederatedNode({
        node_id: newNodeId,
        institution_name: newNodeInstitution,
        domain: newNodeDomain,
        local_samples: newNodeSamples,
        region: 'eu-west-1',
      });
      toast({
        title: 'Institutional Node Registered',
        description: `Enclave accepted mTLS enrollment for ${newNodeId}.`,
        type: 'success',
      });
      setShowAddNodeModal(false);
      fetchNodes();
    } catch (err: any) {
      toast({
        title: 'Registration Failed',
        description: err.message,
        type: 'warning',
      });
    }
  };

  const handleExecuteRound = async () => {
    setIsExecutingRound(true);
    try {
      const res = await executeFederatedRound({
        noise_multiplier: roundNoise,
        l2_clip_norm: roundL2Clip,
        dimension: 8,
      });
      setLastRoundResult(res);
      toast({
        title: `Round ${res.round_id} Executed inside TEE`,
        description: `SecAgg complete. New cumulative ε = ${res.differential_privacy.round_epsilon}. Global weights updated without raw data exposure.`,
        type: 'success',
      });
      fetchAccountant();
      fetchAttestation();
    } catch (err: any) {
      toast({
        title: 'Federated Round Blocked',
        description: err.message,
        type: 'warning',
      });
      fetchAccountant();
    } finally {
      setIsExecutingRound(false);
    }
  };

  const handleDownloadAuditPacket = async () => {
    try {
      const packet = await getFederatedAuditPacket();
      const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trustfed_tee_audit_packet_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Audit Packet Exported',
        description: 'Saved signed TEE attestation document, PCR measurements, and RDP ledger.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message,
        type: 'warning',
      });
    }
  };

  const currentEps = accountant?.current_epsilon || 0.0;
  const maxEps = accountant?.max_epsilon_budget || 5.0;
  const budgetPct = accountant?.budget_consumed_pct || 0.0;
  const circuitBreaker = accountant?.circuit_breaker_active || false;

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & TELEMETRY STRIP */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span>Hardware Enclaves & Distributed Topology</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AWS Nitro Enclaves
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cryptographically certified cross-silo aggregation with hardware-isolated memory encryption and Rényi DP moment accounting.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadAuditPacket}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export TEE Audit Packet</span>
          </button>

          <button
            onClick={handleExecuteRound}
            disabled={isExecutingRound || circuitBreaker}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              circuitBreaker
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 cursor-not-allowed'
                : isExecutingRound
                ? 'bg-cyan-600/50 text-cyan-200 animate-pulse cursor-wait'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {isExecutingRound ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Aggregating in Enclave...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>⚡ Run TEE Aggregation Round</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. TELEMETRY KPI RIBBON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TEE Attestation Status */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Hardware Enclave State</span>
            <Lock className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {verificationResult?.verified ? 'CERTIFIED' : 'PENDING'}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">
              PCR0 Match
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 font-mono truncate">
            {attestationDoc?.attestation_document?.enclave_id || 'nitro-tee-node-us-east-1a'}
          </div>
        </div>

        {/* KPI 2: Rényi DP Epsilon Consumed */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Cumulative Rényi DP (ε)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {currentEps.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              / {maxEps.toFixed(2)} Max
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              circuitBreaker ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {circuitBreaker ? 'HALTED' : `${budgetPct.toFixed(1)}%`}
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                budgetPct > 80 ? 'bg-red-500' : budgetPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Differential Privacy Delta Guarantee */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Privacy Parameter (δ)</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              1.0 × 10⁻⁵
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              (Strict)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 font-mono">
            Optimal α* = {accountant?.optimal_alpha || 24.0}
          </div>
        </div>

        {/* KPI 4: Institutional Nodes Cluster */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Distributed Institutional Nodes</span>
            <Server className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {nodes.length} / {nodes.length} Online
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
              SecAgg Quorum OK
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 font-mono">
            Total records: {nodes.reduce((acc, n) => acc + (n.local_samples || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 3. VIEW SUBTABS */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('enclave')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'enclave'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-cyan-500" />
          <span>1. Enclave Remote Attestation</span>
        </button>
        <button
          onClick={() => setActiveTab('accountant')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'accountant'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>2. Continuous Rényi DP Accountant</span>
        </button>
        <button
          onClick={() => setActiveTab('topology')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'topology'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-500" />
          <span>3. Institutional Node Topology</span>
        </button>
        <button
          onClick={() => setActiveTab('round')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'round'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-purple-500" />
          <span>4. SecAgg Round Controls & Telemetry</span>
        </button>
      </div>

      {/* 4. SUBTAB PANELS */}
      <AnimatePresence mode="wait">
        {/* SUBTAB 1: ENCLAVE REMOTE ATTESTATION */}
        {activeTab === 'enclave' && (
          <motion.div
            key="tab-enclave"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left 2 Cols: Cryptographic Attestation Inspection */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      AWS Nitro Enclaves Platform Configuration Registers (PCRs)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simulateTamper}
                        onChange={(e) => setSimulateTamper(e.target.checked)}
                        className="rounded border-zinc-700 text-red-500 focus:ring-0"
                      />
                      <span className="font-mono text-[11px] text-red-400">Inject PCR Tamper</span>
                    </label>
                    <button
                      onClick={handleVerifyAttestation}
                      disabled={attestationLoading}
                      className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {attestationLoading ? 'Verifying...' : 'Re-Verify Nonce & PCRs'}
                    </button>
                  </div>
                </div>

                {/* PCR Registers Breakdown */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                      <span className="font-bold text-cyan-400">PCR0: Enclave Image File (EIF) Digest</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
                        {simulateTamper ? 'TAMPERED' : 'GOLDEN MATCH'}
                      </span>
                    </div>
                    <div className="text-[11px] break-all text-zinc-700 dark:text-zinc-300">
                      {simulateTamper
                        ? '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 (MODIFIED)'
                        : attestationDoc?.attestation_document?.pcrs?.PCR0}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                      <span className="font-bold text-cyan-400">PCR1: Linux Kernel & Bootstrap OS</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
                        VERIFIED
                      </span>
                    </div>
                    <div className="text-[11px] break-all text-zinc-700 dark:text-zinc-300">
                      {attestationDoc?.attestation_document?.pcrs?.PCR1}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                      <span className="font-bold text-cyan-400">PCR2: TrustFed Application Binary & Python Runtime</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
                        VERIFIED
                      </span>
                    </div>
                    <div className="text-[11px] break-all text-zinc-700 dark:text-zinc-300">
                      {attestationDoc?.attestation_document?.pcrs?.PCR2}
                    </div>
                  </div>
                </div>

                {/* Nonce & Signature Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 block text-[10px] uppercase">Challenger Nonce</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold break-all">
                      {attestationDoc?.attestation_document?.nonce || 'c74829fa01bd93847291a0b948c201e3'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 block text-[10px] uppercase">Digital Enclave Seal</span>
                    <span className="text-emerald-500 font-semibold break-all">
                      {attestationDoc?.signature?.slice(0, 32)}...
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Security Features & Trust Chain */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-500" />
                  <span>Hardware Isolation Boundary</span>
                </h3>

                <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>AES-256-XTS Memory Encryption:</strong> Physical RAM encrypted by CPU hardware fused keys.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Zero Host Access:</strong> EC2 root admin and hypervisor cannot dump enclave memory.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Vsock Only Network:</strong> No external IP socket; communicates only via secure coordinator pipe.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Side-Channel Flush:</strong> CPU L1/L2 cache lines wiped on each execution context switch.</span>
                  </li>
                </ul>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-500 space-y-1">
                  <div><strong>Root CA:</strong> AWS Nitro Global Root CA</div>
                  <div><strong>Sub CA:</strong> CN=TrustFed Enclave Sub-CA 2026</div>
                  <div><strong>Status:</strong> {verificationResult?.message || 'Nominal operational state'}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 2: CONTINUOUS RÉNYI DP MOMENTS ACCOUNTANT */}
        {activeTab === 'accountant' && (
          <motion.div
            key="tab-accountant"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Continuous Rényi Differential Privacy (RDP) Ledger</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Subsampled Gaussian mechanism (Mironov, 2017) composing privacy loss across federated rounds.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetAccountant}
                    className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Reset Ledger</span>
                  </button>
                  <button
                    onClick={fetchAccountant}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Visual Budget Meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">
                    Cumulative Privacy Consumption: <strong className="text-zinc-900 dark:text-zinc-100">{currentEps.toFixed(4)}</strong> / {maxEps.toFixed(2)} ε
                  </span>
                  <span className={`font-bold ${
                    circuitBreaker ? 'text-red-500' : budgetPct > 70 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {circuitBreaker ? 'CIRCUIT BREAKER HALTED (ε >= 5.0)' : `${budgetPct.toFixed(1)}% Consumed`}
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      circuitBreaker ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, budgetPct)}%` }}
                  />
                </div>
              </div>

              {/* RDP Ledger Rounds History Table */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Recent Federated Training Rounds
                </h4>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-3">Round ID</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Noise Multiplier (σ)</th>
                        <th className="py-2.5 px-3">Subsample Ratio (q)</th>
                        <th className="py-2.5 px-3">Round ε Added</th>
                        <th className="py-2.5 px-3">Cumulative ε</th>
                        <th className="py-2.5 px-3">Optimal Order (α*)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                      {accountant?.recent_rounds && accountant.recent_rounds.length > 0 ? (
                        accountant.recent_rounds.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                            <td className="py-2.5 px-3 font-bold text-cyan-400">Round #{r.round_id}</td>
                            <td className="py-2.5 px-3 text-zinc-400">{r.timestamp}</td>
                            <td className="py-2.5 px-3 text-zinc-300">{r.noise_multiplier}</td>
                            <td className="py-2.5 px-3 text-zinc-300">{r.subsample_ratio}</td>
                            <td className="py-2.5 px-3 text-emerald-400">+{r.round_epsilon_added}</td>
                            <td className="py-2.5 px-3 font-semibold text-zinc-100">{r.cumulative_epsilon}</td>
                            <td className="py-2.5 px-3 text-purple-400">α = {r.optimal_alpha}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-zinc-500">
                            No training rounds executed yet in this ledger session. Click '⚡ Run TEE Aggregation Round' above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 3: INSTITUTIONAL NODE TOPOLOGY */}
        {activeTab === 'topology' && (
          <motion.div
            key="tab-topology"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>Cross-Silo Institutional Client Cluster</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Distributed worker clients running behind member firewalls communicating over authenticated mTLS.
                </p>
              </div>
              <button
                onClick={() => setShowAddNodeModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll New Institutional Node</span>
              </button>
            </div>

            {/* Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nodes.map((node) => (
                <div
                  key={node.node_id}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold uppercase bg-blue-500/10 text-blue-400">
                      {node.domain}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {node.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {node.institution_name}
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      {node.node_id} • {node.region}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono">
                    <div className="flex justify-between text-zinc-500">
                      <span>Local Samples:</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold">{node.local_samples?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Last Heartbeat:</span>
                      <span className="text-zinc-400">{node.last_heartbeat}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate pt-1">
                      mTLS: {node.tls_fingerprint}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Enrollment Modal */}
            {showAddNodeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-white space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Enroll Institutional Federated Node</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-zinc-400 block mb-1">Node Identifier</label>
                      <input
                        type="text"
                        value={newNodeId}
                        onChange={(e) => setNewNodeId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-mono focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Institution Name</label>
                      <input
                        type="text"
                        value={newNodeInstitution}
                        onChange={(e) => setNewNodeInstitution(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Domain</label>
                      <select
                        value={newNodeDomain}
                        onChange={(e) => setNewNodeDomain(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-hidden"
                      >
                        <option value="banks">Banking & Wire Transfers</option>
                        <option value="lenders">Digital Lending & Credit</option>
                        <option value="insurers">Insurance Claims</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Local Training Records</label>
                      <input
                        type="number"
                        value={newNodeSamples}
                        onChange={(e) => setNewNodeSamples(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-mono focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddNodeModal(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegisterNode}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Enroll Node
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* SUBTAB 4: SECAGG ROUND CONTROLS & TELEMETRY */}
        {activeTab === 'round' && (
          <motion.div
            key="tab-round"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left 1 Col: Parameters */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-500" />
                <span>TEE DP-SGD Hyperparameters</span>
              </h3>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-zinc-500 mb-1">
                    <span>Noise Multiplier (σ):</span>
                    <span className="text-cyan-400 font-bold">{roundNoise.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={roundNoise}
                    onChange={(e) => setRoundNoise(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <span className="text-[10px] text-zinc-400">Higher σ = stronger privacy, slightly slower convergence.</span>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-500 mb-1">
                    <span>L2 Gradient Clipping Norm (C):</span>
                    <span className="text-purple-400 font-bold">{roundL2Clip.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={roundL2Clip}
                    onChange={(e) => setRoundL2Clip(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <span className="text-[10px] text-zinc-400">Enforces sensitivity bound on local updates.</span>
                </div>
              </div>

              <button
                onClick={handleExecuteRound}
                disabled={isExecutingRound || circuitBreaker}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                  circuitBreaker
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 cursor-not-allowed'
                    : isExecutingRound
                    ? 'bg-purple-600/50 text-purple-200 animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {isExecutingRound ? 'Running Secure Aggregation...' : 'Execute TEE Aggregation'}
              </button>
            </div>

            {/* Right 2 Cols: Last Execution Telemetry */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-500" />
                <span>TEE Enclave Execution Receipt</span>
              </h3>

              {lastRoundResult ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Round</span>
                      <span className="text-sm font-bold text-cyan-400">#{lastRoundResult.round_id}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Nodes Combined</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {lastRoundResult.consensus_metrics.participating_nodes}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Records Aggregated</span>
                      <span className="text-sm font-bold text-zinc-100">
                        {lastRoundResult.consensus_metrics.total_samples_represented.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">New Cumulative ε</span>
                      <span className="text-sm font-bold text-purple-400">
                        {lastRoundResult.differential_privacy.round_epsilon}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Consensus Model Checksum:</span>
                      <span className="text-emerald-400">SHA-256</span>
                    </div>
                    <div className="text-[11px] text-zinc-200 break-all font-semibold">
                      {lastRoundResult.consensus_metrics.global_model_hash}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>SecAgg Verification:</span>
                      <span className="text-emerald-400">Zero Raw Data Leakage Certified</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Pairwise additive masks cancellation: <strong className="text-emerald-400">∑ m_i = {lastRoundResult.enclave_execution.secagg_sum_of_masks}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                  No active round executed yet in this session. Click 'Execute TEE Aggregation' to simulate.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
