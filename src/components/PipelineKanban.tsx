// src/components/PipelineKanban.tsx — Full-Width Enterprise Pipeline & Deals System
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Kanban,
  Table as TableIcon,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
  ChevronDown,
  X,
  MessageSquareWarning,
  UserCheck,
  CheckSquare,
} from "lucide-react";
import DealCard, {
  type ProposalDeal,
  type PipelineStageKey,
  type CanonicalPipelineLane,
  getProposalStage,
  isDealStalled,
  getExpiryDetails,
  formatLKR,
} from "./DealCard";
import {
  normalizePipelineStage,
  getLaneSubtotal,
} from "../utils/pipelineStatusMapper";
import PipelineFilterBar, {
  type PipelineFilterState,
} from "./PipelineFilterBar";
import LogActivityModal from "./LogActivityModal";
import ActivityTimelineDrawer from "./ActivityTimelineDrawer";
import LossReasonModal from "./LossReasonModal";

interface RepOption {
  id: number;
  fullName: string;
  email: string;
}

interface PipelineStageConfig {
  key: CanonicalPipelineLane;
  label: string;
  sublabel: string;
  probability: number;
  headerColor: string;
  badgeBg: string;
  badgeText: string;
  borderAccent: string;
  dotColor: string;
}

const STAGES: PipelineStageConfig[] = [
  {
    key: "HOD_REVIEW",
    label: "Under HOD Review",
    sublabel: "Awaiting approval",
    probability: 0.2,
    headerColor: "text-amber-800",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800 border-amber-200",
    borderAccent: "border-t-4 border-t-amber-500",
    dotColor: "bg-amber-500",
  },
  {
    key: "DISPATCHED",
    label: "Dispatched / Sent",
    sublabel: "Active client review",
    probability: 0.6,
    headerColor: "text-sky-800",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800 border-sky-200",
    borderAccent: "border-t-4 border-t-sky-500",
    dotColor: "bg-sky-500",
  },
  {
    key: "NEGOTIATION",
    label: "In Discussion / Negotiation",
    sublabel: "Commercial evaluation",
    probability: 0.8,
    headerColor: "text-purple-800",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800 border-purple-200",
    borderAccent: "border-t-4 border-t-purple-500",
    dotColor: "bg-purple-500",
  },
  {
    key: "CLOSED_WON",
    label: "Closed / Won",
    sublabel: "Confirmed agreements",
    probability: 1.0,
    headerColor: "text-emerald-800",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800 border-emerald-200",
    borderAccent: "border-t-4 border-t-emerald-600",
    dotColor: "bg-emerald-500",
  },
  {
    key: "DROPPED_LOST",
    label: "Dropped / Lost",
    sublabel: "Declined or expired",
    probability: 0.0,
    headerColor: "text-rose-800",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800 border-rose-200",
    borderAccent: "border-t-4 border-t-rose-500",
    dotColor: "bg-rose-500",
  },
];

const INITIAL_FILTERS: PipelineFilterState = {
  search: "",
  period: "all",
  fromDate: "",
  toDate: "",
  valueTier: "all",
  urgency: "all",
  company: "ALL",
  repId: "ALL",
  stage: "ALL",
};

interface PipelineKanbanProps {
  isAdmin?: boolean;
  proposals?: ProposalDeal[];
}

