'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { CsvValidationIssue } from '@/lib/csv';
import type { Language } from '@/types/pricing';

const en = {
  productName: 'AI Monetisation Scenario Lab',
  productTagline: 'Internal pricing intelligence',
  dashboard: 'Dashboard',
  datasets: 'Datasets',
  scenarios: 'Scenarios',
  about: 'About',
  scenarioWorkspace: 'Scenario workspace',
  headline: 'Find the pricing model that captures more value.',
  intro:
    'Import customer economics, test deterministic pricing scenarios, and turn the results into a consultant-ready recommendation.',
  workflow: 'Analysis workflow',
  stepUpload: 'Upload data',
  stepReview: 'Review dataset',
  stepModel: 'Build scenarios',
  stepCompare: 'Compare results',
  stepSummary: 'Consultant summary',
  uploadTitle: '1. Upload customer data',
  uploadDescription:
    'Use the six-column CSV template or load the demonstration dataset.',
  chooseCsv: 'Choose CSV',
  loadSample: 'Load sample dataset',
  downloadTemplate: 'Download CSV template',
  acceptedColumns: 'Required columns',
  datasetReady: '{count} customers ready for analysis',
  replaceDataset: 'Replace dataset',
  uploadErrors: 'Please fix the following CSV issues',
  reviewTitle: '2. Review dataset',
  reviewDescription: 'Sort the imported customer economics before modelling.',
  customerName: 'Customer name',
  customerSegment: 'Customer segment',
  monthlyUsage: 'Monthly usage',
  currentPrice: 'Current price',
  willingnessToPay: 'Willingness to pay',
  variableCost: 'Variable cost',
  noCustomers: 'No customers imported yet.',
  createTitle: '3. Create pricing scenarios',
  createDescription:
    'Edit the assumptions below. Results recalculate without AI.',
  scenarioName: 'Scenario name',
  pricingModel: 'Pricing model',
  subscription: 'Subscription pricing',
  usage: 'Usage-based pricing',
  hybrid: 'Hybrid pricing',
  fixedMonthlyPrice: 'Fixed monthly price',
  pricePerUnit: 'Price per usage unit',
  baseMonthlyFee: 'Base monthly fee',
  addScenario: 'Add scenario',
  removeScenario: 'Remove',
  runComparison: 'Run comparison',
  runningComparison: 'Saving analysis…',
  scenarioLimit: 'Up to 12 scenarios per analysis',
  currentBaseline: 'Current pricing baseline',
  compareTitle: '4. Compare financial outcomes',
  compareDescription:
    'Scenario results use the same customers, costs, and deterministic formulas.',
  monthlyRevenue: 'Monthly revenue',
  totalVariableCost: 'Total variable cost',
  grossProfit: 'Gross profit',
  grossMargin: 'Gross margin',
  arpu: 'ARPU',
  revenueUplift: 'Revenue uplift',
  profitUplift: 'Profit uplift',
  versusCurrent: 'vs current pricing',
  scenarioComparison: 'Scenario comparison',
  revenue: 'Revenue',
  profit: 'Gross profit',
  segmentAnalysis: 'Customer segment analysis',
  segmentDescription:
    'Compare economics and value capture within each customer group.',
  customers: 'Customers',
  avgRevenue: 'Average revenue / customer',
  avgWtp: 'Average willingness to pay',
  avgValueCapture: 'Average value capture ratio',
  valueCaptureTitle: 'Value capture analysis',
  valueCaptureDescription:
    'Configurable indicators to focus investigation—not absolute business truths.',
  underThreshold: 'Under-monetised below',
  overThreshold: 'Over-pricing risk above',
  potentiallyUnder: 'Potentially under-monetised',
  reasonableCapture: 'Reasonable value capture',
  potentialOver: 'Potential over-pricing risk',
  unavailable: 'Unavailable',
  accounts: 'accounts',
  analysisIndicator: 'Analytical indicator',
  selectScenario: 'Scenario to inspect',
  summaryTitle: '5. AI Consultant Summary',
  summaryDescription:
    'AI interprets calculated results only. It never performs the financial calculations.',
  generateSummary: 'Generate Consultant Summary',
  generatingSummary: 'Generating summary…',
  summaryFallback: 'Deterministic fallback',
  summaryAi: 'AI-assisted interpretation',
  summaryEmpty: 'Generate a concise recommendation from the scenario results.',
  illustrativeCaveat:
    'Illustrative analysis: validate assumptions with customer research before making pricing decisions.',
  saved: 'Analysis saved',
  saveFailed: 'Analysis calculated, but could not be saved in this environment.',
  scenarioRequired: 'Add at least one pricing scenario.',
  datasetRequired: 'Upload customer data first.',
  invalidScenario: 'Scenario values must be valid non-negative numbers.',
  csvEmpty: 'The CSV contains no customer rows.',
  csvMalformed: 'The CSV is malformed{row}. {detail}',
  csvMissingColumns: 'Missing required columns: {detail}.',
  csvMissingCustomerName: 'Row {row}: customer_name is required.',
  csvMissingSegment: 'Row {row}: segment is required.',
  csvInvalidNumber: 'Row {row}: {field} must be a valid number.',
  csvNegativeNumber: 'Row {row}: {field} cannot be negative.',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  formulaNote: 'All metrics are calculated in TypeScript before any AI call.',
  strongest: 'Highest gross profit',
  dataRows: 'customer rows',
  switchEnglish: 'Switch to English',
  switchChinese: '切换到中文',
  model: 'Model',
  status: 'Status',
  ratio: 'Ratio',
  calculatedPrice: 'Calculated price',
  aboutTitle: 'Built for explainable pricing decisions',
  aboutBody:
    'Deterministic formulas, transparent assumptions, typed APIs, and bilingual interpretation make this a practical internal consulting tool.',
  deterministicBadge: 'Deterministic engine',
  rowsShown: 'Showing {shown} of {total} customers',
} as const;

