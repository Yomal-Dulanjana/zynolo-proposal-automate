// src/components/ProposalTable.tsx — Enterprise Proposal Table with Multi-Criteria Filters, Deal Pipeline, Expiry Alerts, Clone & CSV Export
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Download, Mail, Pencil, Trash2, FileText,
  ChevronUp, ChevronDown, AlertCircle, Loader2, CheckCircle2, X,
  Copy, Check, Share2, Send, Clock, TrendingUp, CheckCircle,
  Filter, RotateCcw, Building2, Calendar, Users, DollarSign, Phone,
  MessageSquareWarning, Sparkles, MessageSquare,
} from "lucide-react";
import {
  ACTIVE_PIPELINE_STATUSES,
  TERMINAL_WON_STATUSES,
} from "../utils/financialAnalytics";

export type ProposalStatus =
  | "DRAFT"
  | "HOD_PENDING"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "CHANGED_PENDING"
  | "SENT"
  | "VIEWED"
  | "IN_NEGOTIATION"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface Proposal {
  id: number;
  proposalId: string;
  status: ProposalStatus;
  publicToken?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  employeeCount: number;
  baseAmount: string | number;
  vatAmount: string | number;
  totalAmount: string | number;
  proposalDate: string;
  expiryDate: string;
  pdfPath: string | null;
  hodComment?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
}

interface ProposalTableProps {
  proposals: Proposal[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: number) => Promise<boolean>;
  onResend: (id: number) => Promise<boolean>;
  showToast: (type: "success" | "error", msg: string) => void;
}

type SortKey = "proposalId" | "clientName" | "employeeCount" | "totalAmount" | "proposalDate" | "expiryDate" | "status" | "createdAt";
type SortDir = "asc" | "desc";

