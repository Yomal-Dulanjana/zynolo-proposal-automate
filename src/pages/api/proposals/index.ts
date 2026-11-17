// src/pages/api/proposals/index.ts
// CREATE new proposal: generate PDF → save → send email
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";
import {
  generateProposalId,
  addDays,
} from "../../../lib/proposals.js";
import { calculateProposalPricing } from "../../../utils/pricing.js";
import { generateProposalPDF } from "../../../lib/pdf.js";
import { sendProposalEmail } from "../../../lib/email.js";
import { formatCurrency, formatDate } from "../../../lib/proposals.js";
import { getOrigin, getBaseUrl, getPdfUrl } from "../../../lib/url.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PDF_DIR = process.env.PDF_DIR ?? "./public/pdfs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── GET — list all proposals for authenticated user or HOD admin ───────────────
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user && !locals.adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const isHodAdmin = !!locals.adminUser && locals.adminUser.role === "HOD_ADMIN";
    const where = isHodAdmin ? {} : { salesUserId: locals.user!.userId };

    const proposals = await prisma.proposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        proposalId: true,
        status: true,
        stage: true,
        isHodApproved: true,
        probability: true,
        publicToken: true,
        clientName: true,
        clientEmail: true,
        clientPhone: true,
        employeeCount: true,
        baseAmount: true,
        vatAmount: true,
        totalAmount: true,
        proposalDate: true,
        expiryDate: true,
        pdfPath: true,
        hodComment: true,
        reviewedAt: true,
        reviewedBy: true,
        createdAt: true,
        updatedAt: true,
        lastContactedAt: true,
        lossReason: true,
        lossNotes: true,
        rejectionComment: true,
        rejectedAt: true,
        rejectedByRole: true,
        cogsEstimated: true,
        salesUserId: true,
        salesUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobileNumber: true,
          },
        },
      },
    });

    return Response.json({ success: true, proposals });
  } catch (err) {
    console.error("[proposals GET]", err);
    return Response.json({ success: false, message: "Failed to fetch proposals." }, { status: 500 });
  }
};