export type TranslationKey = keyof typeof en;

const zh: Record<TranslationKey, string> = {
  productName: 'AI 商业化定价方案实验室',
  productTagline: '内部定价决策工具',
  dashboard: '仪表板',
  datasets: '数据集',
  scenarios: '定价方案',
  about: '关于',
  scenarioWorkspace: '方案分析工作区',
  headline: '找到能够获取更多价值的定价模式。',
  intro: '导入客户经济数据，测试确定性定价方案，并生成可用于咨询决策的建议。',
  workflow: '分析流程',
  stepUpload: '上传数据',
  stepReview: '检查数据集',
  stepModel: '建立方案',
  stepCompare: '比较结果',
  stepSummary: '顾问分析摘要',
  uploadTitle: '1. 上传客户数据',
  uploadDescription: '使用六列 CSV 模板，或加载演示数据集。',
  chooseCsv: '选择 CSV 文件',
  loadSample: '加载示例数据集',
  downloadTemplate: '下载 CSV 模板',
  acceptedColumns: '必需列',
  datasetReady: '已有 {count} 个客户可供分析',
  replaceDataset: '替换数据集',
  uploadErrors: '请修正以下 CSV 问题',
  reviewTitle: '2. 检查数据集',
  reviewDescription: '在建立模型前，对导入的客户经济数据进行排序和检查。',
  customerName: '客户名称',
  customerSegment: '客户细分',
  monthlyUsage: '月度使用量',
  currentPrice: '当前定价',
  willingnessToPay: '支付意愿',
  variableCost: '可变成本',
  noCustomers: '尚未导入客户。',
  createTitle: '3. 创建定价方案',
  createDescription: '编辑以下假设，系统将在不使用 AI 的情况下重新计算结果。',
  scenarioName: '方案名称',
  pricingModel: '定价模式',
  subscription: '订阅制收费',
  usage: '按使用量收费',
  hybrid: '混合定价',
  fixedMonthlyPrice: '固定月费',
  pricePerUnit: '每使用单位价格',
  baseMonthlyFee: '基础月费',
  addScenario: '添加方案',
  removeScenario: '删除',
  runComparison: '运行方案比较',
  runningComparison: '正在保存分析…',
  scenarioLimit: '每次分析最多可添加 12 个方案',
  currentBaseline: '当前定价基准',
  compareTitle: '4. 比较财务结果',
  compareDescription: '所有方案使用相同客户、成本和确定性公式。',
  monthlyRevenue: '月度收入',
  totalVariableCost: '可变成本总额',
  grossProfit: '毛利润',
  grossMargin: '毛利率',
  arpu: '每用户平均收入',
  revenueUplift: '收入提升',
  profitUplift: '利润提升',
  versusCurrent: '相较当前定价',
  scenarioComparison: '方案比较',
  revenue: '收入',
  profit: '毛利润',
  segmentAnalysis: '客户细分分析',
  segmentDescription: '比较各客户群体的经济结果与价值获取情况。',
  customers: '客户数',
  avgRevenue: '每客户平均收入',
  avgWtp: '平均支付意愿',
  avgValueCapture: '平均价值获取率',
  valueCaptureTitle: '价值获取分析',
  valueCaptureDescription: '可配置的调查指标，而非绝对的商业结论。',
  underThreshold: '潜在商业化不足阈值',
  overThreshold: '潜在定价过高阈值',
  potentiallyUnder: '潜在商业化不足',
  reasonableCapture: '价值获取合理',
  potentialOver: '潜在定价过高风险',
  unavailable: '不可用',
  accounts: '个客户',
  analysisIndicator: '分析指标',
  selectScenario: '选择要检查的方案',
  summaryTitle: '5. AI 顾问分析摘要',
  summaryDescription: 'AI 仅解读已计算的结果，绝不执行财务计算。',
  generateSummary: '生成顾问分析摘要',
  generatingSummary: '正在生成摘要…',
  summaryFallback: '确定性备用摘要',
  summaryAi: 'AI 辅助解读',
  summaryEmpty: '根据方案结果生成简明建议。',
  illustrativeCaveat: '示例分析：在作出定价决策前，请通过客户研究验证假设。',
  saved: '分析已保存',
  saveFailed: '分析已计算，但无法在当前环境中保存。',
  scenarioRequired: '请至少添加一个定价方案。',
  datasetRequired: '请先上传客户数据。',
  invalidScenario: '方案参数必须是有效的非负数。',
  csvEmpty: 'CSV 中没有客户数据行。',
  csvMalformed: 'CSV 格式错误{row}。{detail}',
  csvMissingColumns: '缺少必需列：{detail}。',
  csvMissingCustomerName: '第 {row} 行：customer_name 为必填项。',
  csvMissingSegment: '第 {row} 行：segment 为必填项。',
  csvInvalidNumber: '第 {row} 行：{field} 必须是有效数字。',
  csvNegativeNumber: '第 {row} 行：{field} 不能为负数。',
  sortAscending: '升序排列',
  sortDescending: '降序排列',
  formulaNote: '所有指标均在调用 AI 之前由 TypeScript 完成计算。',
  strongest: '毛利润最高',
  dataRows: '条客户数据',
  switchEnglish: 'Switch to English',
  switchChinese: '切换到中文',
  model: '模式',
  status: '状态',
  ratio: '比率',
  calculatedPrice: '计算后价格',
  aboutTitle: '为可解释的定价决策而构建',
  aboutBody: '确定性公式、透明假设、类型安全 API 与双语解读，共同构成实用的内部咨询工具。',
  deterministicBadge: '确定性计算引擎',
  rowsShown: '显示 {total} 个客户中的 {shown} 个',
};

