export declare function checkBackendHealth(): Promise<{ status: string; [key: string]: any }>;

export declare function assessRisk(
  domain: 'banks' | 'lenders' | 'insurers' | 'creditfraud' | 'insurance',
  userInput: Record<string, any>,
  includeAiReasoning?: boolean
): Promise<any>;

export declare function assessBatchRisk(
  domain: 'banks' | 'lenders' | 'insurers' | 'creditfraud' | 'insurance',
  records: Array<Record<string, any>>
): Promise<any>;

export declare function uploadBatchFile(
  domain: 'banks' | 'lenders' | 'insurers' | 'creditfraud' | 'insurance',
  file: File
): Promise<any>;

export declare function fetchSampleBatch(
  domain: 'banks' | 'lenders' | 'insurers' | 'creditfraud' | 'insurance'
): Promise<any>;

export declare function getSampleDownloadUrl(filename: string): string;

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onMeta?: (meta: any) => void;
  onDone?: (result: any) => void;
  onError?: (error: any) => void;
  signal?: AbortSignal;
}

export declare function streamRiskAssessment(
  domain: 'banks' | 'lenders' | 'insurers' | 'creditfraud' | 'insurance',
  userInput: Record<string, any>,
  callbacks?: StreamCallbacks
): Promise<void>;

export declare function getTelemetrySnapshot(): Promise<any>;

export declare function connectTelemetryWebSocket(
  onTelemetry: (data: any) => void,
  onError?: (error: any) => void
): () => void;

export interface SecAggRoundOptions {
  dropout_silo_id?: 'bank' | 'wallet' | 'insurer' | null;
  dp_epsilon?: number;
  clipping_bound?: number;
}

export declare function runSecAggRound(options?: SecAggRoundOptions): Promise<{
  ok: boolean;
  certificate: any;
  state: any;
}>;

export declare function getFederatedState(): Promise<any>;

export declare function getFederatedAuditTrail(): Promise<{ count: number; ledger: any[] }>;

export declare function resetFederatedState(): Promise<{ ok: boolean; state: any }>;

export declare function setApiKey(key: string | null): void;
export declare function getApiKey(): string | null;
export declare function exchangeToken(apiKey?: string | null): Promise<{ access_token: string; token_type: string; expires_in: number; role: string }>;
export declare function fetchCallerIdentity(): Promise<{ client_id: string; role: string; auth_method: string; ip: string }>;
export declare function fetchAdminAuditLog(limit?: number): Promise<{ count: number; events: any[] }>;

export declare function assessBatchRiskAsync(
  domain: 'banks' | 'lenders' | 'insurers' | 'creditfraud' | 'insurance',
  records: Array<Record<string, any>>
): Promise<{
  job_id: string;
  domain: string;
  status: string;
  total_records: number;
  created_at: string;
  poll_url: string;
  results_url: string;
  eta_seconds?: number;
}>;

export declare function getJobStatus(jobId: string): Promise<{
  job_id: string;
  domain: string;
  status: string;
  total_records: number;
  processed_records: number;
  progress_pct: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  elapsed_ms: number;
  eta_seconds?: number;
  summary?: any;
  error?: string;
}>;

export declare function getJobResults(
  jobId: string,
  offset?: number,
  limit?: number,
  flaggedOnly?: boolean
): Promise<{
  job_id: string;
  domain: string;
  status: string;
  summary: any;
  pagination: { offset: number; limit: number; total_matching: number; has_more: boolean };
  records: any[];
}>;

export declare function listBatchJobs(domain?: string | null, limit?: number): Promise<{
  jobs: any[];
  total: number;
}>;

export declare function cancelBatchJob(jobId: string): Promise<{ job_id: string; status: string }>;

export declare function getCacheStats(): Promise<{
  tier1_memory_entries: number;
  tier1_memory_capacity: number;
  tier1_memory_hits: number;
  tier2_redis_connected: boolean;
  tier2_redis_hits: number;
  total_misses: number;
  total_sets: number;
  hit_ratio: number;
  cache_ttl_seconds: number;
}>;

