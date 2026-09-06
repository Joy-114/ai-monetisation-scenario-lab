export type Language = 'en' | 'zh';

export type PricingModel = 'subscription' | 'usage' | 'hybrid';

export type ValueCaptureStatus =
  | 'under'
  | 'balanced'
  | 'over'
  | 'unavailable';

export interface Customer {
  customerName: string;
  segment: string;
  monthlyUsage: number;
  currentPrice: number;
  willingnessToPay: number;
  variableCost: number;
}

export interface PricingScenario {
  id: string;
  name: string;
  model: PricingModel;
  fixedMonthlyPrice?: number;
  pricePerUnit?: number;
  baseMonthlyFee?: number;
}

export interface Thresholds {
  under: number;
  over: number;
}

export interface Metrics {
  totalRevenue: number;
  totalVariableCost: number;
  grossProfit: number;
  grossMargin: number | null;
  arpu: number | null;
  revenueUplift: number | null;
  profitUplift: number | null;
}

export interface CustomerScenarioResult {
  customerName: string;
  segment: string;
  revenue: number;
  variableCost: number;
  grossProfit: number;
  willingnessToPay: number;
  valueCaptureRatio: number | null;
  valueCaptureStatus: ValueCaptureStatus;
}

export interface SegmentResult {
  segment: string;
  customerCount: number;
  totalRevenue: number;
  grossProfit: number;
  averageRevenue: number;
  averageWillingnessToPay: number;
  averageValueCaptureRatio: number | null;
}

export interface ScenarioResult extends Metrics {
  scenario: PricingScenario;
  customers: CustomerScenarioResult[];
  segments: SegmentResult[];
}

export interface AnalysisBundle {
  baseline: Metrics;
  scenarios: ScenarioResult[];
  thresholds: Thresholds;
}
