// src/lib/email.ts — Nodemailer transport with Brevo & Generic SMTP configuration
import "dotenv/config";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma.js";
import { getOrigin, getBaseUrl, getProposalPortalUrl } from "./url.js";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  allowSelfSigned: boolean;
}

function getSmtpConfig(): SmtpConfig {
  const fromName = process.env.MAIL_FROM_NAME ?? "Zynolo People Proposal";
  const fromAddress = process.env.MAIL_FROM_ADDRESS ?? "noreply@yomaldulanjana.me";
  const defaultFrom = process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? `"${fromName}" <${fromAddress}>`;

  return {
    host: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: (process.env.SMTP_PASS ?? "").replace(/^["']|["']$/g, ""),
    from: defaultFrom,
    allowSelfSigned: process.env.SMTP_ALLOW_SELF_SIGNED === "true",
  };
}

export function createTransport(config: SmtpConfig = getSmtpConfig()) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // false for port 587 (uses STARTTLS)
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: !config.allowSelfSigned,
    },
    connectionTimeout: 8000, // 8s max
    greetingTimeout: 5000,   // 5s max
    socketTimeout: 10000,    // 10s max
  });
}

function getZynoloLogoAttachment(): Mail.Attachment | null {
  const cwd = process.cwd();
  const possiblePaths = [
    path.resolve(cwd, "public/zynolo-logo.png"),
    path.resolve("./public/zynolo-logo.png"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return {
        filename: "zynolo-logo.png",
        path: p,
        cid: "zynolologo",
      };
    }
  }
  return null;
}

function renderEmailHeader(subtitle: string = "Official Business Proposal Communication", hasLogo: boolean = true): string {
  return `
  <div class="header" style="background: #0f172a; padding: 36px 44px; text-align: left;">
    ${
      hasLogo
        ? `<img src="cid:zynolologo" alt="Zynolo People" style="height: 38px; max-width: 220px; object-fit: contain; display: block;" />`
        : `<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Zynolo<span style="color: #dc2626;"> </span>People</h1>`
    }
    <p style="color: #94a3b8; margin: 10px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${subtitle}</p>
  </div>
  <div class="accent-bar" style="height: 4px; background: linear-gradient(90deg, #dc2626, #b91c1c);"></div>
  `;
}

export interface ProposalEmailOptions {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  repName: string;
  repMobile?: string;
  repEmail: string;
  proposalId: string;
  totalAmount: string;
  expiryDate: string;
  pdfBuffer?: Buffer | null;
  publicToken?: string;
  baseUrl?: string;
}

