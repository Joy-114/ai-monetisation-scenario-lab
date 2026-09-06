import { describe, expect, it, vi } from 'vitest';
import { generateConsultantSummary } from '@/lib/ai-summary';
import { analyseScenarios } from '@/lib/pricing';
import { fixtureCustomers } from './fixtures';

const payload = {
  language: 'en' as const,
  analysis: analyseScenarios(fixtureCustomers, [
    {
      id: 'hybrid',
      name: 'Hybrid growth',
      model: 'hybrid' as const,
      baseMonthlyFee: 20,
      pricePerUnit: 0.1,
    },
  ]),
};

describe('consultant summary resilience', () => {
  it('uses the deterministic fallback when no API key exists', async () => {
    const result = await generateConsultantSummary(payload);
    expect(result.source).toBe('fallback');
    expect(result.summary).toContain('Hybrid growth');
  });

  it('uses the deterministic fallback when the AI API fails', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await generateConsultantSummary(
      payload,
      'test-key',
      'test-model',
      failingFetch,
    );
    expect(result.source).toBe('fallback');
  });

  it('sends calculated aggregate metrics without customer records to OpenAI', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [{ content: [{ type: 'output_text', text: 'Recommendation' }] }],
        }),
        { status: 200 },
      ),
    );

    const result = await generateConsultantSummary(
      payload,
      'test-key',
      'test-model',
      fetcher,
    );
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body)) as {
      input: string;
    };
    const metrics = JSON.parse(request.input) as {
      scenarios: Array<{
        metrics: { grossProfit: number };
        valueCapture: { under: number };
      }>;
    };

    expect(result).toEqual({ summary: 'Recommendation', source: 'ai' });
    expect(request.input).not.toContain('Alpha Co');
    expect(request.input).not.toContain('monthlyUsage');
    expect(metrics.scenarios[0].metrics.grossProfit).toBe(72);
    expect(metrics.scenarios[0].valueCapture.under).toBe(1);
  });
});
