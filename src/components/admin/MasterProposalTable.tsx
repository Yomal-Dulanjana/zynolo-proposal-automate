// src/components/admin/MasterProposalTable.tsx — Company-Wide Master Proposal Oversight Feed
import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Building2,
  X,
  ChevronDown,
  RotateCcw,
  Copy,
  MessageSquare,
  TrendingUp,
  Trash2,
} from "lucide-react";
import type { AdminProposalItem, RepPerformanceMetric } from "./types";
import DeleteProposalModal, { type ProposalForDeletion } from "./DeleteProposalModal";
import {
  ACTIVE_PIPELINE_STATUSES,
  TERMINAL_WON_STATUSES,
} from "../../utils/financialAnalytics.js";

interface MasterProposalTableProps {
  proposals: AdminProposalItem[];
  reps: RepPerformanceMetric[];
  selectedRepId: number | null;
  onSelectRep: (repId: number | null) => void;
}

const STATUS_BADGES: Record<string, { label: string; badgeClass: string }> = {
  DRAFT: { label: "Draft", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  HOD_PENDING: { label: "HOD Pending", badgeClass: "bg-amber-50 text-amber-700 border-amber-300" },
  CHANGED_PENDING: { label: "Changed Pending", badgeClass: "bg-purple-50 text-purple-700 border-purple-300" },
  CHANGES_REQUESTED: { label: "Changes Requested", badgeClass: "bg-sky-50 text-sky-700 border-sky-300" },
  APPROVED: { label: "Approved", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  SENT: { label: "Sent", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  VIEWED: { label: "Viewed", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  IN_NEGOTIATION: { label: "In Negotiation", badgeClass: "bg-amber-50 text-amber-700 border-amber-300" },
  ACCEPTED: { label: "Accepted / Won", badgeClass: "bg-green-100 text-green-800 border-green-300" },
  REJECTED: { label: "Rejected / Lost", badgeClass: "bg-rose-50 text-rose-700 border-rose-300" },
  EXPIRED: { label: "Expired", badgeClass: "bg-slate-100 text-slate-600 border-slate-300" },
};

export default function MasterProposalTable({
  proposals: initialProposals,
  reps,
  selectedRepId,
  onSelectRep,
}: MasterProposalTableProps) {
  const [proposals, setProposals] = useState<AdminProposalItem[]>(initialProposals);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Deletion state
  const [selectedProposalForDeletion, setSelectedProposalForDeletion] =
    useState<ProposalForDeletion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const formatLKR = (num: number) =>
    `Rs. ${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Top executive KPI counters dynamically derived from local state
  const metrics = useMemo(() => {
    const totalCount = proposals.length;
    let activePipelineValue = 0;
    let wonRevenue = 0;
    let totalHeadcount = 0;

    proposals.forEach((p) => {
      const st = (p.status || "").toUpperCase();
      const baseVal = Number(p.baseAmount) || Number(p.totalAmount) || 0;
      totalHeadcount += Number(p.employeeCount) || 0;

      if (ACTIVE_PIPELINE_STATUSES.includes(st)) {
        activePipelineValue += baseVal;
      } else if (TERMINAL_WON_STATUSES.includes(st)) {
        wonRevenue += baseVal;
      }
    });

    return {
      totalCount,
      activePipelineValue,
      wonRevenue,
      totalHeadcount,
    };
  }, [proposals]);

  // Executive permanent delete handler
  const handleDeleteProposal = async () => {
    if (!selectedProposalForDeletion) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/proposals/${selectedProposalForDeletion.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.error || data.message || "Failed to delete proposal record from database.");
        return;
      }

      setProposals((prev) => prev.filter((p) => p.id !== selectedProposalForDeletion.id));
      showToast("success", `Proposal ${selectedProposalForDeletion.proposalId} deleted successfully.`);
      setSelectedProposalForDeletion(null);
    } catch (err) {
      console.error("Failed to delete proposal:", err);
      showToast("error", "Network error while attempting to delete proposal.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered proposal list
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // 1. Rep filter
      if (selectedRepId !== null && p.salesUserId !== selectedRepId) {
        return false;
      }

      // 2. Status filter
      if (statusFilter !== "ALL" && p.status !== statusFilter) {
        return false;
      }

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesId = p.proposalId.toLowerCase().includes(q);
        const matchesClient = p.clientName.toLowerCase().includes(q) || p.clientEmail.toLowerCase().includes(q);
        const matchesRep = p.salesRepName.toLowerCase().includes(q) || p.salesRepEmail.toLowerCase().includes(q);
        if (!matchesId && !matchesClient && !matchesRep) {
          return false;
        }
      }

      // 4. Date range filter
      const pDate = new Date(p.proposalDate).toISOString().split("T")[0];
      if (fromDate && pDate < fromDate) return false;
      if (toDate && pDate > toDate) return false;

      return true;
    });
  }, [proposals, selectedRepId, statusFilter, search, fromDate, toDate]);

  // Master CSV Export Function
  const handleExportCSV = () => {
    const headers = [
      "Proposal ID",
      "Sales Representative",
      "Rep Email",
      "Client Organization",
      "Client Email",
      "Client Phone",
      "Staff Scope",
      "Base Amount (LKR)",
      "VAT (18%)",
      "Total Amount (LKR)",
      "Deal Status",
      "Issue Date",
      "Expiry Date",
    ];

    const rows = filteredProposals.map((p) => [
      `"${p.proposalId}"`,
      `"${p.salesRepName.replace(/"/g, '""')}"`,
      `"${p.salesRepEmail.replace(/"/g, '""')}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      `"${p.clientEmail.replace(/"/g, '""')}"`,
      `"${(p.clientPhone || "").replace(/"/g, '""')}"`,
      p.employeeCount || 0,
      Number(p.baseAmount || 0).toFixed(2),
      Number(p.vatAmount || 0).toFixed(2),
      Number(p.totalAmount || 0).toFixed(2),
      p.status,
      new Date(p.proposalDate).toISOString().split("T")[0],
      new Date(p.expiryDate).toISOString().split("T")[0],
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `zynolo_company_proposals_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
    onSelectRep(null);
  };

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter !== "ALL" || fromDate || toDate || selectedRepId !== null
  );

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-5">
      {/* Top Header & Export Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-red-600" />
            Master Proposals &amp; Contracts Feed
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Cross-departmental log of all commercial proposals issued across the enterprise sales force.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredProposals.length === 0}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} className="text-red-400" />
          Export Company CSV ({filteredProposals.length})
        </button>
      </div>

      {/* Dynamic Summary Metric Cards (Automatically recomputes upon proposal deletion) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider">
              Total Proposals
            </span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">
            {metrics.totalCount}
          </div>
          <div className="text-[11px] text-slate-500 font-sans mt-0.5">
            Enterprise proposal records in vault
          </div>
        </div>

        <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider">
              Active Pipeline
            </span>
            <TrendingUp size={16} className="text-red-600" />
          </div>
          <div className="font-heading font-semibold text-2xl text-red-600 tracking-tight tabular-nums truncate">
            {formatLKR(metrics.activePipelineValue)}
          </div>
          <div className="text-[11px] text-slate-500 font-sans mt-0.5">
            Sent &amp; Negotiation (Excl. Review)
          </div>
        </div>

        <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider">
              Won Revenue
            </span>
            <Building2 size={16} className="text-emerald-600" />
          </div>
          <div className="font-heading font-semibold text-2xl text-emerald-600 tracking-tight tabular-nums truncate">
            {formatLKR(metrics.wonRevenue)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium font-sans mt-0.5">
            Finalized &amp; Accepted Deals
          </div>
        </div>

        <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-heading font-semibold uppercase tracking-wider">
              Staff Managed
            </span>
            <User size={16} className="text-blue-600" />
          </div>
          <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">
            {metrics.totalHeadcount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-sans mt-0.5">
            Total employee headcount in scope
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, Client, or Rep..."
              className="w-full pl-9 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-sm font-sans font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 2. Rep Selector */}
          <div className="relative">
            <select
              value={selectedRepId !== null ? String(selectedRepId) : "ALL"}
              onChange={(e) => {
                const val = e.target.value;
                onSelectRep(val === "ALL" ? null : Number(val));
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 appearance-none cursor-pointer pr-8"
            >
              <option value="ALL">All Representatives ({reps.length})</option>
              {reps.map((r) => (
                <option key={r.repId} value={r.repId}>
                  Rep: {r.repName} ({r.totalProposals} props)
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {/* 3. Deal Status Selector */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 appearance-none cursor-pointer pr-8"
            >
              <option value="ALL">All Deal Stages</option>
              <option value="HOD_PENDING">HOD Pending</option>
              <option value="CHANGED_PENDING">Changed - Approval Pending</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
              <option value="VIEWED">Viewed</option>
              <option value="IN_NEGOTIATION">In Negotiation</option>
              <option value="ACCEPTED">Accepted / Won</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
              <option value="DRAFT">Draft</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {/* 4. Date Range & Reset */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              title="From Issue Date"
            />
            <span className="text-slate-400 text-xs font-bold">&ndash;</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              title="To Issue Date"
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs font-semibold tracking-wider border-b border-slate-800">
              <th className="py-3.5 px-4 text-left">PROPOSAL ID</th>
              <th className="py-3.5 px-4 text-left">SALES REPRESENTATIVE</th>
              <th className="py-3.5 px-4 text-left">CLIENT ORGANIZATION</th>
              <th className="py-3.5 px-3 text-center">STAFF</th>
              <th className="py-3.5 px-4 text-right">TOTAL INVESTMENT</th>
              <th className="py-3.5 px-3 text-center">DEAL STATUS</th>
              <th className="py-3.5 px-3 text-left">ISSUED DATE</th>
              <th className="py-3.5 px-3 text-left">EXPIRY DATE</th>
              <th className="py-3.5 px-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredProposals.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No proposals match your active criteria</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-bold text-red-600 hover:underline"
                    >
                      Reset All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredProposals.map((p) => {
                const statusCfg = STATUS_BADGES[p.status] || {
                  label: p.status,
                  badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
                };

                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/75 transition-colors">
                    {/* Proposal ID */}
                    <td className="px-4 py-4 align-middle whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-[#E11D48] block tabular-nums">
                        {p.proposalId}
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans mt-0.5 block">
                        Issued: {fmtDate(p.proposalDate)}
                      </span>
                    </td>

                    {/* Sales Representative */}
                    <td className="px-4 py-4 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {p.salesRepName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{p.salesRepName}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[160px]">
                            {p.salesRepEmail}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Client Organization */}
                    <td className="px-4 py-4 align-middle whitespace-nowrap">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{p.clientName}</div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 truncate max-w-[180px]">
                          <span className="truncate">{p.clientEmail}</span>
                        </div>
                      </div>
                    </td>

                    {/* Staff Scope */}
                    <td className="px-3 py-4 align-middle whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md font-bold bg-slate-100 text-slate-700 text-xs">
                        {p.employeeCount || 0}
                      </span>
                    </td>

                    {/* Total Amount & Gross Profit */}
                    <td className="px-4 py-4 align-middle whitespace-nowrap text-right">
                      <div className="font-bold text-slate-900 text-sm tabular-nums">
                        {formatLKR(p.totalAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Base: {formatLKR(p.baseAmount)} | VAT 18%: {formatLKR(p.vatAmount || (p.totalAmount - p.baseAmount))}
                      </div>
                      <div className="text-[10px] font-medium text-emerald-600 font-sans mt-0.5">
                        GP (60%): {formatLKR(p.grossProfit || (p.baseAmount * 0.60))} ({p.grossMarginPct || 60.0}%)
                      </div>
                    </td>

                    {/* Deal Status (Single-Line) */}
                    <td className="px-3 py-4 align-middle whitespace-nowrap text-center">
                      <span
                        className={`whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </span>
                    </td>

                    {/* Issued Date */}
                    <td className="px-3 py-4 align-middle whitespace-nowrap text-slate-700 font-medium text-xs">
                      {fmtDate(p.proposalDate)}
                    </td>

                    {/* Expiry Date */}
                    <td className="px-3 py-4 align-middle whitespace-nowrap text-slate-700 font-medium text-xs">
                      {fmtDate(p.expiryDate)}
                    </td>

                    {/* Actions: WhatsApp + Clone + Download PDF */}
                    <td className="px-4 py-4 align-middle whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp Action */}
                        {p.clientPhone && (
                          <div className="relative group inline-block">
                            <a
                              href={`https://wa.me/${p.clientPhone.replace(/\D/g, "").replace(/^0/, "94")}?text=${encodeURIComponent(
                                `Dear ${p.clientName}, greetings from D TECH Solutions. We have officially dispatched proposal ${p.proposalId} for Zynolo People HRM (${p.employeeCount} Employees, All-Inclusive Flat LKR 400.00/head) to your email. Please let us know when it would be convenient for a quick 15-minute system demonstration.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors inline-flex items-center justify-center border border-emerald-200 bg-emerald-50"
                              aria-label="WhatsApp Corporate Pitch"
                            >
                              <MessageSquare size={15} />
                            </a>
                            <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                              <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                                1-Click WhatsApp Pitch
                                <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Clone / Duplicate Proposal */}
                        <div className="relative group inline-block">
                          <a
                            href={`/create-proposal?clone=${p.id}`}
                            className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-colors inline-flex items-center justify-center border border-blue-200 bg-blue-50"
                            aria-label="Clone Proposal"
                          >
                            <Copy size={15} />
                          </a>
                          <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                            <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                              Clone Proposal ("Duplicate as New")
                              <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        </div>

                        {/* Download PDF */}
                        <div className="relative group inline-block">
                          <a
                            href={`/api/proposals/${p.id}/pdf`}
                            download={`Zynolo-Proposal-${p.proposalId}.pdf`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center border border-transparent hover:border-slate-200"
                            aria-label="Download Proposal PDF"
                          >
                            <Download size={15} />
                          </a>
                          <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                            <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                              Download Proposal PDF
                              <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        </div>

                        {/* Delete Proposal (Executive) */}
                        <div className="relative group inline-block">
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
                            <Trash2 size={15} />
                          </button>
                          <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                            <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                              Delete Proposal (Executive)
                              <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800" />
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

      {/* Executive Deletion Confirmation Modal */}
      <DeleteProposalModal
        isOpen={!!selectedProposalForDeletion}
        proposal={selectedProposalForDeletion}
        onClose={() => setSelectedProposalForDeletion(null)}
        onConfirm={handleDeleteProposal}
        isDeleting={isDeleting}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold animate-slide-up ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
