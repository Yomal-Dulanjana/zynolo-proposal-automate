// src/components/modals/RejectProposalModal.tsx — Universal Rejection Confirmation Modal
import React, { useState } from 'react';

export interface RejectProposalModalProps {
  isOpen: boolean;
  proposalId: string;
  clientName: string;
  onClose: () => void;
  onSubmit: (data: { lossReason: string; rejectionComment: string }) => Promise<void>;
}

export const LOSS_REASONS = [
  'Budget / Pricing Constraint',
  'Competitor Chosen',
  'Feature Mismatch / Technical Gap',
  'Project Indefinitely Shelved',
  'Client Unresponsive',
  'Pricing Structure Disagreement',
  'Other Corporate Justification',
];

export const RejectProposalModal: React.FC<RejectProposalModalProps> = ({
  isOpen,
  proposalId,
  clientName,
  onClose,
  onSubmit,
}) => {
  const [lossReason, setLossReason] = useState(LOSS_REASONS[0]);
  const [rejectionComment, setRejectionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionComment.trim() || rejectionComment.trim().length < 8) {
      setError('Please provide detailed feedback (minimum 8 characters).');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ lossReason, rejectionComment: rejectionComment.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3 bg-rose-50/50">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
            ✕
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Mark Proposal as Rejected / Lost</h3>
            <p className="text-xs text-gray-500">
              Proposal ID: <span className="font-mono text-rose-600 font-semibold">{proposalId}</span> • {clientName}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-xs bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Loss Reason</label>
            <select
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500 bg-gray-50 p-2.5 text-gray-800"
            >
              {LOSS_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Remarks / Client Feedback</label>
            <textarea
              rows={3}
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Detail reasons communicated by the client or internal review (min 8 chars)..."
              className="w-full text-sm border border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500 bg-gray-50 p-2.5 placeholder:text-gray-400 text-gray-800"
            />
            <p className="text-[11px] text-gray-400 mt-1">This feedback will be permanently locked and saved for commercial audit history.</p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Locking Proposal...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectProposalModal;