export declare function clearExplanationCache(): Promise<{ status: string; timestamp: string }>;

export interface ClearinghouseController {
  disconnect: () => void;
  setTps: (tps: number) => void;
  pause: () => void;
  resume: () => void;
  injectAnomaly: (domain?: 'banks' | 'lenders' | 'insurers') => void;
}

export declare function connectClearinghouseStream(
  onTick: (tick: any) => void,
  onStatus?: (status: any) => void,
  onError?: (error: any) => void
): ClearinghouseController;

export declare function generateFcraNotice(
  domain: string,
  recordId: string,
  userInput: Record<string, any>,
  options?: {
    mlRiskResult?: any;
    applicantName?: string;
    institutionName?: string;
    investigatorNotes?: string;
  }
): Promise<{
  document_type: string;
  notice_id: string;
  date_issued: string;
  iso_timestamp: string;
  institution_name: string;
  applicant: { name: string; record_reference_id: string; domain: string };
  adverse_action: {
    status: string;
    evaluated_risk_score: number;
    decision_threshold: number;
    model_version: string;
    model_checksum_sha256: string;
  };
  principal_reasons: Array<{
    rank: number;
    reason_code: string;
    category: string;
    principal_reason: string;
    relative_impact_weight: number;
  }>;
  investigator_notes: string;
  legal_statutory_disclosure: string;
  consumer_dispute_rights: {
    free_report_window_days: number;
    dispute_authority: string;
    contact_email: string;
    toll_free_dispute_phone: string;
  };
  input_vector_fingerprint: string;
  hmac_seal: string;
}>;

export declare function generateNistCertificate(
  domain: string,
  recordId: string,
  userInput: Record<string, any>,
  mlRiskResult?: any
): Promise<{
  certificate_id: string;
  standard: string;
  iso_timestamp: string;
  verifier: string;
  evaluated_record: { record_id: string; domain: string; input_vector_sha256: string };
  model_provenance: {
    domain: string;
    architecture: string;
    model_weights_sha256: string;
    secagg_consensus: string;
    privacy_guarantee: {
      mechanism: string;
      epsilon: number;
      delta: number;
      zero_customer_records_shared: boolean;
    };
  };
  explainability_assessment: {
    local_fidelity_score: number;
    additive_efficiency_verified: boolean;
    primary_decision_drivers: Array<any>;
    anomaly_isolation_score?: number;
    fraud_probability: number;
    risk_score: number;
    classification: string;
  };
  fairness_and_bias_audit: {
    demographic_parity_ratio: number;
    equal_opportunity_difference: number;
    disparate_impact_certified: boolean;
    protected_class_features_excluded: boolean;
  };
  governance_attestation: string;
  cryptographic_seal: {
    algorithm: string;
    signature: string;
    signed_by: string;
    tamper_evident: boolean;
  };
}>;

export declare function verifyCertificateSignature(certificate: any): Promise<{
  valid: boolean;
  certificate_id?: string;
  standard?: string;
  iso_timestamp?: string;
  verifier?: string;
  tamper_evident_check: string;
}>;

export declare function submitInvestigatorOverride(
  domain: string,
  recordId: string,
  originalClassification: string,
  overrideClassification: string,
  reasonCode: string,
  justificationNotes: string,
  metadata?: Record<string, any>
): Promise<{
  override_id: string;
  record_id: string;
  domain: string;
  timestamp: number;
  iso_timestamp: string;
  investigator: { name: string; role: string; client_ip: string };
  decision: {
    original_classification: string;
    override_classification: string;
    is_false_positive_flag: boolean;
  };
  regulatory_justification: {
    reason_code: string;
    reason_title: string;
    reason_description: string;
    notes: string;
  };
}>;

export declare function listInvestigatorOverrides(
  domain?: string | null,
  limit?: number
): Promise<{
  overrides: any[];
  domain?: string;
}>;

export declare function getComplianceReport(): Promise<{
  governance_summary: any;
  federated_state: any;
  caller: any;
}>;

