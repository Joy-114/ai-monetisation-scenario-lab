import { describe, expect, it } from 'vitest';
import {
  analyseScenario,
  analyseScenarios,
  currentPricingBaseline,
  revenueForCustomer,
  safeRatio,
  valueCaptureStatus,
} from '@/lib/pricing';
import type { Customer, PricingScenario } from '@/types/pricing';
import { fixtureCustomers } from './fixtures';

const subscription: PricingScenario = {
  id: 'subscription',
  name: 'Subscription',
  model: 'subscription',
  fixedMonthlyPrice: 50,
};

describe('pricing models', () => {
  it('calculates subscription revenue', () => {
    expect(revenueForCustomer(fixtureCustomers[0], subscription)).toBe(50);
  });

  it('calculates usage-based revenue', () => {
    expect(
      revenueForCustomer(fixtureCustomers[0], {
        id: 'usage',
        name: 'Usage',
        model: 'usage',
        pricePerUnit: 0.1,
      }),
    ).toBe(10);
  });

  it('calculates hybrid revenue', () => {
    expect(
      revenueForCustomer(fixtureCustomers[0], {
        id: 'hybrid',
        name: 'Hybrid',
        model: 'hybrid',
        baseMonthlyFee: 20,
        pricePerUnit: 0.1,
      }),
    ).toBe(30);
  });

  it('handles zero usage', () => {
    expect(
      revenueForCustomer(
        { ...fixtureCustomers[0], monthlyUsage: 0 },
        { id: 'usage', name: 'Usage', model: 'usage', pricePerUnit: 0.1 },
      ),
    ).toBe(0);
  });

  it('rejects negative values', () => {
    expect(() =>
      revenueForCustomer({ ...fixtureCustomers[0], monthlyUsage: -1 }, subscription),
    ).toThrow(RangeError);
  });

  it('supports extreme but finite usage values', () => {
    expect(
      revenueForCustomer(
        { ...fixtureCustomers[0], monthlyUsage: 1_000_000_000 },
        { id: 'usage', name: 'Usage', model: 'usage', pricePerUnit: 0.001 },
      ),
    ).toBe(1_000_000);
  });
});

describe('financial metrics', () => {
  it('calculates the manually verifiable current baseline', () => {
    expect(currentPricingBaseline(fixtureCustomers)).toEqual({
      totalRevenue: 60,
      totalVariableCost: 28,
      grossProfit: 32,
      grossMargin: 32 / 60,
      arpu: 30,
      revenueUplift: 0,
      profitUplift: 0,
    });
  });

  it('calculates revenue, profit, margin, ARPU and uplifts', () => {
    const result = analyseScenario(fixtureCustomers, subscription);
    expect(result.totalRevenue).toBe(100);
    expect(result.totalVariableCost).toBe(28);
    expect(result.grossProfit).toBe(72);
    expect(result.grossMargin).toBeCloseTo(0.72);
    expect(result.arpu).toBe(50);
    expect(result.revenueUplift).toBeCloseTo(40 / 60);
    expect(result.profitUplift).toBeCloseTo(40 / 32);
  });

  it('returns null for division by zero', () => {
    expect(safeRatio(10, 0)).toBeNull();
    const zeroBaseline: Customer[] = [
      {
        ...fixtureCustomers[0],
        currentPrice: 0,
        variableCost: 0,
        willingnessToPay: 0,
      },
    ];
    const result = analyseScenario(zeroBaseline, subscription);
    expect(result.revenueUplift).toBeNull();
    expect(result.profitUplift).toBeNull();
    expect(result.customers[0].valueCaptureRatio).toBeNull();
  });

  it('handles an empty dataset', () => {
    const bundle = analyseScenarios([], [subscription]);
    expect(bundle.baseline.totalRevenue).toBe(0);
    expect(bundle.scenarios[0].grossMargin).toBeNull();
    expect(bundle.scenarios[0].arpu).toBeNull();
    expect(bundle.scenarios[0].segments).toEqual([]);
  });
});

describe('value capture and segment aggregation', () => {
  it('classifies ratios as configurable analytical indicators', () => {
    expect(valueCaptureStatus(0.69)).toBe('under');
    expect(valueCaptureStatus(0.7)).toBe('balanced');
    expect(valueCaptureStatus(1)).toBe('balanced');
    expect(valueCaptureStatus(1.01)).toBe('over');
    expect(valueCaptureStatus(0.8, { under: 0.9, over: 1.2 })).toBe('under');
  });

  it('aggregates each customer segment', () => {
    const result = analyseScenario(fixtureCustomers, subscription);
    expect(result.segments).toHaveLength(2);
    expect(result.segments.find((segment) => segment.segment === 'Small')).toEqual({
      segment: 'Small',
      customerCount: 1,
      totalRevenue: 50,
      grossProfit: 42,
      averageRevenue: 50,
      averageWillingnessToPay: 45,
      averageValueCaptureRatio: 50 / 45,
    });
  });
});
