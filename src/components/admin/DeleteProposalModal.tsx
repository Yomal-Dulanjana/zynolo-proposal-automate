// src/components/admin/DeleteProposalModal.tsx — Executive Confirmation Modal for Proposal Deletion
import React from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export interface ProposalForDeletion {
  id: number;
  proposalId: string;
  clientName: string;
  totalAmount: number;
}

interface DeleteProposalModalProps {
  proposal: ProposalForDeletion | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting: boolean;
}

export default function DeleteProposalModal({
  proposal,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteProposalModalProps) {
  if (!isOpen || !proposal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-proposal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} />
            </div>
            <h3
              id="delete-proposal-title"
              className="font-heading font-semibold text-base text-rose-600"
            >
              Confirm Permanent Deletion
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            You are about to permanently purge the following commercial record from the enterprise vault:
          </p>

          {/* Proposal Details Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs font-sans">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Proposal ID:</span>
              <span className="font-mono font-bold text-rose-600 text-sm">
                {proposal.proposalId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Client Organization:</span>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[200px]">
                {proposal.clientName}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 font-bold">
              <span className="text-slate-700">Total Value:</span>
              <span className="font-mono text-slate-900 tabular-nums">
                Rs. {(proposal.totalAmount || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Warning Notice Callout */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="font-sans leading-relaxed">
              <span className="font-semibold">Irreversible Administrative Action:</span> This action cannot be undone. This proposal and all associated activity records, client feedback notes, and generated PDF records will be permanently removed from the enterprise database.
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting && <Loader2 size={15} className="animate-spin" />}
            <span>{isDeleting ? "Deleting..." : "Confirm Permanent Delete"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