export default function PipelineKanban({
  isAdmin = false,
  proposals: initialProposals,
}: PipelineKanbanProps) {
  // Operational Layout Switcher: 'kanban' | 'matrix'
  const [viewMode, setViewMode] = useState<"kanban" | "matrix">("kanban");

  // Proposals & loading states
  const [proposals, setProposals] = useState<ProposalDeal[]>(initialProposals || []);
  const [loading, setLoading] = useState(!initialProposals || initialProposals.length === 0);

  useEffect(() => {
    if (initialProposals && initialProposals.length > 0) {
      setProposals(initialProposals);
      setLoading(false);
    }
  }, [initialProposals]);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Advanced Filters State
  const [filters, setFilters] = useState<PipelineFilterState>(INITIAL_FILTERS);

  // Reps list (for HOD executive filtering and reassignment)
  const [teamReps, setTeamReps] = useState<RepOption[]>([]);

  // Batch actions selection (for Matrix view)
  const [selectedDealIds, setSelectedDealIds] = useState<number[]>([]);
  const [batchStage, setBatchStage] = useState<string>("");
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Modals
  const [feedbackDeal, setFeedbackDeal] = useState<ProposalDeal | null>(null);
  const [reassignDeal, setReassignDeal] = useState<ProposalDeal | null>(null);
  const [activityDeal, setActivityDeal] = useState<ProposalDeal | null>(null);
  const [timelineDeal, setTimelineDeal] = useState<ProposalDeal | null>(null);
  const [lossDeal, setLossDeal] = useState<ProposalDeal | null>(null);
  const [newRepId, setNewRepId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch proposals
  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/proposals");
      const data = await res.json();
      if (data.success && Array.isArray(data.proposals)) {
        setProposals(data.proposals);
      } else {
        showToast("error", data.message || "Failed to load pipeline.");
      }
    } catch {
      showToast("error", "Network error while loading pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch team reps for HOD
  const fetchTeamReps = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (data.success && Array.isArray(data.team)) {
        setTeamReps(
          data.team.map((t: any) => ({
            id: t.id,
            fullName: t.fullName,
            email: t.email,
          }))
        );
      }
    } catch {
      // Fallback: derive reps from proposals
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchProposals();
    fetchTeamReps();
  }, [fetchProposals, fetchTeamReps]);

  // Derived available reps (combine team API and proposal owners)
  const availableReps = useMemo(() => {
    const map = new Map<number, RepOption>();
    teamReps.forEach((r) => map.set(r.id, r));
    proposals.forEach((p) => {
      if (p.salesUser) {
        map.set(p.salesUser.id, {
          id: p.salesUser.id,
          fullName: p.salesUser.fullName,
          email: p.salesUser.email,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [teamReps, proposals]);

  // Derived unique company names (for sales rep filter)
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach((p) => {
      if (p.clientName) set.add(p.clientName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [proposals]);

  // Status transition handler (calls PATCH /api/proposals/[id]/status)
  const handleStageChange = async (
    proposalId: number,
    targetStage: CanonicalPipelineLane | PipelineStageKey | string
  ) => {
    const deal = proposals.find((p) => p.id === proposalId);
    if (!deal) return;

    // Rep gatekeeping check: cannot move unapproved proposal into DISPATCHED, NEGOTIATION, WON
    const currentStage = normalizePipelineStage(deal);
    if (!isAdmin && currentStage === "HOD_REVIEW" && targetStage !== "DROPPED_LOST" && targetStage !== "CLOSED_LOST") {
      showToast(
        "error",
        "Cannot move unapproved proposal to Dispatched. Proposal requires executive HOD approval."
      );
      return;
    }

    if (targetStage === "HOD_REVIEW" && currentStage !== "HOD_REVIEW") {
      showToast("error", "Cannot move live proposal back into HOD Review.");
      return;
    }

    if (targetStage === "DROPPED_LOST" || targetStage === "CLOSED_LOST") {
      setLossDeal(deal);
      return;
    }

    const stageToStatusMap: Record<string, { stage: string; status: string }> = {
      HOD_REVIEW: { stage: "PROPOSAL_SENT", status: "HOD_PENDING" },
      DISPATCHED: { stage: "PROPOSAL_SENT", status: "SENT" },
      NEGOTIATION: { stage: "NEGOTIATION", status: "IN_NEGOTIATION" },
      CLOSED_WON: { stage: "CLOSED_WON", status: "ACCEPTED" },
      DROPPED_LOST: { stage: "CLOSED_LOST", status: "REJECTED" },
      NEW_LEAD: { stage: "NEW_LEAD", status: "DRAFT" },
      QUALIFIED: { stage: "QUALIFIED", status: "DRAFT" },
      PROPOSAL_SENT: { stage: "PROPOSAL_SENT", status: "SENT" },
      CLOSED_LOST: { stage: "CLOSED_LOST", status: "REJECTED" },
    };

    const targetInfo = stageToStatusMap[targetStage] || { stage: targetStage, status: targetStage };

    // Optimistic UI update
    const previousProposals = [...proposals];
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              stage: targetInfo.stage as any,
              status: targetInfo.status as any,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    try {
      setUpdatingId(proposalId);
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: targetInfo.stage, status: targetInfo.status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          "success",
          `Moved ${deal.proposalId} to ${STAGES.find((s) => s.key === targetStage)?.label || targetStage}`
        );
        if (data.proposal) {
          setProposals((prev) =>
            prev.map((p) => (p.id === proposalId ? { ...p, ...data.proposal } : p))
          );
        }
      } else {
        setProposals(previousProposals);
        showToast("error", data.message || "Failed to update deal stage.");
      }
    } catch {
      setProposals(previousProposals);
      showToast("error", "Network error updating stage.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Reassignment handler (for HOD)
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignDeal || !newRepId) return;

    const repNum = Number(newRepId);
    const chosenRep = availableReps.find((r) => r.id === repNum);
    if (!chosenRep) return;

    try {
      setIsReassigning(true);
      const res = await fetch(`/api/proposals/${reassignDeal.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reassignDeal.status,
          salesUserId: repNum,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Reassigned ${reassignDeal.proposalId} to ${chosenRep.fullName}.`);
        setProposals((prev) =>
          prev.map((p) =>
            p.id === reassignDeal.id
              ? {
                  ...p,
                  salesUserId: repNum,
                  salesUser: {
                    id: chosenRep.id,
                    fullName: chosenRep.fullName,
                    email: chosenRep.email,
                    mobileNumber: "",
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
        setReassignDeal(null);
        setNewRepId("");
      } else {
        showToast("error", data.message || "Failed to reassign proposal.");
      }
    } catch {
      showToast("error", "Network error reassigning deal.");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleFollowUpSuccess = (dealId: number, newLastContactedAt: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === dealId ? { ...p, lastContactedAt: newLastContactedAt } : p))
    );
    showToast("success", "Formal follow-up notice dispatched to client.");
  };

  const handleActivitySuccess = (newActivity: any, lastContactedAt: string) => {
    if (activityDeal) {
      setProposals((prev) =>
        prev.map((p) => (p.id === activityDeal.id ? { ...p, lastContactedAt } : p))
      );
    }
    showToast("success", "Client touchpoint logged successfully.");
  };

  const handleLossSuccess = (updated: any) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? { ...p, status: updated.status, lossReason: updated.lossReason, lossNotes: updated.lossNotes }
          : p
      )
    );
    showToast("success", `Proposal ${updated.proposalId} recorded as Lost.`);
  };

  // Batch actions handler (Matrix view)
  const handleBatchStageApply = async () => {
    if (!batchStage || selectedDealIds.length === 0) return;
    const targetStage = batchStage as CanonicalPipelineLane;

    setIsBatchUpdating(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedDealIds) {
      const deal = proposals.find((p) => p.id === id);
      if (!deal) continue;

      const curStage = normalizePipelineStage(deal);
      if (!isAdmin && curStage === "HOD_REVIEW" && targetStage !== "DROPPED_LOST") {
        failCount++;
        continue;
      }

      const stageToStatusMap: Record<string, { stage: string; status: string }> = {
        HOD_REVIEW: { stage: "PROPOSAL_SENT", status: "HOD_PENDING" },
        DISPATCHED: { stage: "PROPOSAL_SENT", status: "SENT" },
        NEGOTIATION: { stage: "NEGOTIATION", status: "IN_NEGOTIATION" },
        CLOSED_WON: { stage: "CLOSED_WON", status: "ACCEPTED" },
        DROPPED_LOST: { stage: "CLOSED_LOST", status: "REJECTED" },
      };

      const targetInfo = stageToStatusMap[targetStage] || { stage: targetStage, status: targetStage };

      try {
        const res = await fetch(`/api/proposals/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: targetInfo.stage, status: targetInfo.status }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setIsBatchUpdating(false);
    setSelectedDealIds([]);
    setBatchStage("");
    fetchProposals();

    if (failCount === 0) {
      showToast("success", `Updated ${successCount} deal(s) to ${targetStage}.`);
    } else {
      showToast(
        "error",
        `Updated ${successCount} deal(s). ${failCount} deal(s) were skipped due to review gatekeeping.`
      );
    }
  };

  // ── MULTI-FILTER EVALUATION LOGIC ──────────────────────────────────────────
  const filteredProposals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return proposals.filter((p) => {
      const curStage = normalizePipelineStage(p);
      const totalAmt = Number(p.totalAmount) || 0;
      const expiry = getExpiryDetails(p.expiryDate);
      const stalled = isDealStalled(p);

      // 1. Rep filter (HOD)
      if (isAdmin && filters.repId !== "ALL") {
        if (String(p.salesUserId) !== filters.repId) return false;
      }

      // 2. Company filter (Sales Rep)
      if (!isAdmin && filters.company !== "ALL") {
        if (p.clientName !== filters.company) return false;
      }

      // 3. Matrix View Stage filter
      if (filters.stage !== "ALL") {
        const filterLane = normalizePipelineStage(filters.stage);
        if (curStage !== filters.stage && curStage !== filterLane) return false;
      }

      // 4. Period / Validity filter
      if (filters.period === "this_month") {
        const dateToCheck = p.proposalDate ? new Date(p.proposalDate) : new Date(p.createdAt);
        if (dateToCheck.getMonth() !== currentMonth || dateToCheck.getFullYear() !== currentYear) {
          return false;
        }
      } else if (filters.period === "expiring_soon") {
        if (expiry.daysLeft < 0 || expiry.daysLeft > 5 || curStage === "CLOSED_WON" || curStage === "DROPPED_LOST") {
          return false;
        }
      }

      // 5. Date Range Pickers (From → To based on proposalDate)
      if (filters.fromDate) {
        const fromTimestamp = new Date(filters.fromDate).getTime();
        const pTimestamp = p.proposalDate ? new Date(p.proposalDate).getTime() : new Date(p.createdAt).getTime();
        if (pTimestamp < fromTimestamp) return false;
      }
      if (filters.toDate) {
        const toTimestamp = new Date(filters.toDate + "T23:59:59").getTime();
        const pTimestamp = p.proposalDate ? new Date(p.proposalDate).getTime() : new Date(p.createdAt).getTime();
        if (pTimestamp > toTimestamp) return false;
      }

      // 6. Deal Value Tier Filter
      if (filters.valueTier === "under_500") {
        if (totalAmt >= 500) return false;
      } else if (filters.valueTier === "500_to_1000") {
        if (totalAmt < 500 || totalAmt > 1000) return false;
      } else if (filters.valueTier === "over_1000") {
        if (totalAmt <= 1000) return false;
      }

      // 7. Deal Urgency & Velocity Filter
      if (filters.urgency === "critical") {
        // Expiring < 48 hours and in active stage
        if (expiry.daysLeft < 0 || expiry.daysLeft > 2 || curStage === "CLOSED_WON" || curStage === "DROPPED_LOST") {
          return false;
        }
      } else if (filters.urgency === "active") {
        if (curStage === "CLOSED_WON" || curStage === "DROPPED_LOST") return false;
      } else if (filters.urgency === "stalled") {
        if (!stalled.isStalled) return false;
      }

      // 8. Real-Time Search Match
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = p.clientName.toLowerCase().includes(q);
        const matchesId = p.proposalId.toLowerCase().includes(q);
        const matchesEmail = p.clientEmail.toLowerCase().includes(q);
        const matchesPhone = p.clientPhone ? p.clientPhone.toLowerCase().includes(q) : false;
        const matchesRep = p.salesUser?.fullName?.toLowerCase().includes(q);
        return matchesName || matchesId || matchesEmail || matchesPhone || matchesRep;
      }

      return true;
    });
  }, [proposals, isAdmin, filters]);

  // Group proposals safely using the normalizer (Blueprint Section 2)
  const laneData = useMemo(() => {
    const lanes: Record<CanonicalPipelineLane, ProposalDeal[]> = {
      HOD_REVIEW: [],
      DISPATCHED: [],
      NEGOTIATION: [],
      CLOSED_WON: [],
      DROPPED_LOST: [],
    };

    filteredProposals.forEach((proposal) => {
      const lane = normalizePipelineStage(proposal);
      if (lanes[lane]) {
        lanes[lane].push(proposal);
      }
    });

    return lanes;
  }, [filteredProposals]);

  // ── DYNAMIC TOP METRIC STRIP (Blueprint Section 4) ──────────────────────────
  const metrics = useMemo(() => {
    const dispatchedBase = getLaneSubtotal(laneData.DISPATCHED);
    const negotiationBase = getLaneSubtotal(laneData.NEGOTIATION);
    const wonBase = getLaneSubtotal(laneData.CLOSED_WON);

    // 1. Total Active Pipeline: getLaneSubtotal(laneData.DISPATCHED) + getLaneSubtotal(laneData.NEGOTIATION)
    const totalActivePipeline = dispatchedBase + negotiationBase;

    // 2. Projected Weighted Value: (getLaneSubtotal(laneData.DISPATCHED) * 0.6) + (getLaneSubtotal(laneData.NEGOTIATION) * 0.8)
    const projectedWeightedValue = Math.round(dispatchedBase * 0.6 + negotiationBase * 0.8);

    // 3. Closed Won Revenue: getLaneSubtotal(laneData.CLOSED_WON)
    const closedWonRevenue = wonBase;

    let stalledCount = 0;
    filteredProposals.forEach((p) => {
      if (isDealStalled(p).isStalled) {
        stalledCount++;
      }
    });

    return {
      totalActivePipeline,
      projectedWeightedValue,
      closedWonRevenue,
      stalledDealsCount: stalledCount,
      activeDealsCount: laneData.DISPATCHED.length + laneData.NEGOTIATION.length,
    };
  }, [laneData, filteredProposals]);

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: CanonicalPipelineLane) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("text/plain");
    if (!dataStr) return;
    try {
      const { dealId } = JSON.parse(dataStr);
      if (dealId) {
        handleStageChange(Number(dealId), targetStage);
      }
    } catch {
      // Ignore invalid drag payload
    }
  };

  // CSV Export (Downloads currently filtered deals)
  const handleExportCSV = () => {
    if (filteredProposals.length === 0) {
      showToast("error", "No deals available matching active filters to export.");
      return;
    }

    const headers = [
      "Proposal ID",
      "Client Organization",
      "Client Email",
      "Client Phone",
      "Sales Representative",
      "Pipeline Stage",
      "Raw Status",
      "Staff Scope",
      "Base Amount (LKR)",
      "Total Amount (LKR)",
      "Issued Date",
      "Expiry Date",
      "Last Activity",
    ];

    const rows = filteredProposals.map((p) => [
      `"${p.proposalId}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      `"${p.clientEmail}"`,
      `"${p.clientPhone || ""}"`,
      `"${p.salesUser?.fullName || "Unassigned"}"`,
      `"${STAGES.find((s) => s.key === getProposalStage(p))?.label || getProposalStage(p)}"`,
      `"${p.status}"`,
      p.employeeCount,
      Number(p.baseAmount).toFixed(2),
      Number(p.totalAmount).toFixed(2),
      p.proposalDate ? new Date(p.proposalDate).toLocaleDateString("en-GB") : "",
      p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-GB") : "",
      p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-GB") : "",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Zynolo_Pipeline_Deals_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("success", `Exported ${filteredProposals.length} deal(s) to CSV.`);
  };

  return (
    <div className="w-full space-y-6">
      {/* ── TOAST NOTIFICATION ────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-sm font-semibold transition-all animate-slide-up ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          )}
          <span className="font-sans">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── TOP HEADER & OPERATIONAL VIEW SWITCHER ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-2xl text-slate-900 tracking-tight flex items-center gap-2.5">
            <Kanban className="text-red-600" size={26} />
            {isAdmin ? "Enterprise Commercial Pipeline & Deal Board" : "Sales Pipeline & Deal Management"}
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            {isAdmin
              ? "Executive department-wide oversight of commercial stages, weighted velocity, and team deal conversions."
              : "Track active engagements, advance client discussions, and convert commercial proposals to signed agreements."}
          </p>
        </div>

        {/* View Switcher & Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex bg-slate-200/80 p-1 rounded-xl text-xs font-heading font-medium">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Kanban size={14} />
              <span>Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon size={14} />
              <span>Deal Matrix</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-heading font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── DYNAMIC TOP METRIC STRIP (RECOMPUTES BASED ON ACTIVE FILTERS) ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* 1. Total Active Pipeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">
              Total Active Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-heading font-semibold text-slate-900 tabular-nums">
            {formatLKR(metrics.totalActivePipeline)}
          </div>
          <div className="text-xs text-slate-500 font-sans mt-1">
            Approved / Sent &amp; In Negotiation (Excl. HOD Review)
          </div>
        </div>

        {/* 2. Projected Weighted Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">
              Projected Weighted Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-heading font-semibold text-purple-700 tabular-nums">
            {formatLKR(metrics.projectedWeightedValue)}
          </div>
          <div className="text-xs text-slate-500 font-sans mt-1">
            (Dispatched &times; 0.6) + (Negotiation &times; 0.8)
          </div>
        </div>

        {/* 3. Closed Won Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">
              Closed Won Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Trophy size={16} />
            </div>
          </div>
          <div className="text-2xl font-heading font-semibold text-emerald-600 tabular-nums">
            {formatLKR(metrics.closedWonRevenue)}
          </div>
          <div className="text-xs text-slate-500 font-sans mt-1">
            Confirmed signed agreements
          </div>
        </div>

        {/* 4. Stalled Deals Alert (Clickable to toggle stalled filter) */}
        <div
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              urgency: prev.urgency === "stalled" ? "all" : "stalled",
            }))
          }
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs relative overflow-hidden ${
            filters.urgency === "stalled"
              ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30"
              : "bg-white border-slate-200/90 hover:border-amber-300"
          }`}
          title="Click to toggle stalled deals filter"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">
              Stalled Deals Alert
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                metrics.stalledDealsCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              <AlertTriangle size={16} />
            </div>
          </div>
          <div
            className={`text-2xl font-heading font-semibold tabular-nums ${
              metrics.stalledDealsCount > 0 ? "text-amber-700" : "text-slate-900"
            }`}
          >
            {metrics.stalledDealsCount}
          </div>
          <div className="text-xs text-slate-500 font-sans mt-1 flex items-center justify-between">
            <span>&gt; 7 days without stage movement</span>
            {filters.urgency === "stalled" && (
              <span className="font-semibold text-amber-700 underline text-[11px]">Filter Active</span>
            )}
          </div>
        </div>
      </div>

      {/* ── ADVANCED MULTI-FILTER TOOLBAR (REUSABLE COMPONENT) ─────────────── */}
      <PipelineFilterBar
        isAdmin={isAdmin}
        filters={filters}
        onChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onReset={() => setFilters(INITIAL_FILTERS)}
        reps={availableReps}
        companies={availableCompanies}
        totalCount={proposals.length}
        filteredCount={filteredProposals.length}
        viewMode={viewMode}
      />

      {/* ── VIEW 1: FULL-WIDTH FLUID KANBAN BOARD (5-COLUMN CSS GRID) ──────── */}
      {viewMode === "kanban" && (
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full items-start">
            {STAGES.map((col) => {
              const stageDeals = laneData[col.key] || [];
              const subtotal = getLaneSubtotal(stageDeals);

              return (
                <div
                  key={col.key}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`w-full border border-slate-200 bg-slate-50/70 rounded-xl p-3 flex flex-col gap-3 min-h-[550px] transition-colors ${col.borderAccent}`}
                >
                  {/* Column Header with Metrics */}
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} flex-shrink-0`} />
                        <h3 className="font-heading font-semibold text-sm text-slate-800 truncate">
                          {col.label}
                        </h3>
                      </div>
                      <span
                        className={`text-[11px] font-heading font-semibold px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText} flex-shrink-0 border`}
                      >
                        {stageDeals.length} deals
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-sans text-slate-500 pt-2 border-t border-slate-100">
                      <span>{col.key === "HOD_REVIEW" ? "Awaiting Review:" : "Subtotal:"}</span>
                      <span className="font-heading font-semibold text-slate-900 tabular-nums">
                        LKR {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {col.key === "HOD_REVIEW" && (
                      <div className="text-[10px] text-amber-700 font-medium pt-1">
                        Pending approval &bull; Excluded from pipeline
                      </div>
                    )}
                  </div>

                  {/* Cards Lane / Drop Target */}
                  <div className="flex-1 space-y-3">
                    {loading ? (
                      <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-red-600" />
                        <span className="text-xs font-sans">Loading deals...</span>
                      </div>
                    ) : stageDeals.length === 0 ? (
                      <div className="h-36 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <FileText size={22} className="mb-1 text-slate-300" />
                        <span className="text-xs font-medium font-sans">No proposals in this stage</span>
                        <span className="text-[10px] text-slate-400 font-sans mt-0.5">Drop deal here</span>
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          isAdmin={isAdmin}
                          onStageChange={handleStageChange}
                          onOpenFeedback={(d) => setFeedbackDeal(d)}
                          onOpenReassign={(d) => {
                            setReassignDeal(d);
                            setNewRepId(String(d.salesUserId));
                          }}
                          onOpenActivityModal={(d) => setActivityDeal(d)}
                          onOpenTimelineDrawer={(d) => setTimelineDeal(d)}
                          onOpenLossModal={(d) => setLossDeal(d)}
                          onFollowUpSuccess={handleFollowUpSuccess}
                          isUpdating={updatingId === deal.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: DENSE DEAL MATRIX VIEW ───────────────────────────────── */}
      {viewMode === "matrix" && (
        <div className="space-y-4 w-full">
          {/* Batch Actions Toolbar */}
          {selectedDealIds.length > 0 && (
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-slide-up">
              <div className="flex items-center gap-2 text-xs font-heading font-medium">
                <CheckSquare size={16} className="text-red-500" />
                <span>{selectedDealIds.length} proposal(s) selected</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <select
                    value={batchStage}
                    onChange={(e) => setBatchStage(e.target.value)}
                    className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 font-heading font-medium cursor-pointer"
                  >
                    <option value="">Move selected to Stage...</option>
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!batchStage || isBatchUpdating}
                    onClick={handleBatchStageApply}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-heading font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isBatchUpdating ? <Loader2 size={13} className="animate-spin" /> : "Apply Stage"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDealIds([])}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-heading font-semibold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredProposals.length > 0 &&
                          selectedDealIds.length === filteredProposals.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDealIds(filteredProposals.map((p) => p.id));
                          } else {
                            setSelectedDealIds([]);
                          }
                        }}
                        className="rounded border-slate-700 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Proposal ID</th>
                    <th className="py-3.5 px-4">Client Organization</th>
                    {isAdmin && <th className="py-3.5 px-4">Sales Rep</th>}
                    <th className="py-3.5 px-3 text-center">Staff Scope</th>
                    <th className="py-3.5 px-4 text-right">Total Investment</th>
                    <th className="py-3.5 px-4">Pipeline Stage</th>
                    <th className="py-3.5 px-4">Validity / Expiry</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-800 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-16 text-center text-slate-400">
                        <Loader2 size={28} className="animate-spin text-red-600 mx-auto mb-2" />
                        <p className="text-xs">Loading commercial pipeline matrix...</p>
                      </td>
                    </tr>
                  ) : filteredProposals.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-16 text-center text-slate-400">
                        <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                        <h4 className="font-heading font-semibold text-sm text-slate-800">
                          No pipeline proposals match active criteria
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting search terms or clearing filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProposals.map((deal) => {
                      const curStage = getProposalStage(deal);
                      const stageCfg = STAGES.find((s) => s.key === curStage);
                      const expiry = getExpiryDetails(deal.expiryDate);
                      const stalled = isDealStalled(deal);
                      const isSelected = selectedDealIds.includes(deal.id);

                      return (
                        <tr
                          key={deal.id}
                          className={`hover:bg-slate-50/75 transition-colors ${
                            isSelected ? "bg-red-50/20" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDealIds((prev) => [...prev, deal.id]);
                                } else {
                                  setSelectedDealIds((prev) => prev.filter((id) => id !== deal.id));
                                }
                              }}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-red-600 text-xs">
                              {deal.proposalId}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              Issued: {deal.proposalDate ? new Date(deal.proposalDate).toLocaleDateString("en-GB") : ""}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-heading font-semibold text-slate-900 text-sm">
                              {deal.clientName}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{deal.clientEmail}</span>
                              {deal.clientPhone && (
                                <>
                                  <span className="text-slate-300">&bull;</span>
                                  <span>{deal.clientPhone}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {isAdmin && (
                            <td className="py-3.5 px-4">
                              {deal.salesUser ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-heading font-semibold text-[10px] flex-shrink-0">
                                    {deal.salesUser.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-slate-800 truncate text-xs">
                                      {deal.salesUser.fullName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {deal.salesUser.email}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                          )}

                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 text-[11px]">
                              {deal.employeeCount}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="font-heading font-semibold text-slate-900 text-sm tabular-nums">
                              {formatLKR(deal.totalAmount)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              Base: {formatLKR(deal.baseAmount)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {!isAdmin && curStage === "HOD_REVIEW" ? (
                              <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-300">
                                HOD Approval Pending
                              </span>
                            ) : (
                              <div className="relative inline-block w-48">
                                <select
                                  value={curStage}
                                  onChange={(e) =>
                                    handleStageChange(deal.id, e.target.value as CanonicalPipelineLane)
                                  }
                                  className={`w-full text-[11px] font-heading font-medium py-1.5 pl-2.5 pr-6 rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500 truncate ${
                                    stageCfg?.badgeBg
                                  } ${stageCfg?.badgeText}`}
                                >
                                  {STAGES.filter((s) => isAdmin || s.key !== "HOD_REVIEW").map((s) => (
                                    <option
                                      key={s.key}
                                      value={s.key}
                                      disabled={!isAdmin && curStage === "HOD_REVIEW" && s.key !== "DROPPED_LOST"}
                                    >
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  size={12}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                                />
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-800 text-xs font-medium">
                              {deal.expiryDate ? new Date(deal.expiryDate).toLocaleDateString("en-GB") : ""}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {expiry.isExpired ? (
                                <span className="inline-flex items-center text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                                  Expired
                                </span>
                              ) : expiry.isExpiringSoon ? (
                                <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                  {expiry.daysLeft}d left
                                </span>
                              ) : null}

                              {stalled && (
                                <span className="inline-flex items-center text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                                  Stalled
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(deal.hodComment ||
                                deal.status === "CHANGES_REQUESTED" ||
                                deal.status === "REJECTED") && (
                                <button
                                  type="button"
                                  onClick={() => setFeedbackDeal(deal)}
                                  title="View Executive HOD Review Feedback"
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200 cursor-pointer"
                                >
                                  <MessageSquareWarning size={14} />
                                </button>
                              )}

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReassignDeal(deal);
                                    setNewRepId(String(deal.salesUserId));
                                  }}
                                  title="Reassign proposal to another Sales Rep"
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <UserCheck size={14} />
                                </button>
                              )}

                              <a
                                href={`/api/proposals/${deal.id}/pdf`}
                                download={`Proposal_${deal.proposalId}.pdf`}
                                title="Download Official Proposal PDF"
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW HOD FEEDBACK & INSTRUCTIONS ──────────────────────── */}
      {feedbackDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <MessageSquareWarning size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-slate-900">
                    Executive Review Feedback
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Proposal <span className="font-mono font-bold text-red-600">{feedbackDeal.proposalId}</span> &bull; {feedbackDeal.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackDeal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Review Decision:</span>
                  <span className="font-bold px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                    {feedbackDeal.status === "REJECTED" ? "Proposal Rejected" : "Revisions Requested"}
                  </span>
                </div>
                {feedbackDeal.reviewedBy && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-500">Reviewed By:</span>
                    <span className="font-semibold">{feedbackDeal.reviewedBy}</span>
                  </div>
                )}
                {feedbackDeal.reviewedAt && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-500">Review Date:</span>
                    <span>
                      {new Date(feedbackDeal.reviewedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  HOD Feedback &amp; Revision Instructions:
                </label>
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs font-medium text-slate-900 leading-relaxed whitespace-pre-wrap font-sans">
                  {feedbackDeal.hodComment || "No written explanation provided."}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFeedbackDeal(null)}
                  className="px-4 py-2 text-xs font-heading font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={`/proposals/${feedbackDeal.id}/edit`}
                  className="px-4 py-2 text-xs font-heading font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  Edit &amp; Resubmit Proposal
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EXECUTIVE REASSIGN PROPOSAL (HOD ONLY) ─────────────────── */}
      {isAdmin && reassignDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-slate-900">
                    Reassign Commercial Proposal
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Proposal <span className="font-mono font-bold text-red-600">{reassignDeal.proposalId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignDeal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client:</span>
                  <span className="font-bold text-slate-800">{reassignDeal.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Owner:</span>
                  <span className="font-semibold text-slate-800">
                    {reassignDeal.salesUser?.fullName || "Unassigned"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Commercial Amount:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {formatLKR(reassignDeal.totalAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-medium uppercase tracking-wider text-slate-700 mb-1.5">
                  Assign To Sales Representative <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <select
                    value={newRepId}
                    onChange={(e) => setNewRepId(e.target.value)}
                    required
                    className="w-full text-xs font-heading font-medium py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none cursor-pointer"
                  >
                    <option value="">Select Representative...</option>
                    {availableReps.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.fullName} ({r.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  The selected sales representative will immediately inherit management and pipeline ownership of this deal.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReassignDeal(null)}
                  className="px-4 py-2 text-xs font-heading font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRepId || isReassigning}
                  className="px-5 py-2 text-xs font-heading font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isReassigning && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm Reassignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CLIENT TOUCHPOINT LOGGING MODAL ───────────────────────── */}
      {activityDeal && (
        <LogActivityModal
          proposal={activityDeal}
          isOpen={!!activityDeal}
          onClose={() => setActivityDeal(null)}
          onSuccess={handleActivitySuccess}
        />
      )}

      {/* ── INTERACTION TIMELINE FEED DRAWER ─────────────────────── */}
      {timelineDeal && (
        <ActivityTimelineDrawer
          proposal={timelineDeal}
          isOpen={!!timelineDeal}
          onClose={() => setTimelineDeal(null)}
          onOpenLogModal={() => {
            setActivityDeal(timelineDeal);
            setTimelineDeal(null);
          }}
        />
      )}

      {/* ── DEAL LOSS ROOT-CAUSE MODAL ────────────────────────────── */}
      {lossDeal && (
        <LossReasonModal
          proposal={lossDeal}
          isOpen={!!lossDeal}
          onClose={() => setLossDeal(null)}
          onSuccess={handleLossSuccess}
        />
      )}
    </div>
  );
}