function fmtLKR(n: string | number) {
  const num = Number(n) || 0;
  return `LKR ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getRemainingDays(expiry: string): number {
  const now = new Date();
  const exp = new Date(expiry);
  const diffMs = exp.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

const AVAILABLE_MANUAL_STATUSES = [
  { value: "SENT", label: "Approved / Sent" },
  { value: "IN_NEGOTIATION", label: "In Negotiation" },
  { value: "ACCEPTED", label: "Accepted / Won" },
  { value: "REJECTED", label: "Rejected / Lost" },
  { value: "EXPIRED", label: "Expired" },
];

const STATUS_CONFIG: Record<ProposalStatus, { label: string; badgeClass: string }> = {
  HOD_PENDING: {
    label: "HOD Approval Pending",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-300",
  },
  CHANGED_PENDING: {
    label: "HOD Approval Pending",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-300",
  },
  CHANGES_REQUESTED: {
    label: "Revisions Requested",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  APPROVED: {
    label: "Approved / Sent",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  SENT: {
    label: "Approved / Sent",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  VIEWED: {
    label: "Approved / Sent",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  IN_NEGOTIATION: {
    label: "In Negotiation",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  ACCEPTED: {
    label: "Accepted / Won",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Rejected / Lost",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  EXPIRED: {
    label: "Expired",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

export default function ProposalTable({
  proposals,
  loading,
  onRefresh,
  onDelete,
  onResend,
  showToast,
}: ProposalTableProps) {
  // Filter states
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedSizeRange, setSelectedSizeRange] = useState("ALL");
  const [onlyExpiring, setOnlyExpiring] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("filter") === "expiring") {
        setOnlyExpiring(true);
      }
    }
  }, []);

  // Table sorting & modal states
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [followingUp, setFollowingUp] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Proposal | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<Proposal | null>(null);

  // Extract distinct companies from proposals
  const companies = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      if (p.clientName) set.add(p.clientName.trim());
    });
    return Array.from(set).sort();
  }, [proposals]);

  // Extract distinct months from proposals
  const months = useMemo(() => {
    const map = new Map<string, string>(); // "YYYY-MM" -> "Month YYYY"
    proposals.forEach(p => {
      if (p.proposalDate) {
        const d = new Date(p.proposalDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!map.has(key)) map.set(key, label);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [proposals]);

  // Handle Sort Toggle
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearch("");
    setSelectedCompany("ALL");
    setSelectedMonth("ALL");
    setSelectedDate("");
    setSelectedStatus("ALL");
    setSelectedSizeRange("ALL");
    setOnlyExpiring(false);
  }, []);

  // Filter & Sort Logic
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      // 1. Global Search (proposalId, clientName, clientEmail, clientPhone)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          p.proposalId.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.clientEmail.toLowerCase().includes(q) ||
          (p.clientPhone && p.clientPhone.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 2. Company Filter
      if (selectedCompany !== "ALL" && p.clientName.trim() !== selectedCompany) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus !== "ALL") {
        if (selectedStatus === "HOD_PENDING") {
          if (!["HOD_PENDING", "CHANGED_PENDING", "CHANGES_REQUESTED"].includes(p.status)) {
            return false;
          }
        } else if (selectedStatus === "SENT") {
          if (!["SENT", "APPROVED", "VIEWED"].includes(p.status)) {
            return false;
          }
        } else if (selectedStatus === "IN_NEGOTIATION") {
          if (!["IN_NEGOTIATION"].includes(p.status)) {
            return false;
          }
        } else if (p.status !== selectedStatus) {
          return false;
        }
      }

      // 4. Exact Date Filter
      if (selectedDate) {
        const pDate = new Date(p.proposalDate).toISOString().split("T")[0];
        if (pDate !== selectedDate) return false;
      }

      // 5. Month Filter
      if (selectedMonth !== "ALL") {
        const d = new Date(p.proposalDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key !== selectedMonth) return false;
      }

      // 6. Workforce Employee Count Range
      if (selectedSizeRange !== "ALL") {
        const count = p.employeeCount || 0;
        if (selectedSizeRange === "1-50" && (count < 1 || count > 50)) return false;
        if (selectedSizeRange === "51-200" && (count < 51 || count > 200)) return false;
        if (selectedSizeRange === "201-500" && (count < 201 || count > 500)) return false;
        if (selectedSizeRange === "500+" && count < 501) return false;
      }

      // 7. Expiring Soon Quick Filter (<= 5 days)
      if (onlyExpiring) {
        if (["ACCEPTED", "REJECTED", "EXPIRED"].includes(p.status)) return false;
        const now = new Date();
        const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
        const exp = new Date(p.expiryDate);
        if (!(exp >= now && exp <= in5Days)) return false;
      }

      return true;
    }).sort((a, b) => {
      let va: any = a[sortKey];
      let vb: any = b[sortKey];

      if (sortKey === "totalAmount") {
        va = Number(a.totalAmount) || 0;
        vb = Number(b.totalAmount) || 0;
      } else if (sortKey === "employeeCount") {
        va = a.employeeCount || 0;
        vb = b.employeeCount || 0;
      } else if (sortKey === "proposalDate" || sortKey === "expiryDate" || sortKey === "createdAt") {
        va = new Date(a[sortKey]).getTime();
        vb = new Date(b[sortKey]).getTime();
      } else {
        va = String(va || "").toLowerCase();
        vb = String(vb || "").toLowerCase();
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [proposals, search, selectedCompany, selectedStatus, selectedDate, selectedMonth, selectedSizeRange, onlyExpiring, sortKey, sortDir]);

  // Dynamic Metric Cards Calculations (based on filtered list)
  const metrics = useMemo(() => {
    const totalCount = filteredProposals.length;
    let totalPipelineValue = 0;
    let acceptedValue = 0;
    let acceptedCount = 0;
    let expiringSoonCount = 0;

    filteredProposals.forEach(p => {
      const status = (p.status || "").toUpperCase();
      const baseVal = Number(p.baseAmount) || (Number(p.employeeCount || 0) * 400.00);

      // Gatekeep: Only active live pipeline deals count towards Pipeline Value (Excludes HOD review)
      if (ACTIVE_PIPELINE_STATUSES.includes(status)) {
        totalPipelineValue += baseVal;
      }

      if (TERMINAL_WON_STATUSES.includes(status)) {
        acceptedValue += baseVal;
        acceptedCount++;
      }

      const remDays = getRemainingDays(p.expiryDate);
      if (remDays >= 0 && remDays <= 5 && (status === "SENT" || status === "APPROVED")) {
        expiringSoonCount++;
      }
    });

    return {
      totalCount,
      totalPipelineValue,
      acceptedValue,
      acceptedCount,
      expiringSoonCount,
    };
  }, [filteredProposals]);

  // Status Change (PATCH /api/proposals/[id]/status)
  const handleStatusChange = async (proposalId: number, newStatus: ProposalStatus) => {
    setUpdatingStatus(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Proposal status updated to ${newStatus}.`);
        onRefresh();
      } else {
        showToast("error", data.message || "Failed to update status.");
      }
    } catch {
      showToast("error", "Network error updating status.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // 1-Click Formal Follow-Up Email (POST /api/proposals/[id]/follow-up)
  const handleSendFollowUp = async (p: Proposal) => {
    setFollowingUp(p.id);
    try {
      const res = await fetch(`/api/proposals/${p.id}/follow-up`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || `Follow-up email dispatched to ${p.clientEmail}.`);
      } else {
        showToast("error", data.message || "Failed to dispatch follow-up email.");
      }
    } catch {
      showToast("error", "Network error sending follow-up email.");
    } finally {
      setFollowingUp(null);
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredProposals.length === 0) {
      showToast("error", "No records to export.");
      return;
    }

    const headers = [
      "Proposal ID",
      "Client Name",
      "Client Email",
      "Client Phone",
      "Employee Count",
      "Base Amount (LKR)",
      "VAT Amount (LKR)",
      "Total Amount (LKR)",
      "Proposal Date",
      "Expiry Date",
      "Status",
    ];

    const rows = filteredProposals.map(p => [
      `"${p.proposalId}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      `"${p.clientEmail.replace(/"/g, '""')}"`,
      `"${(p.clientPhone || '').replace(/"/g, '""')}"`,
      p.employeeCount || 0,
      Number(p.baseAmount || 0).toFixed(2),
      Number(p.vatAmount || 0).toFixed(2),
      Number(p.totalAmount || 0).toFixed(2),
      new Date(p.proposalDate).toISOString().split("T")[0],
      new Date(p.expiryDate).toISOString().split("T")[0],
      p.status || "SENT",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `proposals_export_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("success", `Exported ${filteredProposals.length} proposal(s) to CSV.`);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCompany !== "ALL" ||
    selectedMonth !== "ALL" ||
    selectedDate !== "" ||
    selectedStatus !== "ALL" ||
    selectedSizeRange !== "ALL" ||
    onlyExpiring;

  return (
    <div className="space-y-6">

      {/* Dynamic Summary Metric Cards (Calculated based on filtered results) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Proposals */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Total Proposals</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">
            {metrics.totalCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-sans">
            {hasActiveFilters ? "Matching active filters" : "All active deals in pipeline"}
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Active Pipeline</span>
            <TrendingUp size={16} className="text-crimson-600" />
          </div>
          <div className="text-xl sm:text-2xl font-heading font-semibold text-crimson-600 truncate tracking-tight tabular-nums">
            {fmtLKR(metrics.totalPipelineValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-sans">
            Approved / Sent &amp; In Negotiation (Excl. HOD Review)
          </div>
        </div>

        {/* Accepted / Won */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Accepted Deals</span>
            <CheckCircle size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-heading font-semibold text-emerald-600 truncate tracking-tight tabular-nums">
            {fmtLKR(metrics.acceptedValue)}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1 font-sans">
            {metrics.acceptedCount} Won proposal(s)
          </div>
        </div>

        {/* Expiring Soon Alert Card */}
        <div
          onClick={() => setOnlyExpiring((prev) => !prev)}
          className={`rounded-xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] cursor-pointer transition-all ${
            onlyExpiring
              ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 shadow-md"
              : "bg-white border-slate-200/90 hover:border-amber-300 hover:shadow-md"
          }`}
          title="Click to toggle Expiring Soon filter"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-heading font-semibold uppercase tracking-wider">Expiring Soon</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="font-heading font-semibold text-2xl text-amber-600 tracking-tight tabular-nums">
            {metrics.expiringSoonCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>&le; 5 days validity remaining</span>
            {onlyExpiring && <span className="font-bold text-amber-700 text-[11px] underline">Active Filter</span>}
          </div>
        </div>

      </div>

      {/* Multi-Criteria Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        
        {/* Top row: Global Search + Action Buttons (Export CSV + Reset) */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Global Search input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Proposal ID (e.g. DTPZPV), Client Name, or Email..."
              className="form-input pl-10 text-sm w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-heading font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Clear all active filters"
              >
                <RotateCcw size={13} />
                Reset Filters
              </button>
            )}
            
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-heading font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

        </div>

        {/* Second row: Granular Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* 1. Company Dropdown */}
          <div>
            <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Company
            </label>
            <div className="relative">
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                className="form-input text-xs py-2 pr-8 appearance-none cursor-pointer"
              >
                <option value="ALL">All Companies ({companies.length})</option>
                {companies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* 2. Status Dropdown */}
          <div>
            <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Deal Status
            </label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="form-input text-xs py-2 pr-8 appearance-none cursor-pointer"
              >
                <option value="ALL">All Deal States</option>
                <option value="HOD_PENDING">HOD Approval Pending</option>
                <option value="SENT">Approved / Sent</option>
                <option value="IN_NEGOTIATION">In Negotiation</option>
                <option value="ACCEPTED">Accepted / Won</option>
                <option value="REJECTED">Rejected / Lost</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* 3. Month Selector */}
          <div>
            <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Month
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => {
                  setSelectedMonth(e.target.value);
                  if (e.target.value !== "ALL") setSelectedDate("");
                }}
                className="form-input text-xs py-2 pr-8 appearance-none cursor-pointer"
              >
                <option value="ALL">All Months</option>
                {months.map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* 4. Exact Date Picker */}
          <div>
            <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Exact Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                if (e.target.value) setSelectedMonth("ALL");
              }}
              className="form-input text-xs py-1.5"
            />
          </div>

          {/* 5. Employee Count Range */}
          <div>
            <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Workforce Size
            </label>
            <div className="relative">
              <select
                value={selectedSizeRange}
                onChange={e => setSelectedSizeRange(e.target.value)}
                className="form-input text-xs py-2 pr-8 appearance-none cursor-pointer"
              >
                <option value="ALL">All Sizes</option>
                <option value="1-50">1 &ndash; 50 Staff</option>
                <option value="51-200">51 &ndash; 200 Staff</option>
                <option value="201-500">201 &ndash; 500 Staff</option>
                <option value="500+">500+ Enterprise</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
            </div>
          </div>

        </div>

      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-crimson-600" />
            <p className="text-sm font-semibold">Loading enterprise proposals...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <FileText size={40} className="text-slate-300" />
            <h4 className="text-base font-bold text-slate-800">No proposals match your criteria</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Try adjusting your search terms or clearing active filters to view all proposals.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 btn-secondary text-xs"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-heading font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-4 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort("proposalId")}>
                    <div className="flex items-center gap-1.5">
                      Proposal ID
                      {sortKey === "proposalId" && (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </div>
                  </th>
                  <th className="py-4 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort("clientName")}>
                    <div className="flex items-center gap-1.5">
                      Client Organization
                      {sortKey === "clientName" && (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </div>
                  </th>
                  <th className="py-4 px-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort("employeeCount")}>
                    <div className="flex items-center gap-1.5">
                      Staff
                      {sortKey === "employeeCount" && (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </div>
                  </th>
                  <th className="py-4 px-4 cursor-pointer hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort("totalAmount")}>
                    <div className="flex items-center justify-end gap-1.5">
                      Total Investment
                      {sortKey === "totalAmount" && (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </div>
                  </th>
                  <th className="py-4 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1.5">
                      Deal Status
                      {sortKey === "status" && (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </div>
                  </th>
                  <th className="py-4 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort("expiryDate")}>
                    <div className="flex items-center gap-1.5">
                      Validity &amp; Expiry
                      {sortKey === "expiryDate" && (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium text-xs">
                {filteredProposals.map(p => {
                  const remDays = getRemainingDays(p.expiryDate);
                  const isExpiringSoon = remDays >= 0 && remDays <= 5 && (p.status === "SENT" || p.status === "VIEWED");
                  const isExpiredDeal = remDays < 0;
                  const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.SENT;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Proposal ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-crimson-600">
                        <div className="flex items-center gap-2">
                          <span>{p.proposalId}</span>
                        </div>
                        <div className="text-[10px] text-slate-700 font-sans mt-0.5 font-normal">
                          Issued: {fmtDate(p.proposalDate)}
                        </div>
                      </td>

                      {/* Client Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-heading font-semibold text-slate-900 text-sm">{p.clientName}</span>
                          <span className="text-sm font-medium text-slate-700">{p.clientEmail}</span>
                          {p.clientPhone && (
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                              <Phone size={11} className="text-slate-600 flex-shrink-0" />
                              {p.clientPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 text-[11px]">
                          {p.employeeCount}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 text-sm tabular-nums">
                          {fmtLKR(p.totalAmount)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Base: {fmtLKR(p.baseAmount)} | VAT 18%: {fmtLKR(Number(p.vatAmount) || (Number(p.totalAmount) - Number(p.baseAmount)))}
                        </div>
                      </td>

                      {/* Deal Status Column */}
                      <td className="py-3.5 px-4">
                        {p.status === "HOD_PENDING" || p.status === "CHANGED_PENDING" || p.status === "CHANGES_REQUESTED" ? (
                          <div className="inline-flex items-center gap-1.5 flex-wrap">
                            <span className={`border text-[11px] font-bold rounded-full px-2.5 py-1 ${cfg.badgeClass}`}>
                              {cfg.label}
                            </span>
                            {p.status === "CHANGES_REQUESTED" && (
                              <button
                                type="button"
                                onClick={() => setViewingFeedback(p)}
                                title="View HOD Review Feedback"
                                className="p-1 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <MessageSquareWarning size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative inline-block">
                            <select
                              disabled={updatingStatus === p.id}
                              value={p.status === "APPROVED" ? "SENT" : p.status}
                              onChange={e => handleStatusChange(p.id, e.target.value as ProposalStatus)}
                              className={`cursor-pointer border text-[11px] font-bold rounded-full px-2.5 py-1 appearance-none pr-6 focus:outline-none focus:ring-1 focus:ring-crimson-500 transition-all ${cfg.badgeClass}`}
                            >
                              {AVAILABLE_MANUAL_STATUSES.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={11} className="absolute right-2 top-2 pointer-events-none opacity-60" />
                          </div>
                        )}
                      </td>

                      {/* Validity & Expiry with Smart Expiry Alert */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {fmtDate(p.expiryDate)}
                        </div>
                        {isExpiringSoon && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-1 animate-pulse">
                            <Clock size={10} />
                            {remDays === 0 ? "Expires today" : `Expires in ${remDays}d`}
                          </div>
                        )}
                        {isExpiredDeal && (
                          <div className="inline-flex items-center text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5">
                            Expired
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View HOD Feedback Action (if changes requested or rejected) */}
                          {(p.status === "CHANGES_REQUESTED" || p.status === "REJECTED") && (
                            <button
                              type="button"
                              onClick={() => setViewingFeedback(p)}
                              title="View Executive HOD Feedback"
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200 cursor-pointer"
                            >
                              <MessageSquareWarning size={15} />
                            </button>
                          )}

                          {/* 1-Click Formal Follow-up Email Action */}
                          <button
                            type="button"
                            onClick={() => handleSendFollowUp(p)}
                            disabled={followingUp === p.id || p.status === "HOD_PENDING" || p.status === "CHANGED_PENDING" || p.status === "CHANGES_REQUESTED" || p.status === "REJECTED"}
                            title={
                              p.status === "HOD_PENDING" || p.status === "CHANGED_PENDING"
                                ? "Follow-up email unavailable: Proposal pending HOD approval"
                                : "Send Formal Executive Follow-Up Email via SMTP"
                            }
                            className="p-1.5 text-slate-500 hover:text-crimson-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {followingUp === p.id ? (
                              <Loader2 size={15} className="animate-spin text-crimson-600" />
                            ) : (
                              <Send size={15} />
                            )}
                          </button>

                          {/* WhatsApp Corporate Pitch Action */}
                          {p.clientPhone && (
                            <a
                              href={`https://wa.me/${p.clientPhone.replace(/\D/g, "").replace(/^0/, "94")}?text=${encodeURIComponent(
                                `Dear ${p.clientName}, greetings from D TECH Solutions. We have officially dispatched proposal ${p.proposalId} for Zynolo People HRM (${p.employeeCount} Employees, All-Inclusive Flat LKR 400.00/head) to your email. Please let us know when it would be convenient for a quick 15-minute system demonstration.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="1-Click WhatsApp Corporate Pitch"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <MessageSquare size={15} />
                            </a>
                          )}

                          {/* Clone / Duplicate Action */}
                          <a
                            href={`/create-proposal?clone=${p.id}`}
                            title="Clone / Duplicate into New Proposal"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Copy size={15} />
                          </a>

                          {/* Download PDF Action */}
                          <a
                            href={`/api/proposals/${p.id}?action=download`}
                            download={`Proposal_${p.proposalId}.pdf`}
                            title="Download PDF Document"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Download size={15} />
                          </a>

                          {/* Re-send Initial Email Action (Gatekept: only for approved/sent proposals) */}
                          <button
                            type="button"
                            onClick={async () => {
                              setResendingId(p.id);
                              await onResend(p.id);
                              setResendingId(null);
                            }}
                            disabled={resendingId === p.id || p.status === "HOD_PENDING" || p.status === "CHANGED_PENDING" || p.status === "CHANGES_REQUESTED" || p.status === "REJECTED"}
                            title={
                              p.status === "HOD_PENDING" || p.status === "CHANGED_PENDING"
                                ? "Email dispatch disabled until approved by HOD"
                                : "Re-dispatch Original Proposal Email"
                            }
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {resendingId === p.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Mail size={15} />
                            )}
                          </button>

                          {/* Edit Action */}
                          <a
                            href={`/proposals/${p.id}/edit`}
                            title={p.status === "CHANGES_REQUESTED" ? "Edit & Resubmit Proposal with Feedback" : "Edit Proposal Details"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.status === "CHANGES_REQUESTED"
                                ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            }`}
                          >
                            <Pencil size={15} />
                          </a>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(p)}
                            title="Delete Proposal"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-heading font-semibold text-lg text-slate-900">Delete Proposal</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed font-sans">
              Are you sure you want to delete proposal <strong className="font-mono text-slate-900">{confirmDelete.proposalId}</strong> for <strong>{confirmDelete.clientName}</strong>?
              This will remove the database record and delete the generated PDF file permanently.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary text-xs font-heading font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === confirmDelete.id}
                onClick={async () => {
                  setDeletingId(confirmDelete.id);
                  const ok = await onDelete(confirmDelete.id);
                  setDeletingId(null);
                  if (ok) setConfirmDelete(null);
                }}
                className="btn-primary bg-rose-600 hover:bg-rose-700 text-xs font-heading font-medium text-white"
              >
                {deletingId === confirmDelete.id ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Deletion"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW HOD FEEDBACK MODAL ─────────────────────────────────────── */}
      {viewingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  viewingFeedback.status === "REJECTED" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                }`}>
                  <MessageSquareWarning size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-slate-900">
                    Executive Review Feedback
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Proposal <span className="font-mono font-bold text-red-600">{viewingFeedback.proposalId}</span> &bull; {viewingFeedback.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingFeedback(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Status & Reviewer Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Decision:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    viewingFeedback.status === "REJECTED"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {viewingFeedback.status === "REJECTED" ? "Proposal Rejected" : "Revisions Requested"}
                  </span>
                </div>
                {viewingFeedback.reviewedBy && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-500">Reviewed By:</span>
                    <span className="font-semibold">{viewingFeedback.reviewedBy}</span>
                  </div>
                )}
                {viewingFeedback.reviewedAt && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-500">Review Date:</span>
                    <span>{new Date(viewingFeedback.reviewedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
              </div>

              {/* HOD Comment */}
              <div>
                <label className="block text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  HOD Feedback &amp; Instructions:
                </label>
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs font-medium text-slate-900 leading-relaxed whitespace-pre-wrap font-sans">
                  {viewingFeedback.hodComment || "No written explanation provided."}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewingFeedback(null)}
                  className="px-4 py-2 text-xs font-heading font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                {viewingFeedback.status === "CHANGES_REQUESTED" && (
                  <a
                    href={`/proposals/${viewingFeedback.id}/edit`}
                    className="px-4 py-2 text-xs font-heading font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit &amp; Resubmit Proposal</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
