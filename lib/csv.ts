import Papa from 'papaparse';
import type { Customer } from '@/types/pricing';

export const REQUIRED_COLUMNS = [
  'customer_name',
  'segment',
  'monthly_usage',
  'current_price',
  'willingness_to_pay',
  'variable_cost',
] as const;

export type CsvIssueCode =
  | 'emptyCsv'
  | 'malformedCsv'
  | 'missingColumns'
  | 'missingCustomerName'
  | 'missingSegment'
  | 'invalidNumber'
  | 'negativeNumber';

export interface CsvValidationIssue {
  code: CsvIssueCode;
  row?: number;
  field?: string;
  detail?: string;
}

export interface CsvParseResult {
  customers: Customer[];
  issues: CsvValidationIssue[];
}

type RawCsvRow = Record<string, string | undefined>;

function numericValue(
  row: RawCsvRow,
  field: (typeof REQUIRED_COLUMNS)[number],
  rowNumber: number,
  issues: CsvValidationIssue[],
): number | null {
  const raw = row[field]?.trim() ?? '';
  const value = Number(raw);

  if (raw === '' || !Number.isFinite(value)) {
    issues.push({ code: 'invalidNumber', row: rowNumber, field });
    return null;
  }

  if (value < 0) {
    issues.push({ code: 'negativeNumber', row: rowNumber, field });
    return null;
  }

  return value;
}

export function parseCustomerCsv(csv: string): CsvParseResult {
  if (!csv.trim()) {
    return { customers: [], issues: [{ code: 'emptyCsv' }] };
  }

  const parsed = Papa.parse<RawCsvRow>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    return {
      customers: [],
      issues: parsed.errors.map((error) => ({
        code: 'malformedCsv',
        row: error.row === undefined ? undefined : error.row + 2,
        detail: error.message,
      })),
    };
  }

  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    return {
      customers: [],
      issues: [{ code: 'missingColumns', detail: missing.join(', ') }],
    };
  }

  if (parsed.data.length === 0) {
    return { customers: [], issues: [{ code: 'emptyCsv' }] };
  }

  const issues: CsvValidationIssue[] = [];
  const customers: Customer[] = [];

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const customerName = row.customer_name?.trim() ?? '';
    const segment = row.segment?.trim() ?? '';

    if (!customerName) {
      issues.push({ code: 'missingCustomerName', row: rowNumber });
    }
    if (!segment) {
      issues.push({ code: 'missingSegment', row: rowNumber });
    }

    const monthlyUsage = numericValue(
      row,
      'monthly_usage',
      rowNumber,
      issues,
    );
    const currentPrice = numericValue(
      row,
      'current_price',
      rowNumber,
      issues,
    );
    const willingnessToPay = numericValue(
      row,
      'willingness_to_pay',
      rowNumber,
      issues,
    );
    const variableCost = numericValue(
      row,
      'variable_cost',
      rowNumber,
      issues,
    );

    if (
      customerName &&
      segment &&
      monthlyUsage !== null &&
      currentPrice !== null &&
      willingnessToPay !== null &&
      variableCost !== null
    ) {
      customers.push({
        customerName,
        segment,
        monthlyUsage,
        currentPrice,
        willingnessToPay,
        variableCost,
      });
    }
  });

  return { customers: issues.length === 0 ? customers : [], issues };
}
