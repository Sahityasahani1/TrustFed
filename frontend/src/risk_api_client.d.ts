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
