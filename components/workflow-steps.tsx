'use client';

import { Check } from 'lucide-react';
import { useLanguage, type TranslationKey } from '@/lib/i18n';

const steps: TranslationKey[] = [
  'stepUpload',
  'stepReview',
  'stepModel',
  'stepCompare',
  'stepSummary',
];

export function WorkflowSteps({ activeStep }: { activeStep: number }) {
  const { t } = useLanguage();
  return (
    <section className="rounded-xl border bg-card p-2 shadow-sm" aria-label={t('workflow')}>
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-5">
        {steps.map((step, index) => {
          const completed = index + 1 < activeStep;
          const active = index + 1 === activeStep;
          return (
            <li
              key={step}
              className={`flex min-h-12 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : completed
                    ? 'bg-[#e5f0ec] text-[#174f46]'
                    : 'text-muted-foreground'
              }`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                  active
                    ? 'border-white/30 bg-white/10'
                    : completed
                      ? 'border-[#174f46]/20 bg-white'
                      : 'border-border bg-background'
                }`}
              >
                {completed ? <Check className="size-3" /> : index + 1}
              </span>
              <span>{t(step)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
