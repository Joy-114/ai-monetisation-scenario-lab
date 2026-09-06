import type {
  Metrics,
  ScenarioResult,
  Thresholds,
} from '@/types/pricing';

export type ApiVersion = 'v1';

export interface ApiSuccessResponse<T> {
  apiVersion: ApiVersion;
  requestId: string;
  data: T;
}

export interface ApiValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  apiVersion: ApiVersion;
  requestId: string;
  error: {
    code: string;
    message: string;
    issues?: ApiValidationIssue[];
  };
}

export interface AnalyseResponseData {
  baseline: Metrics;
  thresholds: Thresholds;
  result: ScenarioResult;
}

export interface SummaryResponseData {
  summary: string;
  source: 'openai' | 'fallback';
  analysisRunId?: string;
}

export interface HealthResponseData {
  status: 'ok';
  service: 'ai-monetisation-scenario-lab';
  version: ApiVersion;
  timestamp: string;
}
