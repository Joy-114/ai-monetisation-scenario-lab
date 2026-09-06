'use client';

import { Bot, FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';

interface SummaryPanelProps {
  summary: string;
  source: 'ai' | 'fallback' | null;
  generating: boolean;
  disabled: boolean;
  onGenerate: () => Promise<void>;
}

export function SummaryPanel({
  summary,
  source,
  generating,
  disabled,
  onGenerate,
}: SummaryPanelProps) {
  const { t } = useLanguage();
  return (
    <section id="summary" className="scroll-mt-24">
      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
          <div className="bg-[#123f3a] p-6 text-white md:p-8">
            <div className="mb-5 grid size-10 place-items-center rounded-lg bg-white/10 text-[#b4dfd2]">
              <Bot className="size-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{t('summaryTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {t('summaryDescription')}
            </p>
            <Button
              className="mt-6 h-10 bg-[#e8d09c] px-4 text-[#173f39] hover:bg-[#f0dfb8]"
              onClick={onGenerate}
              disabled={disabled || generating}
              data-testid="generate-summary"
            >
              <Sparkles />
              {generating ? t('generatingSummary') : t('generateSummary')}
            </Button>
          </div>
          <div className="p-6 md:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span className="text-sm font-semibold">{t('summaryTitle')}</span>
              </div>
              {source && (
                <Badge variant="outline">
                  {source === 'ai' ? t('summaryAi') : t('summaryFallback')}
                </Badge>
              )}
            </div>
            {summary ? (
              <div
                className="space-y-4 text-sm leading-7 text-foreground/80"
                data-testid="consultant-summary"
              >
                {summary.split('\n\n').map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center rounded-xl border border-dashed bg-secondary/25 p-8 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  {t('summaryEmpty')}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
