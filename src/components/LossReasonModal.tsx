// src/components/LossReasonModal.tsx — Deal Loss Root-Cause Taxonomy Prompt Modal
import React, { useState } from "react";
import { X, AlertOctagon, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface LossReasonModalProps {
  proposal: {
    id: number;
    proposalId: string;
    clientName: string;
    totalAmount: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProposal: any) => void;
}

export type LossReasonKey = "COMPETITOR" | "BUDGET" | "FEATURE_MISMATCH" | "RESTRUCTURING";

export default function LossReasonModal({
  proposal,
  isOpen,
  onClose,
  onSuccess,
}: LossReasonModalProps) {
  if (!isOpen) return null;

  const [lossReason, setLossReason] = useState<LossReasonKey>("COMPETITOR");
  const [lossNotes, setLossNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const LOSS_REASONS: { key: LossReasonKey; label: string; desc: string }[] = [
    {
      key: "COMPETITOR",
      label: "Competitor System Chosen",
      desc: "Client preferred alternative vendor or existing legacy HR provider.",
    },
    {
      key: "BUDGET",
      label: "Budget Frozen / Postponed to Next FY",
      desc: "Fiscal capital constraints or software spending paused.",
    },
    {
      key: "FEATURE_MISMATCH",
      label: "Feature / Device Requirement Mismatch",
      desc: "Specific hardware, biometric, or niche payroll localization requested.",
    },
    {
      key: "RESTRUCTURING",
      label: "Client Management Restructuring",
      desc: "Key decision maker departure, merger, or internal leadership shift.",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/loss-reason`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lossReason,
          lossNotes: lossNotes.trim() || undefined,
          status: "REJECTED",
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.proposal);
        onClose();
      } else {
        setError(data.message || "Failed to record loss reason.");
      }
    } catch {
      setError("Network error recording loss taxonomy.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-rose-950 text-white px-6 py-4 flex items-center justify-between border-b border-rose-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-900/80 text-rose-400 flex items-center justify-center border border-rose-800">
              <AlertOctagon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-base text-white">Deal Loss Root-Cause</h3>
                <span className="font-mono text-xs font-bold text-rose-300 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-800">
                  {proposal.proposalId}
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-0.5 font-sans truncate max-w-sm">
                Client: {proposal.clientName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium font-sans">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-500 font-sans">
            Please capture the primary objection or reason for mark-down. This feeds directly into executive leadership win/loss analytics.
          </p>

          {/* Loss Reason Options */}
          <div className="space-y-2">
            {LOSS_REASONS.map((opt) => {
              const isSelected = lossReason === opt.key;
              return (
                <label
                  key={opt.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-rose-50/70 border-rose-300 ring-1 ring-rose-400"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="lossReason"
                    value={opt.key}
                    checked={isSelected}
                    onChange={() => setLossReason(opt.key)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <div className="font-heading font-semibold text-slate-900">{opt.label}</div>
                    <div className="text-slate-500 font-sans mt-0.5 text-[11px]">{opt.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Free-text Notes */}
          <div>
            <label className="text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              Specific Competitor / Objection Feedback (Optional)
            </label>
            <textarea
              rows={2}
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              placeholder="e.g. Selected vendor X due to fingerprint clock bundle. Keep on contact radar for Q3."
              className="w-full text-xs font-sans px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-heading font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-heading font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <span>Confirm Dropped Deal</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
