// src/pages/api/proposals/[id]/download.ts — GET /api/proposals/[id]/download
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { generateProposalPDF } from "../../../../lib/pdf.js";
import fs from "fs";
import path from "path";

import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

export const GET: APIRoute = async ({ params, locals, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const rawId = params.id;
  const numId = Number(rawId);
  const isNumeric = !isNaN(numId) && numId > 0;

  try {
    const where = adminUser
      ? isNumeric ? { id: numId } : { proposalId: rawId }
      : isNumeric ? { id: numId, salesUserId: user!.userId } : { proposalId: rawId, salesUserId: user!.userId };

    const proposal = await prisma.proposal.findFirst({
      where,
      include: { salesUser: { select: { fullName: true, mobileNumber: true, email: true } } },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found." }, { status: 404 });
    }

    const isRejected = ["REJECTED", "REJECTED_LOST", "CLOSED_LOST"].includes(
      (proposal.status || proposal.stage || "").toUpperCase()
    );

    let pdfBuffer: Buffer;
    const absPath = proposal.pdfPath ? path.join("./public", proposal.pdfPath) : null;
    if (!isRejected && absPath && fs.existsSync(absPath)) {
      pdfBuffer = fs.readFileSync(absPath);
    } else {
      pdfBuffer = await generateProposalPDF({
        proposalId: proposal.proposalId,
        version: proposal.version,
        status: proposal.status,
        stage: proposal.stage,
        isRejected,
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

    const downloadFilename = isRejected
      ? `Proposal-${proposal.proposalId}-REJECTED.pdf`
      : `Proposal_${proposal.proposalId}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[proposals download]", err);
    return Response.json({ success: false, message: "Failed to download PDF." }, { status: 500 });
  }
};
