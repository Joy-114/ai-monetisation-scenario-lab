import type { AnalysisBundle, Language, ScenarioResult } from '@/types/pricing';

export interface SummaryPayload {
  language: Language;
  analysis: AnalysisBundle;
}

function percent(value: number | null): string {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function strongestScenario(scenarios: ScenarioResult[]): ScenarioResult | null {
  return scenarios.length === 0
    ? null
    : [...scenarios].sort((a, b) => b.grossProfit - a.grossProfit)[0];
}

export function deterministicSummary({
  language,
  analysis,
}: SummaryPayload): string {
  const strongest = strongestScenario(analysis.scenarios);
  if (!strongest) {
    return language === 'zh'
      ? '请先添加至少一个定价方案，再生成顾问分析摘要。'
      : 'Add at least one pricing scenario before generating a consultant summary.';
  }

  const underCount = strongest.customers.filter(
    (customer) => customer.valueCaptureStatus === 'under',
  ).length;
  const overCount = strongest.customers.filter(
    (customer) => customer.valueCaptureStatus === 'over',
  ).length;
  const opportunitySegment = [...strongest.segments].sort(
    (a, b) =>
      (a.averageValueCaptureRatio ?? Number.POSITIVE_INFINITY) -
      (b.averageValueCaptureRatio ?? Number.POSITIVE_INFINITY),
  )[0]?.segment;

  if (language === 'zh') {
    return [
      `在本次示例分析中，“${strongest.scenario.name}”方案的毛利润最高，为 ${money(strongest.grossProfit)}，月度收入为 ${money(strongest.totalRevenue)}。相较当前定价，收入变化为 ${percent(strongest.revenueUplift)}，利润变化为 ${percent(strongest.profitUplift)}。`,
      opportunitySegment
        ? `${opportunitySegment} 客户细分的平均价值获取率最低，值得优先验证支付意愿与套餐设计。`
        : '当前数据不足以判断优先客户细分。',
      `按当前分析阈值，${underCount} 个客户显示潜在商业化不足，${overCount} 个客户显示潜在定价过高风险。这些只是分析信号，并非确定结论。`,
      '建议下一步开展客户访谈、测试价格敏感度，并在更完整的数据集上进行情景压力测试后再作商业决策。',
    ].join('\n\n');
  }

  return [
    `On this illustrative dataset, “${strongest.scenario.name}” produces the strongest gross profit at ${money(strongest.grossProfit)}, with monthly revenue of ${money(strongest.totalRevenue)}. Versus current pricing, revenue changes by ${percent(strongest.revenueUplift)} and profit changes by ${percent(strongest.profitUplift)}.`,
    opportunitySegment
      ? `${opportunitySegment} has the lowest average value-capture ratio and is the clearest segment for further willingness-to-pay and packaging validation.`
      : 'There is not enough segment data to identify a priority segment.',
    `Using the current analytical thresholds, ${underCount} customers show a possible under-monetisation signal and ${overCount} show a possible over-pricing risk. These are indicators, not definitive conclusions.`,
    'Next steps should include customer interviews, price-sensitivity testing, and scenario stress-testing on a broader dataset before making a commercial decision.',
  ].join('\n\n');
}
