// src/components/modals/ViewRejectionReasonModal.tsx — Read-Only Rejection Reason & Audit Log Modal
import React from 'react';

export interface ViewRejectionReasonModalProps {
  isOpen: boolean;
  proposal: {
    proposalId: string;
    clientName: string;
    lossReason?: string | null;
    rejectionComment?: string | null;
    lossNotes?: string | null;
    hodComment?: string | null;
    rejectedAt?: string | Date | null;
    rejectedByRole?: string | null;
  } | null;
  onClose: () => void;
}

export const ViewRejectionReasonModal: React.FC<ViewRejectionReasonModalProps> = ({
  isOpen,
  proposal,
  onClose,
}) => {
  if (!isOpen || !proposal) return null;

  const commentText =
    proposal.rejectionComment ||
    proposal.lossNotes ||
    proposal.hodComment ||
    'No additional remarks provided.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center space-x-2">
            <span className="text-amber-600 text-lg">💬</span>
            <h3 className="text-base font-bold text-gray-900">Rejection Audit Log</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm font-sans">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider block font-semibold mb-0.5">
              Proposal Reference &amp; Client
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-rose-600">{proposal.proposalId}</span>
              <span className="font-medium text-slate-800 text-xs">{proposal.clientName}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider block font-semibold mb-1">
              Loss Category / Reason
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
              {proposal.lossReason || 'Standard Rejection'}
            </span>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider block font-semibold mb-1">
              Feedback / Internal Remarks
            </span>
            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 text-gray-700 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {commentText}
            </div>
          </div>

          <div className="pt-2 text-[11px] text-gray-500 border-t border-gray-100 flex justify-between items-center">
            <span>
              Rejected By:{' '}
              <strong className="text-gray-700">{proposal.rejectedByRole || 'Executive Management'}</strong>
            </span>
            <span>
              Date: {proposal.rejectedAt ? new Date(proposal.rejectedAt).toLocaleDateString() : 'Recorded'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewRejectionReasonModal;
