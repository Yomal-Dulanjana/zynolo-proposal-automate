// src/utils/financialAnalytics.ts — Standard 60% Gross Profit (GP) & Annualization Engine
// Fixed 60% Corporate Gross Margin applied to Net Base Monthly Subscription (Excl. VAT)

export const CORPORATE_GP_PERCENTAGE = 0.60; // Fixed 60% Gross Profit Margin

export const ACTIVE_PIPELINE_STATUSES = [
  "APPROVED_SENT",
  "SENT",
  "APPROVED",
  "NEGOTIATION",
  "IN_NEGOTIATION",
  "IN_DISCUSSION",
  "DISPATCHED",
  "PROPOSAL_SENT",
];

export const TERMINAL_WON_STATUSES = [
  "WON",
  "ACCEPTED",
  "ACCEPTED_WON",
  "CLOSED_WON",
];

export const TERMINAL_LOST_STATUSES = [
  "LOST",
  "REJECTED",
  "REJECTED_LOST",
  "CLOSED_LOST",
  "DROPPED_LOST",
];

export const TERMINAL_EXPIRED_STATUSES = [
  "EXPIRED",
];

export const HOD_REVIEW_STATUSES = [
  "HOD_PENDING",
  "CHANGED_PENDING",
  "CHANGES_REQUESTED",
  "REVIEW",
  "UNDER_REVIEW",
  "HOD_REVIEW",
  "DRAFT",
];

export interface DealFinancialBreakdown {
  employeeCount: number;
  ratePerUser: number;
  monthlyBaseRevenue: number;
  monthlyVatAmount: number;
  monthlyTotalInvestment: number;
  monthlyGrossProfit: number;
  annualGrossProfit: number;
  grossMarginPercentage: number;
}

/**
 * Standard Deal Financial Calculation Helper (Official Zynolo HRM Model)
 * - Monthly Base Subscription: Users * Quoted Rate
 * - Monthly Gross Profit (60%): Monthly Base * 0.60
 * - Annual Gross Profit (12M): Monthly GP * 12
 * - Total Monthly Investment: Monthly Base + 18% VAT
 */
export function computeDealFinancials(
  employeeCount: number,
  ratePerUser = 400.00
): DealFinancialBreakdown {
  const staff = Math.max(1, Math.round(Number(employeeCount) || 1));
  const rate = Math.max(0, Number(ratePerUser) || 400.00);

  const monthlyBaseRevenue = staff * rate;
  const monthlyVatAmount = Number((monthlyBaseRevenue * 0.18).toFixed(2));
  const monthlyTotalInvestment = Number((monthlyBaseRevenue + monthlyVatAmount).toFixed(2));

  // Official Zynolo GP Model: Base * 60%
  const monthlyGrossProfit = Number((monthlyBaseRevenue * CORPORATE_GP_PERCENTAGE).toFixed(2));
  const annualGrossProfit = Number((monthlyGrossProfit * 12).toFixed(2));

  return {
    employeeCount: staff,
    ratePerUser: rate,
    monthlyBaseRevenue,
    monthlyVatAmount,
    monthlyTotalInvestment,
    monthlyGrossProfit,
    annualGrossProfit,
    grossMarginPercentage: 60.0,
  };
}

export interface AggregatedFinancialsResult {
  wonDealsCount: number;
  totalProposalsCount: number;
  monthlyBaseRevenue: number;
  grossBilling: number;
  monthlyGrossProfit: number;
  annualGrossProfit: number;
  grossMarginPercentage: string;
  grossMarginPct: number;
}

/**
 * Aggregates financial totals for finalized (WON / ACCEPTED) deals.
 */
