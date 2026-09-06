'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AppHeader } from '@/components/app-header';
import { DataWorkspace } from '@/components/data-workspace';
import { ResultsDashboard } from '@/components/results-dashboard';
import { ScenarioBuilder } from '@/components/scenario-builder';
import { SummaryPanel } from '@/components/summary-panel';
import { WorkflowSteps } from '@/components/workflow-steps';
import { parseCustomerCsv, type CsvValidationIssue } from '@/lib/csv';
import { useLanguage } from '@/lib/i18n';
import {
  analyseScenarios,
  DEFAULT_THRESHOLDS,
} from '@/lib/pricing';
import { deterministicSummary } from '@/lib/summary';
import type {
  Customer,
  PricingScenario,
  Thresholds,
} from '@/types/pricing';

const INITIAL_SCENARIOS: PricingScenario[] = [
  {
    id: 'subscription-growth',
    name: 'Subscription Growth',
    model: 'subscription',
    fixedMonthlyPrice: 249,
  },
  {
    id: 'usage-aligned',
    name: 'Usage Aligned',
    model: 'usage',
    pricePerUnit: 0.11,
  },
  {
    id: 'hybrid-balance',
    name: 'Hybrid Balance',
    model: 'hybrid',
    baseMonthlyFee: 59,
    pricePerUnit: 0.075,
  },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export function ScenarioLab() {
  const { language, t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filename, setFilename] = useState('');
  const [issues, setIssues] = useState<CsvValidationIssue[]>([]);
  const [scenarios, setScenarios] =
    useState<PricingScenario[]>(INITIAL_SCENARIOS);
  const [thresholds, setThresholds] =
    useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    INITIAL_SCENARIOS[0].id,
  );
  const [hasRun, setHasRun] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [analysisRunId, setAnalysisRunId] = useState<string>();
  const [summary, setSummary] = useState('');
  const [summaryLanguage, setSummaryLanguage] = useState<'en' | 'zh'>();
  const [summarySource, setSummarySource] = useState<'ai' | 'fallback' | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);

  const analysis = useMemo(
    () => analyseScenarios(customers, scenarios, thresholds),
    [customers, scenarios, thresholds],
  );

  const resetAfterInputChange = useCallback(() => {
    setHasRun(false);
    setSaveState('idle');
    setAnalysisRunId(undefined);
    setSummary('');
    setSummaryLanguage(undefined);
    setSummarySource(null);
  }, []);

  const acceptCsv = useCallback((csv: string, sourceFilename: string) => {
    const parsed = parseCustomerCsv(csv);
    setIssues(parsed.issues);
    if (parsed.issues.length === 0) {
      setCustomers(parsed.customers);
      setFilename(sourceFilename);
      resetAfterInputChange();
    }
    return parsed.customers.length;
  }, [resetAfterInputChange]);

  async function handleFileSelected(file: File) {
    acceptCsv(await file.text(), file.name);
  }

  const loadSample = useCallback(async () => {
    const response = await fetch('/sample-customers.csv');
    if (!response.ok) {
      setIssues([{ code: 'malformedCsv', detail: 'Sample data unavailable.' }]);
      return 0;
    }
    return acceptCsv(await response.text(), 'sample-customers.csv');
  }, [acceptCsv]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: 'load_sample_pricing_dataset',
          title: 'Load sample pricing dataset',
          description:
            'Load the built-in customer pricing CSV into the visible scenario lab so a pricing comparison can be configured.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: {
            readOnlyHint: false,
            untrustedContentHint: false,
          },
          async execute(input) {
            if (
              typeof input !== 'object' ||
              input === null ||
              Array.isArray(input) ||
              Object.keys(input).length > 0
            ) {
              throw new TypeError('This action does not accept input fields.');
            }
            const customerCount = await loadSample();
            if (customerCount === 0) throw new Error('Sample dataset unavailable.');
            return { status: 'loaded', customerCount };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, [loadSample]);

  function updateScenario(id: string, patch: Partial<PricingScenario>) {
    setScenarios((current) =>
      current.map((scenario) =>
        scenario.id === id ? { ...scenario, ...patch } : scenario,
      ),
    );
    resetAfterInputChange();
  }

  function addScenario() {
    const id = crypto.randomUUID();
    setScenarios((current) => [
      ...current,
      {
        id,
        name: `${t('hybrid')} ${current.length + 1}`,
        model: 'hybrid',
        baseMonthlyFee: 49,
        pricePerUnit: 0.08,
      },
    ]);
    setSelectedScenarioId(id);
    resetAfterInputChange();
  }

  function removeScenario(id: string) {
    setScenarios((current) => {
      const next = current.filter((scenario) => scenario.id !== id);
      if (selectedScenarioId === id && next[0]) {
        setSelectedScenarioId(next[0].id);
      }
      return next;
    });
    resetAfterInputChange();
  }

  function requestBody() {
    return {
      datasetName: filename.replace(/\.csv$/i, '') || 'Customer dataset',
      sourceFilename: filename,
      language,
      customers,
      scenarios,
      thresholds,
    };
  }

  async function runComparison() {
    if (customers.length === 0 || scenarios.length === 0) return;
    setHasRun(true);
    setSaveState('saving');
    setSummary('');
    setSummarySource(null);

    requestAnimationFrame(() => {
      document.getElementById('results')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    try {
      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody()),
      });
      if (!response.ok) throw new Error('Persistence failed.');
      const body = (await response.json()) as { analysisRunId: string };
      setAnalysisRunId(body.analysisRunId);
      setSaveState('saved');
    } catch {
      setSaveState('failed');
    }
  }

  async function generateSummary() {
    if (!hasRun) return;
    setGenerating(true);
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody(), analysisRunId }),
      });
      if (!response.ok) throw new Error('Summary failed.');
      const body = (await response.json()) as {
        summary: string;
        source: 'ai' | 'fallback';
      };
      setSummary(body.summary);
      setSummaryLanguage(language);
      setSummarySource(body.source);
    } catch {
      setSummary(deterministicSummary({ language, analysis }));
      setSummaryLanguage(language);
      setSummarySource('fallback');
    } finally {
      setGenerating(false);
    }
  }

  const visibleSummary = summaryLanguage === language ? summary : '';
  const visibleSummarySource = visibleSummary ? summarySource : null;
  const activeStep = visibleSummary
    ? 5
    : hasRun
      ? 4
      : customers.length > 0
        ? 3
        : 1;

  return (
    <main id="dashboard" className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto max-w-[1480px] space-y-7 px-5 py-8 lg:px-8 lg:py-10">
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <BarChart3 className="size-3.5" /> {t('scenarioWorkspace')}
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl md:leading-[1.05]">
              {t('headline')}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t('intro')}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
            <ShieldCheck className="size-4 text-primary" /> {t('formulaNote')}
          </div>
        </section>

        <WorkflowSteps activeStep={activeStep} />
        <DataWorkspace
          customers={customers}
          filename={filename}
          issues={issues}
          onFileSelected={handleFileSelected}
          onLoadSample={loadSample}
        />
        <ScenarioBuilder
          scenarios={scenarios}
          onChange={updateScenario}
          onAdd={addScenario}
          onRemove={removeScenario}
          onRun={runComparison}
          disabled={customers.length === 0}
          saving={saveState === 'saving'}
        />

        {saveState === 'saved' && (
          <Alert className="border-[#99c6b8] bg-[#eff7f4] text-[#17594e]">
            <CheckCircle2 />
            <AlertTitle>{t('saved')}</AlertTitle>
          </Alert>
        )}
        {saveState === 'failed' && (
          <Alert>
            <AlertCircle />
            <AlertTitle>{t('saveFailed')}</AlertTitle>
          </Alert>
        )}

        {hasRun && (
          <ResultsDashboard
            analysis={analysis}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
            thresholds={thresholds}
            onThresholdsChange={(next) => {
              setThresholds(next);
              setSummary('');
              setSummarySource(null);
            }}
          />
        )}

        <SummaryPanel
          summary={visibleSummary}
          source={visibleSummarySource}
          generating={generating}
          disabled={!hasRun}
          onGenerate={generateSummary}
        />

        <section
          id="about"
          className="scroll-mt-24 rounded-xl border bg-[#ebe8de] p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8"
        >
          <div>
            <h2 className="text-lg font-semibold">{t('aboutTitle')}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t('aboutBody')}
            </p>
          </div>
          <p className="mt-4 shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-primary md:mt-0">
            TypeScript · React · SQLite/D1 · Vitest · Playwright
          </p>
        </section>
      </div>
    </main>
  );
}
