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

    let pdfBuffer: Buffer;
    const possiblePaths = [
      proposal.pdfPath ? path.resolve(process.cwd(), "public", proposal.pdfPath.replace(/^\/+/, "")) : null,
      path.resolve(process.cwd(), "public/pdfs", `${proposal.proposalId}.pdf`),
    ].filter(Boolean) as string[];

    const foundPath = possiblePaths.find((p) => fs.existsSync(p));

    if (foundPath) {
      pdfBuffer = fs.readFileSync(foundPath);
    } else {
      // Regenerate PDF if not found on disk
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

      const pdfDir = path.resolve(process.cwd(), "public/pdfs");
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      fs.writeFileSync(path.join(pdfDir, `${proposal.proposalId}.pdf`), pdfBuffer);
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Zynolo-Proposal-${proposal.proposalId}.pdf"`,
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
