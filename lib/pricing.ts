import type {
  AnalysisBundle,
  Customer,
  CustomerScenarioResult,
  Metrics,
  PricingScenario,
  ScenarioResult,
  SegmentResult,
  Thresholds,
  ValueCaptureStatus,
} from '@/types/pricing';

export const DEFAULT_THRESHOLDS: Thresholds = { under: 0.7, over: 1 };

function ensureNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number.`);
  }
}

function validateCustomer(customer: Customer): void {
  if (!customer.customerName.trim() || !customer.segment.trim()) {
    throw new Error('Customer name and segment are required.');
  }

  ensureNonNegative(customer.monthlyUsage, 'Monthly usage');
  ensureNonNegative(customer.currentPrice, 'Current price');
  ensureNonNegative(customer.willingnessToPay, 'Willingness to pay');
  ensureNonNegative(customer.variableCost, 'Variable cost');
}

export function safeRatio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function valueCaptureStatus(
  ratio: number | null,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): ValueCaptureStatus {
  if (ratio === null) return 'unavailable';
  if (ratio < thresholds.under) return 'under';
  if (ratio > thresholds.over) return 'over';
  return 'balanced';
}

export function revenueForCustomer(
  customer: Customer,
  scenario: PricingScenario,
): number {
  validateCustomer(customer);

  switch (scenario.model) {
    case 'subscription': {
      const price = scenario.fixedMonthlyPrice ?? 0;
      ensureNonNegative(price, 'Fixed monthly price');
      return price;
    }
    case 'usage': {
      const pricePerUnit = scenario.pricePerUnit ?? 0;
      ensureNonNegative(pricePerUnit, 'Price per unit');
      return customer.monthlyUsage * pricePerUnit;
    }
    case 'hybrid': {
      const baseFee = scenario.baseMonthlyFee ?? 0;
      const pricePerUnit = scenario.pricePerUnit ?? 0;
      ensureNonNegative(baseFee, 'Base monthly fee');
      ensureNonNegative(pricePerUnit, 'Price per unit');
      return baseFee + customer.monthlyUsage * pricePerUnit;
    }
  }
}

export function currentPricingBaseline(customers: Customer[]): Metrics {
  customers.forEach(validateCustomer);
  const totalRevenue = customers.reduce(
    (sum, customer) => sum + customer.currentPrice,
    0,
  );
  const totalVariableCost = customers.reduce(
    (sum, customer) => sum + customer.variableCost,
    0,
  );
  const grossProfit = totalRevenue - totalVariableCost;

  return {
    totalRevenue,
    totalVariableCost,
    grossProfit,
    grossMargin: safeRatio(grossProfit, totalRevenue),
    arpu: customers.length === 0 ? null : totalRevenue / customers.length,
    revenueUplift: 0,
    profitUplift: 0,
  };
}

function aggregateSegments(results: CustomerScenarioResult[]): SegmentResult[] {
  const grouped = new Map<string, CustomerScenarioResult[]>();

  results.forEach((result) => {
    const current = grouped.get(result.segment) ?? [];
    current.push(result);
    grouped.set(result.segment, current);
  });

  return [...grouped.entries()]
    .map(([segment, customers]) => {
      const totalRevenue = customers.reduce(
        (sum, customer) => sum + customer.revenue,
        0,
      );
      const grossProfit = customers.reduce(
        (sum, customer) => sum + customer.grossProfit,
        0,
      );
      const ratios = customers
        .map((customer) => customer.valueCaptureRatio)
        .filter((ratio): ratio is number => ratio !== null);

      return {
        segment,
        customerCount: customers.length,
        totalRevenue,
        grossProfit,
        averageRevenue: totalRevenue / customers.length,
        averageWillingnessToPay:
          customers.reduce(
            (sum, customer) => sum + customer.willingnessToPay,
            0,
          ) / customers.length,
        averageValueCaptureRatio:
          ratios.length === 0
            ? null
            : ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length,
      };
    })
    .sort((a, b) => a.segment.localeCompare(b.segment));
}

export function analyseScenario(
  customers: Customer[],
  scenario: PricingScenario,
  baseline = currentPricingBaseline(customers),
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): ScenarioResult {
  if (thresholds.under < 0 || thresholds.over < thresholds.under) {
    throw new RangeError('Value capture thresholds are invalid.');
  }

  const customerResults = customers.map((customer) => {
    const revenue = revenueForCustomer(customer, scenario);
    const valueCaptureRatio = safeRatio(revenue, customer.willingnessToPay);

    return {
      customerName: customer.customerName,
      segment: customer.segment,
      revenue,
      variableCost: customer.variableCost,
      grossProfit: revenue - customer.variableCost,
      willingnessToPay: customer.willingnessToPay,
      valueCaptureRatio,
      valueCaptureStatus: valueCaptureStatus(valueCaptureRatio, thresholds),
    } satisfies CustomerScenarioResult;
  });

  const totalRevenue = customerResults.reduce(
    (sum, customer) => sum + customer.revenue,
    0,
  );
  const totalVariableCost = customerResults.reduce(
    (sum, customer) => sum + customer.variableCost,
    0,
  );
  const grossProfit = totalRevenue - totalVariableCost;

  return {
    scenario,
    totalRevenue,
    totalVariableCost,
    grossProfit,
    grossMargin: safeRatio(grossProfit, totalRevenue),
    arpu: customers.length === 0 ? null : totalRevenue / customers.length,
    revenueUplift: safeRatio(
      totalRevenue - baseline.totalRevenue,
      baseline.totalRevenue,
    ),
    profitUplift: safeRatio(
      grossProfit - baseline.grossProfit,
      baseline.grossProfit,
    ),
    customers: customerResults,
    segments: aggregateSegments(customerResults),
  };
}

export function analyseScenarios(
  customers: Customer[],
  scenarios: PricingScenario[],
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): AnalysisBundle {
  const baseline = currentPricingBaseline(customers);
  return {
    baseline,
    thresholds,
    scenarios: scenarios.map((scenario) =>
      analyseScenario(customers, scenario, baseline, thresholds),
    ),
  };
}
