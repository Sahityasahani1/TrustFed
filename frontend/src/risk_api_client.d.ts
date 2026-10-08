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
