// src/pages/api/logs/index.ts — Query Email Delivery Logs
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const query = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const status = url.searchParams.get("status")?.toUpperCase();

  try {
    // Retrieve proposals owned by this sales rep
    const userProposals = await prisma.proposal.findMany({
      where: { salesUserId: locals.user.userId },
      select: { proposalId: true, clientName: true },
    });

    const proposalIds = userProposals.map((p) => p.proposalId);
    const clientNameMap = new Map(userProposals.map((p) => [p.proposalId, p.clientName]));

    if (proposalIds.length === 0) {
      return Response.json({ success: true, logs: [], totalCount: 0 });
    }

    const whereClause: any = {
      proposalId: { in: proposalIds },
    };

    if (status && (status === "SENT" || status === "FAILED")) {
      whereClause.status = status;
    }

    const rawLogs = await prisma.emailLog.findMany({
      where: whereClause,
      orderBy: { sentAt: "desc" },
      take: 200,
    });

    // Enrich logs with client name
    const enrichedLogs = rawLogs.map((log) => ({
      ...log,
      clientName: clientNameMap.get(log.proposalId) || "Unknown Client",
    }));

    // Filter if search query exists
    const filteredLogs = query
      ? enrichedLogs.filter(
          (log) =>
            log.proposalId.toLowerCase().includes(query) ||
            log.recipientEmail.toLowerCase().includes(query) ||
            log.clientName.toLowerCase().includes(query) ||
            log.subject.toLowerCase().includes(query)
        )
      : enrichedLogs;

    return Response.json({
      success: true,
      logs: filteredLogs,
      totalCount: filteredLogs.length,
    });
  } catch (err: any) {
    console.error("[logs GET]", err);
    return Response.json({ success: false, message: "Failed to fetch email delivery logs." }, { status: 500 });
  }
};
