// src/components/admin/WaitingProposalsTable.tsx — Refactored Executive Review Table with Single-Line Actions & Tooltips
import React, { useState, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Search,
  Mail,
  Phone,
  RotateCcw,
  X,
  Loader2,
  AlertCircle,
  DollarSign,
  Sparkles,
  Trash2,
} from "lucide-react";
import DeleteProposalModal, { type ProposalForDeletion } from "./DeleteProposalModal";

export interface WaitingProposalItem {
  id: number;
  proposalId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  salesUserId: number;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
  employeeCount: number;
  baseAmount?: number;
  vatAmount?: number;
  totalAmount: number;
  status: "HOD_PENDING" | "CHANGED_PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  proposalDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
  pdfPath: string;
  hodComment?: string | null;
}

interface WaitingProposalsTableProps {
  initialProposals: WaitingProposalItem[];
}

export default function WaitingProposalsTable({ initialProposals }: WaitingProposalsTableProps) {
  const [proposals, setProposals] = useState<WaitingProposalItem[]>(initialProposals);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "HOD_PENDING" | "CHANGED_PENDING">("ALL");

  // Modal states
  const [approvingProposal, setApprovingProposal] = useState<WaitingProposalItem | null>(null);
  const [requestingProposal, setRequestingProposal] = useState<WaitingProposalItem | null>(null);
  const [rejectingProposal, setRejectingProposal] = useState<WaitingProposalItem | null>(null);
  const [selectedProposalForDeletion, setSelectedProposalForDeletion] =
    useState<ProposalForDeletion | null>(null);
  const [isDeletingProposal, setIsDeletingProposal] = useState(false);

  // Form input & loading states
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeleteProposal = async () => {
    if (!selectedProposalForDeletion) return;
    try {
      setIsDeletingProposal(true);
      const res = await fetch(`/api/admin/proposals/${selectedProposalForDeletion.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.error || data.message || "Failed to delete proposal.");
        return;
      }

      setProposals((prev) => prev.filter((p) => p.id !== selectedProposalForDeletion.id));
      showToast("success", `Proposal ${selectedProposalForDeletion.proposalId} deleted successfully.`);
      setSelectedProposalForDeletion(null);
    } catch (err) {
      console.error("Delete proposal error:", err);
      showToast("error", "Network error while deleting proposal.");
    } finally {
      setIsDeletingProposal(false);
    }
  };

  // Filter proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (p.status !== "HOD_PENDING" && p.status !== "CHANGED_PENDING") return false;

      if (filterTab === "HOD_PENDING" && p.status !== "HOD_PENDING") return false;
      if (filterTab === "CHANGED_PENDING" && p.status !== "CHANGED_PENDING") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.proposalId.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.salesRepName.toLowerCase().includes(q) ||
        p.salesRepEmail.toLowerCase().includes(q) ||
        p.clientEmail.toLowerCase().includes(q)
      );
    });
  }, [proposals, search, filterTab]);

  // Aggregate stats
  const stats = useMemo(() => {
    const activeWaiting = proposals.filter(
      (p) => p.status === "HOD_PENDING" || p.status === "CHANGED_PENDING"
    );
    const newCount = activeWaiting.filter((p) => p.status === "HOD_PENDING").length;
    const changedCount = activeWaiting.filter((p) => p.status === "CHANGED_PENDING").length;
    const totalPipelineValue = activeWaiting.reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      totalCount: activeWaiting.length,
      newCount,
      changedCount,
      totalPipelineValue,
    };
  }, [proposals]);

  // 1. Client-Side Robust PDF Download Handler
  const handleDownloadPdf = async (proposal: WaitingProposalItem) => {
    try {
      setDownloadingId(proposal.id);
      const res = await fetch(`/api/proposals/${proposal.id}/pdf`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Zynolo-Proposal-${proposal.proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("success", `Downloaded proposal ${proposal.proposalId}.pdf`);
    } catch (err) {
      console.error("PDF Download Error:", err);
      // Fallback: direct window.open download URL
      window.open(`/api/proposals/${proposal.id}/pdf`, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  // 2. Approve & Send Handler
  const handleApprove = async () => {
    if (!approvingProposal) return;
    const targetProposal = approvingProposal;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/proposals/${targetProposal.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || data.error || "Failed to approve proposal.");
        return;
      }

      // Optimistically remove approved proposal from the Waiting Proposals list
      setProposals((prev) => prev.filter((p) => p.id !== targetProposal.id));
      showToast(
        "success",
        data.message ||
          `Proposal ${targetProposal.proposalId} approved! Dispatched to ${targetProposal.clientEmail} and ${targetProposal.salesRepEmail}.`
      );
      setApprovingProposal(null);
    } catch {
      showToast("error", "Network error while approving proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Request Changes Handler
  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingProposal) return;
    if (!commentInput.trim()) {
      showToast("error", "Please specify what changes or amendments are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/proposals/${requestingProposal.id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to request changes.");
        return;
      }

      setProposals((prev) => prev.filter((p) => p.id !== requestingProposal.id));
      showToast(
        "success",
        `Revision request recorded for ${requestingProposal.proposalId}. Rep will be prompted to make updates.`
      );
      setRequestingProposal(null);
      setCommentInput("");
    } catch {
      showToast("error", "Network error while requesting changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Reject Handler
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingProposal) return;
    if (!commentInput.trim()) {
      showToast("error", "Please provide a reason for proposal rejection.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/proposals/${rejectingProposal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to reject proposal.");
        return;
      }

      setProposals((prev) => prev.filter((p) => p.id !== rejectingProposal.id));
      showToast(
        "success",
        `Proposal ${rejectingProposal.proposalId} marked as Rejected with feedback.`
      );
      setRejectingProposal(null);
      setCommentInput("");
    } catch {
      showToast("error", "Network error while rejecting proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all duration-300 animate-slide-up ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Waiting */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Awaiting Review
            </div>
            <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">{stats.totalCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Pending HOD Gatekeeping</div>
          </div>
          <div className="w-11 h-11 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        {/* New Submissions */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              New Submissions
            </div>
            <div className="font-heading font-semibold text-2xl text-amber-600 tracking-tight tabular-nums">{stats.newCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Initial Proposal Drafts</div>
          </div>
          <div className="w-11 h-11 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        {/* Resubmissions */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Revised &amp; Resubmitted
            </div>
            <div className="font-heading font-semibold text-2xl text-purple-600 tracking-tight tabular-nums">{stats.changedCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Changes Completed by Rep</div>
          </div>
          <div className="w-11 h-11 bg-purple-50 border border-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Pending Deal Value
            </div>
            <div className="font-heading font-semibold text-2xl text-emerald-600 tracking-tight tabular-nums">
              Rs. {stats.totalPipelineValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Commercial Volume Held</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Main Review Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Waiting ({stats.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("HOD_PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "HOD_PENDING"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              HOD Pending ({stats.newCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("CHANGED_PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "CHANGED_PENDING"
                  ? "bg-purple-600 text-white"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              Changed - Approval Pending ({stats.changedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, client, or sales rep..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-red-600 focus:bg-white focus:ring-1 focus:ring-red-600 transition-all"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-semibold tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4 text-left">PROPOSAL ID</th>
                <th className="py-3.5 px-4 text-left">SALES REPRESENTATIVE</th>
                <th className="py-3.5 px-4 text-left">CLIENT ORGANIZATION</th>
                <th className="py-3.5 px-3 text-center">STAFF</th>
                <th className="py-3.5 px-4 text-right">TOTAL INVESTMENT</th>
                <th className="py-3.5 px-4 text-center">DEAL STATUS</th>
                <th className="py-3.5 px-4 text-left">DATE</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <CheckCircle2 size={36} className="mx-auto mb-2.5 text-emerald-500" />
                    <p className="font-bold text-slate-800 text-sm">Review Queue Clear!</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search
                        ? "No pending proposals matched your search query."
                        : "There are currently no proposals waiting for executive HOD approval."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProposals.map((p) => {
                  const isChanged = p.status === "CHANGED_PENDING";
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/75 transition-colors">
                      {/* Proposal ID */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#E11D48] block tabular-nums">
                          {p.proposalId}
                        </span>
                        <span className="text-[11px] text-slate-500 font-sans mt-0.5 block">
                          Issued: {new Date(p.proposalDate || p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>

                      {/* Sales Rep */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {p.salesRepName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate">
                              {p.salesRepName}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {p.salesRepEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">{p.clientName}</div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 truncate">
                          <Mail size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{p.clientEmail}</span>
                        </div>
                        {p.clientPhone && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                            <Phone size={11} className="text-slate-400 flex-shrink-0" />
                            <span>{p.clientPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Staff */}
                      <td className="px-3 py-4 align-middle whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md font-bold bg-slate-100 text-slate-700 text-xs">
                          {p.employeeCount} staff
                        </span>
                      </td>

                      {/* Total Investment */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap text-right">
                        <div className="font-bold text-slate-900 text-sm tabular-nums">
                          LKR {p.totalAmount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Base: LKR {(p.baseAmount ?? p.totalAmount / 1.18).toLocaleString("en-LK", { minimumFractionDigits: 2 })} | VAT 18%: LKR {(p.vatAmount ?? (p.totalAmount - (p.baseAmount ?? p.totalAmount / 1.18))).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Status Badge with Dot Indicator (Single-Line) */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap text-center">
                        {isChanged ? (
                          <span className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Changed Pending
                          </span>
                        ) : (
                          <span className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            HOD Pending
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="font-medium text-slate-800 text-xs">
                          {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        {isChanged && (
                          <div className="text-[10px] text-purple-600 font-semibold mt-0.5">
                            Revised {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          </div>
                        )}
                      </td>

                      {/* ── REVIEW ACTIONS (Sleek Icon-Based Button Bar with Tooltips) ── */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          
                          {/* 1. Download PDF */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(p)}
                              disabled={downloadingId === p.id}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-50"
                              aria-label="Download Proposal PDF"
                            >
                              {downloadingId === p.id ? (
                                <Loader2 size={16} className="animate-spin text-slate-700" />
                              ) : (
                                <Download size={16} />
                              )}
                            </button>
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                              <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                                Download Proposal PDF
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>

                          {/* 2. Approve & Send */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setApprovingProposal(p)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                              aria-label="Approve & Dispatch Emails"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                              <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                                Approve &amp; Dispatch Emails
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>

                          {/* 3. Request Changes */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => {
                                setRequestingProposal(p);
                                setCommentInput(p.hodComment || "");
                              }}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                              aria-label="Request Amendments (Comment)"
                            >
                              <RotateCcw size={16} />
                            </button>
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                              <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                                Request Amendments (Comment)
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>

                          {/* 4. Reject Submission */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingProposal(p);
                                setCommentInput(p.hodComment || "");
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              aria-label="Reject Proposal (Comment)"
                            >
                              <XCircle size={16} />
                            </button>
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                              <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                                Reject Proposal (Comment)
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>

                          {/* 5. Delete Proposal (Executive) */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProposalForDeletion({
                                  id: p.id,
                                  proposalId: p.proposalId,
                                  clientName: p.clientName,
                                  totalAmount: p.totalAmount,
                                })
                              }
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              aria-label="Delete Proposal"
                              title="Delete Proposal (Executive)"
                            >
                              <Trash2 size={16} />
                            </button>
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                              <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                                Delete Proposal (Executive)
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>

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

      {/* ── APPROVE & SEND CONFIRMATION MODAL ───────────────────────────── */}
      {approvingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-heading font-semibold text-lg text-slate-900 mb-1">
                Approve &amp; Dispatch Proposal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4 font-sans">
                Approving this proposal will transition its state to <span className="font-bold text-emerald-600">APPROVED</span> and automatically trigger parallel email delivery with the finalized PDF attached.
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 mb-5 font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-500">Proposal ID:</span>
                  <span className="font-mono font-bold text-red-600">{approvingProposal.proposalId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client Recipient:</span>
                  <span className="font-semibold text-slate-800">{approvingProposal.clientName} ({approvingProposal.clientEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rep Internal Copy:</span>
                  <span className="font-semibold text-slate-800">{approvingProposal.salesRepName} ({approvingProposal.salesRepEmail})</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-2 font-bold">
                  <span className="text-slate-700">Commercial Amount:</span>
                  <span className="text-slate-900 font-mono tabular-nums">
                    Rs. {approvingProposal.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setApprovingProposal(null)}
                  className="px-4 py-2 text-xs font-heading font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApprove}
                  className="px-5 py-2 text-xs font-heading font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm Approval &amp; Send Emails</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUEST CHANGES MODAL ───────────────────────────────────────── */}
      {requestingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-900">
                  Request Revisions from Sales Rep
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">
                  Proposal <span className="font-mono font-bold text-red-600">{requestingProposal.proposalId}</span> &bull; {requestingProposal.salesRepName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestingProposal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestChanges} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-sans font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Specify what changes or amendments are required <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="e.g. Please recalculate employee count to include the secondary branch, or adjust the payment schedule terms..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 transition-all resize-none font-sans"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  This note will be visible to {requestingProposal.salesRepName} when they edit and resubmit this proposal.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setRequestingProposal(null)}
                  className="px-4 py-2 text-xs font-heading font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-heading font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Submit Revision Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECT PROPOSAL MODAL ───────────────────────────────────────── */}
      {rejectingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-900">
                  Reject Proposal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">
                  Proposal <span className="font-mono font-bold text-red-600">{rejectingProposal.proposalId}</span> &bull; {rejectingProposal.salesRepName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingProposal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-sans font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for proposal rejection <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="e.g. Terms violate corporate minimum rate criteria and client credit standing was not verified..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-rose-600 focus:bg-white focus:ring-1 focus:ring-rose-600 transition-all resize-none font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setRejectingProposal(null)}
                  className="px-4 py-2 text-xs font-heading font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-heading font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EXECUTIVE DELETION CONFIRMATION MODAL ───────────────────────── */}
      <DeleteProposalModal
        isOpen={!!selectedProposalForDeletion}
        proposal={selectedProposalForDeletion}
        onClose={() => setSelectedProposalForDeletion(null)}
        onConfirm={handleDeleteProposal}
        isDeleting={isDeletingProposal}
      />
    </div>
  );
}
