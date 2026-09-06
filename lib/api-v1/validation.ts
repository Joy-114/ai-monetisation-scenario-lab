import { z } from 'zod';
import {
  customerSchema,
  scenarioSchema,
  thresholdsSchema,
} from '@/lib/validation';
import { DEFAULT_THRESHOLDS } from '@/lib/pricing';

const customersSchema = z.array(customerSchema).min(1).max(5_000);
const scenariosSchema = z.array(scenarioSchema).min(1).max(12);

export const publicAnalyseRequestSchema = z
  .object({
    customers: customersSchema,
    scenario: scenarioSchema,
    thresholds: thresholdsSchema.default(DEFAULT_THRESHOLDS),
  })
  .strict();

const directSummaryRequestSchema = z
  .object({
    language: z.enum(['en', 'zh']).default('en'),
    customers: customersSchema,
    scenarios: scenariosSchema,
    thresholds: thresholdsSchema.default(DEFAULT_THRESHOLDS),
  })
  .strict();

const savedSummaryRequestSchema = z
  .object({
    analysisRunId: z.uuid(),
    language: z.enum(['en', 'zh']).optional(),
  })
  .strict();

export const publicSummaryRequestSchema = z.union([
  savedSummaryRequestSchema,
  directSummaryRequestSchema,
]);

export type PublicAnalyseRequest = z.infer<typeof publicAnalyseRequestSchema>;
export type PublicSummaryRequest = z.infer<typeof publicSummaryRequestSchema>;
