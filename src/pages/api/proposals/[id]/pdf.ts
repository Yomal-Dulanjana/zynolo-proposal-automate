// src/pages/api/proposals/[id]/pdf.ts — Direct PDF Stream Download Endpoint
import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";
import { prisma } from "../../../../lib/prisma.js";
import { generateProposalPDF } from "../../../../lib/pdf.js";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

export const GET: APIRoute = async ({ params, locals, request }) => {
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
    const whereCondition = adminUser
      ? isNumeric
        ? { id: numId }
        : { proposalId: rawId }
      : isNumeric
      ? { id: numId, salesUserId: user!.userId }
      : { proposalId: rawId, salesUserId: user!.userId };

    const proposal = await prisma.proposal.findFirst({
      where: whereCondition,
      include: {
        salesUser: {
          select: { fullName: true, mobileNumber: true, email: true },
        },
      },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found." }, { status: 404 });
    }

    // Determine if proposal is in terminal rejected state
    const isRejected = ["REJECTED", "REJECTED_LOST", "CLOSED_LOST"].includes(
      (proposal.status || proposal.stage || "").toUpperCase()
    );

    let pdfBuffer: Buffer;
    const possiblePaths = [
      proposal.pdfPath ? path.resolve(process.cwd(), "public", proposal.pdfPath.replace(/^\/+/, "")) : null,
      path.resolve(process.cwd(), "public/pdfs", `${proposal.proposalId}.pdf`),
    ].filter(Boolean) as string[];

    const foundPath = !isRejected ? possiblePaths.find((p) => fs.existsSync(p)) : null;

    if (foundPath) {
      pdfBuffer = fs.readFileSync(foundPath);
    } else {
      // Generate PDF (embeds rejected watermark on Slide 1 if proposal is rejected)
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

      // Cache only if active; for rejected deals, optionally cache as -REJECTED.pdf
      try {
        const pdfDir = path.resolve(process.cwd(), "public/pdfs");
        if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
        const cacheFilename = isRejected
          ? `${proposal.proposalId}-REJECTED.pdf`
          : `${proposal.proposalId}.pdf`;
        fs.writeFileSync(path.join(pdfDir, cacheFilename), pdfBuffer);
      } catch (cacheErr) {
        console.warn("[proposals/[id]/pdf GET] Serverless read-only filesystem detected, streaming buffer directly:", cacheErr);
      }
    }

    const downloadFilename = isRejected
      ? `Proposal-${proposal.proposalId}-REJECTED.pdf`
      : `Zynolo-Proposal-${proposal.proposalId}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("[proposals/[id]/pdf GET]", err);
    return Response.json(
      { success: false, message: err?.message || "Failed to download PDF." },
      { status: 500 }
    );
  }
};
