import { env } from 'cloudflare:workers';
import {
  apiError,
  apiSuccess,
  consumeRateLimit,
  preflightResponse,
} from '@/lib/api-v1/http';
import type { HealthResponseData } from '@/types/api-v1';

const METHODS = ['GET', 'OPTIONS'];

export function OPTIONS(request: Request) {
  return preflightResponse(request, METHODS, env.API_ALLOWED_ORIGINS);
}

export function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const rateLimit = consumeRateLimit(request, 'v1:health', 120);
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
      'Too many health requests. Try again after the Retry-After interval.',
      responseOptions,
    );
  }

  const data: HealthResponseData = {
    status: 'ok',
    service: 'ai-monetisation-scenario-lab',
    version: 'v1',
    timestamp: new Date().toISOString(),
  };
  return apiSuccess(request, requestId, data, responseOptions);
}