export async function sendProposalEmail(
  opts: ProposalEmailOptions
): Promise<void> {
  const config = getSmtpConfig();
  const transport = createTransport(config);
  const logoAttachment = getZynoloLogoAttachment();
  const hasLogo = logoAttachment !== null;

  const baseOrigin = opts.baseUrl ? opts.baseUrl.replace(/\/+$/, "") : getBaseUrl();

  const baseAttachments: Mail.Attachment[] = [];
  if (opts.pdfBuffer && opts.pdfBuffer.length > 0) {
    baseAttachments.push({
      filename: `Proposal_${opts.proposalId}.pdf`,
      content: opts.pdfBuffer,
      contentType: "application/pdf",
    });
  }
  if (logoAttachment) {
    baseAttachments.push(logoAttachment);
  }

  const issueDateFormatted = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // 1. Client-Facing Email HTML (Strictly professional, zero action buttons)
  const clientHtmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Zynolo People Proposal ${opts.proposalId}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 640px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .body { padding: 40px 48px; }
  .greeting { font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 16px; }
  .message { color: #475569; line-height: 1.7; font-size: 14.5px; margin-bottom: 16px; }
  .proposal-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #dc2626; border-radius: 8px; padding: 22px 26px; margin: 26px 0; }
  .proposal-box table { width: 100%; border-collapse: collapse; }
  .proposal-box td { padding: 7px 0; font-size: 14px; }
  .proposal-box td:first-child { color: #64748b; font-weight: 500; width: 160px; }
  .proposal-box td:last-child { color: #0f172a; font-weight: 700; }
  .footer { background: #f1f5f9; padding: 24px 48px; border-top: 1px solid #e2e8f0; }
  .footer p { color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6; }
  .rep-info { margin-top: 28px; padding-top: 22px; border-top: 1px solid #e2e8f0; font-size: 13.5px; color: #64748b; }
  .rep-info p { margin: 4px 0; }
  .rep-info strong { color: #0f172a; }
</style>
</head>
<body>
<div class="wrapper">
  ${renderEmailHeader("Official Business Proposal Communication", hasLogo)}
  <div class="body">
    <p class="greeting">Dear ${opts.clientName},</p>
    <p class="message">
      Thank you for your engagement with <strong>Zynolo People</strong>. Please find attached our customized corporate proposal detailing our staffing solutions, contractual terms, and comprehensive financial consideration.
    </p>

    <div class="proposal-box">
      <table>
        <tr>
          <td>Proposal Reference:</td>
          <td><span style="color:#dc2626;font-family:monospace;font-weight:bold;">${opts.proposalId}</span></td>
        </tr>
        <tr>
          <td>Prepared For:</td>
          <td>${opts.clientName}</td>
        </tr>
        <tr>
          <td>Total Investment:</td>
          <td>${opts.totalAmount}</td>
        </tr>
        <tr>
          <td>Issue Date:</td>
          <td>${issueDateFormatted}</td>
        </tr>
        <tr>
          <td>Validity Deadline:</td>
          <td>${opts.expiryDate}</td>
        </tr>
      </table>
    </div>

    <p class="message">
      The complete, executive proposal is attached to this communication as an official PDF document for your review and formal consideration. You can also view or download your proposal directly online at:
      <br />
      <a href="${baseOrigin}/p/${opts.publicToken || opts.proposalId}" style="color: #dc2626; font-weight: 600; text-decoration: underline;" target="_blank">
        ${baseOrigin}/p/${opts.publicToken || opts.proposalId}
      </a>
    </p>

    <div class="rep-info">
      <p style="text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 8px;">Your Assigned Representative</p>
      <p><strong>${opts.repName}</strong></p>
      <p>Corporate Sales &amp; Accounts Representative</p>
      <p>Email: <a href="mailto:${opts.repEmail}" style="color:#dc2626; text-decoration: none;">${opts.repEmail}</a></p>
      ${opts.repMobile ? `<p>Mobile: <span style="color:#0f172a; font-weight: 600;">${opts.repMobile}</span></p>` : ""}
    </div>
  </div>
  <div class="footer">
    <p>
      This is a confidential corporate communication intended solely for ${opts.clientName}.<br />
      &copy; ${new Date().getFullYear()} D-Tech Solutions / Zynolo People. All rights reserved.
    </p>
  </div>
</div>
</body>
</html>
  `.trim();

  // 2. Sales Rep Internal Copy HTML (Record summary)
  const repHtmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>[Copy] Proposal Dispatched: ${opts.clientName} (${opts.proposalId})</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 640px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .body { padding: 40px 48px; }
  .greeting { font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 14px; }
  .message { color: #475569; line-height: 1.7; font-size: 14.5px; margin-bottom: 16px; }
  .internal-banner { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #334155; margin-bottom: 24px; }
  .proposal-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0f172a; border-radius: 8px; padding: 22px 26px; margin: 24px 0; }
  .proposal-box table { width: 100%; border-collapse: collapse; }
  .proposal-box td { padding: 7px 0; font-size: 14px; }
  .proposal-box td:first-child { color: #64748b; font-weight: 500; width: 160px; }
  .proposal-box td:last-child { color: #0f172a; font-weight: 700; }
  .footer { background: #f1f5f9; padding: 20px 48px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
<div class="wrapper">
  ${renderEmailHeader("Internal Sales Confirmation Record", hasLogo)}
  <div class="body">
    <div class="internal-banner">
      📋 <strong>Internal Record:</strong> This proposal has been formally issued and dispatched directly to the client recipient.
    </div>

    <p class="greeting">Hi ${opts.repName},</p>
    <p class="message">
      A corporate proposal was dispatched successfully to <strong>${opts.clientName}</strong>. A copy of the finalized PDF proposal is attached for your records.
    </p>

    <div class="proposal-box">
      <table>
        <tr>
          <td>Proposal Reference:</td>
          <td><span style="color:#dc2626;font-family:monospace;font-weight:bold;">${opts.proposalId}</span></td>
        </tr>
        <tr>
          <td>Client Organization:</td>
          <td>${opts.clientName}</td>
        </tr>
        <tr>
          <td>Recipient Email:</td>
          <td><a href="mailto:${opts.clientEmail}" style="color:#0f172a; text-decoration:none; font-weight: bold;">${opts.clientEmail}</a></td>
        </tr>
        ${opts.clientPhone ? `<tr><td>Client Phone:</td><td><strong style="color:#0f172a;">${opts.clientPhone}</strong></td></tr>` : ""}
        <tr>
          <td>Total Commercial Value:</td>
          <td>${opts.totalAmount}</td>
        </tr>
        <tr>
          <td>Issue Date:</td>
          <td>${issueDateFormatted}</td>
        </tr>
        <tr>
          <td>Validity Deadline:</td>
          <td>${opts.expiryDate}</td>
        </tr>
      </table>
    </div>

    <p class="message" style="font-size: 13px; color: #64748b;">
      The proposal PDF is attached to this email. You can manage deal pipeline progress and follow-up reminders directly from your sales dashboard.
    </p>
  </div>
  <div class="footer">
    D-Tech Corporate Solutions / Zynolo People &bull; Sales Operations &amp; Proposal Tracking System
  </div>
</div>
</body>
</html>
  `.trim();

  // 1. Dispatch Client Email (direct, NO CC)
  const clientMailOptions: Mail.Options = {
    from: config.from,
    to: opts.clientEmail,
    subject: `Zynolo People Proposal - ${opts.clientName} (${opts.proposalId})`,
    html: clientHtmlBody,
    attachments: baseAttachments,
  };

  // 2. Dispatch Sales Rep Copy Email (direct, NO CC)
  const repMailOptions: Mail.Options = {
    from: config.from,
    to: opts.repEmail,
    subject: `[Copy] Proposal Dispatched: ${opts.clientName} (${opts.proposalId})`,
    html: repHtmlBody,
    attachments: baseAttachments,
  };

  // Send both independent emails in parallel and record delivery logs
  const sendAndLog = async (
    recipientType: "CLIENT" | "SALES_REP",
    recipientEmail: string,
    subject: string,
    mailOptions: Mail.Options
  ) => {
    try {
      await transport.sendMail(mailOptions);
      await prisma.emailLog
        .create({
          data: {
            proposalId: opts.proposalId,
            recipientType,
            recipientEmail,
            subject,
            status: "SENT",
          },
        })
        .catch((e) => console.warn("[emailLog] Failed to record SENT log:", e));
    } catch (err: any) {
      await prisma.emailLog
        .create({
          data: {
            proposalId: opts.proposalId,
            recipientType,
            recipientEmail,
            subject,
            status: "FAILED",
            errorMessage: err?.message || String(err),
          },
        })
        .catch((e) => console.warn("[emailLog] Failed to record FAILED log:", e));
      throw err;
    }
  };

  await Promise.all([
    sendAndLog("CLIENT", opts.clientEmail, clientMailOptions.subject as string, clientMailOptions),
    sendAndLog("SALES_REP", opts.repEmail, repMailOptions.subject as string, repMailOptions),
  ]);
}

export interface FollowUpEmailOptions {
  clientName: string;
  clientEmail: string;
  repName: string;
  repEmail: string;
  proposalId: string;
  totalAmount: string;
  expiryDate: string;
  remainingDays: number;
  publicToken?: string;
  pdfBuffer?: Buffer | null;
  baseUrl?: string;
}

export async function sendFollowUpEmail(opts: FollowUpEmailOptions): Promise<void> {
  const config = getSmtpConfig();
  const transport = createTransport(config);
  const logoAttachment = getZynoloLogoAttachment();
  const hasLogo = logoAttachment !== null;

  const baseOrigin = opts.baseUrl ? opts.baseUrl.replace(/\/+$/, "") : getBaseUrl();

  const baseAttachments: Mail.Attachment[] = [];
  if (opts.pdfBuffer && opts.pdfBuffer.length > 0) {
    baseAttachments.push({
      filename: `Proposal_${opts.proposalId}.pdf`,
      content: opts.pdfBuffer,
      contentType: "application/pdf",
    });
  }
  if (logoAttachment) {
    baseAttachments.push(logoAttachment);
  }

  const urgencyText =
    opts.remainingDays <= 1
      ? "is scheduled to expire <strong>today</strong>"
      : `is scheduled to expire in <strong>${opts.remainingDays} days</strong> (${opts.expiryDate})`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Formal Proposal Follow-Up ${opts.proposalId}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrapper { max-width: 640px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .body { padding: 36px 44px; }
  .greeting { font-size: 17px; color: #0f172a; font-weight: 700; margin-bottom: 14px; }
  .message { color: #475569; line-height: 1.7; font-size: 14px; margin-bottom: 14px; }
  .proposal-box { background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px 24px; margin: 22px 0; }
  .proposal-box table { width: 100%; border-collapse: collapse; }
  .proposal-box td { padding: 6px 0; font-size: 13.5px; }
  .proposal-box td:first-child { color: #64748b; font-weight: 500; width: 160px; }
  .proposal-box td:last-child { color: #0f172a; font-weight: 700; }
  .footer { background: #f1f5f9; padding: 20px 44px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #94a3b8; }
</style>
</head>
<body>
<div class="wrapper">
  ${renderEmailHeader("Executive Proposal Status Follow-Up", hasLogo)}
  <div class="body">
    <p class="greeting">Dear ${opts.clientName},</p>
    <p class="message">
      I hope this note finds you well. I am writing to follow up regarding our official business proposal 
      <strong>${opts.proposalId}</strong> recently submitted to your organization.
    </p>
    <p class="message">
      Please note that the commercial terms and pricing presented ${urgencyText}.
    </p>

    <div class="proposal-box">
      <table>
        <tr>
          <td>Proposal Reference:</td>
          <td><span style="color:#dc2626;font-family:monospace;font-weight:bold;">${opts.proposalId}</span></td>
        </tr>
        <tr>
          <td>Total Investment:</td>
          <td>${opts.totalAmount}</td>
        </tr>
        <tr>
          <td>Validity Deadline:</td>
          <td><strong>${opts.expiryDate}</strong></td>
        </tr>
      </table>
    </div>

    <p class="message">
      If you require any clarifications or wish to finalize the arrangement, please feel free to reach out directly to me. 
      The original proposal PDF is attached to this communication, or you can access it directly online at:
      <br />
      <a href="${baseOrigin}/p/${opts.publicToken || opts.proposalId}" style="color: #dc2626; font-weight: 600; text-decoration: underline;" target="_blank">
        ${baseOrigin}/p/${opts.publicToken || opts.proposalId}
      </a>
    </p>

    <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
      <p style="margin: 0;">Warm regards,</p>
      <p style="margin: 4px 0 0; font-weight: bold; color: #0f172a;">${opts.repName}</p>
      <p style="margin: 2px 0 0;">Corporate Sales Representative</p>
      <p style="margin: 2px 0 0;"><a href="mailto:${opts.repEmail}" style="color: #dc2626; text-decoration: none;">${opts.repEmail}</a></p>
    </div>
  </div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} D-Tech Solutions / Zynolo People. Confidential corporate correspondence.
  </div>
</div>
</body>
</html>
  `.trim();

  // Send follow-up directly to client (NO CC)
  const clientMailOptions: Mail.Options = {
    from: config.from,
    to: opts.clientEmail,
    subject: `Follow-Up: Zynolo People Proposal - ${opts.clientName} (${opts.proposalId})`,
    html: htmlBody,
    attachments: baseAttachments,
  };

  // Send rep notification copy directly to repEmail
  const repMailOptions: Mail.Options = {
    from: config.from,
    to: opts.repEmail,
    subject: `[Copy] Follow-Up Sent: ${opts.clientName} (${opts.proposalId})`,
    html: htmlBody,
    attachments: baseAttachments,
  };

  const sendAndLogFollowUp = async (
    recipientType: "CLIENT" | "SALES_REP",
    recipientEmail: string,
    subject: string,
    mailOptions: Mail.Options
  ) => {
    try {
      await transport.sendMail(mailOptions);
      await prisma.emailLog
        .create({
          data: {
            proposalId: opts.proposalId,
            recipientType,
            recipientEmail,
            subject,
            status: "SENT",
          },
        })
        .catch((e) => console.warn("[emailLog] Failed to record SENT log:", e));
    } catch (err: any) {
      await prisma.emailLog
        .create({
          data: {
            proposalId: opts.proposalId,
            recipientType,
            recipientEmail,
            subject,
            status: "FAILED",
            errorMessage: err?.message || String(err),
          },
        })
        .catch((e) => console.warn("[emailLog] Failed to record FAILED log:", e));
      throw err;
    }
  };

  await Promise.all([
    sendAndLogFollowUp("CLIENT", opts.clientEmail, clientMailOptions.subject as string, clientMailOptions),
    sendAndLogFollowUp("SALES_REP", opts.repEmail, repMailOptions.subject as string, repMailOptions),
  ]);
}

// OTP verification email
export async function sendOTPEmail(
  to: string,
  fullName: string,
  otp: string
): Promise<void> {
  const config = getSmtpConfig();
  const transport = createTransport(config);
  const logoAttachment = getZynoloLogoAttachment();
  const hasLogo = logoAttachment !== null;

  const html = `
<!DOCTYPE html>
<html>
<head><style>
  body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
  .w{max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .b{padding:32px 40px}
  .otp{font-size:38px;font-weight:900;letter-spacing:8px;color:#dc2626;background:#fff1f2;border:2px dashed #fca5a5;padding:18px;border-radius:10px;text-align:center;margin:22px 0}
  .note{color:#64748b;font-size:12.5px;margin-top:14px;line-height:1.6}
</style></head>
<body>
<div class="w">
  ${renderEmailHeader("Sales Portal Security Verification", hasLogo)}
  <div class="b">
    <p style="color:#0f172a;font-weight:700;font-size:16px">Hi ${fullName},</p>
    <p style="color:#475569;font-size:14px;">Your 6-digit verification code to reset your sales portal password is:</p>
    <div class="otp">${otp}</div>
    <p class="note">⏱️ This OTP is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
    <p class="note">If you did not initiate this request, you can safely disregard this message.</p>
  </div>
</div>
</body>
</html>`;

  const attachments: Mail.Attachment[] = [];
  if (logoAttachment) {
    attachments.push(logoAttachment);
  }

  await transport.sendMail({
    from: config.from,
    to,
    subject: "Password Reset OTP — Zynolo People Proposal Portal",
    html,
    attachments,
  });
}
