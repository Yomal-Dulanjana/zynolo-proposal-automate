// src/lib/proposals.ts — Proposal ID generation, financial calculations, and ordinal date formatting
import { calculateProposalPricing } from "../utils/pricing.js";

export function generateProposalId(): string {
  const now = new Date();
  const ts = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const rand = Math.floor(100 + Math.random() * 900).toString();
  return `DTPZPV${ts}${rand}`;
}

export function calculateFinancials(
  employeeCount: number,
  ratePerEmployee?: number,
  manualBaseAmount?: number
): { baseAmount: number; vatAmount: number; totalAmount: number; vatPct: number } {
  // If manualBaseAmount is explicitly provided (for custom contracts), use it; otherwise strictly use the standard LKR 400.00 formula
  if (manualBaseAmount != null && manualBaseAmount > 0 && (!employeeCount || employeeCount <= 0)) {
    const vatPct = 18;
    const baseAmount = parseFloat(manualBaseAmount.toFixed(2));
    const vatAmount = parseFloat((baseAmount * 0.18).toFixed(2));
    const totalAmount = parseFloat((baseAmount + vatAmount).toFixed(2));
    return { baseAmount, vatAmount, totalAmount, vatPct };
  }

  const pricing = calculateProposalPricing(employeeCount);
  return {
    baseAmount: pricing.baseAmount,
    vatAmount: pricing.vatAmount,
    totalAmount: pricing.totalAmount,
    vatPct: pricing.vatRate,
  };
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatCurrency(amount: number | string): string {
  const num = Number(amount) || 0;
  return `LKR ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Formats a number as #,##0.00 without currency code (for pre-labeled LKR columns)
export function formatAmountOnly(amount: number | string): string {
  const num = Number(amount) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// Formats as "29th Oct 2026"
export function formatOrdinalDateShort(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

// Formats as "30th November 2026"
export function formatOrdinalDateLong(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
