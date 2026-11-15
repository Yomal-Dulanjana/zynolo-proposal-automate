// src/components/ClientDirectory.tsx — Corporate Client & Accounts Management (Address Book)
import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  DollarSign,
  X,
  History,
  Download,
  Calendar,
  Check,
  Eye,
  ShieldCheck,
  Briefcase,
  ChevronRight,
} from "lucide-react";

export interface ClientProposalSummary {
  id: number;
  proposalId: string;
  clientName: string;
  employeeCount?: number;
  baseAmount: number | string;
  vatPercentage: number | string;
  vatAmount: number | string;
  totalAmount: number | string;
  status: string;
  proposalDate: string;
  expiryDate: string;
  publicToken?: string;
  pdfPath?: string;
}

export interface ClientProfile {
  id: number;
  companyName: string;
  address: string;
  contactPerson?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  logoUrl?: string | null;
  proposalCount?: number;
  totalValue?: number;
  wonValue?: number;
  updatedAt?: string;
  proposals?: ClientProposalSummary[];
}

const STATUS_BADGES: Record<string, { label: string; badgeClass: string }> = {
  DRAFT: { label: "Draft", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  SENT: { label: "Sent", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  VIEWED: { label: "Viewed", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  IN_NEGOTIATION: { label: "In Negotiation", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Accepted / Won", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected / Lost", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  EXPIRED: { label: "Expired", badgeClass: "bg-slate-100 text-slate-600 border-slate-300" },
};

export default function ClientDirectory() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [selectedDrawerClient, setSelectedDrawerClient] = useState<ClientProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (data.success) {
        setClients(data.clients || []);
        // If drawer is currently open, refresh the selected client with new data
        if (selectedDrawerClient) {
          const updated = (data.clients || []).find((c: ClientProfile) => c.id === selectedDrawerClient.id);
          if (updated) setSelectedDrawerClient(updated);
        }
      } else {
        showToast("error", data.message || "Failed to load clients.");
      }
    } catch {
      showToast("error", "Failed to connect to clients service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({
      companyName: "",
      address: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      logoUrl: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: ClientProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(client);
    setFormData({
      companyName: client.companyName,
      address: client.address,
      contactPerson: client.contactPerson || "",
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone || "",
      logoUrl: client.logoUrl || "",
    });
    setIsModalOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("logo", file);

    try {
      setIsUploadingLogo(true);
      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setFormData((prev) => ({ ...prev, logoUrl: data.url }));
        showToast("success", "Logo uploaded successfully!");
      } else {
        showToast("error", data.message || "Logo upload failed.");
      }
    } catch {
      showToast("error", "Error uploading logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.address.trim() || !formData.contactEmail.trim()) {
      showToast("error", "Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showToast("success", data.message || "Client saved successfully!");
        setIsModalOpen(false);
        fetchClients();
      } else {
        showToast("error", data.message || "Failed to save client.");
      }
    } catch {
      showToast("error", "Network error while saving client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to remove "${name}" from your address book?`)) return;

    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Client profile deleted.");
        setClients((prev) => prev.filter((c) => c.id !== id));
        if (selectedDrawerClient?.id === id) {
          setSelectedDrawerClient(null);
        }
      } else {
        showToast("error", data.message || "Failed to delete client.");
      }
    } catch {
      showToast("error", "Failed to delete client.");
    }
  };

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        c.contactEmail.toLowerCase().includes(q) ||
        (c.contactPhone && c.contactPhone.toLowerCase().includes(q)) ||
        c.address.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const summary = useMemo(() => {
    const totalAccounts = clients.length;
    const totalProposals = clients.reduce((sum, c) => sum + (c.proposalCount || 0), 0);
    const totalPipelineValue = clients.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    return { totalAccounts, totalProposals, totalPipelineValue };
  }, [clients]);

  const fmtCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0);
    return `Rs. ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-2xl text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="text-red-600" size={26} />
            Corporate Accounts &amp; Address Book
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Maintain verified corporate accounts, primary stakeholders, and dispatched proposal histories.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-heading font-medium shadow-sm shadow-red-600/30 transition-all hover:scale-[1.02]"
        >
          <Plus size={18} />
          Add Client Profile
        </button>
      </div>

      {/* Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Building2 size={22} className="text-red-500" />
          </div>
          <div>
            <div className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">Registered Accounts</div>
            <div className="text-2xl font-heading font-semibold text-slate-900 mt-0.5 tabular-nums">{summary.totalAccounts}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <FileText size={22} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">Total Proposals</div>
            <div className="text-2xl font-heading font-semibold text-slate-900 mt-0.5 tabular-nums">{summary.totalProposals}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <DollarSign size={22} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">Total Deal Volume</div>
            <div className="text-2xl font-heading font-semibold text-slate-900 mt-0.5 tabular-nums">
              Rs. {summary.totalPipelineValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company name, contact person, email, or address..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Structured Clients Table View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="animate-spin text-red-600 mb-3" size={32} />
          <p className="text-sm font-semibold">Loading corporate address book...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-16 bg-white border border-dashed border-slate-200 rounded-2xl text-center">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-heading font-semibold text-base text-slate-800">No corporate clients found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4 font-sans">
            {search ? "No clients match your search query." : "You haven't saved any corporate client profiles yet."}
          </p>
          {!search && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-heading font-medium shadow-sm"
            >
              <Plus size={16} />
              Create First Client
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-heading font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Company Name &amp; Logo</th>
                  <th className="py-3.5 px-5">Primary Contact Person</th>
                  <th className="py-3.5 px-5 text-center">Total Proposals</th>
                  <th className="py-3.5 px-5 text-right">Total Deal Value</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedDrawerClient(client)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Company Name & Logo */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs">
                          {client.logoUrl ? (
                            <img
                              src={client.logoUrl}
                              alt={client.companyName}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <span className="text-base font-heading font-semibold text-slate-400">
                              {client.companyName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading font-semibold text-sm text-slate-900 group-hover:text-red-600 transition-colors flex items-center gap-1.5">
                            <span className="truncate">{client.companyName}</span>
                            <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5 max-w-xs truncate font-sans">
                            <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{client.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Primary Contact Person */}
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {client.contactPerson ? (
                          <div className="font-heading font-medium text-slate-800 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400 flex-shrink-0" />
                            <span>{client.contactPerson}</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 italic font-sans">No contact designated</div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-600 font-sans">
                          <Mail size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-600">{client.contactEmail}</span>
                        </div>
                        {client.contactPhone && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium font-sans">
                            <Phone size={12} className="text-slate-400 flex-shrink-0" />
                            <span>{client.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Proposals Count */}
                    <td className="py-4 px-5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDrawerClient(client);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-medium bg-slate-100 text-slate-800 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <FileText size={13} className="text-red-600" />
                        <span>{client.proposalCount || 0} Proposals</span>
                      </button>
                    </td>

                    {/* Total Deal Value */}
                    <td className="py-4 px-5 text-right">
                      <div className="font-heading font-semibold text-slate-900 text-sm tabular-nums">
                        {fmtCurrency(client.totalValue)}
                      </div>
                      {(client.wonValue || 0) > 0 && (
                        <div className="text-[11px] font-heading font-medium text-emerald-600 mt-0.5 tabular-nums">
                          Won: {fmtCurrency(client.wonValue)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* History / Detail Drawer Action */}
                        <button
                          type="button"
                          onClick={() => setSelectedDrawerClient(client)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="View Sales & Proposal History"
                        >
                          <History size={16} />
                        </button>

                        {/* New Proposal for this client */}
                        <a
                          href={`/proposals/new?client=${encodeURIComponent(client.companyName)}`}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Generate New Proposal for this Client"
                        >
                          <Plus size={16} />
                        </a>

                        {/* Edit Client */}
                        <button
                          type="button"
                          onClick={(e) => openEditModal(client, e)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Client Profile"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Delete Client */}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(client.id, client.companyName, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Client Profile"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Drawer: [Client Company Name] - Sales & Proposal History */}
      {selectedDrawerClient && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setSelectedDrawerClient(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-2xl w-full flex pl-10">
            <div className="w-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
              
              {/* Drawer Top Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                    {selectedDrawerClient.logoUrl ? (
                      <img
                        src={selectedDrawerClient.logoUrl}
                        alt={selectedDrawerClient.companyName}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-xl font-black text-slate-400">
                        {selectedDrawerClient.companyName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-slate-900 leading-tight">
                      {selectedDrawerClient.companyName}
                    </h3>
                    <div className="font-heading font-medium text-xs text-red-600 uppercase tracking-wider mt-0.5">
                      Sales &amp; Proposal History
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-sans">
                      <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                      <span>{selectedDrawerClient.address}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDrawerClient(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Account Details Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3 font-sans">
                  <div className="text-xs font-heading font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-slate-400" />
                    Authorized Commercial Profile
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Primary Contact Person:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDrawerClient.contactPerson || "Not specified"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact Phone:</span>
                      {selectedDrawerClient.contactPhone ? (
                        <a
                          href={`tel:${selectedDrawerClient.contactPhone}`}
                          className="font-semibold text-slate-800 hover:text-red-600"
                        >
                          {selectedDrawerClient.contactPhone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Not available</span>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Direct Procurement Email:</span>
                      <a
                        href={`mailto:${selectedDrawerClient.contactEmail}`}
                        className="font-semibold text-red-600 hover:underline"
                      >
                        {selectedDrawerClient.contactEmail}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Account Financial Metrics Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
                    <div className="text-[10px] font-heading font-semibold uppercase tracking-wider text-slate-400">Total Proposals</div>
                    <div className="text-xl font-heading font-semibold text-slate-900 mt-0.5 tabular-nums">
                      {selectedDrawerClient.proposalCount || 0}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
                    <div className="text-[10px] font-heading font-semibold uppercase tracking-wider text-slate-400">Total Volume</div>
                    <div className="text-sm font-heading font-semibold text-slate-900 mt-1 tabular-nums">
                      {fmtCurrency(selectedDrawerClient.totalValue)}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
                    <div className="text-[10px] font-heading font-semibold uppercase tracking-wider text-slate-400">Won Value</div>
                    <div className="text-sm font-heading font-semibold text-emerald-600 mt-1 tabular-nums">
                      {fmtCurrency(selectedDrawerClient.wonValue)}
                    </div>
                  </div>
                </div>

                {/* Dispatched Proposals History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-heading font-semibold text-slate-900 flex items-center gap-2">
                      <FileText size={16} className="text-red-600" />
                      Dispatched Commercial Proposals
                    </h4>
                    <a
                      href={`/proposals/new?client=${encodeURIComponent(selectedDrawerClient.companyName)}`}
                      className="inline-flex items-center gap-1 text-xs font-heading font-medium text-red-600 hover:text-red-700 hover:underline"
                    >
                      <Plus size={14} />
                      Create New
                    </a>
                  </div>

                  {!selectedDrawerClient.proposals || selectedDrawerClient.proposals.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-medium text-slate-600 font-sans">No proposals dispatched yet to this client</p>
                      <a
                        href={`/proposals/new?client=${encodeURIComponent(selectedDrawerClient.companyName)}`}
                        className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-heading font-medium hover:bg-red-700"
                      >
                        <Plus size={14} />
                        Dispatch First Proposal
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDrawerClient.proposals.map((prop) => {
                        const statusConfig = STATUS_BADGES[prop.status] || {
                          label: prop.status,
                          badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
                        };

                        return (
                          <div
                            key={prop.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-sm transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900 text-xs">
                                    {prop.proposalId}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusConfig.badgeClass}`}
                                  >
                                    {statusConfig.label}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 font-sans">
                                  <span>Issued: {fmtDate(prop.proposalDate)}</span>
                                  <span>&bull;</span>
                                  <span>Expires: {fmtDate(prop.expiryDate)}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-heading font-semibold text-slate-900 tabular-nums">
                                  {fmtCurrency(prop.totalAmount)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-sans">
                                  Base: {fmtCurrency(prop.baseAmount)}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons for Proposal */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <div className="text-slate-500 text-[11px] font-sans">
                                {prop.employeeCount ? `${prop.employeeCount} staff scope` : "Standard proposal"}
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={`/api/proposals/${prop.id}?action=download`}
                                  download={`Proposal_${prop.proposalId}.pdf`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-heading font-medium transition-colors"
                                >
                                  <Download size={13} />
                                  <span>Download PDF</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedDrawerClient)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-heading font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Edit2 size={14} />
                  Edit Client Profile
                </button>

                <a
                  href={`/proposals/new?client=${encodeURIComponent(selectedDrawerClient.companyName)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-heading font-medium shadow-sm shadow-red-600/30 transition-all hover:scale-[1.02]"
                >
                  <Plus size={14} />
                  New Proposal
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Add / Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h3 className="text-lg font-heading font-semibold text-slate-900 flex items-center gap-2">
                <Building2 size={20} className="text-red-600" />
                {editingClient ? "Edit Client Profile" : "Add New Corporate Client"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-sans font-medium uppercase tracking-wider text-slate-600 mb-1">
                  Company Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. DSI Samson Group"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-sans font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-sans font-medium uppercase tracking-wider text-slate-600 mb-1">
                  Physical Office Address <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 110 Kumaran Ratnam Rd, Colombo 02, Sri Lanka"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-sans font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-sans font-medium uppercase tracking-wider text-slate-600 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. John Doe (HR Director)"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-sans font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-medium uppercase tracking-wider text-slate-600 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-sans font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-medium uppercase tracking-wider text-slate-600 mb-1">
                  Contact Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="procurement@client.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-sans font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-sans font-medium uppercase tracking-wider text-slate-600 mb-1">
                  Client Logo
                </label>
                <div className="flex items-center gap-3">
                  {formData.logoUrl && (
                    <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={formData.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-heading font-medium transition-colors">
                    {isUploadingLogo ? (
                      <Loader2 size={14} className="animate-spin text-red-600" />
                    ) : (
                      <Upload size={14} />
                    )}
                    <span>{formData.logoUrl ? "Change Logo" : "Upload Logo"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-heading font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-heading font-medium shadow-sm shadow-red-600/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingClient ? "Update Client" : "Save Client"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
