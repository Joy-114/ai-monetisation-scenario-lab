import { env } from 'cloudflare:workers';
import { getD1 } from '@/db';
import { generateConsultantSummary } from '@/lib/ai-summary';
import { analyseScenarios } from '@/lib/pricing';
import { analysisRequestSchema } from '@/lib/validation';
import { z } from 'zod';

const summaryRequestSchema = analysisRequestSchema.extend({
  analysisRunId: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = summaryRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: 'Invalid summary request.' }, { status: 400 });
  }

  const input = parsed.data;
  const analysis = analyseScenarios(
    input.customers,
    input.scenarios,
    input.thresholds,
  );
  const generated = await generateConsultantSummary(
    { language: input.language, analysis },
    env.OPENAI_API_KEY,
    env.OPENAI_MODEL,
  );

  if (input.analysisRunId) {
    try {
      await getD1()
        .prepare(
          'UPDATE analysis_runs SET summary = ?, summary_source = ? WHERE id = ?',
        )
        .bind(generated.summary, generated.source, input.analysisRunId)
        .run();
    } catch {
      // The summary should remain useful even if persistence is unavailable.
    }
  }

  return Response.json(generated);
}
