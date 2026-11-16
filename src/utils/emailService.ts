// src/utils/emailService.ts — Serverless Email Dispatch Service
import { sendProposalEmail } from "../lib/email.js";
import { generateProposalPDF } from "./pdfGenerator.js";
import { formatCurrency, formatDate } from "../lib/proposals.js";
import { getAppBaseUrl } from "./url.js";
import fs from "fs";
import path from "path";

export async function sendProposalApprovedEmails(proposal: any, request?: Request): Promise<boolean> {
  const baseUrl = getAppBaseUrl(request);

  // 1. Attempt to load existing PDF buffer or safely compile using @sparticuz/chromium
  let pdfBuffer: Buffer | null = null;
  try {
    const possiblePaths = [
      proposal.pdfPath ? path.resolve(process.cwd(), "public", proposal.pdfPath.replace(/^\/+/, "")) : null,
      path.resolve(process.cwd(), "public/pdfs", `${proposal.proposalId}.pdf`),
    ].filter(Boolean) as string[];

    const found = possiblePaths.find((p) => fs.existsSync(p));
    if (found) {
      pdfBuffer = fs.readFileSync(found);
    } else {
      pdfBuffer = await generateProposalPDF({
        proposalId: proposal.proposalId,
        version: proposal.version || "1.0.0",
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
        repName: proposal.salesUser?.fullName || "Corporate Sales Representative",
        repMobile: proposal.salesUser?.mobileNumber || "",
        repEmail: proposal.salesUser?.email || "sales@dtech.lk",
      });
    }
  } catch (pdfErr) {
    console.warn("[emailService] PDF rendering skipped/timed out, dispatching email with web portal link fallback:", pdfErr);
    pdfBuffer = null;
  }

  // 2. Dispatch emails via Nodemailer with serverless timeout guard
  await sendProposalEmail({
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    clientPhone: proposal.clientPhone || undefined,
    repName: proposal.salesUser?.fullName || "Corporate Sales Representative",
    repMobile: proposal.salesUser?.mobileNumber || undefined,
    repEmail: proposal.salesUser?.email || "sales@dtech.lk",
    proposalId: proposal.proposalId,
    totalAmount: formatCurrency(Number(proposal.totalAmount)),
    expiryDate: formatDate(proposal.expiryDate),
    publicToken: proposal.publicToken,
    pdfBuffer: pdfBuffer || undefined,
    baseUrl,
  });

  return true;
}
