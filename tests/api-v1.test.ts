import { describe, expect, it } from 'vitest';
import {
  consumeRateLimit,
  preflightResponse,
  readJsonBody,
} from '@/lib/api-v1/http';
import { calculatePublicAnalysis } from '@/lib/api-v1/service';
import {
  publicAnalyseRequestSchema,
  publicSummaryRequestSchema,
} from '@/lib/api-v1/validation';
import { fixtureCustomers } from './fixtures';

const hybridScenario = {
  id: 'hybrid-api',
  name: 'Hybrid API',
  model: 'hybrid' as const,
  baseMonthlyFee: 20,
  pricePerUnit: 0.1,
};

describe('public API v1', () => {
  it('validates and calculates an analysis through the existing pricing engine', () => {
    const input = publicAnalyseRequestSchema.parse({
      customers: fixtureCustomers,
      scenario: hybridScenario,
    });
    const output = calculatePublicAnalysis(input);

    expect(output.baseline.totalRevenue).toBe(60);
    expect(output.result.totalRevenue).toBe(100);
    expect(output.result.totalVariableCost).toBe(28);
    expect(output.result.grossProfit).toBe(72);
    expect(output.result.grossMargin).toBeCloseTo(0.72);
    expect(output.result.arpu).toBe(50);
    expect(output.result.revenueUplift).toBeCloseTo(2 / 3);
    expect(output.result.profitUplift).toBeCloseTo(1.25);
    expect(output.result.customers[0].valueCaptureRatio).toBeCloseTo(2 / 3);
    expect(output.result.segments).toHaveLength(2);
  });

  it('rejects a usage scenario without a unit price', () => {
    const result = publicAnalyseRequestSchema.safeParse({
      customers: fixtureCustomers,
      scenario: { id: 'bad', name: 'Bad usage', model: 'usage' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts either direct summary input or a saved analysis ID', () => {
    expect(
      publicSummaryRequestSchema.safeParse({
        language: 'en',
        customers: fixtureCustomers,
        scenarios: [hybridScenario],
      }).success,
    ).toBe(true);
    expect(
      publicSummaryRequestSchema.safeParse({
        analysisRunId: '9b6f91de-f86d-49eb-8dba-196e20ed669c',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid JSON and oversized bodies before validation', async () => {
    const invalid = await readJsonBody(
      new Request('https://example.test/api/v1/analyse', {
        method: 'POST',
        body: '{not-json}',
      }),
    );
    expect(invalid).toEqual({ ok: false, reason: 'invalid_json' });

    const oversized = await readJsonBody(
      new Request('https://example.test/api/v1/analyse', {
        method: 'POST',
        body: '12345678901',
      }),
      10,
    );
    expect(oversized).toEqual({ ok: false, reason: 'too_large' });
  });

  it('applies a fixed-window limit per client and endpoint', () => {
    const request = new Request('https://example.test/api/v1/summary', {
      headers: { 'CF-Connecting-IP': '192.0.2.10' },
    });
    expect(consumeRateLimit(request, 'test-summary', 2, 60_000, 1).allowed).toBe(
      true,
    );
    expect(consumeRateLimit(request, 'test-summary', 2, 60_000, 2).allowed).toBe(
      true,
    );
    const limited = consumeRateLimit(request, 'test-summary', 2, 60_000, 3);
    expect(limited.allowed).toBe(false);
    expect(limited.remaining).toBe(0);
  });

  it('returns CORS preflight headers only for configured origins', () => {
    const allowed = preflightResponse(
      new Request('https://example.test/api/v1/analyse', {
        method: 'OPTIONS',
        headers: { Origin: 'https://client.example' },
      }),
      ['POST', 'OPTIONS'],
      'https://client.example',
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://client.example',
    );

    const denied = preflightResponse(
      new Request('https://example.test/api/v1/analyse', {
        method: 'OPTIONS',
        headers: { Origin: 'https://other.example' },
      }),
      ['POST', 'OPTIONS'],
      'https://client.example',
    );
    expect(denied.status).toBe(403);
  });
});
