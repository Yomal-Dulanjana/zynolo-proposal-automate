// src/pages/api/dashboard/counters.ts — Real-time sidebar navigation counter badges
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";
import { ACTIVE_PIPELINE_STATUSES } from "../../../utils/financialAnalytics.js";

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const proposals = await prisma.proposal.findMany({
      where: { salesUserId: locals.user.userId },
      select: { status: true, expiryDate: true },
    });

    const clientsCount = await prisma.clientProfile.count({
      where: { salesUserId: locals.user.userId },
    });

    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const allProposalsCount = proposals.length;
    const activePipelineCount = proposals.filter((p) =>
      ACTIVE_PIPELINE_STATUSES.includes((p.status || "").toUpperCase())
    ).length;

    const expiringSoonCount = proposals.filter((p) => {
      if (["ACCEPTED", "REJECTED", "EXPIRED"].includes(p.status)) return false;
      const exp = new Date(p.expiryDate);
      return exp >= now && exp <= in5Days;
    }).length;

    return Response.json({
      success: true,
      counters: {
        allProposals: allProposalsCount,
        activePipeline: activePipelineCount,
        expiringSoon: expiringSoonCount,
        clients: clientsCount,
      },
    });
  } catch (err: any) {
    console.error("[counters GET]", err);
    return Response.json({ success: false, message: "Failed to fetch counters." }, { status: 500 });
  }
};
