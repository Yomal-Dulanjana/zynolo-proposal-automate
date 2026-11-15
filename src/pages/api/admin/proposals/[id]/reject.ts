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

    const updated = await prisma.proposal.update({
      where: { id },
      data: {
        status: "REJECTED",
        stage: "CLOSED_LOST",
        probability: 0,
        lossReason: "HOD_REJECTED",
        lossNotes: comment,
        hodComment: comment,
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
