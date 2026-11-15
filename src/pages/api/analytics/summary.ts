// src/pages/api/analytics/summary.ts — Summary Analytics API Endpoint
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../lib/adminAuth.js";
import { calculateAnalytics, ACTIVE_PIPELINE_STATUSES } from "../../../lib/analytics.js";

export const GET: APIRoute = async ({ locals, url, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const repIdParam = url.searchParams.get("repId");
    const singleDate = url.searchParams.get("date")?.trim() || "";
    const fromDate = url.searchParams.get("from")?.trim() || "";
    const toDate = url.searchParams.get("to")?.trim() || "";

    const isHodAdmin = !!(adminUser && adminUser.role === "HOD_ADMIN");

    let where: any = {};
    if (!isHodAdmin) {
      where.salesUserId = user!.userId;
    } else if (repIdParam && repIdParam !== "ALL") {
      where.salesUserId = Number(repIdParam);
    }

    const allProposals = await prisma.proposal.findMany({
      where,
      orderBy: { proposalDate: "desc" },
    });

    const filteredProposals = allProposals.filter((p) => {
      const pDateStr = new Date(p.proposalDate).toISOString().split("T")[0];
      if (singleDate && pDateStr !== singleDate) return false;
      if (fromDate && pDateStr < fromDate) return false;
      if (toDate && pDateStr > toDate) return false;
      return true;
    });

    const summary = calculateAnalytics(filteredProposals as any);

    const activeCount = filteredProposals.filter((p) =>
      ACTIVE_PIPELINE_STATUSES.includes((p.status || "").toUpperCase())
    ).length;
    const pipelineValue = summary.activePipelineBaseValue;

    return Response.json({
      success: true,
      summary: {
        ...summary,
        activeCount,
        pipelineValue: parseFloat(pipelineValue.toFixed(2)),
      },
    });
  } catch (err: any) {
    console.error("[analytics/summary GET]", err);
    return Response.json(
      { success: false, message: "Failed to calculate analytics summary." },
      { status: 500 }
    );
  }
};
