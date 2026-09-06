import { env } from 'cloudflare:workers';
import { getD1 } from '@/db';
import { loadStoredAnalysis } from '@/lib/api-v1/analysis-run';
import {
  apiError,
  apiSuccess,
  consumeRateLimit,
  preflightResponse,
  readJsonBody,
  validationIssues,
} from '@/lib/api-v1/http';
import { publicSummaryRequestSchema } from '@/lib/api-v1/validation';
import { generateConsultantSummary } from '@/lib/ai-summary';
import { analyseScenarios } from '@/lib/pricing';
import type { SummaryPayload } from '@/lib/summary';
import type { SummaryResponseData } from '@/types/api-v1';

const METHODS = ['POST', 'OPTIONS'];

export function OPTIONS(request: Request) {
  return preflightResponse(request, METHODS, env.API_ALLOWED_ORIGINS);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const rateLimit = consumeRateLimit(request, 'v1:summary', 10);
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
      'Too many summary requests. Try again after the Retry-After interval.',
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

  const parsed = publicSummaryRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError(
      request,
      requestId,
      422,
      'VALIDATION_ERROR',
      'The summary request did not match the v1 schema.',
      responseOptions,
      validationIssues(parsed.error),
    );
  }

  let payload: SummaryPayload;
  let analysisRunId: string | undefined;

  if ('analysisRunId' in parsed.data) {
    analysisRunId = parsed.data.analysisRunId;
    try {
      const stored = await loadStoredAnalysis(analysisRunId);
      if (!stored) {
        return apiError(
          request,
          requestId,
          404,
          'ANALYSIS_RUN_NOT_FOUND',
          'No saved analysis run exists for that ID.',
          responseOptions,
        );
      }
      payload = {
        language: parsed.data.language ?? stored.language,
        analysis: stored.analysis,
      };
    } catch {
      return apiError(
        request,
        requestId,
        503,
        'ANALYSIS_STORE_UNAVAILABLE',
        'The saved analysis could not be retrieved.',
        responseOptions,
      );
    }
  } else {
    payload = {
      language: parsed.data.language,
      analysis: analyseScenarios(
        parsed.data.customers,
        parsed.data.scenarios,
        parsed.data.thresholds,
      ),
    };
  }

  const generated = await generateConsultantSummary(
    payload,
    env.OPENAI_API_KEY,
    env.OPENAI_MODEL,
  );

  if (analysisRunId) {
    try {
      await getD1()
        .prepare(
          'UPDATE analysis_runs SET summary = ?, summary_source = ? WHERE id = ?',
        )
        .bind(generated.summary, generated.source, analysisRunId)
        .run();
    } catch {
      // A useful summary should still be returned if this optional update fails.
    }
  }

  const data: SummaryResponseData = {
    summary: generated.summary,
    source: generated.source === 'ai' ? 'openai' : 'fallback',
    ...(analysisRunId ? { analysisRunId } : {}),
  };
  return apiSuccess(request, requestId, data, responseOptions);
}
