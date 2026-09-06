'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CsvValidationIssue } from '@/lib/csv';
import { useLanguage, type TranslationKey } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Customer } from '@/types/pricing';

type SortKey = keyof Customer;

interface DataWorkspaceProps {
  customers: Customer[];
  filename: string;
  issues: CsvValidationIssue[];
  onFileSelected: (file: File) => Promise<void>;
  onLoadSample: () => Promise<unknown>;
}

const columns: Array<{ key: SortKey; label: TranslationKey }> = [
  { key: 'customerName', label: 'customerName' },
  { key: 'segment', label: 'customerSegment' },
  { key: 'monthlyUsage', label: 'monthlyUsage' },
  { key: 'currentPrice', label: 'currentPrice' },
  { key: 'willingnessToPay', label: 'willingnessToPay' },
  { key: 'variableCost', label: 'variableCost' },
];

export function DataWorkspace({
  customers,
  filename,
  issues,
  onFileSelected,
  onLoadSample,
}: DataWorkspaceProps) {
  const { language, t, csvIssueMessage } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'customerName',
    direction: 'asc',
  });

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((a, b) => {
        const left = a[sort.key];
        const right = b[sort.key];
        const comparison =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), language);
        return sort.direction === 'asc' ? comparison : -comparison;
      }),
    [customers, language, sort],
  );

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  async function loadSample() {
    setLoadingSample(true);
    await onLoadSample();
    setLoadingSample(false);
  }

  return (
    <section id="dataset" className="scroll-mt-24 space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="border-dashed bg-[#f7faf8] ring-primary/20">
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-lg bg-[#dcebe6] text-primary">
              <Upload className="size-5" />
            </div>
            <CardTitle>{t('uploadTitle')}</CardTitle>
            <CardDescription>{t('uploadDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={inputRef}
              data-testid="csv-input"
              className="sr-only"
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) await onFileSelected(file);
                event.target.value = '';
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => inputRef.current?.click()}>
                <FileSpreadsheet />
                {customers.length ? t('replaceDataset') : t('chooseCsv')}
              </Button>
              <Button variant="outline" onClick={loadSample} disabled={loadingSample}>
                <Database />
                {t('loadSample')}
              </Button>
            </div>
            <a
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
              href="/sample-customers.csv"
              download
            >
              <Download className="size-3.5" /> {t('downloadTemplate')}
            </a>
            <div className="rounded-lg border bg-card p-3">
              <p className="mb-2 text-xs font-semibold">{t('acceptedColumns')}</p>
              <p className="font-mono text-[10px] leading-5 text-muted-foreground">
                customer_name · segment · monthly_usage · current_price ·
                willingness_to_pay · variable_cost
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div>
              <CardTitle>{t('reviewTitle')}</CardTitle>
              <CardDescription>{t('reviewDescription')}</CardDescription>
            </div>
            {customers.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="bg-[#e2efe9] text-[#17594e]">
                  <CheckCircle2 /> {t('datasetReady', { count: customers.length })}
                </Badge>
                <span className="text-xs text-muted-foreground">{filename}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-0">
            {customers.length === 0 ? (
              <div className="grid min-h-56 place-items-center px-6 text-center">
                <div>
                  <Database className="mx-auto mb-3 size-7 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">{t('noCustomers')}</p>
                </div>
              </div>
            ) : (
              <div className="max-h-[360px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column.key} className="px-4">
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className="inline-flex items-center gap-1.5 hover:text-primary"
                            aria-label={`${t(column.label)} ${
                              sort.direction === 'asc'
                                ? t('sortDescending')
                                : t('sortAscending')
                            }`}
                          >
                            {t(column.label)} <ArrowDownUp className="size-3" />
                          </button>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCustomers.map((customer) => (
                      <TableRow key={customer.customerName}>
                        <TableCell className="px-4 font-medium">
                          {customer.customerName}
                        </TableCell>
                        <TableCell className="px-4">
                          <Badge variant="outline">{customer.segment}</Badge>
                        </TableCell>
                        <TableCell className="px-4 font-mono text-xs">
                          {formatNumber(customer.monthlyUsage, language)}
                        </TableCell>
                        <TableCell className="px-4 font-mono text-xs">
                          {formatMoney(customer.currentPrice, language)}
                        </TableCell>
                        <TableCell className="px-4 font-mono text-xs">
                          {formatMoney(customer.willingnessToPay, language)}
                        </TableCell>
                        <TableCell className="px-4 font-mono text-xs">
                          {formatMoney(customer.variableCost, language)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{t('uploadErrors')}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {issues.slice(0, 8).map((issue, index) => (
                <li key={`${issue.code}-${issue.row}-${index}`}>
                  {csvIssueMessage(issue)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
