import { getD1 } from '@/db';
import { analyseScenarios } from '@/lib/pricing';
import { analysisRequestSchema } from '@/lib/validation';

export async function GET() {
  try {
    const db = getD1();
    const result = await db
      .prepare(
        `SELECT
          ar.id,
          ar.language,
          ar.current_revenue AS currentRevenue,
          ar.current_profit AS currentProfit,
          ar.summary_source AS summarySource,
          ar.created_at AS createdAt,
          d.name AS datasetName,
          COUNT(ps.id) AS scenarioCount
        FROM analysis_runs ar
        JOIN datasets d ON d.id = ar.dataset_id
        LEFT JOIN pricing_scenarios ps ON ps.analysis_run_id = ar.id
        GROUP BY ar.id
        ORDER BY ar.created_at DESC
        LIMIT 10`,
      )
      .all();
    return Response.json({ analyses: result.results });
  } catch {
    return Response.json({ analyses: [] });
  }
}

export async function POST(request: Request) {
  const parsed = analysisRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid analysis request.', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const analysis = analyseScenarios(
    input.customers,
    input.scenarios,
    input.thresholds,
  );
  const db = getD1();
  const datasetId = crypto.randomUUID();
  const analysisRunId = crypto.randomUUID();

  const statements = [
    db
      .prepare(
        'INSERT INTO datasets (id, name, source_filename) VALUES (?, ?, ?)',
      )
      .bind(datasetId, input.datasetName, input.sourceFilename ?? null),
    ...input.customers.map((customer) =>
      db
        .prepare(
          `INSERT INTO customers
            (id, dataset_id, customer_name, segment, monthly_usage, current_price, willingness_to_pay, variable_cost)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          datasetId,
          customer.customerName,
          customer.segment,
          customer.monthlyUsage,
          customer.currentPrice,
          customer.willingnessToPay,
          customer.variableCost,
        ),
    ),
    db
      .prepare(
        `INSERT INTO analysis_runs
          (id, dataset_id, language, under_threshold, over_threshold, current_revenue, current_profit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        analysisRunId,
        datasetId,
        input.language,
        input.thresholds.under,
        input.thresholds.over,
        analysis.baseline.totalRevenue,
        analysis.baseline.grossProfit,
      ),
    ...analysis.scenarios.map((result) =>
      db
        .prepare(
          `INSERT INTO pricing_scenarios
            (id, analysis_run_id, name, model, fixed_monthly_price, price_per_unit, base_monthly_fee,
             total_revenue, total_variable_cost, gross_profit, gross_margin, arpu, revenue_uplift, profit_uplift)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          analysisRunId,
          result.scenario.name,
          result.scenario.model,
          result.scenario.fixedMonthlyPrice ?? null,
          result.scenario.pricePerUnit ?? null,
          result.scenario.baseMonthlyFee ?? null,
          result.totalRevenue,
          result.totalVariableCost,
          result.grossProfit,
          result.grossMargin,
          result.arpu,
          result.revenueUplift,
          result.profitUplift,
        ),
    ),
  ];

  await db.batch(statements);

  return Response.json(
    { datasetId, analysisRunId, analysis },
    { status: 201 },
  );
}