// ── POST — create a new proposal (Routes to HOD Review with Email Gatekeeping) ─
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user && !locals.adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const user = locals.user;
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
      baseAmount: directBaseAmount,
    } = body;

    // Validation
    if (!clientName || !clientAddress || !clientEmail) {
      return Response.json(
        { success: false, message: "Client name, address, and email are required." },
        { status: 400 }
      );
    }

    // Determine custom per-user rate (default to LKR 400.00)
    const rawRate = rawRatePerUser !== undefined ? rawRatePerUser : rawRatePerEmployee;
    const userRate = rawRate !== undefined && !isNaN(Number(rawRate))
      ? Math.max(0, Number(rawRate))
      : 400.00;

    // Enforce standardized backend calculation: count × ratePerUser + 18% VAT
    const count = Math.max(1, Math.round(Number(employeeCount) || 1));
    const pricing = calculateProposalPricing(count, userRate);
    const { baseAmount, vatAmount, totalAmount, vatRate: vatPct } = pricing;

    if (baseAmount <= 0) {
      return Response.json(
        { success: false, message: "Base amount must be greater than zero." },
        { status: 400 }
      );
    }

    // Fetch active dynamic COGS rate from SystemConfig to lock into proposal snapshot
    let activeCogsRate = 80.00;
    try {
      if ((prisma as any).systemConfig) {
        const systemConfig = await (prisma as any).systemConfig.findUnique({
          where: { id: "global_config" },
        });
        if (systemConfig?.currentCogsWithVat) {
          activeCogsRate = Number(systemConfig.currentCogsWithVat);
        }
      }
    } catch (cfgErr) {
      console.warn("[proposals POST] Could not fetch systemConfig, defaulting to 80.00:", cfgErr);
    }
    const totalCogs = count * activeCogsRate;

    // IDs, token & dates
    const proposalId = generateProposalId();
    const publicToken = crypto.randomBytes(16).toString("hex");
    const proposalDate = new Date();
    const expiryDate = addDays(proposalDate, 21);

    // Fetch full rep data (support sales user or executive admin fallback)
    let salesUserId = user?.userId;
    if (!salesUserId && body.salesUserId) {
      salesUserId = Number(body.salesUserId);
    }

    let salesUser = salesUserId
      ? await prisma.salesUser.findUnique({
          where: { id: salesUserId },
          select: { id: true, fullName: true, mobileNumber: true, email: true },
        })
      : null;

    if (!salesUser) {
      salesUser = await prisma.salesUser.findFirst({
        select: { id: true, fullName: true, mobileNumber: true, email: true },
      });
      if (salesUser) {
        salesUserId = salesUser.id;
      }
    }

    if (!salesUser || !salesUserId) {
      return Response.json({ success: false, message: "Sales rep not found." }, { status: 404 });
    }

    const pdfFilename = `${proposalId}.pdf`;
    const pdfPath = `/pdfs/${pdfFilename}`;

    // Upsert reusable ClientProfile
    try {
      await prisma.clientProfile.upsert({
        where: {
          salesUserId_companyName: {
            salesUserId: salesUserId,
            companyName: clientName.trim(),
          },
        },
        update: {
          address: clientAddress,
          contactEmail: clientEmail,
          contactPhone: clientPhone || undefined,
          logoUrl: clientLogoUrl || undefined,
        },
        create: {
          salesUserId: salesUserId,
          companyName: clientName.trim(),
          address: clientAddress,
          contactEmail: clientEmail,
          contactPhone: clientPhone || null,
          logoUrl: clientLogoUrl || null,
        },
      });
    } catch (profileErr) {
      console.warn("[proposals POST] ClientProfile upsert warning:", profileErr);
    }

    // Save Proposal to database with HOD_PENDING status (Gated review workflow)
    // Persist to database FIRST to decouple DB insertion from PDF rendering
    const proposal = await prisma.proposal.create({
      data: {
        proposalId,
        version: "1.0.0",
        status: "HOD_PENDING",
        stage: "PROPOSAL_SENT",
        isHodApproved: false,
        probability: 60,
        publicToken,
        salesUserId: salesUserId,
        clientName,
        clientAddress,
        clientEmail,
        clientPhone: clientPhone ?? null,
        clientLogoUrl: clientLogoUrl ?? null,
        employeeCount: count,
        ratePerUser: userRate,
        baseAmount,
        vatPercentage: vatPct,
        vatAmount,
        totalAmount,
        cogsEstimated: pricing.estimatedCogs,
        cogsRateWithVat: activeCogsRate,
        totalCogsAmount: totalCogs,
        lastContactedAt: new Date(),
        proposalDate,
        expiryDate,
        pdfPath,
      },
    });

    // Decoupled PDF pre-rendering: try generating and caching PDF in background, but never fail proposal creation
    try {
      const pdfBuffer = await generateProposalPDF({
        proposalId,
        version: "1.0.0",
        proposalDate,
        expiryDate,
        clientName,
        clientAddress,
        clientEmail,
        clientPhone,
        clientLogoUrl,
        employeeCount: count,
        ratePerUser: userRate,
        baseAmount,
        vatAmount,
        vatPercentage: vatPct,
        totalAmount,
        repName: salesUser.fullName,
        repMobile: salesUser.mobileNumber,
        repEmail: salesUser.email,
      });

      try {
        ensureDir(PDF_DIR);
        const pdfAbsPath = path.join(PDF_DIR, pdfFilename);
        fs.writeFileSync(pdfAbsPath, pdfBuffer);
      } catch (fsErr) {
        console.warn("[proposals POST] Serverless read-only filesystem detected, skipping local PDF cache write:", fsErr);
      }
    } catch (pdfErr) {
      console.warn("[proposals POST] PDF pre-render deferred (will be generated on-demand):", pdfErr);
    }

    // DO NOT DISPATCH ANY EMAILS HERE.
    // The proposal is now safely held in HOD_PENDING state awaiting executive review.
    return Response.json(
      {
        success: true,
        message: "Proposal created successfully and submitted for HOD executive review.",
        emailSent: false,
        requiresApproval: true,
        proposal: {
          id: proposal.id,
          proposalId: proposal.proposalId,
          status: proposal.status,
          pdfPath: proposal.pdfPath,
          pdfUrl: getPdfUrl(proposal.pdfPath, request),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[proposals POST] Detailed Error:", err);
    const errorMessage =
      err?.message ||
      (typeof err === "string" ? err : "") ||
      "Failed to create proposal. Please verify client details and try again.";
    return Response.json(
      { success: false, message: errorMessage, error: String(err?.stack || err) },
      { status: 500 }
    );
  }
};