export declare function getEnclaveAttestation(nonce?: string | null): Promise<{
  attestation_document: {
    enclave_id: string;
    enclave_type: string;
    issued_epoch: number;
    timestamp: string;
    pcrs: Record<string, string>;
    public_key: string;
    user_data_hash: string;
    nonce: string;
    root_ca: string;
    certificate_chain: string[];
  };
  signature: string;
  signature_algorithm: string;
  status: string;
  enclave_security_features: {
    memory_encryption: string;
    side_channel_mitigation: string;
    zero_host_access: boolean;
    zero_network_stack: string;
    tamper_proof: boolean;
  };
}>;

export declare function verifyEnclaveAttestation(
  attestationWrapper: any,
  expectedNonce?: string | null
): Promise<{
  verified: boolean;
  reason?: string;
  enclave_id?: string;
  enclave_type?: string;
  root_ca?: string;
  user_data_hash?: string;
  pcr_match?: boolean;
  signature_valid?: boolean;
  nonce_fresh?: boolean;
  age_seconds?: number;
  message?: string;
}>;

export declare function getPrivacyAccountantStatus(): Promise<{
  total_rounds: number;
  target_delta: number;
  max_epsilon_budget: number;
  current_epsilon: number;
  remaining_budget: number;
  budget_consumed_pct: number;
  status: string;
  optimal_alpha: number;
  recent_rounds: any[];
  circuit_breaker_active: boolean;
}>;

export declare function resetPrivacyAccountant(): Promise<{
  ok: boolean;
  accountant: any;
}>;

export declare function listFederatedNodes(): Promise<{
  nodes: Array<{
    node_id: string;
    institution_name: string;
    domain: string;
    endpoint_url: string;
    local_samples: number;
    region: string;
    status: string;
    tls_fingerprint: string;
    last_heartbeat: string;
  }>;
}>;

export declare function registerFederatedNode(nodeData: {
  node_id: string;
  institution_name?: string;
  domain?: string;
  endpoint_url?: string;
  local_samples?: number;
  region?: string;
  tls_fingerprint?: string;
}): Promise<{
  ok: boolean;
  node: any;
}>;

export declare function executeFederatedRound(params?: {
  round_id?: number;
  noise_multiplier?: number;
  dimension?: number;
  l2_clip_norm?: number;
}): Promise<{
  round_id: number;
  status: string;
  enclave_execution: {
    tee_environment: string;
    pcr0_verified: boolean;
    zero_raw_weights_exposed: boolean;
    secagg_sum_of_masks: number;
    attestation_digest: string;
  };
  differential_privacy: {
    mechanism: string;
    round_epsilon: number;
    target_delta: number;
    remaining_budget: number;
    budget_consumed_pct: number;
    optimal_alpha: number;
    circuit_breaker_active: boolean;
  };
  consensus_metrics: {
    participating_nodes: number;
    total_samples_represented: number;
    aggregated_gradient_norm: number;
    global_model_hash: string;
  };
  node_audit_submissions: any[];
  hardware_attestation: any;
}>;

export declare function getFederatedAuditPacket(): Promise<{
  timestamp: string;
  enclave_attestation: any;
  privacy_accountant: any;
  institutional_nodes: any[];
  compliance_guarantees: any;
}>;

export declare function getPlatformStatus(): Promise<{
  platform: string;
  system_status: string;
  uptime_seconds: number;
  overall_uptime_percent: number;
  timestamp_iso: string;
  active_incidents_count: number;
  components: Record<string, {
    name: string;
    status: string;
    latency_p95_ms?: number;
    sla?: string;
  }>;
}>;

export declare function getFeatureFlags(): Promise<{
  flags: Record<string, {
    enabled: boolean;
    description: string;
    category: string;
  }>;
}>;

export declare function createStateBackup(): Promise<{
  status: string;
  manifest: any;
}>;

export declare function executeRestoreDrill(backupId: string): Promise<{
  status: string;
  backup_id: string;
  recovery_time_ms: number;
  rto_sla_met: boolean;
}>;


