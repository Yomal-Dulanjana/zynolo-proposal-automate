// src/lib/analytics.ts — Standardized Financial Analytics & Gross Profit (GP) Calculation Engine
import {
  computeAccountingMetrics,
  calculateDashboardMetrics,
  isInternalOrUnapprovedProposal,
  computeConversionRatio,
  buildPipelineTrendData,
  ACTIVE_PIPELINE_STATUSES,
  TERMINAL_WON_STATUSES,
  TERMINAL_LOST_STATUSES,
  TERMINAL_EXPIRED_STATUSES,
  HOD_REVIEW_STATUSES,
  type FinancialMetricResult,
  type ConversionRatioResult,
  type PipelineTrendInterval,
} from "../utils/financialAnalytics.js";

export {
  computeAccountingMetrics,
  calculateDashboardMetrics,
  isInternalOrUnapprovedProposal,
  computeConversionRatio,
  buildPipelineTrendData,
  ACTIVE_PIPELINE_STATUSES,
  TERMINAL_WON_STATUSES,
  TERMINAL_LOST_STATUSES,
  TERMINAL_EXPIRED_STATUSES,
  HOD_REVIEW_STATUSES,
  type FinancialMetricResult,
  type ConversionRatioResult,
  type PipelineTrendInterval,
};

export interface ProposalFinancialRecord {
  id?: number | string;
  proposalId?: string;
  status: string;
  totalAmount: number | string | any;
  baseAmount?: number | string | any;
  employeeCount?: number | null;
  cogsEstimated?: number | string | any | null;
  cogsRateWithVat?: number | string | any | null;
  cogsRate?: number | string | any | null;
  totalCogsAmount?: number | string | any | null;
  salesUserId?: number | string;
}

export interface AnalyticsCalculationResult {
  wonRevenue: number;         // Commercial Net Revenue (Excl. VAT) = monthlyBaseRevenue
  revenueWon: number;         // Alias for wonRevenue
  monthlyBaseRevenue: number; // Monthly Base Subscription (Excl. VAT)
  baseWonRevenue: number;     // Net Base Won Revenue (Excl. VAT)
  grossBillingWon: number;    // Total Client Billing (With 18% VAT)
  grossBilling: number;       // Alias for grossBillingWon
  wonBaseRevenue: number;     // Alias for baseWonRevenue
  totalCogs: number;          // 40% Delivery & Direct Cost
  totalStaffInWon: number;    // Cumulative employees across won deals
  grossProfit: number;        // Monthly Gross Profit (60% Corporate GP)
  monthlyGrossProfit: number; // Monthly Gross Profit (60% Corporate GP)
  annualGrossProfit: number;  // Annual Gross Profit (12M = Monthly GP * 12)
  grossMargin: string;        // Gross Margin percentage e.g. "60.0%"
  grossMarginPct: number;     // Gross Margin percentage e.g. 60.0
  wonCount: number;           // Count of closed won deals
  wonDealsCount: number;      // Alias for wonCount
  totalCount: number;         // Total proposals in scope
  totalProposalsCount: number;// Alias for totalCount
  winRate: string;            // Win rate formatted e.g. "50.0%"
  winRatePct: number;         // Win rate as number e.g. 50.0
  activePipelineBaseValue: number; // Active pipeline excl. VAT
  conversionRatio?: ConversionRatioResult;
}

/**
 * Standard Corporate Accounting Financial Computation Engine (60% GP Engine)
 */
export function calculateAnalytics(
  proposals: ProposalFinancialRecord[],
  defaultCogsRate = 80.0
): AnalyticsCalculationResult {
  const metrics = computeAccountingMetrics(proposals);
  const conversionRatio = computeConversionRatio(proposals);

  const wonDeals = proposals.filter((p) =>
    ["WON", "ACCEPTED", "ACCEPTED_WON", "CLOSED_WON"].includes(((p as any).status || (p as any).stage || "").toUpperCase())
  );
  const totalStaffInWon = wonDeals.reduce(
    (sum, p) => sum + (Number(p.employeeCount) || 0),
    0
  );

  return {
    wonRevenue: metrics.monthlyBaseRevenue,
    revenueWon: metrics.monthlyBaseRevenue,
    monthlyBaseRevenue: metrics.monthlyBaseRevenue,
    baseWonRevenue: metrics.monthlyBaseRevenue,
    grossBillingWon: metrics.grossBillingWon,
    grossBilling: metrics.grossBillingWon,
    wonBaseRevenue: metrics.monthlyBaseRevenue,
    totalCogs: metrics.totalCogs,
    totalStaffInWon,
    grossProfit: metrics.monthlyGrossProfit,
    monthlyGrossProfit: metrics.monthlyGrossProfit,
    annualGrossProfit: metrics.annualGrossProfit,
    grossMargin: `${metrics.grossMarginPercentage.toFixed(1)}%`,
    grossMarginPct: metrics.grossMarginPercentage,
    wonCount: metrics.wonDealsCount,
    wonDealsCount: metrics.wonDealsCount,
    totalCount: metrics.totalProposalsCount,
    totalProposalsCount: metrics.totalProposalsCount,
    winRate: conversionRatio.winRate,
    winRatePct: conversionRatio.winRatePct,
    activePipelineBaseValue: metrics.activePipelineBaseValue,
    conversionRatio,
  };
}