export function computeAggregatedFinancials(proposals: any[]): AggregatedFinancialsResult {
  const wonDeals = (proposals || []).filter((p) => {
    const rawStatus = (p.status || "").toUpperCase();
    const rawStage = (p.stage || "").toUpperCase();
    return (
      TERMINAL_WON_STATUSES.includes(rawStatus) ||
      TERMINAL_WON_STATUSES.includes(rawStage) ||
      rawStatus.includes("WON") ||
      rawStatus.includes("ACCEPT")
    );
  });

  let totalMonthlyBaseRevenue = 0;
  let totalMonthlyGrossProfit = 0;
  let totalAnnualGrossProfit = 0;
  let totalGrossBilling = 0;

  wonDeals.forEach((deal) => {
    const staff = Number(deal.employeeCount) || 10;
    const rate = Number(deal.ratePerUser) || 400.00;

    // Net base monthly subscription
    const dealBase = deal.baseAmount ? Number(deal.baseAmount) : staff * rate;
    const dealVat = deal.vatAmount ? Number(deal.vatAmount) : dealBase * 0.18;
    const dealTotal = deal.totalAmount ? Number(deal.totalAmount) : dealBase + dealVat;

    // 60% Corporate GP Rules
    const dealMonthlyGP = Number((dealBase * CORPORATE_GP_PERCENTAGE).toFixed(2));
    const dealAnnualGP = Number((dealMonthlyGP * 12).toFixed(2));

    totalMonthlyBaseRevenue += dealBase;
    totalMonthlyGrossProfit += dealMonthlyGP;
    totalAnnualGrossProfit += dealAnnualGP;
    totalGrossBilling += dealTotal;
  });

  return {
    wonDealsCount: wonDeals.length,
    totalProposalsCount: (proposals || []).length,
    monthlyBaseRevenue: Number(totalMonthlyBaseRevenue.toFixed(2)),
    grossBilling: Number(totalGrossBilling.toFixed(2)),
    monthlyGrossProfit: Number(totalMonthlyGrossProfit.toFixed(2)),
    annualGrossProfit: Number(totalAnnualGrossProfit.toFixed(2)),
    grossMarginPercentage: wonDeals.length > 0 ? "60.0%" : "0.0%",
    grossMarginPct: wonDeals.length > 0 ? 60.0 : 0.0,
  };
}

export interface FinancialMetricResult {
  baseWonRevenue: number;         // Net Revenue (Excl. VAT) = monthlyBaseRevenue
  monthlyBaseRevenue: number;     // Monthly Base Subscription
  grossBillingWon: number;        // Total Client Billing (With 18% VAT)
  grossBilling: number;           // Alias for grossBillingWon
  totalCogs: number;              // 40% Delivery & Direct Cost
  grossProfit: number;            // Monthly Gross Profit (60%)
  monthlyGrossProfit: number;     // Monthly Gross Profit (60%)
  annualGrossProfit: number;      // Annualized Gross Profit (12M)
  grossMarginPercentage: number;  // 60.0
  wonDealsCount: number;
  totalProposalsCount: number;
  winRatePercentage: number;
  activePipelineBaseValue: number;
}

/**
 * Standard Corporate Accounting Financial Computation Engine
 */
