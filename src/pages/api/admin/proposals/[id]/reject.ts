// src/pages/api/admin/proposals/[id]/reject.ts — Reject Proposal with Reason
import type { APIRoute } from "astro";
import { prisma } from "../../../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../../../lib/adminAuth.js";

export const POST: APIRoute = async ({ params, request, locals }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json(
      { success: false, message: "Unauthorized. Executive Admin session required." },
      { status: 401 }
    );
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return Response.json(
      { success: false, message: "Invalid proposal ID." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (!comment) {
      return Response.json(
        { success: false, message: "A reason must be provided when rejecting a proposal." },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return Response.json(
        { success: false, message: "Proposal not found." },
        { status: 404 }
      );
    }

    // TERMINAL STATE LOCK: Already rejected
    const terminalStatuses = ["REJECTED", "REJECTED_LOST", "CLOSED_LOST"];
    const currentStatus = (proposal.status || "").toUpperCase();
    const currentStage = (proposal.stage || "").toUpperCase();

    if (terminalStatuses.includes(currentStatus) || terminalStatuses.includes(currentStage)) {
      return Response.json(
        {
          success: false,
          error: "Terminal State Violation: Proposal is already rejected and locked.",
          message: "Terminal State Violation: Proposal is already rejected and locked.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.proposal.update({
      where: { id },
      data: {
        status: "REJECTED",
        stage: "CLOSED_LOST",
        probability: 0,
        lossReason: typeof body?.lossReason === "string" && body.lossReason.trim() ? body.lossReason.trim() : "Executive HOD Rejection",
        lossNotes: comment,
        rejectionComment: comment,
        hodComment: comment,
        rejectedAt: new Date(),
        rejectedByRole: "Executive HOD",
        reviewedAt: new Date(),
        reviewedBy: adminUser.email,
      },
    });

    return Response.json({
      success: true,
      message: `Proposal ${proposal.proposalId} rejected.`,
      proposal: updated,
    });
  } catch (err: any) {
    console.error("[reject POST]", err);
    return Response.json(
      { success: false, message: err?.message || "Failed to reject proposal." },
      { status: 500 }
    );
  }
};
