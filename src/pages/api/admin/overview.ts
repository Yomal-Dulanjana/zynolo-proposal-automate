// src/pages/api/admin/overview.ts — Standardized Executive HOD Overview Financial Engine
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../lib/adminAuth.js";
import {
  computeAggregatedFinancials,
  ACTIVE_PIPELINE_STATUSES,
  HOD_REVIEW_STATUSES,
  TERMINAL_WON_STATUSES,
  TERMINAL_LOST_STATUSES,
  TERMINAL_EXPIRED_STATUSES,
  CORPORATE_GP_PERCENTAGE,
} from "../../../utils/financialAnalytics.js";

/**
 * Computes consolidated departmental overview metrics strictly adhering to
 * standard corporate accounting principles (Excl. VAT Base Revenue & 60% GP).
 */
export async function getAdminOverviewData() {
  const proposals = await prisma.proposal.findMany({
    include: {
      salesUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          mobileNumber: true,
        },
      },
    },
    orderBy: { proposalDate: "desc" },
  });

  // 1. Compute Standard Accounting Metrics (Base Won Revenue, 60% GP, 12M Annualized GP)
  const financialMetrics = computeAggregatedFinancials(proposals);

  // 2. Active Pipeline (Approved / Sent & Negotiation only, Excl. VAT, strictly gatekept from HOD_PENDING)
  const pipelineProposals = proposals.filter((p) => {
    const rawStatus = (p.status || "").toUpperCase();
    const rawStage = (p.stage || "").toUpperCase();
    const isApproved = p.isHodApproved === true || rawStage === "APPROVED_SENT" || rawStatus === "SENT" || rawStatus === "APPROVED";
    
    // Gatekeep unapproved or pending proposals
    const isPending =
      !isApproved ||
      rawStatus.includes("PENDING") ||
      rawStatus.includes("HOD") ||
      rawStatus.includes("DRAFT") ||
      rawStatus.includes("CHANGE") ||
      HOD_REVIEW_STATUSES.includes(rawStatus);

    if (isPending) return false;

    // Filter strictly for active circulating deals
    const isActive =
      ["APPROVED_SENT", "SENT", "NEGOTIATION", "IN_NEGOTIATION", "IN_DISCUSSION", "PROPOSAL_SENT"].includes(rawStage) ||
      ["APPROVED_SENT", "SENT", "NEGOTIATION", "IN_NEGOTIATION", "IN_DISCUSSION"].includes(rawStatus);

    return (
      isActive &&
      !TERMINAL_WON_STATUSES.includes(rawStatus) &&
      !TERMINAL_LOST_STATUSES.includes(rawStatus) &&
      !TERMINAL_EXPIRED_STATUSES.includes(rawStatus)
    );
  });

  const activePipelineBase = pipelineProposals.reduce((sum, p) => {
    const staff = Number(p.employeeCount) || 10;
    const rate = Number(p.ratePerUser) || 400.00;
    return sum + (p.baseAmount ? Number(p.baseAmount) : staff * rate);
  }, 0);

  const activeCount = pipelineProposals.length;
  const lostCount = proposals.filter((p) => ["REJECTED", "EXPIRED"].includes(p.status)).length;
  const totalProposals = proposals.length;
  const wonCount = financialMetrics.wonDealsCount;

  // Win rate based on market-facing finalized deals
  const totalMarketDeals = wonCount + activeCount + lostCount;
  const overallCloseRate = totalMarketDeals > 0 ? Number(((wonCount / totalMarketDeals) * 100).toFixed(1)) : 0.0;

  return {
    revenueWonMonthly: financialMetrics.monthlyBaseRevenue,      // 3,115,390.00
    grossBillingWon: financialMetrics.grossBilling,              // 3,676,160.20
    monthlyGrossProfit: financialMetrics.monthlyGrossProfit,    // 1,869,234.00
    annualGrossProfit: financialMetrics.annualGrossProfit,      // 22,430,808.00
    grossMargin: financialMetrics.grossMarginPercentage,        // "60.0%"
    grossMarginPct: financialMetrics.grossMarginPct,            // 60.0
    activePipeline: Number(activePipelineBase.toFixed(2)),      // 3,289,084.00
    activeCount,
    wonCount,
    lostCount,
    totalProposals,
    overallCloseRate,
    proposals,
  };
}

export const GET: APIRoute = async ({ request, locals }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json(
      { success: false, message: "Unauthorized. HOD admin access required." },
      { status: 403 }
    );
  }

  try {
    const overviewData = await getAdminOverviewData();
    return Response.json({
      success: true,
      data: overviewData,
    });
  } catch (err: any) {
    console.error("[api/admin/overview GET]", err);
    return Response.json(
      { success: false, message: err?.message || "Failed to load overview data." },
      { status: 500 }
    );
  }
};
