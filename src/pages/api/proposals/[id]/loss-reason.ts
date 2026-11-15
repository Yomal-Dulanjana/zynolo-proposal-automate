// src/pages/api/proposals/[id]/loss-reason.ts — PATCH /api/proposals/[id]/loss-reason
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { ProposalStatus } from "@prisma/client";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const rawId = params.id;
  if (!rawId) {
    return Response.json({ success: false, message: "Missing proposal ID." }, { status: 400 });
  }

  const numId = Number(rawId);
  const isNumeric = !isNaN(numId) && numId > 0;

  try {
    const isHodAdmin = !!(adminUser && adminUser.role === "HOD_ADMIN");
    const where = isHodAdmin
      ? isNumeric
        ? { id: numId }
        : { proposalId: rawId }
      : isNumeric
      ? { id: numId, salesUserId: user!.userId }
      : { proposalId: rawId, salesUserId: user!.userId };

    const proposal = await prisma.proposal.findFirst({
      where,
      select: { id: true, proposalId: true, salesUserId: true, status: true },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found or access denied." }, { status: 404 });
    }

    const body = await request.json();
    const { lossReason, lossNotes, status } = body;

    if (!lossReason) {
      return Response.json({ success: false, message: "Loss reason is required." }, { status: 400 });
    }

    const targetStatus = status ? (status.toUpperCase() === "REJECTED" ? ProposalStatus.REJECTED : ProposalStatus.REJECTED) : ProposalStatus.REJECTED;

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        lossReason: String(lossReason).trim(),
        lossNotes: lossNotes ? String(lossNotes).trim() : null,
        status: targetStatus,
      },
      select: {
        id: true,
        proposalId: true,
        status: true,
        lossReason: true,
        lossNotes: true,
        updatedAt: true,
      },
    });

    // Also record an activity entry for this loss event
    await prisma.proposalActivity.create({
      data: {
        proposalId: proposal.id,
        salesUserId: user ? user.userId : proposal.salesUserId,
        type: "NOTE",
        outcome: "OBJECTION",
        notes: `Deal Closed Lost. Reason: ${lossReason}${lossNotes ? ` | Notes: ${lossNotes}` : ""}`,
      },
    });

    return Response.json({
      success: true,
      message: `Proposal ${updated.proposalId} recorded as Lost with reason: ${lossReason}.`,
      proposal: updated,
    });
  } catch (err) {
    console.error("[proposal loss-reason PATCH]", err);
    return Response.json({ success: false, message: "Failed to record loss reason." }, { status: 500 });
  }
};