const dictionaries = { en, zh };

function interpolate(
  template: string,
  replacements?: Record<string, string | number>,
): string {
  if (!replacements) return template;
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (
    key: TranslationKey,
    replacements?: Record<string, string | number>,
  ) => string;
  csvIssueMessage: (issue: CsvValidationIssue) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem('scenario-lab-language');
    if (saved === 'en' || saved === 'zh') {
      queueMicrotask(() => setLanguageState(saved));
    }
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem('scenario-lab-language', nextLanguage);
    document.documentElement.lang = nextLanguage === 'zh' ? 'zh-CN' : 'en';
  }, []);

  const t = useCallback(
    (
      key: TranslationKey,
      replacements?: Record<string, string | number>,
    ) => interpolate(dictionaries[language][key], replacements),
    [language],
  );

  const csvIssueMessage = useCallback(
    (issue: CsvValidationIssue) => {
      const replacements = {
        row: issue.row ?? '',
        field: issue.field ?? '',
        detail: issue.detail ?? '',
      };
      const keyByCode: Record<CsvValidationIssue['code'], TranslationKey> = {
        emptyCsv: 'csvEmpty',
        malformedCsv: 'csvMalformed',
        missingColumns: 'csvMissingColumns',
        missingCustomerName: 'csvMissingCustomerName',
        missingSegment: 'csvMissingSegment',
        invalidNumber: 'csvInvalidNumber',
        negativeNumber: 'csvNegativeNumber',
      };
      return t(keyByCode[issue.code], {
        ...replacements,
        row: issue.row ? ` (row ${issue.row})` : '',
      });
    },
    [t],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, csvIssueMessage }),
    [csvIssueMessage, language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider.');
  return context;
}
