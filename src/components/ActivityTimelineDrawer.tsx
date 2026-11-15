// src/components/ActivityTimelineDrawer.tsx — Touchpoint History Drawer & Timeline Feed
import React, { useState, useEffect } from "react";
import { X, Phone, Mail, Video, MessageSquare, StickyNote, Calendar, Clock, User, Plus, RefreshCw, AlertCircle } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string; // 'CALL' | 'EMAIL' | 'DEMO' | 'WHATSAPP' | 'NOTE'
  outcome: string; // 'INTERESTED' | 'MEETING_SCHEDULED' | 'APPROVED' | 'OBJECTION' | 'FOLLOW_UP_SENT'
  notes?: string | null;
  nextActionAt?: string | null;
  createdAt: string;
  salesUser?: {
    id: number;
    fullName: string;
    email: string;
  } | null;
}

interface ActivityTimelineDrawerProps {
  proposal: {
    id: number;
    proposalId: string;
    clientName: string;
    clientEmail?: string | null;
    clientPhone?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onOpenLogModal?: () => void;
}

export default function ActivityTimelineDrawer({
  proposal,
  isOpen,
  onClose,
  onOpenLogModal,
}: ActivityTimelineDrawerProps) {
  if (!isOpen) return null;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/activity`);
      const data = await res.json();
      if (data.success && Array.isArray(data.activities)) {
        setActivities(data.activities);
      } else {
        setError(data.message || "Failed to load activity logs.");
      }
    } catch {
      setError("Network error fetching activity history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [proposal.id]);

  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "CALL":
        return { icon: Phone, bg: "bg-blue-100 text-blue-700 border-blue-200" };
      case "WHATSAPP":
        return { icon: MessageSquare, bg: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      case "DEMO":
        return { icon: Video, bg: "bg-purple-100 text-purple-700 border-purple-200" };
      case "EMAIL":
        return { icon: Mail, bg: "bg-amber-100 text-amber-700 border-amber-200" };
      default:
        return { icon: StickyNote, bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome.toUpperCase()) {
      case "APPROVED":
        return { label: "Verbal Approval", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "MEETING_SCHEDULED":
        return { label: "Meeting Scheduled", badge: "bg-purple-50 text-purple-700 border-purple-200" };
      case "OBJECTION":
        return { label: "Concerns / Objection", badge: "bg-rose-50 text-rose-700 border-rose-200" };
      case "FOLLOW_UP_SENT":
        return { label: "Formal Follow-up Sent", badge: "bg-sky-50 text-sky-700 border-sky-200" };
      default:
        return { label: "Interested / Follow-up", badge: "bg-blue-50 text-blue-700 border-blue-200" };
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-lg text-white">Touchpoint Feed</h3>
              <span className="font-mono text-xs font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/60">
                {proposal.proposalId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans truncate max-w-xs">
              Client: <span className="text-slate-200 font-medium">{proposal.clientName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Sub-header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-heading font-semibold text-slate-600 uppercase tracking-wider">
            {activities.length} Recorded Touchpoints
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchActivities}
              title="Refresh timeline"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            {onOpenLogModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-heading font-medium inline-flex items-center gap-1 shadow-sm"
              >
                <Plus size={13} />
                <span>Log New</span>
              </button>
            )}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-red-600" />
              <span className="text-xs font-sans">Loading interaction timeline...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-sans">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock size={24} />
              </div>
              <h4 className="font-heading font-semibold text-sm text-slate-700">No Touchpoints Logged Yet</h4>
              <p className="text-xs text-slate-500 font-sans max-w-xs mx-auto">
                Record your client calls, WhatsApp conversations, meetings, or notes to keep the pipeline fresh.
              </p>
              {onOpenLogModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogModal();
                  }}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-heading font-medium inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} />
                  <span>Log First Touchpoint</span>
                </button>
              )}
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activities.map((act) => {
                const { icon: Icon, bg } = getActivityIcon(act.type);
                const { label: outcomeLabel, badge: outcomeBadge } = getOutcomeBadge(act.outcome);

                return (
                  <div key={act.id} className="relative group">
                    {/* Circle Node on line */}
                    <div
                      className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${bg}`}
                    >
                      <Icon size={11} />
                    </div>

                    {/* Activity Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow transition-all space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${outcomeBadge}`}>
                          {outcomeLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(act.createdAt)}
                        </span>
                      </div>

                      {act.notes && (
                        <p className="text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-wrap">
                          {act.notes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                        <span className="flex items-center gap-1 truncate">
                          <User size={11} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{act.salesUser?.fullName || "Sales Rep"}</span>
                        </span>

                        {act.nextActionAt && (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <Calendar size={11} />
                            <span>Target: {new Date(act.nextActionAt).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
