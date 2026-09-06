'use client';

import { ArrowUpRight, CircleGauge, Info, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney, formatPercent, formatRatio } from '@/lib/format';
import { useLanguage, type TranslationKey } from '@/lib/i18n';
import type {
  AnalysisBundle,
  Thresholds,
  ValueCaptureStatus,
} from '@/types/pricing';

interface ResultsDashboardProps {
  analysis: AnalysisBundle;
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  thresholds: Thresholds;
  onThresholdsChange: (thresholds: Thresholds) => void;
}

const statusKeys: Record<ValueCaptureStatus, TranslationKey> = {
  under: 'potentiallyUnder',
  balanced: 'reasonableCapture',
  over: 'potentialOver',
  unavailable: 'unavailable',
};

function statusClass(status: ValueCaptureStatus): string {
  if (status === 'under') return 'bg-[#fff4d6] text-[#795700]';
  if (status === 'over') return 'bg-[#fde9e5] text-[#983d2f]';
  if (status === 'balanced') return 'bg-[#e2efe9] text-[#17594e]';
  return 'bg-secondary text-muted-foreground';
}

export function ResultsDashboard({
  analysis,
  selectedScenarioId,
  onSelectScenario,
  thresholds,
  onThresholdsChange,
}: ResultsDashboardProps) {
  const { language, t } = useLanguage();
  const selected =
    analysis.scenarios.find(
      (result) => result.scenario.id === selectedScenarioId,
    ) ?? analysis.scenarios[0];

  if (!selected) return null;

  const chartData = [
    {
      name: t('currentBaseline'),
      revenue: analysis.baseline.totalRevenue,
      profit: analysis.baseline.grossProfit,
    },
    ...analysis.scenarios.map((result) => ({
      name: result.scenario.name,
      revenue: result.totalRevenue,
      profit: result.grossProfit,
    })),
  ];
  const statusCounts = selected.customers.reduce(
    (counts, customer) => {
      counts[customer.valueCaptureStatus] += 1;
      return counts;
    },
    { under: 0, balanced: 0, over: 0, unavailable: 0 },
  );
  const flagged = selected.customers
    .filter((customer) =>
      ['under', 'over', 'unavailable'].includes(customer.valueCaptureStatus),
    )
    .sort(
      (a, b) =>
        Math.abs(1 - (b.valueCaptureRatio ?? 1)) -
        Math.abs(1 - (a.valueCaptureRatio ?? 1)),
    );

  return (
    <section id="results" className="scroll-mt-24 space-y-5" data-testid="results-dashboard">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <TrendingUp className="size-3.5" /> {t('scenarioWorkspace')}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{t('compareTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('compareDescription')}</p>
        </div>
        <label className="text-xs font-medium text-muted-foreground">
          <span className="mb-1.5 block">{t('selectScenario')}</span>
          <NativeSelect
            className="min-w-64 bg-card"
            value={selected.scenario.id}
            onChange={(event) => onSelectScenario(event.target.value)}
          >
            {analysis.scenarios.map((result) => (
              <NativeSelectOption
                key={result.scenario.id}
                value={result.scenario.id}
              >
                {result.scenario.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('monthlyRevenue')}
          value={formatMoney(selected.totalRevenue, language)}
          rawValue={selected.totalRevenue}
          change={formatPercent(selected.revenueUplift, language)}
          testId={`monthly-revenue-${selected.scenario.id}`}
        />
        <KpiCard
          label={t('grossProfit')}
          value={formatMoney(selected.grossProfit, language)}
          change={formatPercent(selected.profitUplift, language)}
        />
        <KpiCard
          label={t('grossMargin')}
          value={formatPercent(selected.grossMargin, language)}
          change={null}
        />
        <KpiCard
          label={t('arpu')}
          value={selected.arpu === null ? '—' : formatMoney(selected.arpu, language)}
          change={null}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('scenarioComparison')}</CardTitle>
            <CardDescription>{t('formulaNote')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[300px] w-full"
              config={{
                revenue: { label: t('revenue'), color: '#27675c' },
                profit: { label: t('profit'), color: '#c39a48' },
              }}
            >
              <BarChart data={chartData} margin={{ left: 6, right: 6 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value: string) =>
                    value.length > 16 ? `${value.slice(0, 14)}…` : value
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) =>
                    value >= 1_000 ? `$${Math.round(value / 1_000)}k` : `$${value}`
                  }
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        formatMoney(Number(value), language)
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('scenarioComparison')}</CardTitle>
            <CardDescription>{t('currentBaseline')}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('scenarioName')}</TableHead>
                  <TableHead>{t('monthlyRevenue')}</TableHead>
                  <TableHead>{t('grossProfit')}</TableHead>
                  <TableHead className="pr-4">{t('grossMargin')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-secondary/40">
                  <TableCell className="pl-4 font-medium">
                    {t('currentBaseline')}
                  </TableCell>
                  <TableCell>{formatMoney(analysis.baseline.totalRevenue, language)}</TableCell>
                  <TableCell>{formatMoney(analysis.baseline.grossProfit, language)}</TableCell>
                  <TableCell className="pr-4">
                    {formatPercent(analysis.baseline.grossMargin, language)}
                  </TableCell>
                </TableRow>
                {analysis.scenarios.map((result) => (
                  <TableRow
                    key={result.scenario.id}
                    className={
                      result.scenario.id === selected.scenario.id
                        ? 'bg-[#eaf2ef]'
                        : undefined
                    }
                  >
                    <TableCell className="pl-4 font-medium">
                      {result.scenario.name}
                    </TableCell>
                    <TableCell>{formatMoney(result.totalRevenue, language)}</TableCell>
                    <TableCell>{formatMoney(result.grossProfit, language)}</TableCell>
                    <TableCell className="pr-4">
                      {formatPercent(result.grossMargin, language)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('segmentAnalysis')}</CardTitle>
          <CardDescription>{t('segmentDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t('customerSegment')}</TableHead>
                <TableHead>{t('customers')}</TableHead>
                <TableHead>{t('monthlyRevenue')}</TableHead>
                <TableHead>{t('grossProfit')}</TableHead>
                <TableHead>{t('avgRevenue')}</TableHead>
                <TableHead>{t('avgWtp')}</TableHead>
                <TableHead className="pr-4">{t('avgValueCapture')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.segments.map((segment) => (
                <TableRow key={segment.segment}>
                  <TableCell className="pl-4 font-medium">{segment.segment}</TableCell>
                  <TableCell>{segment.customerCount}</TableCell>
                  <TableCell>{formatMoney(segment.totalRevenue, language)}</TableCell>
                  <TableCell>{formatMoney(segment.grossProfit, language)}</TableCell>
                  <TableCell>{formatMoney(segment.averageRevenue, language)}</TableCell>
                  <TableCell>
                    {formatMoney(segment.averageWillingnessToPay, language)}
                  </TableCell>
                  <TableCell className="pr-4">
                    {formatRatio(segment.averageValueCaptureRatio, language)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <Card className="bg-[#123f3a] text-white ring-0">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a8d5c8]">
              {t('analysisIndicator')}
            </p>
            <CardTitle className="text-white">{t('valueCaptureTitle')}</CardTitle>
            <CardDescription className="text-white/65">
              {t('valueCaptureDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['under', statusCounts.under],
                  ['balanced', statusCounts.balanced],
                  ['over', statusCounts.over],
                ] as const
              ).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-white/8 p-3 text-center">
                  <p className="text-2xl font-semibold">{count}</p>
                  <p className="mt-1 text-[10px] leading-4 text-white/60">
                    {t(statusKeys[status])}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
              <label className="text-xs text-white/65">
                <span className="mb-1.5 block">{t('underThreshold')}</span>
                <Input
                  className="border-white/20 bg-white/10 text-white"
                  type="number"
                  min="0"
                  step="0.05"
                  value={thresholds.under}
                  onChange={(event) =>
                    onThresholdsChange({
                      ...thresholds,
                      under: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </label>
              <label className="text-xs text-white/65">
                <span className="mb-1.5 block">{t('overThreshold')}</span>
                <Input
                  className="border-white/20 bg-white/10 text-white"
                  type="number"
                  min={thresholds.under}
                  step="0.05"
                  value={thresholds.over}
                  onChange={(event) =>
                    onThresholdsChange({
                      ...thresholds,
                      over: Math.max(
                        thresholds.under,
                        Number(event.target.value) || thresholds.under,
                      ),
                    })
                  }
                />
              </label>
            </div>
            <p className="flex gap-2 text-[11px] leading-5 text-white/55">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {t('illustrativeCaveat')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('valueCaptureTitle')}</CardTitle>
            <CardDescription>{selected.scenario.name}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="max-h-[310px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="pl-4">{t('customerName')}</TableHead>
                    <TableHead>{t('customerSegment')}</TableHead>
                    <TableHead>{t('calculatedPrice')}</TableHead>
                    <TableHead>{t('ratio')}</TableHead>
                    <TableHead className="pr-4">{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flagged.slice(0, 10).map((customer) => (
                    <TableRow key={customer.customerName}>
                      <TableCell className="pl-4 font-medium">
                        {customer.customerName}
                      </TableCell>
                      <TableCell>{customer.segment}</TableCell>
                      <TableCell>{formatMoney(customer.revenue, language)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatRatio(customer.valueCaptureRatio, language)}
                      </TableCell>
                      <TableCell className="pr-4">
                        <Badge className={statusClass(customer.valueCaptureStatus)}>
                          {t(statusKeys[customer.valueCaptureStatus])}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  change,
  testId,
  rawValue,
}: {
  label: string;
  value: string;
  change: string | null;
  testId?: string;
  rawValue?: number;
}) {
  const { t } = useLanguage();
  return (
    <Card className="gap-2 py-4">
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <CircleGauge className="size-4 text-primary/55" />
        </div>
        <p
          className="mt-3 text-2xl font-semibold tracking-tight tabular-nums"
          data-testid={testId}
          data-financial-value={rawValue}
        >
          {value}
        </p>
        {change && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#147663]">
            <ArrowUpRight className="size-3.5" /> {change} {t('versusCurrent')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
