// src/pages/api/proposals/[id]/follow-up.ts — POST /api/proposals/[id]/follow-up
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { generateProposalPDF } from "../../../../lib/pdf.js";
import { sendFollowUpEmail } from "../../../../lib/email.js";
import { formatCurrency, formatDate } from "../../../../lib/proposals.js";
import { getOrigin, getBaseUrl } from "../../../../lib/url.js";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";
import fs from "fs";
import path from "path";

export const POST: APIRoute = async ({ request, params, locals }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const rawId = params.id;
  if (!rawId) {
    return Response.json({ success: false, message: "Invalid proposal ID." }, { status: 400 });
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
      include: { salesUser: { select: { fullName: true, mobileNumber: true, email: true, id: true } } },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found." }, { status: 404 });
    }

    // TERMINAL STATE LOCK: Prevent follow-ups on rejected proposals
    const terminalStatuses = ["REJECTED", "REJECTED_LOST", "CLOSED_LOST"];
    const currentStatus = (proposal.status || "").toUpperCase();
    const currentStage = (proposal.stage || "").toUpperCase();

    if (terminalStatuses.includes(currentStatus) || terminalStatuses.includes(currentStage)) {
      return Response.json(
        {
          success: false,
          error: "Terminal State Violation: Rejected proposals are permanently locked and cannot receive follow-up emails.",
          message: "Terminal State Violation: Rejected proposals are permanently locked and cannot receive follow-up emails.",
        },
        { status: 403 }
      );
    }

    // Calculate remaining validity days
    const now = new Date();
    const expiry = new Date(proposal.expiryDate);
    const diffMs = expiry.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

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
    await sendFollowUpEmail({
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      repName: proposal.salesUser.fullName,
      repEmail: proposal.salesUser.email,
      proposalId: proposal.proposalId,
      totalAmount: formatCurrency(Number(proposal.totalAmount)),
      expiryDate: formatDate(proposal.expiryDate),
      remainingDays,
      publicToken: proposal.publicToken,
      pdfBuffer,
      baseUrl,
    });

    // Automatically record activity touchpoint & update lastContactedAt
    await prisma.proposalActivity.create({
      data: {
        proposalId: proposal.id,
        salesUserId: user ? user.userId : proposal.salesUser.id,
        type: "EMAIL",
        outcome: "FOLLOW_UP_SENT",
        notes: `Dispatched formal follow-up notice to ${proposal.clientEmail} (${remainingDays} days validity remaining).`,
      },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        lastContactedAt: now,
      },
    });

    return Response.json({
      success: true,
      message: `Formal follow-up email dispatched successfully to ${proposal.clientEmail}.`,
      lastContactedAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error("[proposals follow-up]", err);
    return Response.json(
      { success: false, message: err?.message || "Failed to send follow-up email." },
      { status: 500 }
    );
  }
};