export function computeAccountingMetrics(proposals: any[]): FinancialMetricResult {
  const aggregated = computeAggregatedFinancials(proposals);

  // Active Pipeline Value (Excl. VAT, excluding gatekept HOD_PENDING/DRAFT/LOST/EXPIRED)
  const pipelineDeals = (proposals || []).filter((p) => {
    const rawStatus = (p.status || "").toUpperCase();
    const rawStage = (p.stage || "").toUpperCase();
    const isHodApproved = p.isHodApproved !== false;
    return (
      (ACTIVE_PIPELINE_STATUSES.includes(rawStatus) || ACTIVE_PIPELINE_STATUSES.includes(rawStage)) &&
      !HOD_REVIEW_STATUSES.includes(rawStatus) &&
      !TERMINAL_WON_STATUSES.includes(rawStatus) &&
      !TERMINAL_LOST_STATUSES.includes(rawStatus) &&
      isHodApproved
    );
  });

  const activePipelineBaseValue = pipelineDeals.reduce((sum, deal) => {
    const staff = Number(deal.employeeCount) || 0;
    const rate = Number(deal.ratePerUser) || 400.00;
    return sum + (deal.baseAmount ? Number(deal.baseAmount) : staff * rate);
  }, 0);

  const marketFacingDeals = (proposals || []).filter((p) => !isInternalOrUnapprovedProposal(p));
  const winRatePercentage =
    marketFacingDeals.length > 0
      ? Number(((aggregated.wonDealsCount / marketFacingDeals.length) * 100).toFixed(1))
      : 0.0;

  // Direct costs are 40% of Base Revenue (since Corporate GP is 60%)
  const totalCogs = Number((aggregated.monthlyBaseRevenue * 0.40).toFixed(2));

  return {
    baseWonRevenue: aggregated.monthlyBaseRevenue,
    monthlyBaseRevenue: aggregated.monthlyBaseRevenue,
    grossBillingWon: aggregated.grossBilling,
    grossBilling: aggregated.grossBilling,
    totalCogs,
    grossProfit: aggregated.monthlyGrossProfit,
    monthlyGrossProfit: aggregated.monthlyGrossProfit,
    annualGrossProfit: aggregated.annualGrossProfit,
    grossMarginPercentage: aggregated.grossMarginPct,
    wonDealsCount: aggregated.wonDealsCount,
    totalProposalsCount: aggregated.totalProposalsCount,
    winRatePercentage,
    activePipelineBaseValue: Number(activePipelineBaseValue.toFixed(2)),
  };
}

export function calculateDashboardMetrics(proposals: any[]) {
  let activePipelineValue = 0;
  let activePipelineCount = 0;
  let wonRevenue = 0;
  let wonCount = 0;
  let lostCount = 0;
  let hodReviewCount = 0;

  (proposals || []).forEach((p) => {
    const status = (p.status || "").toUpperCase();
    const stage = (p.stage || "").toUpperCase();
    const staff = Number(p.employeeCount || 0);
    const rate = Number(p.ratePerUser || 400.00);
    const baseVal = Number(p.baseAmount) || (staff * rate);

    if (
      TERMINAL_WON_STATUSES.includes(status) ||
      TERMINAL_WON_STATUSES.includes(stage) ||
      status.includes("WON") ||
      status.includes("ACCEPT")
    ) {
      wonRevenue += baseVal;
      wonCount++;
    } else if (
      TERMINAL_LOST_STATUSES.includes(status) ||
      TERMINAL_LOST_STATUSES.includes(stage) ||
      TERMINAL_EXPIRED_STATUSES.includes(status)
    ) {
      lostCount++;
    } else if (
      HOD_REVIEW_STATUSES.includes(status) ||
      p.isHodApproved === false
    ) {
      hodReviewCount++;
    } else if (ACTIVE_PIPELINE_STATUSES.includes(status) || ACTIVE_PIPELINE_STATUSES.includes(stage)) {
      activePipelineValue += baseVal;
      activePipelineCount++;
    }
  });

  const monthlyGrossProfit = Number((wonRevenue * CORPORATE_GP_PERCENTAGE).toFixed(2));
  const annualGrossProfit = Number((monthlyGrossProfit * 12).toFixed(2));

  return {
    activePipelineValue: Number(activePipelineValue.toFixed(2)),
    activePipelineCount,
    wonRevenue: Number(wonRevenue.toFixed(2)),
    monthlyBaseRevenue: Number(wonRevenue.toFixed(2)),
    monthlyGrossProfit,
    annualGrossProfit,
    wonCount,
    lostCount,
    hodReviewCount,
  };
}

/**
 * Gatekeeps proposals from commercial market-facing visualizations:
 * Unapproved, HOD Pending, and Draft proposals are strictly excluded from charts.
 */
