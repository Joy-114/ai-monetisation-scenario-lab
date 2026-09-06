import { expect, test } from '@playwright/test';

const customers = [
  {
    customerName: 'Alpha Co',
    segment: 'Small',
    monthlyUsage: 100,
    currentPrice: 30,
    willingnessToPay: 45,
    variableCost: 8,
  },
  {
    customerName: 'Beta Co',
    segment: 'Mid',
    monthlyUsage: 500,
    currentPrice: 30,
    willingnessToPay: 90,
    variableCost: 20,
  },
];

test('v1 health and deterministic analysis endpoints return stable envelopes', async ({
  request,
}) => {
  const health = await request.get('/api/v1/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({
    apiVersion: 'v1',
    data: { status: 'ok', version: 'v1' },
  });

  const response = await request.post('/api/v1/analyse', {
    data: {
      customers,
      scenario: {
        id: 'hybrid-api',
        name: 'Hybrid API',
        model: 'hybrid',
        baseMonthlyFee: 20,
        pricePerUnit: 0.1,
      },
    },
  });
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({
    apiVersion: 'v1',
    data: {
      baseline: { totalRevenue: 60 },
      result: {
        totalRevenue: 100,
        totalVariableCost: 28,
        grossProfit: 72,
        arpu: 50,
      },
    },
  });
});

test('v1 summary rejects invalid input without calling an LLM', async ({ request }) => {
  const response = await request.post('/api/v1/summary', {
    data: { analysisRunId: 'not-a-uuid' },
  });
  expect(response.status()).toBe(422);
  expect(await response.json()).toMatchObject({
    apiVersion: 'v1',
    error: { code: 'VALIDATION_ERROR' },
  });
});
