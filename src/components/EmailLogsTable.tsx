// src/components/EmailLogsTable.tsx — Email Delivery Logs & Activity Tracker
import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
  Filter,
  UserCheck,
  Building,
  Clock,
  ExternalLink,
  Loader2,
  Calendar,
} from "lucide-react";

interface EmailLogItem {
  id: number;
  proposalId: string;
  clientName?: string;
  recipientType: "CLIENT" | "SALES_REP";
  recipientEmail: string;
  subject: string;
  status: "SENT" | "FAILED";
  errorMessage?: string | null;
  sentAt: string;
}

export default function EmailLogsTable() {
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SENT" | "FAILED">("ALL");
  const [resendingProposalId, setResendingProposalId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = statusFilter === "ALL" ? "/api/logs" : `/api/logs?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        showToast("error", data.message || "Failed to load email delivery logs.");
      }
    } catch {
      showToast("error", "Error connecting to delivery logs service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleResend = async (proposalId: string) => {
    try {
      setResendingProposalId(proposalId);
      // Fetch proposal by proposalId to get numerical ID
      const propRes = await fetch("/api/proposals");
      const propData = await propRes.json();
      const target = propData.proposals?.find((p: any) => p.proposalId === proposalId);

      if (!target?.id) {
        showToast("error", `Proposal ${proposalId} not found in database.`);
        return;
      }

      const res = await fetch(`/api/proposals/${target.id}/resend`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Proposal ${proposalId} resent successfully!`);
        fetchLogs(); // Refresh logs to see new delivery entry
      } else {
        showToast("error", data.message || "Failed to resend proposal email.");
      }
    } catch {
      showToast("error", "Network error attempting to resend proposal.");
    } finally {
      setResendingProposalId(null);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.proposalId.toLowerCase().includes(q) ||
        l.recipientEmail.toLowerCase().includes(q) ||
        (l.clientName && l.clientName.toLowerCase().includes(q)) ||
        l.subject.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.status === "SENT").length;
    const failed = logs.filter((l) => l.status === "FAILED").length;
    return { total, sent, failed };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Mail className="text-red-600" size={26} />
            Email Delivery Logs &amp; Activity Tracker
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time audit log of all transactional proposal dispatches, sales rep confirmation copies, and follow-ups.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors self-start md:self-auto"
        >
          <RotateCw size={14} className={loading ? "animate-spin text-red-600" : ""} />
          Refresh Logs
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Mail size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Dispatches</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivered Successfully</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.sent}</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed Dispatches</div>
            <div className="text-2xl font-black text-rose-600 mt-0.5">{stats.failed}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Logs ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter("SENT")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "SENT"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Delivered ({stats.sent})
          </button>
          <button
            onClick={() => setStatusFilter("FAILED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "FAILED"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Failed ({stats.failed})
          </button>
        </div>

        {/* Search */}
        <div className="w-full md:w-80 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, email, or client..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin text-red-600 mb-3" size={32} />
            <p className="text-sm font-semibold">Fetching delivery logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Mail size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No email delivery logs recorded</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? "No delivery logs match your filter criteria."
                : "Logs will automatically populate when you create or dispatch proposals."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5">Proposal Ref</th>
                  <th className="py-3.5 px-5">Recipient</th>
                  <th className="py-3.5 px-5">Subject Line</th>
                  <th className="py-3.5 px-5">Delivery Status</th>
                  <th className="py-3.5 px-5 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  const sentDate = new Date(log.sentAt);
                  const formattedDate = sentDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = sentDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formattedDate}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={11} /> {formattedTime}
                        </div>
                      </td>

                      {/* Proposal Ref & Client */}
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-red-600">{log.proposalId}</div>
                        <div className="text-[11px] text-slate-500 font-medium truncate max-w-[160px]">
                          {log.clientName}
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              log.recipientType === "CLIENT"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {log.recipientType === "CLIENT" ? (
                              <Building size={10} />
                            ) : (
                              <UserCheck size={10} />
                            )}
                            {log.recipientType === "CLIENT" ? "Client" : "Sales Rep"}
                          </span>
                        </div>
                        <div className="text-slate-700 font-semibold mt-1 truncate max-w-[200px]">
                          {log.recipientEmail}
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-5 text-slate-600 max-w-[260px] truncate" title={log.subject}>
                        {log.subject}
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {log.status === "SENT" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            Delivered
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle size={12} />
                              Failed
                            </span>
                            {log.errorMessage && (
                              <p className="text-[10px] text-rose-600 font-mono mt-1 max-w-[180px] truncate" title={log.errorMessage}>
                                {log.errorMessage}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleResend(log.proposalId)}
                          disabled={resendingProposalId === log.proposalId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-bold border border-slate-200 transition-colors disabled:opacity-50"
                        >
                          <RotateCw
                            size={12}
                            className={resendingProposalId === log.proposalId ? "animate-spin text-red-600" : ""}
                          />
                          Resend Email
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