export function isInternalOrUnapprovedProposal(p: any): boolean {
  if (!p) return true;
  const status = (p.status || "").toString().trim().toUpperCase();
  const stage = (p.stage || "").toString().trim().toUpperCase();

  // If explicit approval flag is false
  if (p.isHodApproved === false) {
    const isTerminal =
      TERMINAL_WON_STATUSES.includes(status) ||
      TERMINAL_WON_STATUSES.includes(stage) ||
      TERMINAL_LOST_STATUSES.includes(status) ||
      TERMINAL_LOST_STATUSES.includes(stage) ||
      TERMINAL_EXPIRED_STATUSES.includes(status);

    if (!isTerminal) {
      return true;
    }
  }

  // Any status that represents pending executive review or draft
  if (
    HOD_REVIEW_STATUSES.includes(status) ||
    status === "HOD_PENDING" ||
    status === "CHANGED_PENDING" ||
    status === "CHANGES_REQUESTED" ||
    status === "DRAFT" ||
    status === "WAITING_APPROVAL" ||
    status.includes("PENDING") ||
    status.includes("HOD") ||
    status.includes("REVIEW")
  ) {
    return true;
  }

  return false;
}

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

export interface ConversionRatioResult {
  wonCount: number;
  inPipelineCount: number;
  lostCount: number;
  totalMarketDeals: number;
  winRate: string;
  winRatePct: number;
  donutSegments: DonutSegment[];
}

/**
 * Normalizes Donut / Pie chart data source for Pipeline Conversion Ratio.
 * Strictly excludes HOD Approval Pending / Draft records from all segments and the win rate.
 */
export function computeConversionRatio(proposals: any[]): ConversionRatioResult {
  let wonCount = 0;
  let inPipelineCount = 0;
  let lostCount = 0;

  (proposals || []).forEach((p) => {
    // Skip all HOD Pending records completely
    if (isInternalOrUnapprovedProposal(p)) return;

    const status = (p.status || "").toString().trim().toUpperCase();
    const stage = (p.stage || "").toString().trim().toUpperCase();

    if (
      TERMINAL_WON_STATUSES.includes(status) ||
      TERMINAL_WON_STATUSES.includes(stage) ||
      status.includes("WON") ||
      status.includes("ACCEPT")
    ) {
      wonCount++;
    } else if (
      TERMINAL_LOST_STATUSES.includes(status) ||
      TERMINAL_LOST_STATUSES.includes(stage) ||
      TERMINAL_EXPIRED_STATUSES.includes(status) ||
      status.includes("LOST") ||
      status.includes("REJECT") ||
      status.includes("EXPIRED")
    ) {
      lostCount++;
    } else {
      // Approved and dispatched or in active negotiation
      inPipelineCount++;
    }
  });

  const totalMarketDeals = wonCount + inPipelineCount + lostCount;
  const winRate =
    totalMarketDeals > 0
      ? ((wonCount / totalMarketDeals) * 100).toFixed(1)
      : "0.0";

  return {
    wonCount,
    inPipelineCount,
    lostCount,
    totalMarketDeals,
    winRate: `${winRate}%`,
    winRatePct: Number(winRate),
    donutSegments: [
      { name: "Won Deals", value: wonCount, color: "#10b981" },
      { name: "In Pipeline", value: inPipelineCount, color: "#3b82f6" },
      { name: "Lost / Expired", value: lostCount, color: "#ef4444" },
    ].filter((seg) => seg.value > 0),
  };
}

export interface PipelineTrendInterval {
  interval: string;
  month: string; // Backward-compatible alias for recharts <XAxis dataKey="month" />
  proposedVolume: number;
  proposed: number; // Backward-compatible alias
  proposedGross: number;
  wonRevenue: number;
  won: number; // Backward-compatible alias
  wonGross: number;
  lostVolume: number;
  lost: number; // Backward-compatible alias
  grossProfit: number;
  count: number;
}

/**
 * Builds pipeline trend time series data.
 * Gatekeeps unapproved proposals so the blue Proposed Volume line reflects only approved deals.
 */
