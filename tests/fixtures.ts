import type { Customer } from '@/types/pricing';

export const fixtureCustomers: Customer[] = [
  {
    customerName: 'Alpha Co',
    segment: 'Small',
    monthlyUsage: 100,
    currentPrice: 30,
    willingnessToPay: 45,
    variableCost: 8,
  },
  {
    customerName: 'Beta Co',
    segment: 'Mid',
    monthlyUsage: 500,
    currentPrice: 30,
    willingnessToPay: 90,
    variableCost: 20,
  },
];
