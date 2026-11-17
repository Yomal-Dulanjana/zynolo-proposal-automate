// src/pages/api/admin/proposals/[id]/approve.ts — Serverless-Resilient Proposal Approval
import type { APIRoute } from "astro";
import { prisma } from "../../../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../../../lib/adminAuth.js";
import { sendProposalApprovedEmails } from "../../../../../utils/emailService.js";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized. Executive Admin session required." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawId = params.id;
  if (!rawId) {
    return new Response(
      JSON.stringify({ success: false, error: "Proposal ID is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const numId = Number(rawId);
    const isNumeric = !isNaN(numId) && numId > 0;

    // 1. Locate the proposal
    const proposal = await prisma.proposal.findFirst({
      where: isNumeric
        ? { OR: [{ id: numId }, { proposalId: rawId }] }
        : { proposalId: rawId },
      include: {
        salesUser: true,
      },
    });

    if (!proposal) {
      return new Response(
        JSON.stringify({ success: false, error: "Proposal record not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // TERMINAL STATE LOCK: Reject approval if already rejected/lost
    const terminalStatuses = ["REJECTED", "REJECTED_LOST", "CLOSED_LOST"];
    const currentStatus = (proposal.status || "").toUpperCase();
    const currentStage = (proposal.stage || "").toUpperCase();

    if (terminalStatuses.includes(currentStatus) || terminalStatuses.includes(currentStage)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Terminal State Violation: Rejected proposals are permanently locked and cannot be modified.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Perform Database State Transition First (Atomic)
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: "APPROVED",
        stage: "PROPOSAL_SENT",
        isHodApproved: true,
        probability: 60,
        reviewedAt: new Date(),
        reviewedBy: adminUser.email || "HOD Admin",
      },
    });

    // 3. Dispatch Parallel Emails with Fallback (Non-blocking / Resilient)
    let emailDispatched = false;
    let emailErrorMsg: string | null = null;

    try {
      await sendProposalApprovedEmails(proposal, request);
      emailDispatched = true;
    } catch (mailErr: any) {
      console.error("Email dispatch or PDF compilation failure:", mailErr);
      emailErrorMsg = mailErr?.message || "SMTP or PDF compilation failed";
      // Proposal remains APPROVED in DB
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: emailDispatched
          ? `Proposal ${proposal.proposalId} approved and notification emails dispatched.`
          : `Proposal approved successfully (Email warning: ${emailErrorMsg})`,
        proposal: updatedProposal,
        emailDispatched,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Critical proposal approval error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal database error during approval.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
