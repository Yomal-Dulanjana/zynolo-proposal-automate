// src/components/DealCard.tsx — Advanced Commercial Deal Card for Pipeline Swimlanes
import React, { useState } from "react";
import {
  Clock,
  User,
  Phone,
  FileText,
  Download,
  MessageSquareWarning,
  UserCheck,
  ChevronDown,
  AlertTriangle,
  History,
  Building2,
  MessageSquare,
  Plus,
  Send,
  Loader2,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  type PipelineStageKey,
  STAGE_PROBABILITIES,
  normalizeDealStage,
} from "../utils/pipelineCalculations.js";
import {
  type CanonicalPipelineLane,
  normalizePipelineStage,
} from "../utils/pipelineStatusMapper.js";

export type { PipelineStageKey, CanonicalPipelineLane };

export interface ProposalDeal {
  id: number;
  proposalId: string;
  version?: string;
  status: string;
  stage?: PipelineStageKey | CanonicalPipelineLane | string;
  isHodApproved?: boolean;
  probability?: number;
  ratePerUser?: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  clientAddress?: string;
  employeeCount: number;
  baseAmount: number;
  vatAmount?: number;
  totalAmount: number;
  proposalDate: string;
  expiryDate: string;
  pdfPath?: string;
  hodComment?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  lastContactedAt?: string | null;
  lossReason?: string | null;
  lossNotes?: string | null;
  cogsEstimated?: number | null;
  salesUserId: number;
  salesUser?: {
    id: number;
    fullName: string;
    email: string;
    mobileNumber: string;
  };
}

export function getProposalStage(p: ProposalDeal): CanonicalPipelineLane {
  return normalizePipelineStage(p);
}

export function isDealStalled(p: ProposalDeal): { isStalled: boolean; daysInactive: number } {
  const stage = getProposalStage(p);
  if (stage === "CLOSED_WON" || stage === "DROPPED_LOST" || (stage as string) === "CLOSED_LOST") {
    return { isStalled: false, daysInactive: 0 };
  }
  const lastActive = p.lastContactedAt
    ? new Date(p.lastContactedAt).getTime()
    : p.updatedAt
    ? new Date(p.updatedAt).getTime()
    : new Date(p.createdAt).getTime();
  const diffDays = Math.floor((Date.now() - lastActive) / (1000 * 60 * 60 * 24));
  return { isStalled: diffDays > 7, daysInactive: diffDays };
}

export function getLastContactBadge(p: ProposalDeal): { text: string; isFresh: boolean } {
  const ts = p.lastContactedAt || p.updatedAt || p.createdAt;
  if (!ts) return { text: "No touchpoints", isFresh: false };
  const diffDays = Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { text: "Contacted Today", isFresh: true };
  if (diffDays === 1) return { text: "Contacted Yesterday", isFresh: true };
  return { text: `Last Contact: ${diffDays}d ago`, isFresh: diffDays <= 3 };
}

export function sanitizeSriLankanPhone(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "94" + digits.substring(1);
  } else if (!digits.startsWith("94") && digits.length === 9) {
    digits = "94" + digits;
  }
  return digits;
}

export function getExpiryDetails(expiryDateStr: string) {
  const expiry = new Date(expiryDateStr).getTime();
  const now = Date.now();
  const diffTime = expiry - now;
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    isExpired: daysLeft < 0,
    isExpiringToday: daysLeft === 0,
    isExpiringSoon: daysLeft > 0 && daysLeft <= 5,
    daysLeft,
  };
}

