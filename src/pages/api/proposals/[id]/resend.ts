// src/pages/api/proposals/[id]/resend.ts — POST /api/proposals/[id]/resend
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { generateProposalPDF } from "../../../../lib/pdf.js";
import { sendProposalEmail } from "../../../../lib/email.js";
import { formatCurrency, formatDate } from "../../../../lib/proposals.js";
import { getOrigin, getBaseUrl } from "../../../../lib/url.js";
import fs from "fs";
import path from "path";

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return Response.json({ success: false, message: "Invalid proposal ID." }, { status: 400 });
  }

  try {
    const proposal = await prisma.proposal.findFirst({
      where: { id, salesUserId: locals.user.userId },
      include: { salesUser: { select: { fullName: true, mobileNumber: true, email: true } } },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found." }, { status: 404 });
    }

    // TERMINAL STATE LOCK: Prevent resending rejected proposals
    const terminalStatuses = ["REJECTED", "REJECTED_LOST", "CLOSED_LOST"];
    const currentStatus = (proposal.status || "").toUpperCase();
    const currentStage = (proposal.stage || "").toUpperCase();

    if (terminalStatuses.includes(currentStatus) || terminalStatuses.includes(currentStage)) {
      return Response.json(
        {
          success: false,
          error: "Terminal State Violation: Rejected proposals are permanently locked and cannot be re-dispatched.",
          message: "Terminal State Violation: Rejected proposals are permanently locked and cannot be re-dispatched.",
        },
        { status: 403 }
      );
    }

    let pdfBuffer: Buffer;
    const absPath = proposal.pdfPath ? path.join("./public", proposal.pdfPath) : null;
    if (absPath && fs.existsSync(absPath)) {
      pdfBuffer = fs.readFileSync(absPath);
    } else {
      pdfBuffer = await generateProposalPDF({
        proposalId: proposal.proposalId,
        version: proposal.version,
        proposalDate: proposal.proposalDate,
        expiryDate: proposal.expiryDate,
        clientName: proposal.clientName,
        clientAddress: proposal.clientAddress,
        clientLogoUrl: proposal.clientLogoUrl,
        employeeCount: proposal.employeeCount,
        baseAmount: Number(proposal.baseAmount),
        vatAmount: Number(proposal.vatAmount),
        vatPercentage: Number(proposal.vatPercentage),
        totalAmount: Number(proposal.totalAmount),
        repName: proposal.salesUser.fullName,
        repMobile: proposal.salesUser.mobileNumber,
        repEmail: proposal.salesUser.email,
      });
    }

    const baseUrl = getOrigin(request);
    await sendProposalEmail({
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      clientPhone: proposal.clientPhone ?? undefined,
      repName: proposal.salesUser.fullName,
      repMobile: proposal.salesUser.mobileNumber,
      repEmail: proposal.salesUser.email,
      proposalId: proposal.proposalId,
      totalAmount: formatCurrency(Number(proposal.totalAmount)),
      expiryDate: formatDate(proposal.expiryDate),
      publicToken: proposal.publicToken,
      pdfBuffer,
      baseUrl,
    });

    return Response.json({ success: true, message: "Proposal email resent successfully." });
  } catch (err) {
    console.error("[proposals resend]", err);
    return Response.json({ success: false, message: "Failed to resend proposal email." }, { status: 500 });
  }
};
