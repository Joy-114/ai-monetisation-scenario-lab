import { getD1 } from '@/db';
import { analyseScenarios } from '@/lib/pricing';
import type {
  AnalysisBundle,
  Customer,
  Language,
  PricingModel,
  PricingScenario,
} from '@/types/pricing';

interface AnalysisRunRow {
  language: Language;
  underThreshold: number;
  overThreshold: number;
}

interface CustomerRow {
  customerName: string;
  segment: string;
  monthlyUsage: number;
  currentPrice: number;
  willingnessToPay: number;
  variableCost: number;
}

interface ScenarioRow {
  id: string;
  name: string;
  model: PricingModel;
  fixedMonthlyPrice: number | null;
  pricePerUnit: number | null;
  baseMonthlyFee: number | null;
}

export interface StoredAnalysis {
  language: Language;
  analysis: AnalysisBundle;
}

export async function loadStoredAnalysis(
  analysisRunId: string,
): Promise<StoredAnalysis | null> {
  const db = getD1();
  const run = await db
    .prepare(
      `SELECT
        language,
        under_threshold AS underThreshold,
        over_threshold AS overThreshold
       FROM analysis_runs
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(analysisRunId)
    .first<AnalysisRunRow>();

  if (!run) return null;

  const [customerQuery, scenarioQuery] = await db.batch([
    db
      .prepare(
        `SELECT
          c.customer_name AS customerName,
          c.segment,
          c.monthly_usage AS monthlyUsage,
          c.current_price AS currentPrice,
          c.willingness_to_pay AS willingnessToPay,
          c.variable_cost AS variableCost
         FROM customers c
         JOIN analysis_runs ar ON ar.dataset_id = c.dataset_id
         WHERE ar.id = ?
         ORDER BY c.id`,
      )
      .bind(analysisRunId),
    db
      .prepare(
        `SELECT
          id,
          name,
          model,
          fixed_monthly_price AS fixedMonthlyPrice,
          price_per_unit AS pricePerUnit,
          base_monthly_fee AS baseMonthlyFee
         FROM pricing_scenarios
         WHERE analysis_run_id = ?
         ORDER BY id`,
      )
      .bind(analysisRunId),
  ]);

  const customers = (customerQuery.results as unknown as CustomerRow[]).map(
    (row): Customer => ({
      customerName: row.customerName,
      segment: row.segment,
      monthlyUsage: row.monthlyUsage,
      currentPrice: row.currentPrice,
      willingnessToPay: row.willingnessToPay,
      variableCost: row.variableCost,
    }),
  );
  const scenarios = (scenarioQuery.results as unknown as ScenarioRow[]).map(
    (row): PricingScenario => ({
      id: row.id,
      name: row.name,
      model: row.model,
      ...(row.fixedMonthlyPrice === null
        ? {}
        : { fixedMonthlyPrice: row.fixedMonthlyPrice }),
      ...(row.pricePerUnit === null ? {} : { pricePerUnit: row.pricePerUnit }),
      ...(row.baseMonthlyFee === null
        ? {}
        : { baseMonthlyFee: row.baseMonthlyFee }),
    }),
  );

  return {
    language: run.language,
    analysis: analyseScenarios(customers, scenarios, {
      under: run.underThreshold,
      over: run.overThreshold,
    }),
  };
}
