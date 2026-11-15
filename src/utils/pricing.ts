// src/utils/pricing.ts — Centralized Commercial Pricing & VAT Utility

export const BASE_RATE_PER_EMPLOYEE = 400.00;
export const VAT_PERCENTAGE = 0.18; // 18% Sri Lankan VAT
export const COGS_PER_EMPLOYEE = 80.00; // Internal delivery & support cost

export interface PricingBreakdown {
  employeeCount: number;
  ratePerHead: number;
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  estimatedCogs: number;
  grossProfit: number;
  grossMarginPercentage: number;
}

export function calculateProposalPricing(
  employeeCount: number,
  customRatePerUser?: number
): PricingBreakdown {
  const count = Math.max(1, Math.round(Number(employeeCount) || 1));
  const ratePerHead =
    customRatePerUser !== undefined && !isNaN(Number(customRatePerUser))
      ? Math.max(0, Number(customRatePerUser))
      : BASE_RATE_PER_EMPLOYEE;
  const baseAmount = Number((count * ratePerHead).toFixed(2));
  const vatAmount = Number((baseAmount * VAT_PERCENTAGE).toFixed(2));
  const totalAmount = Number((baseAmount + vatAmount).toFixed(2));

  const estimatedCogs = count * COGS_PER_EMPLOYEE;
  // Standard Accounting: Gross Profit = Base Subscription (Excl. VAT) - Estimated COGS
  const grossProfit = Math.max(0, baseAmount - estimatedCogs);
  const grossMarginPercentage =
    baseAmount > 0
      ? Number(((grossProfit / baseAmount) * 100).toFixed(1))
      : 0.0;

  return {
    employeeCount: count,
    ratePerHead,
    baseAmount,
    vatRate: 18,
    vatAmount,
    totalAmount,
    estimatedCogs,
    grossProfit,
    grossMarginPercentage,
  };
}

export function formatCurrencyLKR(amount: number | string): string {
  const num = Number(amount) || 0;
  return `LKR ${num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatAmountOnly(amount: number | string): string {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
