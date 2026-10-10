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