export function formatLKR(amount: number | string): string {
  const num = Number(amount) || 0;
  return `LKR ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface DealCardProps {
  deal: ProposalDeal;
  isAdmin: boolean;
  onStageChange: (dealId: number, targetStage: CanonicalPipelineLane | PipelineStageKey | string) => void;
  onOpenFeedback?: (deal: ProposalDeal) => void;
  onOpenReassign?: (deal: ProposalDeal) => void;
  onOpenActivityModal?: (deal: ProposalDeal) => void;
  onOpenTimelineDrawer?: (deal: ProposalDeal) => void;
  onOpenLossModal?: (deal: ProposalDeal) => void;
  onFollowUpSuccess?: (dealId: number, newLastContactedAt: string) => void;
  isUpdating?: boolean;
}

export default function DealCard({
  deal,
  isAdmin,
  onStageChange,
  onOpenFeedback,
  onOpenReassign,
  onOpenActivityModal,
  onOpenTimelineDrawer,
  onOpenLossModal,
  onFollowUpSuccess,
  isUpdating = false,
}: DealCardProps) {
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [followUpMsg, setFollowUpMsg] = useState<string | null>(null);

  const currentStage = getProposalStage(deal);
  const expiry = getExpiryDetails(deal.expiryDate);
  const { isStalled, daysInactive } = isDealStalled(deal);
  const contactBadge = getLastContactBadge(deal);

  const isPendingHodApproval =
    deal.status === "HOD_PENDING" ||
    deal.status === "CHANGED_PENDING" ||
    deal.status === "CHANGES_REQUESTED" ||
    deal.isHodApproved === false ||
    currentStage === "HOD_REVIEW";

  const hasFeedback =
    !!deal.hodComment ||
    deal.status === "CHANGES_REQUESTED" ||
    deal.status === "REJECTED";

  // Accent border class for all stages/lanes
  const accentClasses: Record<string, string> = {
    HOD_REVIEW: "border-l-4 border-l-amber-500",
    DISPATCHED: "border-l-4 border-l-sky-500",
    NEGOTIATION: "border-l-4 border-l-purple-500",
    CLOSED_WON: "border-l-4 border-l-emerald-600",
    DROPPED_LOST: "border-l-4 border-l-rose-500",
    NEW_LEAD: "border-l-4 border-l-slate-400",
    QUALIFIED: "border-l-4 border-l-sky-500",
    PROPOSAL_SENT: "border-l-4 border-l-indigo-600",
    CLOSED_LOST: "border-l-4 border-l-rose-500",
  };

  const STAGE_OPTIONS: { key: string; label: string; prob: string; disabledForRep?: boolean }[] = [
    { key: "HOD_REVIEW", label: "Under HOD Review", prob: "Pending", disabledForRep: true },
    { key: "DISPATCHED", label: "Dispatched / Sent (60%)", prob: "60%", disabledForRep: isPendingHodApproval },
    { key: "NEGOTIATION", label: "In Negotiation (80%)", prob: "80%", disabledForRep: isPendingHodApproval },
    { key: "CLOSED_WON", label: "Closed Won (100%)", prob: "100%", disabledForRep: isPendingHodApproval },
    { key: "DROPPED_LOST", label: "Dropped / Lost (0%)", prob: "0%", disabledForRep: false },
  ];

  const STAGE_PROBS: Record<string, number> = {
    HOD_REVIEW: 0.20,
    DISPATCHED: 0.60,
    NEGOTIATION: 0.80,
    CLOSED_WON: 1.00,
    DROPPED_LOST: 0.00,
    NEW_LEAD: 0.10,
    QUALIFIED: 0.30,
    PROPOSAL_SENT: 0.60,
    CLOSED_LOST: 0.00,
  };

  // Financial Base & Weighted Calculation
  const baseAmount = Number(deal.baseAmount) || (Number(deal.employeeCount || 0) * (Number(deal.ratePerUser) || 400.0));
  const probability = STAGE_PROBS[currentStage] ?? 0;
  const weightedValue = Math.round(baseAmount * probability);

  // 1-Click WhatsApp Pitch Generator
  const cleanPhone = sanitizeSriLankanPhone(deal.clientPhone);
  const whatsappPitchText = encodeURIComponent(
    `Dear ${deal.clientName}, greetings from D TECH Solutions. We have officially dispatched proposal ${deal.proposalId} for Zynolo People HRM (${deal.employeeCount} Employees, All-Inclusive Flat LKR 400.00/head) to your email. Please let us know when it would be convenient for a quick 15-minute system demonstration.`
  );
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappPitchText}` : null;

  // 1-Click Follow-up Email Dispatcher
  const handleSendFollowUp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSendingFollowUp(true);
    setFollowUpMsg(null);
    try {
      const res = await fetch(`/api/proposals/${deal.id}/follow-up`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFollowUpMsg("Sent!");
        if (onFollowUpSuccess && data.lastContactedAt) {
          onFollowUpSuccess(deal.id, data.lastContactedAt);
        }
        setTimeout(() => setFollowUpMsg(null), 3000);
      } else {
        alert(data.message || "Failed to dispatch follow-up email.");
      }
    } catch {
      alert("Network error sending follow-up email.");
    } finally {
      setSendingFollowUp(false);
    }
  };

  const isTerminalLost =
    currentStage === "CLOSED_LOST" || currentStage === "DROPPED_LOST" || deal.status === "REJECTED";

  const handleStageSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isTerminalLost) return;
    const target = e.target.value as any;
    if ((target === "DROPPED_LOST" || target === "CLOSED_LOST") && onOpenLossModal) {
      onOpenLossModal(deal);
    } else {
      onStageChange(deal.id, target);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isTerminalLost || (!isAdmin && isPendingHodApproval && currentStage === "HOD_REVIEW")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", JSON.stringify({ dealId: deal.id, currentStage }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable={!isUpdating && !isTerminalLost && (isAdmin || !isPendingHodApproval)}
      onDragStart={handleDragStart}
      className={`group w-full bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all ${
        isTerminalLost || (!isAdmin && isPendingHodApproval && currentStage === "HOD_REVIEW")
          ? "cursor-default"
          : "cursor-grab active:cursor-grabbing"
      } relative select-none ${
        accentClasses[currentStage] || "border-l-4 border-l-slate-400"
      } ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* ── CARD TOP: PROPOSAL ID + PROBABILITY / HOD BADGE ───── */}
      <div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-red-600 tracking-tight">
            {deal.proposalId}
          </span>
          {deal.version && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              v{deal.version}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap justify-end">
          {/* HOD Status / Win Probability Pill */}
          {currentStage === "HOD_REVIEW" || isPendingHodApproval ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
              <ShieldAlert size={10} />
              <span>HOD Pending</span>
            </span>
          ) : currentStage === "DISPATCHED" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
              <ShieldCheck size={10} />
              <span>Approved (60%)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
              {Math.round(probability * 100)}% Win
            </span>
          )}

          {/* Expiry Pill */}
          {expiry.isExpired ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
              <Clock size={10} />
              <span>Exp</span>
            </span>
          ) : expiry.isExpiringSoon ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
              <Clock size={10} />
              <span>{expiry.daysLeft}d</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* ── STALLED ALERT (> 7 DAYS INACTIVE) ────────────────────────── */}
      {isStalled && (
        <div className="mb-2.5 p-2 rounded-lg bg-amber-50/90 border border-amber-300 text-amber-900 flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
            <span className="text-[11px] font-bold truncate">
              Stalled ({daysInactive}d inactive)
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendFollowUp}
            disabled={sendingFollowUp}
            className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-heading font-semibold inline-flex items-center gap-1 transition-all flex-shrink-0 shadow-xs"
            title="Dispatch follow-up notice"
          >
            {sendingFollowUp ? (
              <Loader2 size={10} className="animate-spin" />
            ) : followUpMsg ? (
              <span>✓ Sent</span>
            ) : (
              <>
                <Send size={10} />
                <span>Follow-up</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── CLIENT HEADER + WHATSAPP TRIGGER ───────────────────────────── */}
      <div className="mb-2.5">
        <div className="flex items-start justify-between gap-1.5">
          <h4
            className="font-heading font-semibold text-sm text-slate-900 line-clamp-1 group-hover:text-red-600 transition-colors"
            title={deal.clientName}
          >
            {deal.clientName}
          </h4>

          {/* 1-Click WhatsApp Corporate Pitch Button */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 border border-emerald-200 transition-colors flex-shrink-0 inline-flex items-center gap-0.5"
              title="Dispatch 1-Click WhatsApp Corporate Pitch"
            >
              <MessageSquare size={13} />
            </a>
          )}
        </div>

        <div className="text-xs text-slate-500 font-sans flex items-center gap-1.5 mt-0.5 truncate">
          <Building2 size={12} className="text-slate-400 flex-shrink-0" />
          <span className="truncate">{deal.clientEmail}</span>
          {deal.clientPhone && (
            <>
              <span className="text-slate-300">&bull;</span>
              <span className="truncate font-mono">{deal.clientPhone}</span>
            </>
          )}
        </div>
      </div>

      {/* ── COMMERCIAL VALUE & WEIGHTED FORECAST ────────────────────────── */}
      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg mb-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-500 font-sans">
            Base ({deal.employeeCount} staff @ LKR {deal.ratePerUser || 400})
          </span>
          <span
            className={`font-heading font-semibold text-sm tabular-nums ${
              currentStage === "CLOSED_WON" ? "text-emerald-600 font-bold" : "text-slate-900"
            }`}
          >
            {formatLKR(baseAmount)}
          </span>
        </div>

        {/* Stage-Weighted Forecast */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 font-sans mt-1 pt-1.5 border-t border-slate-200/60">
          <span className="font-medium text-slate-500">
            Weighted ({Math.round(probability * 100)}%):
          </span>
          <span className="font-heading font-semibold text-slate-800 tabular-nums">
            {formatLKR(weightedValue)}
          </span>
        </div>
      </div>

      {/* ── TOUCHPOINT CHIP & TIMELINE DRAWER TRIGGER ──────────────────── */}
      <div className="flex items-center justify-between gap-1 mb-2.5 px-2 py-1 bg-slate-100/70 rounded-md border border-slate-200/50 text-[11px] font-sans">
        <span
          className={`font-medium truncate ${
            contactBadge.isFresh ? "text-emerald-700 font-semibold" : "text-slate-500"
          }`}
        >
          {contactBadge.text}
        </span>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenActivityModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenActivityModal(deal);
              }}
              title="Log Client Touchpoint"
              className="text-[11px] font-heading font-medium text-red-600 hover:text-red-700 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Plus size={12} />
              <span>Log</span>
            </button>
          )}

          {onOpenTimelineDrawer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTimelineDrawer(deal);
              }}
              title="View Complete Interaction Feed"
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            >
              <History size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── LOSS REASON NOTICE (FOR LOST DEALS) ─────────────────────────── */}
      {deal.lossReason && (
        <div className="mb-2.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-sans">
          <div className="flex items-center gap-1 font-semibold text-rose-900">
            <AlertOctagon size={12} />
            <span>Loss Reason: {deal.lossReason}</span>
          </div>
          {deal.lossNotes && <p className="mt-0.5 text-rose-700 line-clamp-2">{deal.lossNotes}</p>}
        </div>
      )}

      {/* ── OWNER TAG (HOD VIEW ONLY) ──────────────────────────────────── */}
      {isAdmin && deal.salesUser && (
        <div className="flex items-center justify-between mb-2.5 text-xs bg-slate-100/70 p-2 rounded-lg border border-slate-200/60 font-sans">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-heading font-semibold text-[10px] flex-shrink-0">
              {deal.salesUser.fullName.charAt(0).toUpperCase()}
            </div>
            <span
              className="font-medium text-slate-700 truncate text-[11px]"
              title={deal.salesUser.fullName}
            >
              {deal.salesUser.fullName}
            </span>
          </div>

          {onOpenReassign && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReassign(deal);
              }}
              className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-200 transition-colors"
              title="Re-assign Opportunity"
            >
              <UserCheck size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── CARD FOOTER ACTIONS ────────────────────────────────────────── */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        {/* Stage Transition Selector */}
        {isTerminalLost ? (
          <div className="flex-1 py-1 px-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-semibold text-center truncate cursor-not-allowed select-none">
            Rejected / Lost (Locked)
          </div>
        ) : !isAdmin && isPendingHodApproval && currentStage === "PROPOSAL_SENT" ? (
          <div className="flex-1 py-1 px-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-[11px] font-semibold text-center truncate">
            HOD Approval Pending
          </div>
        ) : (
          <div className="relative flex-1">
            <select
              value={currentStage}
              onChange={handleStageSelectChange}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-[11px] font-heading font-medium py-1.5 pl-2.5 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 cursor-pointer appearance-none truncate"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option
                  key={opt.key}
                  value={opt.key}
                  disabled={!isAdmin && opt.disabledForRep}
                >
                  {opt.key === currentStage ? `Stage: ${opt.label}` : `Move to ${opt.label}`}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* HOD Feedback Button (if revisions requested or rejected) */}
          {hasFeedback && onOpenFeedback && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFeedback(deal);
              }}
              title="View Executive HOD Feedback"
              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors cursor-pointer"
            >
              <MessageSquareWarning size={14} />
            </button>
          )}

          {/* Download PDF Document (Includes Rejected Copy for Lost Deals) */}
          <a
            href={`/api/proposals/${deal.id}/pdf`}
            download={isTerminalLost ? `Proposal-${deal.proposalId}-REJECTED.pdf` : `Zynolo-Proposal-${deal.proposalId}.pdf`}
            onClick={(e) => e.stopPropagation()}
            title={isTerminalLost ? "Download Rejected Copy" : "Download PDF Presentation"}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
