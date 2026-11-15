// src/components/LogActivityModal.tsx — 1-Click Client Touchpoint & Activity Logging Modal
import React, { useState } from "react";
import { X, Phone, Mail, Video, MessageSquare, StickyNote, Calendar, CheckCircle2, Loader2, Sparkles } from "lucide-react";

interface LogActivityModalProps {
  proposal: {
    id: number;
    proposalId: string;
    clientName: string;
    clientPhone?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newActivity: any, lastContactedAt: string) => void;
}

export type ActivityType = "CALL" | "EMAIL" | "DEMO" | "WHATSAPP" | "NOTE";
export type ActivityOutcome = "INTERESTED" | "MEETING_SCHEDULED" | "APPROVED" | "OBJECTION";

export default function LogActivityModal({
  proposal,
  isOpen,
  onClose,
  onSuccess,
}: LogActivityModalProps) {
  if (!isOpen) return null;

  const [type, setType] = useState<ActivityType>("CALL");
  const [outcome, setOutcome] = useState<ActivityOutcome>("INTERESTED");
  const [notes, setNotes] = useState<string>("");
  const [nextActionAt, setNextActionAt] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const TYPE_OPTIONS: { type: ActivityType; label: string; icon: any; color: string }[] = [
    { type: "CALL", label: "Phone Call", icon: Phone, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { type: "WHATSAPP", label: "WhatsApp", icon: MessageSquare, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { type: "DEMO", label: "Meeting / Demo", icon: Video, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { type: "EMAIL", label: "Email Sent", icon: Mail, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { type: "NOTE", label: "Internal Note", icon: StickyNote, color: "text-slate-600 bg-slate-100 border-slate-200" },
  ];

  const OUTCOME_OPTIONS: { outcome: ActivityOutcome; label: string; badge: string }[] = [
    { outcome: "INTERESTED", label: "Follow-up Required / Interested", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    { outcome: "MEETING_SCHEDULED", label: "Meeting / Demo Scheduled", badge: "bg-purple-50 text-purple-700 border-purple-200" },
    { outcome: "APPROVED", label: "Verbal Approval Received", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { outcome: "OBJECTION", label: "Concerns / Objections Raised", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          outcome,
          notes: notes.trim() || undefined,
          nextActionAt: nextActionAt || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.activity, data.lastContactedAt);
        onClose();
      } else {
        setError(data.message || "Failed to save activity log.");
      }
    } catch {
      setError("Network connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-base text-white">Log Client Touchpoint</h3>
              <span className="font-mono text-xs font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/60">
                {proposal.proposalId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans truncate max-w-sm">
              Client: <span className="text-slate-200 font-medium">{proposal.clientName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium font-sans">
              {error}
            </div>
          )}

          {/* Touchpoint Type Selection */}
          <div>
            <label className="text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              1. Interaction Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setType(opt.type)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={14} className={isSelected ? "text-red-400" : "text-slate-500"} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interaction Outcome */}
          <div>
            <label className="text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              2. Interaction Outcome
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OUTCOME_OPTIONS.map((opt) => {
                const isSelected = outcome === opt.outcome;
                return (
                  <button
                    key={opt.outcome}
                    type="button"
                    onClick={() => setOutcome(opt.outcome)}
                    className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-red-50 text-red-900 border-red-300 ring-1 ring-red-400"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 size={14} className="text-red-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Call / Interaction Summary Notes */}
          <div>
            <label className="text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider block mb-1">
              3. Summary &amp; Client Feedback
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke with Finance Director; approved employee scope of 60 heads. Requested draft agreement by Friday."
              className="w-full text-xs font-sans px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder:text-slate-400"
            />
          </div>

          {/* Next Action Target Date */}
          <div>
            <label className="text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Calendar size={13} className="text-slate-400" />
              Next Scheduled Follow-up (Optional)
            </label>
            <input
              type="date"
              value={nextActionAt}
              onChange={(e) => setNextActionAt(e.target.value)}
              className="w-full text-xs font-sans px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Footer Actions */}
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
              className="px-5 py-2 text-xs font-heading font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Save Touchpoint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
