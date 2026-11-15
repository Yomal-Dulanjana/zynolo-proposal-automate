// prisma/seed-fix-pricing.ts — Database Migration Script to Standardize Legacy Proposal Pricing & VAT
import { PrismaClient } from "@prisma/client";
import { calculateProposalPricing } from "../src/utils/pricing.js";
import { generateProposalPDF } from "../src/lib/pdf.js";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const PDF_DIR = process.env.PDF_DIR ?? "./public/pdfs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fixLegacyProposals() {
  console.log("Starting legacy proposal pricing & VAT recalculation...");

  const proposals = await prisma.proposal.findMany({
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

  ensureDir(PDF_DIR);
  let updatedCount = 0;

  for (const p of proposals) {
    const empCount = Math.max(1, p.employeeCount || 10);
    const pricing = calculateProposalPricing(empCount);

    // Update database record
    await prisma.proposal.update({
      where: { id: p.id },
      data: {
        employeeCount: pricing.employeeCount,
        baseAmount: pricing.baseAmount,
        vatPercentage: pricing.vatRate,
        vatAmount: pricing.vatAmount,
        totalAmount: pricing.totalAmount,
        cogsEstimated: pricing.estimatedCogs,
      },
    });

    // Re-generate matching PDF with standardized pricing
    try {
      const pdfBuffer = await generateProposalPDF({
        proposalId: p.proposalId,
        version: p.version || "1.0.0",
        proposalDate: p.proposalDate,
        expiryDate: p.expiryDate,
        clientName: p.clientName,
        clientAddress: p.clientAddress,
        clientEmail: p.clientEmail,
        clientPhone: p.clientPhone,
        clientLogoUrl: p.clientLogoUrl,
        employeeCount: pricing.employeeCount,
        baseAmount: pricing.baseAmount,
        vatAmount: pricing.vatAmount,
        vatPercentage: pricing.vatRate,
        totalAmount: pricing.totalAmount,
        repName: p.salesUser?.fullName || "Sales Representative",
        repMobile: p.salesUser?.mobileNumber || "",
        repEmail: p.salesUser?.email || "",
      });

      const pdfFilename = `${p.proposalId}.pdf`;
      fs.writeFileSync(path.join(PDF_DIR, pdfFilename), pdfBuffer);
    } catch (pdfErr) {
      console.warn(`[fixLegacyProposals] Warning re-generating PDF for ${p.proposalId}:`, pdfErr);
    }

    updatedCount++;
    console.log(
      `✓ Recalculated Proposal ${p.proposalId} (${empCount} employees): Base = LKR ${pricing.baseAmount.toLocaleString()}, VAT = LKR ${pricing.vatAmount.toLocaleString()}, Total = LKR ${pricing.totalAmount.toLocaleString()}`
    );
  }

  console.log(`\n🎉 Successfully recalculated and synchronized ${updatedCount} proposals.`);
}

fixLegacyProposals()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
