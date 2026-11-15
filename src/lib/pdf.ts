// src/lib/pdf.ts — Headless Chrome / Puppeteer engine with 16:9 1920x1080 slide background overlay rendering
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { formatAmountOnly, formatOrdinalDateShort, formatOrdinalDateLong } from "./proposals.js";
import { calculateProposalPricing } from "../utils/pricing.js";

function getSystemChromePath(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

// Convert image file on disk to a Base64 data URI
export function fileToDataUri(filePath: string): string {
  try {
    const cwd = process.cwd();
    const candidates = [
      filePath,
      path.resolve(cwd, filePath),
      path.resolve(cwd, filePath.replace(/^\.?\//, "")),
      path.resolve(cwd, "public", filePath.replace(/^\/?(public\/)?/, "")),
    ];
    for (const cand of candidates) {
      if (cand && fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        const ext = path.extname(cand).replace(".", "").toLowerCase();
        const mime =
          ext === "png"
            ? "image/png"
            : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "svg"
            ? "image/svg+xml"
            : ext === "webp"
            ? "image/webp"
            : "image/png";
        const b64 = fs.readFileSync(cand).toString("base64");
        return `data:${mime};base64,${b64}`;
      }
    }
  } catch (err) {
    console.error(`[pdf] Error reading file ${filePath}:`, err);
  }
  return "";
}

export function resolveLogoDataUri(logoUrl?: string | null): string | null {
  if (!logoUrl || typeof logoUrl !== "string" || !logoUrl.trim()) return null;
  if (logoUrl.startsWith("data:")) return logoUrl;

  const cwd = process.cwd();
  let pathname = logoUrl;
  try {
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      pathname = new URL(logoUrl).pathname;
    }
  } catch {
    pathname = logoUrl;
  }

  let filename = "";
  if (pathname.includes("/uploads/")) {
    const after = pathname.split("/uploads/")[1];
    filename = after ? after.split("?")[0] : "";
  } else if (!logoUrl.startsWith("http://") && !logoUrl.startsWith("https://")) {
    filename = path.basename(pathname);
  }

  const uploadDir = process.env.UPLOAD_DIR || "./public/uploads";
  const possiblePaths = [
    filename ? path.resolve(cwd, uploadDir, filename) : "",
    filename ? path.resolve(cwd, "./public/uploads", filename) : "",
    pathname.startsWith("/") ? path.resolve(cwd, "./public", pathname.replace(/^\/+/, "")) : "",
    pathname.startsWith("/") ? path.resolve(cwd, pathname.replace(/^\/+/, "")) : "",
    path.resolve(cwd, pathname),
    path.resolve(pathname),
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return fileToDataUri(p);
    }
  }

  // If it's a valid remote external URL, Puppeteer can render it directly
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  // Never return raw relative URL to Puppeteer: if file is not found, omit image to avoid broken img icons
  return null;
}

export interface PDFProposalData {
  proposalId: string;
  version?: string;
  proposalDate: Date;
  expiryDate: Date;
  clientName: string;
  clientAddress: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientLogoUrl?: string | null;
  employeeCount: number;
  ratePerUser?: number;
  baseAmount: number;
  vatPercentage?: number;
  vatAmount: number;
  totalAmount: number;
  repName: string;
  repMobile: string;
  repEmail: string;
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildProposalSlidesHtml(data: PDFProposalData): string {
  const version = data.version || "1.0.0";
  const clientLogoDataUri = resolveLogoDataUri(data.clientLogoUrl);

  // Inlined Base64 data URIs for all 7 template slide images
  const s1 = fileToDataUri("./public/templates/slide-1.png");
  const s2 = fileToDataUri("./public/templates/slide-2.png");
  const s3 = fileToDataUri("./public/templates/slide-3.png");
  const s4 = fileToDataUri("./public/templates/slide-4.png");
  const s5 = fileToDataUri("./public/templates/slide-5.png");
  const s6 = fileToDataUri("./public/templates/slide-6.png");
  const s7 = fileToDataUri("./public/templates/slide-7.png");

  const logoMarkup = clientLogoDataUri
    ? `<img src="${clientLogoDataUri}" alt="${escapeHtml(data.clientName)}" />`
    : ``;

  // Commercial Pricing calculations
  const userRate =
    data.ratePerUser !== undefined && !isNaN(Number(data.ratePerUser))
      ? Math.max(0, Number(data.ratePerUser))
      : 400.00;
  const pricing = calculateProposalPricing(data.employeeCount || 10, userRate);
  const baseAmount = data.baseAmount !== undefined && data.baseAmount > 0 ? data.baseAmount : pricing.baseAmount;
  const vatAmount = data.vatAmount !== undefined && data.vatAmount > 0 ? data.vatAmount : pricing.vatAmount;
  const totalAmount = data.totalAmount !== undefined && data.totalAmount > 0 ? data.totalAmount : pricing.totalAmount;
  const empCount = pricing.employeeCount;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080, initial-scale=1.0" />
  <title>Zynolo People Proposal - ${escapeHtml(data.proposalId)}</title>
  <style>
    @page {
      size: 1920px 1080px;
      margin: 0px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      width: 1920px;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .slide-page {
      width: 1920px;
      height: 1080px;
      max-width: 1920px;
      max-height: 1080px;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      page-break-inside: avoid;
      background-size: 1920px 1080px;
      background-position: top left;
      background-repeat: no-repeat;
    }

    .slide-page:last-child {
      page-break-after: auto;
    }

    /* ══════════════════════════════════════════════════════════════
       SLIDE 01 (COVER SLIDE)
    ══════════════════════════════════════════════════════════════ */
    .p1-logo-container {
      position: absolute;
      top: 650px;
      left: 40px;
      width: 260px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .p1-logo-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .p1-target-box {
      position: absolute;
      top: 640px;
      left: 325px;
      width: 480px;
      height: 180px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    }

    .p1-target-line1 {
      color: #a81119;
      font-weight: bold;
      font-size: 16px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-bottom: 2px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    }

    .p1-target-line2 {
      color: #0f172a;
      font-weight: bold;
      font-size: 22px;
      line-height: 1.2;
      word-break: break-word;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    }

    .p1-target-line3 {
      color: #000000;
      font-weight: 500;
      font-size: 18px;
      line-height: 1.25;
      word-break: break-word;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    }

    .p1-target-line4 {
      color: #000000;
      font-weight: 500;
      font-size: 18px;
      line-height: 1.25;
      word-break: break-word;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    }

    .p1-meta-id {
      position: absolute;
      top: 1002px;
      left: 195px;
      min-width: 260px;
      height: 42px;
      display: flex;
      align-items: center;
      padding-left: 8px;
      padding-right: 12px;
      color: #ffffff;
      font-weight: bold;
      font-size: 24px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      letter-spacing: 0.5px;
    }

    .p1-meta-version {
      position: absolute;
      top: 1002px;
      left: 822px;
      min-width: 180px;
      height: 42px;
      display: flex;
      align-items: center;
      padding-left: 8px;
      padding-right: 12px;
      color: #ffffff;
      font-weight: bold;
      font-size: 24px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      letter-spacing: 0.5px;
    }

    .p1-meta-date {
      position: absolute;
      top: 1002px;
      left: 1410px;
      min-width: 260px;
      height: 42px;
      display: flex;
      align-items: center;
      padding-left: 8px;
      padding-right: 12px;
      color: #ffffff;
      font-weight: bold;
      font-size: 24px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      white-space: nowrap;
      letter-spacing: 0.5px;
    }

    /* ══════════════════════════════════════════════════════════════
       SLIDE 05 (FINANCIAL CONSIDERATION)
    ══════════════════════════════════════════════════════════════ */
    .p5-client-name {
      position: absolute;
      top: 390px;
      left: 300px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 32px;
      line-height: 1.2;
      font-weight: bold;
      color: #990000;
      white-space: nowrap;
    }

    .p5-employee-count {
      position: absolute;
      top: 446px;
      left: 600px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 32px;
      line-height: 1.2;
      font-weight: 600;
      color: #990000;
      white-space: nowrap;
    }

    .p5-base-amount {
      position: absolute;
      top: 366px;
      left: 1420px;
      width: 310px;
      text-align: right;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 32px;
      line-height: 1.2;
      font-weight: 600;
      color: #990000;
    }

    .p5-vat-amount {
      position: absolute;
      top: 751px;
      left: 1420px;
      width: 310px;
      text-align: right;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 32px;
      line-height: 1.2;
      font-weight: 600;
      color: #990000;
    }

    .p5-total-amount {
      position: absolute;
      top: 810px;
      left: 1420px;
      width: 310px;
      text-align: right;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 32px;
      line-height: 1.2;
      font-weight: bold;
      color: #990000;
    }

    /* ══════════════════════════════════════════════════════════════
       SLIDE 06 (TERMS & CONDITIONS)
    ══════════════════════════════════════════════════════════════ */
    .p6-client-terminology {
      position: absolute;
      top: 410px;
      left: 416px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 32px;
      line-height: 1.2;
      font-weight: bold;
      color: #990000;
      white-space: nowrap;
    }

    .p6-expiry-clause {
      position: absolute;
      top: 770px;
      left: 730px;
      background: #ffffff;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 32px;
      line-height: 1.2;
      font-weight: bold;
      color: #990000;
      white-space: nowrap;
    }

    /* ══════════════════════════════════════════════════════════════
       SLIDE 07 (CONTACT US / SALES REP SLOT)
    ══════════════════════════════════════════════ */
    .p7-rep-name {
      position: absolute;
      top: 365px;
      left: 48px;
      width: 592px;
      height: 41px;
      display: flex;
      align-items: center;
      padding-left: 12px;
      color: #ffffff;
      font-weight: 400;
      font-size: 28px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      letter-spacing: 0.3px;
    }

    .p7-contact-box {
      position: absolute;
      top: 416px;
      left: 60px;
      width: 580px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    }

    .p7-rep-mobile {
      color: #000000;
      font-weight: 500;
      font-size: 28px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      margin-top: 6px;
    }

    .p7-rep-email {
      color: #1d4ed8;
      font-weight: 500;
      font-size: 28px;
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      text-decoration: underline;
      margin-top: 4px;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: COVER PAGE -->
  <div class="slide-page" style="background-image: url('${s1}');">
    <div class="p1-logo-container">
      ${logoMarkup}
    </div>
    <div class="p1-target-box">
      <div class="p1-target-line1">PROPOSAL FOR</div>
      <div class="p1-target-line2">${escapeHtml(data.clientName)}</div>
      <div class="p1-target-line3">${escapeHtml(data.clientAddress)}</div>
      ${
        data.clientEmail || data.clientPhone
          ? `<div class="p1-target-line4">${[data.clientEmail, data.clientPhone].filter(Boolean).map(s => escapeHtml(s!)).join(" | ")}</div>`
          : ""
      }
    </div>
    <div class="p1-meta-id">${escapeHtml(data.proposalId)}</div>
    <div class="p1-meta-version">${escapeHtml(version)}</div>
    <div class="p1-meta-date">${formatOrdinalDateShort(data.proposalDate)}</div>
  </div>

  <!-- SLIDE 2: MAIN FUNCTIONALITY (STATIC) -->
  <div class="slide-page" style="background-image: url('${s2}');"></div>

  <!-- SLIDE 3: SYSTEM BLOCK DIAGRAM (STATIC) -->
  <div class="slide-page" style="background-image: url('${s3}');"></div>

  <!-- SLIDE 4: IMPLEMENTATION METHODOLOGY (STATIC) -->
  <div class="slide-page" style="background-image: url('${s4}');"></div>

  <!-- SLIDE 5: FINANCIAL CONSIDERATION -->
  <!-- Customize and implement Standard Zynolo-People Product to: ${data.clientName} -->
  <div class="slide-page" style="background-image: url('${s5}');">
    <div class="p5-client-name">&nbsp;${escapeHtml(data.clientName)}.</div>
    <div class="p5-employee-count">&nbsp;${empCount}</div>
    <div class="p5-base-amount">${formatAmountOnly(baseAmount)}</div>
    <div class="p5-vat-amount">${formatAmountOnly(vatAmount)}</div>
    <div class="p5-total-amount">${formatAmountOnly(totalAmount)}</div>
  </div>

  <!-- SLIDE 6: TERMS & CONDITIONS -->
  <div class="slide-page" style="background-image: url('${s6}');">
    <div class="p6-client-terminology">&nbsp;${escapeHtml(data.clientName)}</div>
    <div class="p6-expiry-clause">on ${formatOrdinalDateLong(data.expiryDate)}.</div>
  </div>

  <!-- SLIDE 7: CONTACT US -->
  <div class="slide-page" style="background-image: url('${s7}');">
    <div class="p7-rep-name">${escapeHtml(data.repName)}</div>
    <div class="p7-contact-box">
      <div class="p7-rep-mobile">${escapeHtml(data.repMobile)}</div>
      <div class="p7-rep-email">${escapeHtml(data.repEmail)}</div>
    </div>
  </div>

</body>
</html>
  `.trim();
}

export async function generateProposalPdf(htmlContent: string): Promise<Buffer> {
  const executablePath = getSystemChromePath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=none",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      width: "1920px",
      height: "1080px",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Main helper maintaining backward compatibility
export async function generateProposalPDF(data: PDFProposalData): Promise<Buffer> {
  const html = buildProposalSlidesHtml(data);
  return generateProposalPdf(html);
}
