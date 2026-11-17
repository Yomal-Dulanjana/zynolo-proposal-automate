// src/pages/api/proposals/[id].ts
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";
import { generateProposalPDF } from "../../../lib/pdf.js";
import { sendProposalEmail } from "../../../lib/email.js";
import { formatCurrency, formatDate } from "../../../lib/proposals.js";
import { calculateProposalPricing } from "../../../utils/pricing.js";
import { getOrigin, getBaseUrl } from "../../../lib/url.js";
import fs from "fs";
import path from "path";

const PDF_DIR = process.env.PDF_DIR ?? "./public/pdfs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

import { getAdminAuthUser } from "../../../lib/adminAuth.js";

// ── GET — Proposal details or download ───────────────────────────────────────
export const GET: APIRoute = async ({ params, locals, url, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const rawId = params.id;
  const numId = Number(rawId);
  const isNumeric = !isNaN(numId) && numId > 0;
  const action = url.searchParams.get("action");

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

  if (action === "download") {
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

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Proposal_${proposal.proposalId}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  }

  return Response.json({ success: true, proposal });
};

// ── PUT — edit proposal ──────────────────────────────────────────────────────
export const PUT: APIRoute = async ({ params, locals, request }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  const proposal = await prisma.proposal.findFirst({
    where: { id, salesUserId: locals.user.userId },
    include: { salesUser: { select: { fullName: true, mobileNumber: true, email: true } } },
  });

  if (!proposal) {
    return Response.json({ success: false, message: "Proposal not found." }, { status: 404 });
  }

  // TERMINAL STATE LOCK: Prevent editing rejected proposals
  const terminalStatuses = ["REJECTED", "REJECTED_LOST", "CLOSED_LOST"];
  const currentStatus = (proposal.status || "").toUpperCase();
  const currentStage = (proposal.stage || "").toUpperCase();

  if (terminalStatuses.includes(currentStatus) || terminalStatuses.includes(currentStage)) {
    return Response.json(
      {
        success: false,
        error: "Terminal State Violation: Rejected proposals are permanently locked and cannot be modified.",
        message: "Terminal State Violation: Rejected proposals are permanently locked and cannot be modified.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    clientName,
    clientAddress,
    clientEmail,
    clientPhone,
    clientLogoUrl,
    employeeCount,
    ratePerUser: rawRatePerUser,
    ratePerEmployee: rawRatePerEmployee,
    manualBaseAmount,
  } = body;

  const rawRate = rawRatePerUser !== undefined ? rawRatePerUser : rawRatePerEmployee;
  const userRate =
    rawRate !== undefined && !isNaN(Number(rawRate))
      ? Math.max(0, Number(rawRate))
      : (proposal.ratePerUser || 400.00);

  // Enforce standardized backend calculation: count × ratePerUser + 18% VAT
  const count = Math.max(1, Math.round(Number(employeeCount) || proposal.employeeCount || 1));
  const pricing = calculateProposalPricing(count, userRate);
  const { baseAmount, vatAmount, totalAmount, vatRate: vatPct } = pricing;

  // Re-generate PDF
  const pdfBuffer = await generateProposalPDF({
    proposalId: proposal.proposalId,
    version: proposal.version,
    proposalDate: proposal.proposalDate,
    expiryDate: proposal.expiryDate,
    clientName: clientName ?? proposal.clientName,
    clientAddress: clientAddress ?? proposal.clientAddress,
    clientEmail: clientEmail ?? proposal.clientEmail,
    clientPhone: clientPhone ?? proposal.clientPhone,
    clientLogoUrl: clientLogoUrl ?? proposal.clientLogoUrl,
    employeeCount: count,
    ratePerUser: userRate,
    baseAmount,
    vatAmount,
    vatPercentage: vatPct,
    totalAmount,
    repName: proposal.salesUser.fullName,
    repMobile: proposal.salesUser.mobileNumber,
    repEmail: proposal.salesUser.email,
  });

  const pdfFilename = `${proposal.proposalId}.pdf`;
  try {
    ensureDir(PDF_DIR);
    fs.writeFileSync(path.join(PDF_DIR, pdfFilename), pdfBuffer);
  } catch (fsErr) {
    console.warn("[proposals PUT] Serverless read-only filesystem detected, skipping local PDF cache write:", fsErr);
  }

  const finalClientName = (clientName ?? proposal.clientName).trim();
  const finalAddress = clientAddress ?? proposal.clientAddress;
  const finalEmail = clientEmail ?? proposal.clientEmail;
  const finalPhone = clientPhone ?? proposal.clientPhone;
  const finalLogo = clientLogoUrl ?? proposal.clientLogoUrl;

  try {
    await prisma.clientProfile.upsert({
      where: {
        salesUserId_companyName: {
          salesUserId: locals.user.userId,
          companyName: finalClientName,
        },
      },
      update: {
        address: finalAddress,
        contactEmail: finalEmail,
        contactPhone: finalPhone || undefined,
        logoUrl: finalLogo || undefined,
      },
      create: {
        salesUserId: locals.user.userId,
        companyName: finalClientName,
        address: finalAddress,
        contactEmail: finalEmail,
        contactPhone: finalPhone || null,
        logoUrl: finalLogo || null,
      },
    });
  } catch (profileErr) {
    console.warn("[proposals PUT] ClientProfile upsert warning:", profileErr);
  }

  // When a proposal in CHANGES_REQUESTED is updated by its owner, auto-set status to CHANGED_PENDING
  const newStatus =
    proposal.status === "CHANGES_REQUESTED" || proposal.status === "HOD_PENDING" || proposal.status === "CHANGED_PENDING"
      ? "CHANGED_PENDING"
      : proposal.status;

  const updated = await prisma.proposal.update({
    where: { id },
    data: {
      clientName: finalClientName,
      clientAddress: finalAddress,
      clientEmail: finalEmail,
      clientPhone: finalPhone,
      clientLogoUrl: finalLogo,
      employeeCount: count,
      ratePerUser: userRate,
      baseAmount,
      vatPercentage: vatPct,
      vatAmount,
      totalAmount,
      cogsEstimated: pricing.estimatedCogs,
      totalCogsAmount: count * (proposal.cogsRateWithVat || 80.00),
      lastContactedAt: new Date(),
      status: newStatus,
      // Clear previous resolution flags and queue it back into the HOD Waiting Proposals tab
      reviewedAt: null,
      reviewedBy: null,
    },
  });

  return Response.json({
    success: true,
    message:
      newStatus === "CHANGED_PENDING"
        ? "Proposal updated and resubmitted for HOD approval."
        : "Proposal updated successfully.",
    proposal: updated,
  });
};

// Also expose PATCH method for rep proposal updates
export const PATCH: APIRoute = PUT;

// ── DELETE — remove proposal ──────────────────────────────────────────────────
export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  const proposal = await prisma.proposal.findFirst({
    where: { id, salesUserId: locals.user.userId },
  });

  if (!proposal) {
    return Response.json({ success: false, message: "Proposal not found." }, { status: 404 });
  }

  if (proposal.pdfPath) {
    const absPath = path.join("./public", proposal.pdfPath);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  }

  await prisma.proposal.delete({ where: { id } });
  return Response.json({ success: true, message: "Proposal deleted." });
};

// ── POST — resend fallback ────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  const proposal = await prisma.proposal.findFirst({
    where: { id, salesUserId: locals.user.userId },
    include: { salesUser: { select: { fullName: true, mobileNumber: true, email: true } } },
  });

  if (!proposal) {
    return Response.json({ success: false, message: "Proposal not found." }, { status: 404 });
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
};
