// src/pages/api/analytics/index.ts — Sales Insights & Analytics Aggregator with Date & Period Filtering
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../lib/adminAuth.js";
import {
  calculateAnalytics,
  ACTIVE_PIPELINE_STATUSES,
  buildPipelineTrendData,
  computeConversionRatio,
} from "../../../lib/analytics.js";

export const GET: APIRoute = async ({ locals, url, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const period = (url.searchParams.get("period") || "monthly").toLowerCase(); // "daily" | "monthly" | "yearly"
    const singleDate = url.searchParams.get("date")?.trim() || ""; // YYYY-MM-DD
    const fromDate = url.searchParams.get("from")?.trim() || ""; // YYYY-MM-DD
    const toDate = url.searchParams.get("to")?.trim() || ""; // YYYY-MM-DD

    const isHodAdmin = !!(adminUser && adminUser.role === "HOD_ADMIN");
    const where = isHodAdmin ? {} : { salesUserId: user!.userId };

    // Fetch all user proposals
    const allProposals = await prisma.proposal.findMany({
      where,
      orderBy: { proposalDate: "asc" },
    });

    // Filter proposals based on active date criteria
    const filteredProposals = allProposals.filter((p) => {
      const pDateStr = new Date(p.proposalDate).toISOString().split("T")[0];

      if (singleDate) {
        return pDateStr === singleDate;
      }
      if (fromDate && pDateStr < fromDate) {
        return false;
      }
      if (toDate && pDateStr > toDate) {
        return false;
      }
      return true;
    });

    // 1. Trend Chart Data Generation (Strictly gatekeeps unapproved HOD pending proposals)
    const trendPoints = buildPipelineTrendData(filteredProposals, period as any, {
      singleDate,
      fromDate,
      toDate,
    });

    // 2. Win-Rate / Conversion Breakdown (Strictly market-facing deals)
    const conversionRatio = computeConversionRatio(filteredProposals);
    const conversionDonut = conversionRatio.donutSegments;
    const activeCount = conversionRatio.inPipelineCount;
    const lostCount = conversionRatio.lostCount;
    const draftCount = filteredProposals.filter((p) => p.status === "DRAFT" || p.status === "HOD_PENDING").length;

    // Use standardized computation engine
    const financialAnalytics = calculateAnalytics(filteredProposals as any);
    const wonCount = financialAnalytics.wonCount;
    const totalCount = financialAnalytics.totalCount;
    const winRate = conversionRatio.winRate.replace("%", "");

    // 3. Values, Gross Profit & Averages (Standard Accounting: Excl. VAT)
    const wonTotalValue = financialAnalytics.baseWonRevenue;
    const wonBaseRevenue = financialAnalytics.baseWonRevenue;
    const grossBillingWon = financialAnalytics.grossBillingWon;
    const totalGrossProfitWon = financialAnalytics.grossProfit;
    const averageGrossMargin = financialAnalytics.grossMarginPct;
    const avgDealValue = wonCount > 0 ? Math.round(wonTotalValue / wonCount) : 0;

    const overallTotalValue = filteredProposals.reduce((sum, p) => sum + (Number(p.baseAmount) || (Number(p.employeeCount) || 0) * 400.00), 0);
    const pipelineValue = financialAnalytics.activePipelineBaseValue;

    // Deal Loss Breakdown Taxonomy
    const lossReasonMap: Record<string, { name: string; count: number; color: string }> = {
      COMPETITOR: { name: "Competitor System", count: 0, color: "#f43f5e" },
      BUDGET: { name: "Budget Frozen / Next FY", count: 0, color: "#f59e0b" },
      FEATURE_MISMATCH: { name: "Feature / Device Mismatch", count: 0, color: "#8b5cf6" },
      RESTRUCTURING: { name: "Client Restructuring", count: 0, color: "#06b6d4" },
      OTHER: { name: "Other / Unspecified", count: 0, color: "#64748b" },
    };

    filteredProposals
      .filter((p) => p.status === "REJECTED" || p.status === "EXPIRED" || !!p.lossReason)
      .forEach((p) => {
        const key = (p.lossReason || "OTHER").toUpperCase();
        if (lossReasonMap[key]) lossReasonMap[key].count += 1;
        else lossReasonMap.OTHER.count += 1;
      });

    const lossReasonBreakdown = Object.values(lossReasonMap).filter((item) => item.count > 0);

    // 4. Client Volume Distribution
    const volumeBuckets = {
      small: { name: "1 - 50 Employees", count: 0, totalValue: 0, color: "#6366f1" },
      medium: { name: "51 - 200 Employees", count: 0, totalValue: 0, color: "#8b5cf6" },
      enterprise: { name: "200+ Employees", count: 0, totalValue: 0, color: "#ec4899" },
    };

    filteredProposals.forEach((p) => {
      const count = p.employeeCount || 0;
      const val = Number(p.totalAmount);
      if (count <= 50) {
        volumeBuckets.small.count += 1;
        volumeBuckets.small.totalValue += val;
      } else if (count <= 200) {
        volumeBuckets.medium.count += 1;
        volumeBuckets.medium.totalValue += val;
      } else {
        volumeBuckets.enterprise.count += 1;
        volumeBuckets.enterprise.totalValue += val;
      }
    });

    return Response.json({
      success: true,
      stats: {
        totalProposals: totalCount,
        pipelineValue,
        wonTotalValue,
        wonBaseRevenue,
        grossBillingWon,
        overallTotalValue,
        avgDealValue,
        winRate,
        wonCount,
        activeCount,
        lostCount,
        draftCount,
        totalGrossProfitWon: financialAnalytics.monthlyGrossProfit,
        monthlyGrossProfit: financialAnalytics.monthlyGrossProfit,
        annualGrossProfit: financialAnalytics.annualGrossProfit,
        monthlyBaseRevenue: financialAnalytics.monthlyBaseRevenue,
        averageGrossMargin: financialAnalytics.grossMarginPct,
        grossMarginPercentage: "60.0%",
      },
      monthlyTrend: trendPoints,
      conversionDonut,
      conversionRatio,
      lossReasonBreakdown,
      volumeDistribution: Object.values(volumeBuckets),
    });
  } catch (err: any) {
    console.error("[analytics GET]", err);
    return Response.json({ success: false, message: "Failed to load sales analytics." }, { status: 500 });
  }
};
