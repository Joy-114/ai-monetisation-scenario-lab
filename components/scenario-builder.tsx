'use client';

import { BarChart3, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useLanguage } from '@/lib/i18n';
import type { PricingModel, PricingScenario } from '@/types/pricing';

interface ScenarioBuilderProps {
  scenarios: PricingScenario[];
  onChange: (id: string, patch: Partial<PricingScenario>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRun: () => Promise<void>;
  disabled: boolean;
  saving: boolean;
}

const modelKeys: Record<PricingModel, 'subscription' | 'usage' | 'hybrid'> = {
  subscription: 'subscription',
  usage: 'usage',
  hybrid: 'hybrid',
};

function nonNegativeValue(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function ScenarioBuilder({
  scenarios,
  onChange,
  onAdd,
  onRemove,
  onRun,
  disabled,
  saving,
}: ScenarioBuilderProps) {
  const { t } = useLanguage();

  return (
    <section id="scenarios" className="scroll-mt-24">
      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle>{t('createTitle')}</CardTitle>
            <CardDescription>{t('createDescription')}</CardDescription>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline">{t('deterministicBadge')}</Badge>
            <span className="text-xs text-muted-foreground">{t('scenarioLimit')}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {scenarios.map((scenario, index) => (
              <article
                key={scenario.id}
                className="rounded-xl border bg-secondary/30 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onRemove(scenario.id)}
                    disabled={scenarios.length === 1}
                    aria-label={`${t('removeScenario')} ${scenario.name}`}
                  >
                    <Trash2 /> {t('removeScenario')}
                  </Button>
                </div>

                <label className="mb-3 block text-xs font-medium">
                  <span className="mb-1.5 block text-muted-foreground">
                    {t('scenarioName')}
                  </span>
                  <Input
                    value={scenario.name}
                    onChange={(event) =>
                      onChange(scenario.id, { name: event.target.value })
                    }
                  />
                </label>

                <label className="mb-3 block text-xs font-medium">
                  <span className="mb-1.5 block text-muted-foreground">
                    {t('pricingModel')}
                  </span>
                  <NativeSelect
                    className="w-full"
                    value={scenario.model}
                    data-testid={`pricing-model-${index}`}
                    onChange={(event) =>
                      onChange(scenario.id, {
                        model: event.target.value as PricingModel,
                      })
                    }
                  >
                    {(['subscription', 'usage', 'hybrid'] as PricingModel[]).map(
                      (model) => (
                        <NativeSelectOption key={model} value={model}>
                          {t(modelKeys[model])}
                        </NativeSelectOption>
                      ),
                    )}
                  </NativeSelect>
                </label>

                {scenario.model === 'subscription' && (
                  <NumberField
                    label={t('fixedMonthlyPrice')}
                    value={scenario.fixedMonthlyPrice ?? 0}
                    onChange={(value) =>
                      onChange(scenario.id, { fixedMonthlyPrice: value })
                    }
                  />
                )}
                {scenario.model === 'hybrid' && (
                  <NumberField
                    label={t('baseMonthlyFee')}
                    value={scenario.baseMonthlyFee ?? 0}
                    onChange={(value) =>
                      onChange(scenario.id, { baseMonthlyFee: value })
                    }
                  />
                )}
                {(scenario.model === 'usage' || scenario.model === 'hybrid') && (
                  <NumberField
                    label={t('pricePerUnit')}
                    value={scenario.pricePerUnit ?? 0}
                    step="0.01"
                    onChange={(value) =>
                      onChange(scenario.id, { pricePerUnit: value })
                    }
                  />
                )}
              </article>
            ))}
          </div>

          <div className="flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              onClick={onAdd}
              disabled={scenarios.length >= 12}
            >
              <Plus /> {t('addScenario')}
            </Button>
            <Button
              size="lg"
              className="h-10 bg-[#103f3a] px-5"
              onClick={onRun}
              disabled={disabled || saving}
              data-testid="run-comparison"
            >
              <BarChart3 />
              {saving ? t('runningComparison') : t('runComparison')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function NumberField({
  label,
  value,
  step = '1',
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-3 block text-xs font-medium">
      <span className="mb-1.5 block text-muted-foreground">{label}</span>
      <Input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(nonNegativeValue(event.target.value))}
      />
    </label>
  );
}
