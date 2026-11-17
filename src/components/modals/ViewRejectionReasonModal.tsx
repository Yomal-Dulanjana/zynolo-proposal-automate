// src/components/modals/ViewRejectionReasonModal.tsx — Read-Only Rejection Reason & Audit Log Modal
import React from 'react';

export interface ViewRejectionReasonModalProps {
  isOpen: boolean;
  proposal: {
    proposalId: string;
    clientName?: string | null;
    lossReason?: string | null;
    rejectionComment?: string | null;
    lossNotes?: string | null;
    hodComment?: string | null;
    rejectedAt?: string | Date | null;
    rejectedByRole?: string | null;
    rejectedByName?: string | null;
    rejectedBy?: string | null;
    updatedAt?: string | Date | null;
  } | null;
  onClose: () => void;
}

export const ViewRejectionReasonModal: React.FC<ViewRejectionReasonModalProps> = ({
  isOpen,
  proposal,
  onClose,
}) => {
  if (!isOpen || !proposal) return null;

  const getRejectorLabel = () => {
    const role = (proposal.rejectedByRole || '').toUpperCase();
    if (role === 'HOD' || role === 'ADMIN' || role.includes('HOD') || role === 'EXECUTIVE HOD') {
      return 'Head of Department (HOD)';
    }
    if (role === 'SALES_REP' || role === 'SALES' || role.includes('SALES')) {
      const extractedName =
        proposal.rejectedByRole && proposal.rejectedByRole.includes(':')
          ? proposal.rejectedByRole.split(':')[1].trim()
          : '';
      const name = proposal.rejectedByName || extractedName;
      return name ? `Sales Representative (${name})` : 'Sales Representative';
    }
    return proposal.rejectedBy || proposal.rejectedByRole || 'Executive Management';
  };

  const getFormattedDate = () => {
    const dateVal = proposal.rejectedAt || proposal.updatedAt;
    if (!dateVal) return 'Recorded';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return 'Recorded';
    return (
      date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ', ' +
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  const commentText =
    proposal.rejectionComment ||
    proposal.lossNotes ||
    proposal.hodComment ||
    'No remarks provided.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        {/* Header with X-Mark (කතිරයක්) Icon */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-rose-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900">Rejection Audit Log</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 transition cursor-pointer leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-sm font-sans">
          <div>
            <span className="text-[11px] text-gray-400 uppercase tracking-wider block font-semibold mb-0.5">
              Proposal Reference &amp; Client
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-rose-600 text-sm">{proposal.proposalId}</span>
              <span className="text-xs font-medium text-gray-600 truncate max-w-[200px]">
                {proposal.clientName || 'Direct Client'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-gray-400 uppercase tracking-wider block font-semibold mb-1">
              Loss Category / Reason
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              {proposal.lossReason || 'COMPETITOR'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-gray-400 uppercase tracking-wider block font-semibold mb-1">
              Feedback / Internal Remarks
            </span>
            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 text-gray-700 text-xs leading-relaxed whitespace-pre-wrap min-h-[70px] max-h-48 overflow-y-auto">
              {commentText}
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-3 text-[11px] text-gray-500 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-gray-400">Rejected By: </span>
              <strong className="text-gray-800">{getRejectorLabel()}</strong>
            </div>
            <div>
              <span className="text-gray-400">Date: </span>
              <span className="font-medium text-gray-700">{getFormattedDate()}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewRejectionReasonModal;
