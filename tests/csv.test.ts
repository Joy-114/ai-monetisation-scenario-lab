import { describe, expect, it } from 'vitest';
import { parseCustomerCsv } from '@/lib/csv';

const validHeader =
  'customer_name,segment,monthly_usage,current_price,willingness_to_pay,variable_cost';

describe('CSV validation', () => {
  it('parses a valid customer row', () => {
    const result = parseCustomerCsv(`${validHeader}\nAlpha Co,Small,100,30,45,8`);
    expect(result.issues).toEqual([]);
    expect(result.customers[0].monthlyUsage).toBe(100);
  });

  it('reports missing required columns', () => {
    const result = parseCustomerCsv('customer_name,segment\nAlpha Co,Small');
    expect(result.issues[0].code).toBe('missingColumns');
  });

  it('reports an empty CSV', () => {
    expect(parseCustomerCsv('  ').issues[0].code).toBe('emptyCsv');
    expect(parseCustomerCsv(`${validHeader}\n`).issues[0].code).toBe('emptyCsv');
  });

  it('reports missing names, missing segments and invalid numbers', () => {
    const result = parseCustomerCsv(
      `${validHeader}\n,,not-a-number,30,45,8`,
    );
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'missingCustomerName',
        'missingSegment',
        'invalidNumber',
      ]),
    );
  });

  it('reports negative values', () => {
    const result = parseCustomerCsv(
      `${validHeader}\nAlpha Co,Small,-1,30,45,8`,
    );
    expect(result.issues[0].code).toBe('negativeNumber');
  });

  it('reports malformed quoted data', () => {
    const result = parseCustomerCsv(
      `${validHeader}\n"Alpha Co,Small,100,30,45,8`,
    );
    expect(result.issues[0].code).toBe('malformedCsv');
  });
});
