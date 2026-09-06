import { z } from 'zod';

export const customerSchema = z.object({
  customerName: z.string().trim().min(1),
  segment: z.string().trim().min(1),
  monthlyUsage: z.number().nonnegative(),
  currentPrice: z.number().nonnegative(),
  willingnessToPay: z.number().nonnegative(),
  variableCost: z.number().nonnegative(),
});

export const scenarioSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    model: z.enum(['subscription', 'usage', 'hybrid']),
    fixedMonthlyPrice: z.number().nonnegative().optional(),
    pricePerUnit: z.number().nonnegative().optional(),
    baseMonthlyFee: z.number().nonnegative().optional(),
  })
  .superRefine((scenario, context) => {
    if (
      scenario.model === 'subscription' &&
      scenario.fixedMonthlyPrice === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['fixedMonthlyPrice'],
        message: 'Subscription pricing requires a fixed monthly price.',
      });
    }
    if (
      (scenario.model === 'usage' || scenario.model === 'hybrid') &&
      scenario.pricePerUnit === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['pricePerUnit'],
        message: 'This pricing model requires a price per usage unit.',
      });
    }
    if (scenario.model === 'hybrid' && scenario.baseMonthlyFee === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['baseMonthlyFee'],
        message: 'Hybrid pricing requires a base monthly fee.',
      });
    }
  });

export const thresholdsSchema = z
  .object({
    under: z.number().nonnegative(),
    over: z.number().nonnegative(),
  })
  .refine((thresholds) => thresholds.over >= thresholds.under, {
    message: 'The over threshold must be greater than or equal to the under threshold.',
  });

export const analysisRequestSchema = z.object({
  datasetName: z.string().trim().min(1).max(120),
  sourceFilename: z.string().trim().max(255).optional(),
  language: z.enum(['en', 'zh']),
  customers: z.array(customerSchema).min(1).max(5_000),
  scenarios: z.array(scenarioSchema).min(1).max(12),
  thresholds: thresholdsSchema,
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
