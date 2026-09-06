import type { Language } from '@/types/pricing';

function locale(language: Language): string {
  return language === 'zh' ? 'zh-CN' : 'en-AU';
}

export function formatMoney(value: number, language: Language): string {
  return new Intl.NumberFormat(locale(language), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
  }).format(value);
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(locale(language), {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(
  value: number | null,
  language: Language,
): string {
  if (value === null) return '—';
  return new Intl.NumberFormat(locale(language), {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(value);
}

export function formatRatio(
  value: number | null,
  language: Language,
): string {
  if (value === null) return '—';
  return formatNumber(value, language);
}
