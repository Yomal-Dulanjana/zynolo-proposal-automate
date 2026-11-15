// src/components/admin/ExpiringProposalsView.tsx — Executive Urgent Expiry Monitoring
import React, { useState, useMemo } from "react";
import {
  Clock,
  AlertTriangle,
  Search,
  FileText,
  User,
  Phone,
  Mail,
  Download,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export interface ExpiringProposalItem {
  id: number;
  proposalId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  salesRepName: string;
  salesRepEmail: string;
  salesRepPhone?: string;
  baseAmount?: number;
  vatAmount?: number;
  totalAmount: number;
  status: string;
  proposalDate: string;
  expiryDate: string;
  daysRemaining: number;
}

interface ExpiringProposalsViewProps {
  initialProposals: ExpiringProposalItem[];
}

export default function ExpiringProposalsView({ initialProposals }: ExpiringProposalsViewProps) {
  const [proposals] = useState<ExpiringProposalItem[]>(initialProposals);
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<"ALL" | "CRITICAL" | "UPCOMING">("ALL");

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        p.proposalId.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.salesRepName.toLowerCase().includes(q) ||
        p.clientEmail.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (urgencyFilter === "CRITICAL") {
        return p.daysRemaining <= 2;
      }
      if (urgencyFilter === "UPCOMING") {
        return p.daysRemaining > 2;
      }
      return true;
    });
  }, [proposals, search, urgencyFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = proposals.length;
    const criticalCount = proposals.filter((p) => p.daysRemaining <= 2).length;
    const totalAtRiskRevenue = proposals.reduce((sum, p) => sum + p.totalAmount, 0);
    return { totalCount, criticalCount, totalAtRiskRevenue };
  }, [proposals]);

  return (
    <div className="space-y-6">
      {/* Top Warning Banner / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total At-Risk Revenue */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              At-Risk Pipeline Revenue
            </div>
            <div className="font-heading font-semibold text-2xl text-rose-600 tracking-tight tabular-nums">
              Rs. {stats.totalAtRiskRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Pending Client Decision</div>
          </div>
          <div className="w-11 h-11 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Critical Expiry (<= 48h) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Critical (≤ 48 Hours)
            </div>
            <div className="font-heading font-semibold text-2xl text-amber-600 tracking-tight tabular-nums">{stats.criticalCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Require Immediate Follow-up</div>
          </div>
          <div className="w-11 h-11 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Total Expiring Within 5 Days */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Expiring Soon (5 Days)
            </div>
            <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">{stats.totalCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Company-Wide Proposals</div>
          </div>
          <div className="w-11 h-11 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Main Expiring Proposals List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUrgencyFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                urgencyFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Expiring ({proposals.length})
            </button>
            <button
              type="button"
              onClick={() => setUrgencyFilter("CRITICAL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                urgencyFilter === "CRITICAL"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              Critical ≤ 48h ({stats.criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setUrgencyFilter("UPCOMING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                urgencyFilter === "UPCOMING"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              3 - 5 Days ({proposals.length - stats.criticalCount})
            </button>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, proposal ID, or rep..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-red-600 focus:bg-white focus:ring-1 focus:ring-red-600 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-5 text-left">TIME LEFT</th>
                <th className="py-3.5 px-4 text-left">PROPOSAL ID</th>
                <th className="py-3.5 px-4 text-left">CLIENT ORGANIZATION</th>
                <th className="py-3.5 px-4 text-left">ASSIGNED SALES REP</th>
                <th className="py-3.5 px-4 text-right">TOTAL INVESTMENT</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Clock size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">No expiring proposals in this range.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All active proposals have more than 5 days remaining or have been closed.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProposals.map((item) => {
                  const isCritical = item.daysRemaining <= 2;
                  const isToday = item.daysRemaining <= 0;

                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/75 transition-colors">
                      {/* Urgency Badge */}
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <span
                          className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                            isToday
                              ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                              : isCritical
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <Clock size={12} />
                          {isToday
                            ? "Expires Today!"
                            : item.daysRemaining === 1
                            ? "1 Day Left"
                            : `${item.daysRemaining} Days Left`}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Deadline: {new Date(item.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>

                      {/* Proposal ID */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#E11D48] block tabular-nums">
                          {item.proposalId}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {item.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">{item.clientName}</div>
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <Mail size={11} className="text-slate-400" />
                          <span>{item.clientEmail}</span>
                        </div>
                        {item.clientPhone && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                            <Phone size={11} className="text-slate-400" />
                            <span>{item.clientPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Sales Rep */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {item.salesRepName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{item.salesRepName}</div>
                            <div className="text-xs text-slate-500">{item.salesRepEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Deal Value */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap text-right">
                        <div className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                          LKR {item.totalAmount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Base: LKR {(item.baseAmount ?? item.totalAmount / 1.18).toLocaleString("en-LK", { minimumFractionDigits: 2 })} | VAT 18%: LKR {(item.vatAmount ?? (item.totalAmount - (item.baseAmount ?? item.totalAmount / 1.18))).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 align-middle whitespace-nowrap text-right">
                        <div className="relative group inline-block">
                          <a
                            href={`/api/proposals/${item.id}/pdf`}
                            download={`Zynolo-Proposal-${item.proposalId}.pdf`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center border border-transparent hover:border-slate-200"
                            aria-label="Download Proposal PDF"
                          >
                            <Download size={16} />
                          </a>
                          <div className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap">
                            <div className="bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-md shadow-lg relative">
                              Download Proposal PDF
                              <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-800" />
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
    </div>
  );
}
