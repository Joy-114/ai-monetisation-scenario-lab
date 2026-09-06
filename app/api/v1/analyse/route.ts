import { env } from 'cloudflare:workers';
import {
  apiError,
  apiSuccess,
  consumeRateLimit,
  preflightResponse,
  readJsonBody,
  validationIssues,
} from '@/lib/api-v1/http';
import { calculatePublicAnalysis } from '@/lib/api-v1/service';
import { publicAnalyseRequestSchema } from '@/lib/api-v1/validation';

const METHODS = ['POST', 'OPTIONS'];

export function OPTIONS(request: Request) {
  return preflightResponse(request, METHODS, env.API_ALLOWED_ORIGINS);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const rateLimit = consumeRateLimit(request, 'v1:analyse', 60);
  const responseOptions = {
    allowedOrigins: env.API_ALLOWED_ORIGINS,
    methods: METHODS,
    rateLimit,
  };

  if (!rateLimit.allowed) {
    return apiError(
      request,
      requestId,
      429,
      'RATE_LIMIT_EXCEEDED',
      'Too many analysis requests. Try again after the Retry-After interval.',
      responseOptions,
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return apiError(
      request,
      requestId,
      body.reason === 'too_large' ? 413 : 400,
      body.reason === 'too_large' ? 'REQUEST_TOO_LARGE' : 'INVALID_JSON',
      body.reason === 'too_large'
        ? 'The JSON request body must not exceed 1,000,000 bytes.'
        : 'The request body must contain valid JSON.',
      responseOptions,
    );
  }

  const parsed = publicAnalyseRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError(
      request,
      requestId,
      422,
      'VALIDATION_ERROR',
      'The analysis request did not match the v1 schema.',
      responseOptions,
      validationIssues(parsed.error),
    );
  }

  try {
    return apiSuccess(
      request,
      requestId,
      calculatePublicAnalysis(parsed.data),
      responseOptions,
    );
  } catch {
    return apiError(
      request,
      requestId,
      500,
      'ANALYSIS_FAILED',
      'The deterministic analysis could not be completed.',
      responseOptions,
    );
  }
}
