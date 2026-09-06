import { deterministicSummary, type SummaryPayload } from '@/lib/summary';

export interface GeneratedSummary {
  summary: string;
  source: 'ai' | 'fallback';
}

interface OpenAIContent {
  type?: string;
  text?: string;
}

interface OpenAIOutputItem {
  content?: OpenAIContent[];
}

interface OpenAIResponseBody {
  output?: OpenAIOutputItem[];
}

function structuredMetricsForLlm({ language, analysis }: SummaryPayload) {
  return {
    language,
    baseline: analysis.baseline,
    thresholds: analysis.thresholds,
    scenarios: analysis.scenarios.map((result) => ({
      scenario: {
        name: result.scenario.name,
        model: result.scenario.model,
      },
      metrics: {
        totalRevenue: result.totalRevenue,
        totalVariableCost: result.totalVariableCost,
        grossProfit: result.grossProfit,
        grossMargin: result.grossMargin,
        arpu: result.arpu,
        revenueUplift: result.revenueUplift,
        profitUplift: result.profitUplift,
      },
      valueCapture: {
        under: result.customers.filter(
          (customer) => customer.valueCaptureStatus === 'under',
        ).length,
        balanced: result.customers.filter(
          (customer) => customer.valueCaptureStatus === 'balanced',
        ).length,
        over: result.customers.filter(
          (customer) => customer.valueCaptureStatus === 'over',
        ).length,
        unavailable: result.customers.filter(
          (customer) => customer.valueCaptureStatus === 'unavailable',
        ).length,
      },
      segments: result.segments,
    })),
  };
}

export async function generateConsultantSummary(
  payload: SummaryPayload,
  apiKey?: string,
  model = 'gpt-4.1-mini',
  fetcher: typeof fetch = fetch,
): Promise<GeneratedSummary> {
  const fallback = deterministicSummary(payload);
  if (!apiKey) return { summary: fallback, source: 'fallback' };

  try {
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions:
          'You are a pricing strategy consultant. Interpret only the supplied pre-calculated metrics. Do not recalculate or invent figures. Use measured language because the dataset may be illustrative. Discuss the strongest scenario, revenue, gross profit, segment effects, value capture, trade-offs, risks, and next steps. Return concise professional prose in the requested language.',
        input: JSON.stringify(structuredMetricsForLlm(payload)),
        max_output_tokens: 700,
      }),
    });

    if (!response.ok) return { summary: fallback, source: 'fallback' };
    const body = (await response.json()) as OpenAIResponseBody;
    const text = body.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === 'output_text')?.text;

    return text?.trim()
      ? { summary: text.trim(), source: 'ai' }
      : { summary: fallback, source: 'fallback' };
  } catch {
    return { summary: fallback, source: 'fallback' };
  }
}
