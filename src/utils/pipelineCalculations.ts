// src/utils/pipelineCalculations.ts — Standard 6-Stage Commercial Pipeline & Weighted Forecasting Engine

export type PipelineStageKey =
  | "NEW_LEAD"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export const STAGE_PROBABILITIES: Record<PipelineStageKey, number> = {
  NEW_LEAD: 0.10,
  QUALIFIED: 0.30,
  PROPOSAL_SENT: 0.60,
  NEGOTIATION: 0.80,
  CLOSED_WON: 1.00,
  CLOSED_LOST: 0.00,
};

export const ACTIVE_PIPELINE_STAGES: PipelineStageKey[] = [
  "NEW_LEAD",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
];

export interface PipelineStageConfig {
  key: PipelineStageKey;
  label: string;
  sublabel: string;
  probability: number;
  probabilityPercent: number;
  headerAccent: string;
  badgeBg: string;
  badgeText: string;
  borderAccent: string;
  dotColor: string;
}

export const STAGES_CONFIG: Record<PipelineStageKey, PipelineStageConfig> = {
  NEW_LEAD: {
    key: "NEW_LEAD",
    label: "New Lead / Inquiry",
    sublabel: "Initial commercial interest",
    probability: 0.10,
    probabilityPercent: 10,
    headerAccent: "text-slate-800",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700 border-slate-200",
    borderAccent: "border-t-4 border-t-slate-500",
    dotColor: "bg-slate-500",
  },
  QUALIFIED: {
    key: "QUALIFIED",
    label: "Contacted / Qualified",
    sublabel: "Scope & requirements verified",
    probability: 0.30,
    probabilityPercent: 30,
    headerAccent: "text-sky-800",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700 border-sky-200",
    borderAccent: "border-t-4 border-t-sky-500",
    dotColor: "bg-sky-500",
  },
  PROPOSAL_SENT: {
    key: "PROPOSAL_SENT",
    label: "Proposal / Quote Sent",
    sublabel: "Formal offer dispatched",
    probability: 0.60,
    probabilityPercent: 60,
    headerAccent: "text-indigo-800",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700 border-indigo-200",
    borderAccent: "border-t-4 border-t-indigo-600",
    dotColor: "bg-indigo-500",
  },
  NEGOTIATION: {
    key: "NEGOTIATION",
    label: "In Negotiation",
    sublabel: "Commercial evaluation & terms",
    probability: 0.80,
    probabilityPercent: 80,
    headerAccent: "text-amber-800",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800 border-amber-200",
    borderAccent: "border-t-4 border-t-amber-500",
    dotColor: "bg-amber-500",
  },
  CLOSED_WON: {
    key: "CLOSED_WON",
    label: "Closed Won",
    sublabel: "Confirmed agreements (Accounting)",
    probability: 1.00,
    probabilityPercent: 100,
    headerAccent: "text-emerald-800",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800 border-emerald-200",
    borderAccent: "border-t-4 border-t-emerald-600",
    dotColor: "bg-emerald-500",
  },
  CLOSED_LOST: {
    key: "CLOSED_LOST",
    label: "Closed Lost",
    sublabel: "Archived with loss reason",
    probability: 0.00,
    probabilityPercent: 0,
    headerAccent: "text-rose-800",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700 border-rose-200",
    borderAccent: "border-t-4 border-t-rose-500",
    dotColor: "bg-rose-500",
  },
};

/**
 * Maps legacy status strings or stage keys to the standard 6 PipelineStageKey values
 */
export function normalizeDealStage(deal: any): PipelineStageKey {
  if (deal.stage && deal.stage in STAGE_PROBABILITIES) {
    return deal.stage as PipelineStageKey;
  }

  const status = (deal.status || "").toUpperCase();
  if (status === "ACCEPTED" || status === "WON" || status === "CLOSED_WON") {
    return "CLOSED_WON";
  }
  if (status === "REJECTED" || status === "LOST" || status === "EXPIRED" || status === "CLOSED_LOST") {
    return "CLOSED_LOST";
  }
  if (status === "IN_NEGOTIATION" || status === "NEGOTIATION") {
    return "NEGOTIATION";
  }
  if (status === "SENT" || status === "APPROVED" || status === "VIEWED" || status === "HOD_PENDING" || status === "CHANGED_PENDING" || status === "CHANGES_REQUESTED") {
    return "PROPOSAL_SENT";
  }
  if (status === "DRAFT") {
    return "QUALIFIED";
  }

  return "NEW_LEAD";
}

export function computePipelineAnalytics(deals: any[]) {
  let nominalPipelineValue = 0;
  let projectedWeightedValue = 0;
  let wonRevenue = 0;
  let activeDealsCount = 0;
  let stalledDealsCount = 0;

  deals.forEach((deal) => {
    const base =
      Number(deal.baseAmount) ||
      Number(deal.employeeCount || 0) * (Number(deal.ratePerUser) || 400.0);
    const stage = normalizeDealStage(deal);

    if (ACTIVE_PIPELINE_STAGES.includes(stage)) {
      nominalPipelineValue += base;
      projectedWeightedValue += base * (STAGE_PROBABILITIES[stage] || 0);
      activeDealsCount++;

      // Stalled check (> 7 days of inactivity)
      const lastActive = deal.lastContactedAt
        ? new Date(deal.lastContactedAt).getTime()
        : deal.updatedAt
        ? new Date(deal.updatedAt).getTime()
        : new Date(deal.createdAt).getTime();
      const diffDays = Math.floor((Date.now() - lastActive) / (1000 * 60 * 60 * 24));
      if (diffDays > 7) {
        stalledDealsCount++;
      }
    } else if (stage === "CLOSED_WON") {
      wonRevenue += base;
    }
  });

  return {
    nominalPipelineValue,
    projectedWeightedValue: Math.round(projectedWeightedValue),
    wonRevenue,
    activeDealsCount,
    stalledDealsCount,
  };
}
