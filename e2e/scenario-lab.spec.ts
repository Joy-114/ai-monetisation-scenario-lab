import path from 'node:path';
import { expect, test } from '@playwright/test';

test('uploads sample data, creates a scenario, compares results, and generates a summary', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('csv-input').setInputFiles(
    path.resolve('public/sample-customers.csv'),
  );
  await expect(page.getByText('24 customers ready for analysis')).toBeVisible();

  await page.getByRole('button', { name: 'Add scenario' }).click();
  await page.getByTestId('run-comparison').click();
  await expect(page.getByTestId('results-dashboard')).toBeVisible();

  const revenueKpi = page.locator('[data-testid^="monthly-revenue-"]');
  const valueBeforeLanguageChange = await revenueKpi.getAttribute(
    'data-financial-value',
  );
  expect(Number(valueBeforeLanguageChange)).toBeGreaterThan(0);

  await page.getByRole('button', { name: '切换到中文' }).click();
  await expect(page.getByRole('heading', { name: '找到能够获取更多价值的定价模式。' })).toBeVisible();
  await expect(revenueKpi).toHaveAttribute(
    'data-financial-value',
    valueBeforeLanguageChange ?? '',
  );

  await page.getByTestId('generate-summary').click();
  await expect(page.getByTestId('consultant-summary')).toBeVisible();
  await expect(page.getByText('确定性备用摘要')).toBeVisible();
});

test('shows a translated validation error for malformed CSV data', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '切换到中文' }).click();
  await page.getByTestId('csv-input').setInputFiles({
    name: 'malformed.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'customer_name,segment,monthly_usage,current_price,willingness_to_pay,variable_cost\n"Broken,Small,100,30,45,8',
    ),
  });
  await expect(page.getByText('请修正以下 CSV 问题')).toBeVisible();
});
