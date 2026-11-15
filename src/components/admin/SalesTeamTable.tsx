// src/components/admin/SalesTeamTable.tsx — Executive Sales Team Governance Module
import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  FileText,
  Trophy,
  TrendingUp,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";

export interface SalesRepData {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string;
  createdAt: string;
  totalProposals: number;
  wonProposals: number;
  wonAmount: number;
  pipelineProposals: number;
  pipelineAmount: number;
}

interface SalesTeamTableProps {
  initialReps: SalesRepData[];
}

export default function SalesTeamTable({ initialReps }: SalesTeamTableProps) {
  const [reps, setReps] = useState<SalesRepData[]>(initialReps);
  const [search, setSearch] = useState("");
  const [editingRep, setEditingRep] = useState<SalesRepData | null>(null);
  const [deletingRep, setDeletingRep] = useState<SalesRepData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form state for editing (STRICTLY NO password field, email is read-only)
  const [formFullName, setFormFullName] = useState("");
  const [formMobileNumber, setFormMobileNumber] = useState("");

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Filtered reps
  const filteredReps = useMemo(() => {
    if (!search.trim()) return reps;
    const q = search.toLowerCase();
    return reps.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.mobileNumber.toLowerCase().includes(q)
    );
  }, [reps, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = reps.length;
    const totalProposals = reps.reduce((sum, r) => sum + r.totalProposals, 0);
    const totalWonRevenue = reps.reduce((sum, r) => sum + r.wonAmount, 0);
    const totalPipelineRevenue = reps.reduce((sum, r) => sum + r.pipelineAmount, 0);
    return { totalCount, totalProposals, totalWonRevenue, totalPipelineRevenue };
  }, [reps]);

  // Open Edit Modal
  const handleOpenEdit = (rep: SalesRepData) => {
    setEditingRep(rep);
    setFormFullName(rep.fullName);
    setFormMobileNumber(rep.mobileNumber);
  };

  // Close Edit Modal
  const handleCloseEdit = () => {
    setEditingRep(null);
    setFormFullName("");
    setFormMobileNumber("");
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRep) return;

    if (!formFullName.trim()) {
      showToast("error", "Full Name is required.");
      return;
    }

    if (!formMobileNumber.trim()) {
      showToast("error", "Contact phone number is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/team/${editingRep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formFullName.trim(),
          mobileNumber: formMobileNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to update representative.");
        return;
      }

      // Update local state
      setReps((prev) =>
        prev.map((r) =>
          r.id === editingRep.id
            ? { ...r, fullName: data.user.fullName, mobileNumber: data.user.mobileNumber }
            : r
        )
      );

      showToast("success", `Representative ${data.user.fullName} updated successfully.`);
      handleCloseEdit();
    } catch {
      showToast("error", "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingRep) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/team/${deletingRep.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to remove representative.");
        return;
      }

      // Remove from local state
      setReps((prev) => prev.filter((r) => r.id !== deletingRep.id));
      showToast("success", data.message || "Representative removed successfully.");
      setDeletingRep(null);
    } catch {
      showToast("error", "An error occurred while removing representative.");
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

      {/* Top Department Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reps */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Sales Force
            </div>
            <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">{stats.totalCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Active Representatives</div>
          </div>
          <div className="w-11 h-11 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        {/* Total Proposals */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Proposals Generated
            </div>
            <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">{stats.totalProposals}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Across All Representatives</div>
          </div>
          <div className="w-11 h-11 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        {/* Total Closed Revenue */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Won Revenue
            </div>
            <div className="font-heading font-semibold text-2xl text-emerald-600 tracking-tight tabular-nums">
              Rs. {stats.totalWonRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">Accepted Contract Volume</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Trophy size={20} />
          </div>
        </div>

        {/* Pipeline In Progress */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Active Pipeline
            </div>
            <div className="font-heading font-semibold text-2xl text-slate-900 tracking-tight tabular-nums">
              Rs. {stats.totalPipelineRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium font-sans">In Negotiation &amp; Review</div>
          </div>
          <div className="w-11 h-11 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Toolbar (STRICTLY NO Add Rep Button) */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-semibold text-base text-slate-900">
              Sales Representatives ({filteredReps.length})
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Executive governance and contact directory for Zynolo People commercial representatives.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-red-600 focus:bg-white focus:ring-1 focus:ring-red-600 transition-all"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-5 text-left">REPRESENTATIVE</th>
                <th className="py-3.5 px-4 text-left">CONTACT PHONE</th>
                <th className="py-3.5 px-4 text-center">PROPOSALS</th>
                <th className="py-3.5 px-4 text-left">PERFORMANCE / WIN RATE</th>
                <th className="py-3.5 px-4 text-right">WON REVENUE</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredReps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">No sales representatives found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search ? "Try adjusting your search criteria." : "No representatives registered in the system."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReps.map((rep) => {
                  const winRate =
                    rep.totalProposals > 0
                      ? Math.round((rep.wonProposals / rep.totalProposals) * 100)
                      : 0;

                  return (
                    <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Rep Details */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-red-600/30 flex-shrink-0">
                            {rep.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {rep.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <Mail size={11} className="text-slate-400 flex-shrink-0" />
                              <span className="truncate">{rep.email}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={10} className="text-slate-400" />
                              <span>
                                Joined {new Date(rep.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-4 font-mono text-slate-700">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Phone size={13} className="text-slate-400" />
                          <span>{rep.mobileNumber}</span>
                        </div>
                      </td>

                      {/* Total Proposals */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <FileText size={12} className="text-slate-400" />
                          {rep.totalProposals}
                        </span>
                      </td>

                      {/* Performance */}
                      <td className="py-4 px-4">
                        <div className="w-40 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700">
                              {rep.wonProposals} Won
                            </span>
                            <span className="font-bold text-slate-900">{winRate}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Won Revenue */}
                      <td className="py-4 px-4 font-bold text-emerald-600 font-mono">
                        Rs. {rep.wonAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rep)}
                            title="Edit Representative Profile"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingRep(rep)}
                            title="Remove Representative"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* ── EDIT REPRESENTATIVE MODAL ───────────────────────────────────── */}
      {editingRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Sales Representative
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update representative details and contact information.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. Kasun Fernando"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-red-600 focus:bg-white focus:ring-1 focus:ring-red-600 transition-all"
                />
              </div>

              {/* Contact Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Phone Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formMobileNumber}
                  onChange={(e) => setFormMobileNumber(e.target.value)}
                  placeholder="+94 77 123 4567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-red-600 focus:bg-white focus:ring-1 focus:ring-red-600 transition-all font-mono"
                />
              </div>

              {/* Email (Disabled / Read-only with Lock) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                    <Lock size={10} /> Read-Only
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  value={editingRep.email}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Lock size={11} className="text-slate-400 flex-shrink-0" />
                  <span>Email and login credentials cannot be modified by administrator.</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCloseEdit}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────────── */}
      {deletingRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Remove Sales Representative
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Are you sure you want to remove{" "}
                <span className="font-bold text-slate-900">{deletingRep.fullName}</span>?
                Their historical proposals will be retained/reassigned.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1 mb-5">
                <div className="flex justify-between">
                  <span>Registered Email:</span>
                  <span className="font-mono font-semibold text-slate-700">{deletingRep.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Proposals Created:</span>
                  <span className="font-semibold text-slate-700">{deletingRep.totalProposals} proposals</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setDeletingRep(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm Removal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
