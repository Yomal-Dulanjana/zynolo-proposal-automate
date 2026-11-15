// src/utils/pipelineStatusMapper.ts — Robust Multi-Format Pipeline Status & Swimlane Normalizer

export type CanonicalPipelineLane =
  | "HOD_REVIEW"
  | "DISPATCHED"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "DROPPED_LOST";

/**
 * Normalizes any proposal or status string into one of the 5 canonical pipeline lanes:
 * - HOD_REVIEW: Under HOD Review (Pending approval, draft, changes pending)
 * - DISPATCHED: Dispatched / Sent (Approved proposal active with client)
 * - NEGOTIATION: In Discussion / Negotiation (Commercial evaluation)
 * - CLOSED_WON: Closed / Won (Confirmed accepted deals)
 * - DROPPED_LOST: Dropped / Lost (Declined, rejected, or expired)
 */
export function normalizePipelineStage(proposal: any): CanonicalPipelineLane {
  if (!proposal) return "DISPATCHED";

  // Support string inputs or full proposal objects
  const isString = typeof proposal === "string";
  const rawStage = (isString ? proposal : proposal?.stage || "").toString().trim().toUpperCase();
  const rawStatus = (isString ? proposal : proposal?.status || "").toString().trim().toUpperCase();
  const combined = `${rawStage} ${rawStatus}`.trim();
  const isHodApproved = isString ? undefined : proposal?.isHodApproved;

  // 1. Dropped / Lost Lane (Checked first so rejected unapproved deals route to Lost, not Review)
  if (
    combined.includes("LOST") ||
    combined.includes("REJECT") ||
    combined.includes("EXPIRED") ||
    rawStage === "CLOSED_LOST" ||
    rawStage === "DROPPED_LOST" ||
    rawStatus === "REJECTED" ||
    rawStatus === "EXPIRED"
  ) {
    return "DROPPED_LOST";
  }

  // 2. Closed / Won Lane
  if (
    combined.includes("WON") ||
    combined.includes("ACCEPT") ||
    rawStage === "CLOSED_WON" ||
    rawStatus === "ACCEPTED"
  ) {
    return "CLOSED_WON";
  }

  // 3. Under HOD Review Lane
  if (
    combined.includes("HOD") ||
    combined.includes("PENDING") ||
    combined.includes("DRAFT") ||
    combined.includes("CHANGE") ||
    rawStage === "HOD_REVIEW" ||
    rawStage === "NEW_LEAD" ||
    rawStatus === "DRAFT" ||
    rawStatus === "HOD_PENDING" ||
    rawStatus === "CHANGED_PENDING" ||
    rawStatus === "CHANGES_REQUESTED" ||
    (isHodApproved === false && rawStage !== "CLOSED_LOST" && !combined.includes("LOST"))
  ) {
    return "HOD_REVIEW";
  }

  // 4. In Discussion / Negotiation Lane
  if (
    combined.includes("NEGOTIAT") ||
    combined.includes("DISCUSSION") ||
    rawStage === "NEGOTIATION" ||
    rawStatus === "IN_NEGOTIATION"
  ) {
    return "NEGOTIATION";
  }

  // 5. Dispatched / Sent Lane (Default active pipeline for approved proposals)
  if (
    combined.includes("SENT") ||
    combined.includes("DISPATCH") ||
    combined.includes("APPROV") ||
    combined.includes("QUALIFIED") ||
    rawStage === "PROPOSAL_SENT" ||
    rawStatus === "APPROVED" ||
    rawStatus === "SENT"
  ) {
    return "DISPATCHED";
  }

  // Fallback for active proposals
  return "DISPATCHED";
}

/**
 * Calculates Column Subtotals (Base Revenue Excl. VAT) for a collection of proposals.
 */
export function getLaneSubtotal(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const staff = Number(item.employeeCount) || 10;
    const rate = Number(item.ratePerUser) || 400.0;
    const base = item.baseAmount ? Number(item.baseAmount) : staff * rate;
    return sum + base;
  }, 0);
}
