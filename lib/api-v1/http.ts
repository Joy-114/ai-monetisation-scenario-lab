import type { ZodError } from 'zod';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ApiValidationIssue,
} from '@/types/api-v1';

export const API_VERSION = 'v1' as const;
export const MAX_JSON_BODY_BYTES = 1_000_000;

interface RateBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

interface ResponseOptions {
  allowedOrigins?: string;
  methods: string[];
  rateLimit?: RateLimitResult;
  status?: number;
}

type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'invalid_json' | 'too_large' };

const rateBuckets = new Map<string, RateBucket>();

function clientAddress(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export function consumeRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitResult {
  const key = `${scope}:${clientAddress(request)}`;
  let bucket = rateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (rateBuckets.size > 5_000) {
    for (const [storedKey, storedBucket] of rateBuckets) {
      if (storedBucket.resetAt <= now) rateBuckets.delete(storedKey);
    }
  }

  const allowed = bucket.count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}

function resolvedCorsOrigin(
  request: Request,
  configuredOrigins = '*',
): string | null {
  const origin = request.headers.get('origin');
  const allowed = configuredOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowed.length === 0 || allowed.includes('*')) return '*';
  if (!origin) return null;
  return allowed.includes(origin) ? origin : null;
}

function responseHeaders(
  request: Request,
  options: ResponseOptions,
): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': options.methods.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-Id',
    'Access-Control-Max-Age': '86400',
  });
  const corsOrigin = resolvedCorsOrigin(request, options.allowedOrigins);
  if (corsOrigin) headers.set('Access-Control-Allow-Origin', corsOrigin);
  if (corsOrigin !== '*') headers.append('Vary', 'Origin');

  if (options.rateLimit) {
    headers.set('X-RateLimit-Limit', String(options.rateLimit.limit));
    headers.set('X-RateLimit-Remaining', String(options.rateLimit.remaining));
    headers.set(
      'X-RateLimit-Reset',
      String(Math.ceil(options.rateLimit.resetAt / 1_000)),
    );
    if (!options.rateLimit.allowed) {
      headers.set('Retry-After', String(options.rateLimit.retryAfter));
    }
  }
  return headers;
}

export function apiSuccess<T>(
  request: Request,
  requestId: string,
  data: T,
  options: ResponseOptions,
): Response {
  const body: ApiSuccessResponse<T> = {
    apiVersion: API_VERSION,
    requestId,
    data,
  };
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: responseHeaders(request, options),
  });
}

export function apiError(
  request: Request,
  requestId: string,
  status: number,
  code: string,
  message: string,
  options: ResponseOptions,
  issues?: ApiValidationIssue[],
): Response {
  const body: ApiErrorResponse = {
    apiVersion: API_VERSION,
    requestId,
    error: { code, message, ...(issues ? { issues } : {}) },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request, options),
  });
}

export function preflightResponse(
  request: Request,
  methods: string[],
  allowedOrigins?: string,
): Response {
  const requestId = crypto.randomUUID();
  const origin = request.headers.get('origin');
  if (origin && !resolvedCorsOrigin(request, allowedOrigins)) {
    return apiError(
      request,
      requestId,
      403,
      'CORS_ORIGIN_DENIED',
      'The request origin is not allowed.',
      { allowedOrigins, methods },
    );
  }
  const headers = responseHeaders(request, { allowedOrigins, methods });
  headers.delete('Content-Type');
  return new Response(null, { status: 204, headers });
}

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<JsonBodyResult> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, reason: 'too_large' };
  }
  if (!request.body) return { ok: false, reason: 'invalid_json' };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: 'too_large' };
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
}

export function validationIssues(error: ZodError): ApiValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }));
}
