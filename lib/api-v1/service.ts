import { analyseScenarios } from '@/lib/pricing';
import type { PublicAnalyseRequest } from '@/lib/api-v1/validation';
import type { AnalyseResponseData } from '@/types/api-v1';

export function calculatePublicAnalysis(
  input: PublicAnalyseRequest,
): AnalyseResponseData {
  const analysis = analyseScenarios(
    input.customers,
    [input.scenario],
    input.thresholds,
  );

  return {
    baseline: analysis.baseline,
    thresholds: analysis.thresholds,
    result: analysis.scenarios[0],
  };
}