export function buildPipelineTrendData(
  proposals: any[],
  granularity: "daily" | "monthly" | "yearly" = "monthly",
  options?: { singleDate?: string; fromDate?: string; toDate?: string }
): PipelineTrendInterval[] {
  // 1. Sanitize: Strictly eliminate unapproved/internal draft proposals from commercial trends
  const marketFacingProposals = (proposals || []).filter((p) => !isInternalOrUnapprovedProposal(p));

  const now = new Date();
  const intervalsMap = new Map<
    string,
    { label: string; proposedVolume: number; wonRevenue: number; lostVolume: number; count: number }
  >();

  const singleDate = options?.singleDate?.trim();
  const fromDate = options?.fromDate?.trim();
  const toDate = options?.toDate?.trim();

  if (granularity === "daily") {
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        intervalsMap.set(key, { label, proposedVolume: 0, wonRevenue: 0, lostVolume: 0, count: 0 });
      }
    } else {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        intervalsMap.set(key, { label, proposedVolume: 0, wonRevenue: 0, lostVolume: 0, count: 0 });
      }
    }
  } else if (granularity === "yearly") {
    const curYear = now.getFullYear();
    for (let y = curYear - 2; y <= curYear; y++) {
      const key = String(y);
      intervalsMap.set(key, { label: key, proposedVolume: 0, wonRevenue: 0, lostVolume: 0, count: 0 });
    }
  } else {
    // Default: Monthly (last 6 months)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      intervalsMap.set(key, { label, proposedVolume: 0, wonRevenue: 0, lostVolume: 0, count: 0 });
    }
  }

  // Populate intervals with market-facing proposals only
  marketFacingProposals.forEach((deal) => {
    const pDate = new Date(deal.proposalDate || deal.createdAt || deal.issuedDate || Date.now());
    let key = "";
    let fallbackLabel = "";

    if (granularity === "daily") {
      key = pDate.toISOString().split("T")[0];
      fallbackLabel = pDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (granularity === "yearly") {
      key = String(pDate.getFullYear());
      fallbackLabel = key;
    } else {
      key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
      fallbackLabel = pDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }

    let entry = intervalsMap.get(key);
    if (!entry) {
      if (singleDate || fromDate || toDate) {
        entry = { label: fallbackLabel, proposedVolume: 0, wonRevenue: 0, lostVolume: 0, count: 0 };
        intervalsMap.set(key, entry);
      } else {
        return;
      }
    }

    const staff = Number(deal.employeeCount) || 10;
    const rate = Number(deal.ratePerUser) || 400.00;
    const baseValue = deal.baseAmount ? Number(deal.baseAmount) : staff * rate;

    const status = (deal.status || "").toString().trim().toUpperCase();
    const stage = (deal.stage || "").toString().trim().toUpperCase();

    entry.count += 1;

    if (
      TERMINAL_WON_STATUSES.includes(status) ||
      TERMINAL_WON_STATUSES.includes(stage) ||
      status.includes("WON") ||
      status.includes("ACCEPT")
    ) {
      entry.wonRevenue += baseValue;
    } else if (
      TERMINAL_LOST_STATUSES.includes(status) ||
      TERMINAL_LOST_STATUSES.includes(stage) ||
      TERMINAL_EXPIRED_STATUSES.includes(status) ||
      status.includes("LOST") ||
      status.includes("REJECT") ||
      status.includes("EXPIRED")
    ) {
      entry.lostVolume += baseValue;
    } else {
      // Actively approved and dispatched / in negotiation
      entry.proposedVolume += baseValue;
    }
  });

  return Array.from(intervalsMap.entries()).map(([_, values]) => {
    const grossProfit = Math.round(values.wonRevenue * CORPORATE_GP_PERCENTAGE);
    const proposedGross = Number((values.proposedVolume * 1.18).toFixed(2));
    const wonGross = Number((values.wonRevenue * 1.18).toFixed(2));

    return {
      interval: values.label,
      month: values.label,
      proposedVolume: Number(values.proposedVolume.toFixed(2)),
      proposed: Number(values.proposedVolume.toFixed(2)),
      proposedGross,
      wonRevenue: Number(values.wonRevenue.toFixed(2)),
      won: Number(values.wonRevenue.toFixed(2)),
      wonGross,
      lostVolume: Number(values.lostVolume.toFixed(2)),
      lost: Number(values.lostVolume.toFixed(2)),
      grossProfit,
      count: values.count,
    };
  });
}
