// src/pages/api/admin/analytics.ts — Executive HOD Analytics API with Rep Drill-Down & Margin Aggregation
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

  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json({ success: false, message: "Unauthorized. HOD admin access required." }, { status: 403 });
  }

  try {
    const repIdParam = url.searchParams.get("repId") || "ALL";
    const singleDate = url.searchParams.get("date")?.trim() || "";
    const fromDate = url.searchParams.get("from")?.trim() || "";
    const toDate = url.searchParams.get("to")?.trim() || "";

    // 1. Fetch all sales representatives
    const salesUsers = await prisma.salesUser.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        mobileNumber: true,
      },
      orderBy: { fullName: "asc" },
    });

    // 2. Fetch all proposals with salesUser relations
    const allProposals = await prisma.proposal.findMany({
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

    // 3. Apply date filter
    const dateFilteredProposals = allProposals.filter((p) => {
      const pDateStr = new Date(p.proposalDate).toISOString().split("T")[0];
      if (singleDate && pDateStr !== singleDate) return false;
      if (fromDate && pDateStr < fromDate) return false;
      if (toDate && pDateStr > toDate) return false;
      return true;
    });

    // 4. Department-wide vs. Rep-scoped calculation
    const repFilteredProposals =
      repIdParam !== "ALL"
        ? dateFilteredProposals.filter((p) => String(p.salesUserId) === String(repIdParam))
        : dateFilteredProposals;

    const scopedAnalytics = calculateAnalytics(repFilteredProposals as any);
    const conversionRatio = computeConversionRatio(repFilteredProposals);
    const trendData = buildPipelineTrendData(repFilteredProposals, "monthly", {
      singleDate,
      fromDate,
      toDate,
    });

    const activeCount = conversionRatio.inPipelineCount;
    const pipelineValue = scopedAnalytics.activePipelineBaseValue;

    const lostCount = conversionRatio.lostCount;
    const lostValue = repFilteredProposals
      .filter((p) => ["REJECTED", "EXPIRED"].includes(p.status))
      .reduce((sum, p) => sum + (Number(p.baseAmount) || (Number(p.employeeCount) || 0) * 400.00), 0);

    // 5. Team Performance Comparison Data (Won Base Revenue vs. Realized Gross Profit per rep)
    const teamComparison = salesUsers.map((rep) => {
      const repProps = dateFilteredProposals.filter((p) => String(p.salesUserId) === String(rep.id));
      const repResult = calculateAnalytics(repProps as any);

      return {
        repId: rep.id,
        name: (rep.fullName || "Rep").split(" ")[0],
        fullName: rep.fullName || "Representative",
        email: rep.email,
        wonBaseRevenue: repResult.wonBaseRevenue,
        monthlyBaseRevenue: repResult.monthlyBaseRevenue,
        wonRevenue: repResult.wonRevenue,
        grossProfit: repResult.monthlyGrossProfit,
        monthlyGrossProfit: repResult.monthlyGrossProfit,
        annualGrossProfit: repResult.annualGrossProfit,
        grossMargin: repResult.grossMargin,
        grossMarginPct: repResult.grossMarginPct,
        wonCount: repResult.wonCount,
        totalCount: repProps.length,
        winRate: repResult.winRate,
      };
    });

    return Response.json({
      success: true,
      selectedRepId: repIdParam,
      stats: {
        ...scopedAnalytics,
        activeCount,
        pipelineValue: parseFloat(pipelineValue.toFixed(2)),
        lostCount,
        lostValue: parseFloat(lostValue.toFixed(2)),
        winRate: conversionRatio.winRate,
        winRatePct: conversionRatio.winRatePct,
      },
      conversionRatio,
      trendData,
      teamComparison,
      reps: salesUsers.map((r) => ({
        repId: r.id,
        repName: r.fullName,
        email: r.email,
        phone: r.mobileNumber || "",
      })),
    });
  } catch (err: any) {
    console.error("[admin/analytics GET]", err);
    return Response.json(
      { success: false, message: "Failed to generate HOD analytics." },
      { status: 500 }
    );
  }
};
