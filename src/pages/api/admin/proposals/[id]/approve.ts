// src/pages/api/admin/proposals/[id]/approve.ts — Approve & Dispatch Proposal
import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";
import { prisma } from "../../../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../../../lib/adminAuth.js";
import { sendProposalEmail } from "../../../../../lib/email.js";
import { formatCurrency, formatDate } from "../../../../../lib/proposals.js";
import { generateProposalPDF } from "../../../../../lib/pdf.js";
import { getOrigin } from "../../../../../lib/url.js";

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
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        salesUser: {
          select: {
            fullName: true,
            mobileNumber: true,
            email: true,
          },
        },
      },
    });

    if (!proposal) {
      return Response.json(
        { success: false, message: "Proposal not found." },
        { status: 404 }
      );
    }

    // Load or regenerate PDF buffer
    let pdfBuffer: Buffer;
    const possiblePaths = [
      path.resolve(process.cwd(), "public", proposal.pdfPath.replace(/^\/+/, "")),
      path.resolve(process.cwd(), "public/pdfs", `${proposal.proposalId}.pdf`),
    ];

    let foundPath = possiblePaths.find((p) => fs.existsSync(p));
    if (foundPath) {
      pdfBuffer = fs.readFileSync(foundPath);
    } else {
      // Regenerate PDF if file was missing
      pdfBuffer = await generateProposalPDF({
        proposalId: proposal.proposalId,
        version: proposal.version,
        proposalDate: proposal.proposalDate,
        expiryDate: proposal.expiryDate,
        clientName: proposal.clientName,
        clientAddress: proposal.clientAddress,
        clientEmail: proposal.clientEmail,
        clientPhone: proposal.clientPhone,
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

      const saveDir = path.resolve(process.cwd(), "public/pdfs");
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
      fs.writeFileSync(path.join(saveDir, `${proposal.proposalId}.pdf`), pdfBuffer);
    }

    // 1. Update proposal status to APPROVED
    const updated = await prisma.proposal.update({
      where: { id },
      data: {
        status: "APPROVED",
        stage: "PROPOSAL_SENT",
        isHodApproved: true,
        probability: 60,
        reviewedAt: new Date(),
        reviewedBy: adminUser.email,
      },
    });

    // 2. Dispatch emails (to client and sales rep)
    let emailDispatched = false;
    let emailError: string | null = null;
    const baseUrl = getOrigin(request);

    try {
      await sendProposalEmail({
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail,
        clientPhone: proposal.clientPhone || undefined,
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
      emailDispatched = true;
    } catch (mailErr: any) {
      emailError = mailErr?.message || "Failed to dispatch email";
      console.error("[approve POST] Email dispatch error:", mailErr);
    }

    return Response.json({
      success: true,
      message: emailDispatched
        ? `Proposal ${proposal.proposalId} approved and dispatched via email.`
        : `Proposal approved, but email dispatch failed: ${emailError}`,
      emailSent: emailDispatched,
      proposal: updated,
    });
  } catch (err: any) {
    console.error("[approve POST]", err);
    return Response.json(
      { success: false, message: err?.message || "Failed to approve proposal." },
      { status: 500 }
    );
  }
};
