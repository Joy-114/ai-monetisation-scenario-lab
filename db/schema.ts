import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const datasets = sqliteTable('datasets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sourceFilename: text('source_filename'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    datasetId: text('dataset_id')
      .notNull()
      .references(() => datasets.id, { onDelete: 'cascade' }),
    customerName: text('customer_name').notNull(),
    segment: text('segment').notNull(),
    monthlyUsage: real('monthly_usage').notNull(),
    currentPrice: real('current_price').notNull(),
    willingnessToPay: real('willingness_to_pay').notNull(),
    variableCost: real('variable_cost').notNull(),
  },
  (table) => [
    index('idx_customers_dataset_id').on(table.datasetId),
    index('idx_customers_dataset_segment').on(table.datasetId, table.segment),
  ],
);

export const analysisRuns = sqliteTable(
  'analysis_runs',
  {
    id: text('id').primaryKey(),
    datasetId: text('dataset_id')
      .notNull()
      .references(() => datasets.id, { onDelete: 'cascade' }),
    language: text('language', { enum: ['en', 'zh'] }).notNull(),
    underThreshold: real('under_threshold').notNull(),
    overThreshold: real('over_threshold').notNull(),
    currentRevenue: real('current_revenue').notNull(),
    currentProfit: real('current_profit').notNull(),
    summary: text('summary'),
    summarySource: text('summary_source', { enum: ['ai', 'fallback'] }),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('idx_analysis_runs_dataset_id').on(table.datasetId)],
);

export const pricingScenarios = sqliteTable(
  'pricing_scenarios',
  {
    id: text('id').primaryKey(),
    analysisRunId: text('analysis_run_id')
      .notNull()
      .references(() => analysisRuns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    model: text('model', {
      enum: ['subscription', 'usage', 'hybrid'],
    }).notNull(),
    fixedMonthlyPrice: real('fixed_monthly_price'),
    pricePerUnit: real('price_per_unit'),
    baseMonthlyFee: real('base_monthly_fee'),
    totalRevenue: real('total_revenue').notNull(),
    totalVariableCost: real('total_variable_cost').notNull(),
    grossProfit: real('gross_profit').notNull(),
    grossMargin: real('gross_margin'),
    arpu: real('arpu'),
    revenueUplift: real('revenue_uplift'),
    profitUplift: real('profit_uplift'),
  },
  (table) => [
    index('idx_pricing_scenarios_analysis_run_id').on(table.analysisRunId),
  ],
);
