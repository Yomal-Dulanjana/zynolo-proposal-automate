// src/components/ProposalForm.tsx — Dynamic proposal form with real-time VAT math & sales rep details
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Building2, Mail, MapPin, Users, Calculator,
  FileText, AlertCircle, CheckCircle2, Loader2, X, Image,
  User, Phone, DollarSign
} from "lucide-react";
import { calculateProposalPricing, BASE_RATE_PER_EMPLOYEE } from "../utils/pricing";

interface FormData {
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  clientLogoUrl: string;
  employeeCount: string;
  baseAmount: string;
}

interface Financials {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}

interface SalesRep {
  fullName: string;
  mobileNumber: string;
  email: string;
}

interface SavedClient {
  id: number;
  companyName: string;
  address: string;
  contactEmail: string;
  contactPhone?: string | null;
  logoUrl: string | null;
}

function fmt(n: number) {
  const num = Number(n) || 0;
  return `LKR ${num.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProposalForm({
  mode = "create",
  proposalId,
  cloneId: propCloneId,
}: {
  mode?: "create" | "edit";
  proposalId?: number;
  cloneId?: number;
}) {
  const [form, setForm] = useState<FormData>({
    clientName: "",
    clientAddress: "",
    clientEmail: "",
    clientPhone: "",
    clientLogoUrl: "",
    employeeCount: "10",
    baseAmount: "4000",
  });

  const [rep, setRep] = useState<SalesRep | null>(null);
  const [ratePerUser, setRatePerUser] = useState<number>(400.00);
  const [financials, setFinancials] = useState<Financials>(() => {
    const p = calculateProposalPricing(10, 400.00);
    return { baseAmount: p.baseAmount, vatAmount: p.vatAmount, totalAmount: p.totalAmount };
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cloneNotice, setCloneNotice] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const clientComboboxRef = useRef<HTMLDivElement>(null);

  // Compute live financials whenever employeeCount or ratePerUser changes
  useEffect(() => {
    const count = Math.max(1, Math.round(Number(form.employeeCount) || 1));
    const userRate = Math.max(0, Number(ratePerUser) || 0);
    const pricing = calculateProposalPricing(count, userRate);
    setFinancials({
      baseAmount: pricing.baseAmount,
      vatAmount: pricing.vatAmount,
      totalAmount: pricing.totalAmount,
    });
    setForm(prev => {
      const computedBase = String(pricing.baseAmount);
      if (prev.baseAmount !== computedBase) {
        return { ...prev, baseAmount: computedBase };
      }
      return prev;
    });
  }, [form.employeeCount, ratePerUser]);

  // Fetch saved client profiles (Address Book) & handle URL param auto-fill
  useEffect(() => {
    fetch("/api/proposals/clients")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.clients)) {
          setSavedClients(data.clients);
          if (typeof window !== "undefined") {
            const clientParam = new URLSearchParams(window.location.search).get("client");
            if (clientParam) {
              const matched = data.clients.find(
                (c: any) => c.companyName.toLowerCase() === clientParam.toLowerCase()
              );
              if (matched) {
                setForm(prev => ({
                  ...prev,
                  clientName: matched.companyName,
                  clientAddress: matched.address,
                  clientEmail: matched.contactEmail,
                  clientPhone: matched.contactPhone || prev.clientPhone,
                  clientLogoUrl: matched.logoUrl || prev.clientLogoUrl,
                }));
                if (matched.logoUrl) setLogoPreview(matched.logoUrl);
              }
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Clone proposal handler
  useEffect(() => {
    if (mode === "create") {
      let targetCloneId: string | number | null = propCloneId ?? null;
      if (!targetCloneId && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        targetCloneId = params.get("clone");
      }
      if (targetCloneId) {
        fetch(`/api/proposals/${targetCloneId}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.proposal) {
              const p = data.proposal;
              setForm({
                clientName: p.clientName ?? "",
                clientAddress: p.clientAddress ?? "",
                clientEmail: p.clientEmail ?? "",
                clientPhone: p.clientPhone ?? "",
                clientLogoUrl: p.clientLogoUrl ?? "",
                employeeCount: String(p.employeeCount ?? "10"),
                baseAmount: String(p.baseAmount ?? "400"),
              });
              if (p.ratePerUser !== undefined && p.ratePerUser !== null) {
                setRatePerUser(Number(p.ratePerUser));
              }
              if (p.ratePerUser !== undefined && p.ratePerUser !== null) {
              setRatePerUser(Number(p.ratePerUser));
            }
            if (p.clientLogoUrl) setLogoPreview(p.clientLogoUrl);
              setCloneNotice(`Duplicating details from Proposal ${p.proposalId}. Submit to issue a new proposal with fresh dates.`);
            }
          })
          .catch(() => {});
      }
    }
  }, [mode, propCloneId]);

  // Click outside to close client combobox
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientComboboxRef.current && !clientComboboxRef.current.contains(e.target as Node)) {
        setShowClientSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch logged-in sales rep profile
  useEffect(() => {
    fetch("/api/auth/profile")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          setRep({
            fullName: data.profile.fullName,
            mobileNumber: data.profile.mobileNumber,
            email: data.profile.email,
          });
        }
      })
      .catch(() => {});
  }, []);

  // In edit mode, load existing proposal
  useEffect(() => {
    if (mode === "edit" && proposalId) {
      fetch(`/api/proposals/${proposalId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.proposal) {
            const p = data.proposal;
            setForm({
              clientName: p.clientName ?? "",
              clientAddress: p.clientAddress ?? "",
              clientEmail: p.clientEmail ?? "",
              clientPhone: p.clientPhone ?? "",
              clientLogoUrl: p.clientLogoUrl ?? "",
              employeeCount: String(p.employeeCount ?? "0"),
              baseAmount: String(p.baseAmount ?? "0"),
            });
            if (p.ratePerUser !== undefined && p.ratePerUser !== null) {
              setRatePerUser(Number(p.ratePerUser));
            }
            if (p.clientLogoUrl) setLogoPreview(p.clientLogoUrl);
          }
        });
    }
  }, [mode, proposalId]);

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleLogoUpload = useCallback(async (file: File) => {
    setLogoUploading(true);
    // Instant local preview
    try {
      const localPreviewUrl = URL.createObjectURL(file);
      setLogoPreview(localPreviewUrl);
    } catch {
      // ignore
    }

    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        handleChange("clientLogoUrl", data.url);
        setLogoPreview(data.url);
      } else {
        setError(data.message || data.error || "Logo upload failed.");
        setLogoPreview(null);
      }
    } catch {
      setError("Logo upload failed. Please try again.");
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  }, [handleChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!form.clientName || !form.clientAddress || !form.clientEmail || !form.clientPhone) {
      setError("Client company name, address, email, and phone number are required.");
      setSubmitting(false);
      return;
    }
    if (financials.baseAmount <= 0) {
      setError("Base Amount must be greater than zero.");
      setSubmitting(false);
      return;
    }

    try {
      const count = Math.max(1, Math.round(Number(form.employeeCount) || 1));
      const userRate = Math.max(0, Number(ratePerUser) || 0);
      const pricing = calculateProposalPricing(count, userRate);

      const payload = {
        clientName: form.clientName,
        clientAddress: form.clientAddress,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone,
        clientLogoUrl: form.clientLogoUrl || undefined,
        employeeCount: pricing.employeeCount,
        ratePerUser: userRate,
        ratePerEmployee: userRate,
        baseAmount: pricing.baseAmount,
        vatAmount: pricing.vatAmount,
        totalAmount: pricing.totalAmount,
      };

      const url = mode === "edit" ? `/api/proposals/${proposalId}` : "/api/proposals";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        setError(`Server returned status ${res.status}. Please verify your input and try again.`);
        setSubmitting(false);
        return;
      }

      if (data?.success) {
        setSuccess(
          mode === "edit"
            ? "Proposal updated and resubmitted to HOD for approval!"
            : `Proposal ${data.proposal?.proposalId || ""} created and routed to HOD for executive review!`
        );
        setTimeout(() => {
          window.location.href = "/proposals";
        }, 1800);
      } else {
        const errorMsg = data?.message || (res.status === 401 ? "Session expired. Please log in again." : "Failed to save proposal. Please check inputs.");
        setError(errorMsg);
      }
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
      {/* Clone Notification */}
      {cloneNotice && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-sm animate-slide-up">
          <FileText size={18} className="text-blue-600 flex-shrink-0" />
          <span className="flex-1 font-medium">{cloneNotice}</span>
          <button type="button" onClick={() => setCloneNotice(null)} className="text-blue-400 hover:text-blue-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-crimson-700 px-4 py-3.5 rounded-xl animate-slide-up">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto">
            <X size={16} className="text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3.5 rounded-xl animate-slide-up">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          <span className="text-sm font-semibold">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left 2 Columns: Client & Financial Inputs */}
        <div className="xl:col-span-2 space-y-6">

          {/* Client Logo Upload */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
                <Image size={16} className="text-crimson-600" />
                Client Logo Box (Page 1)
              </h3>
            </div>
            <div className="p-6">
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150
                  ${logoPreview ? "border-crimson-200 bg-red-50/40" : "border-slate-200 hover:border-crimson-300 bg-slate-50 hover:bg-red-50/20"}`}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={logoPreview} alt="Client logo preview" className="max-h-24 max-w-56 object-contain rounded" />
                    <span className="text-xs text-slate-500 font-medium">Click to change client logo</span>
                  </div>
                ) : logoUploading ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 size={24} className="text-crimson-600 animate-spin" />
                    <span className="text-sm text-slate-500 font-medium">Uploading logo...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-1">
                      <Upload size={20} className="text-crimson-600" />
                    </div>
                    <p className="text-sm font-heading font-semibold text-slate-700">Drop client logo here or click to browse</p>
                    <p className="text-xs text-slate-400">PNG, JPG, SVG, or WEBP (Max 5MB)</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </div>
              {logoPreview && (
                <button
                  type="button"
                  className="mt-3 text-xs text-slate-400 hover:text-crimson-600 flex items-center gap-1 font-semibold"
                  onClick={() => { setLogoPreview(null); handleChange("clientLogoUrl", ""); }}
                >
                  <X size={12} /> Remove uploaded logo
                </button>
              )}
            </div>
          </div>

          {/* Client Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-crimson-600" />
                Client Company Information
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div ref={clientComboboxRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label mb-0">
                    Client Company Name <span className="text-crimson-600">*</span>
                  </label>
                  {savedClients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClientSuggestions(v => !v)}
                      className="text-xs font-semibold text-crimson-600 hover:text-crimson-700 flex items-center gap-1 transition-colors"
                    >
                      <Building2 size={12} /> Address Book ({savedClients.length})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={form.clientName}
                    onFocus={() => setShowClientSuggestions(true)}
                    onChange={e => {
                      handleChange("clientName", e.target.value);
                      setShowClientSuggestions(true);
                    }}
                    placeholder="e.g. Acme Global Logistics"
                    className="form-input pl-10"
                    required
                  />
                </div>

                {/* Saved Client Suggestions Combobox */}
                {showClientSuggestions && savedClients.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-slide-up">
                    <div className="px-3.5 py-2 bg-slate-50 text-[11px] font-heading font-semibold uppercase tracking-wider text-slate-400">
                      Saved Client Profiles (Click to Auto-fill)
                    </div>
                    {savedClients
                      .filter(c =>
                        !form.clientName ||
                        c.companyName.toLowerCase().includes(form.clientName.toLowerCase()) ||
                        c.contactEmail.toLowerCase().includes(form.clientName.toLowerCase())
                      )
                      .slice(0, 6)
                      .map(client => (
                        <div
                          key={client.id}
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              clientName: client.companyName,
                              clientAddress: client.address,
                              clientEmail: client.contactEmail,
                              clientPhone: client.contactPhone || prev.clientPhone,
                              clientLogoUrl: client.logoUrl || prev.clientLogoUrl,
                            }));
                            if (client.logoUrl) setLogoPreview(client.logoUrl);
                            setShowClientSuggestions(false);
                          }}
                          className="px-4 py-2.5 hover:bg-red-50/50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-heading font-semibold text-slate-900">{client.companyName}</div>
                            <div className="text-xs text-slate-500">{client.contactEmail}</div>
                          </div>
                          <span className="text-[11px] font-semibold text-crimson-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            Auto-fill &rarr;
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">
                  Client Address <span className="text-crimson-600">*</span>
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <textarea
                    value={form.clientAddress}
                    onChange={e => handleChange("clientAddress", e.target.value)}
                    placeholder="e.g. 742 Evergreen Terrace, Sector 4, Enterprise City"
                    className="form-input pl-10 resize-none"
                    rows={3}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Client Recipient Email <span className="text-crimson-600">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={e => handleChange("clientEmail", e.target.value)}
                    placeholder="procurement@acmeglobal.com"
                    className="form-input pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">The proposal PDF will be delivered directly to this email.</p>
              </div>

              <div>
                <label className="form-label">
                  Client Mobile / Phone Number <span className="text-crimson-600">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={form.clientPhone}
                    onChange={e => handleChange("clientPhone", e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="form-input pl-10 border-slate-200 focus:border-red-600 focus:ring-red-600"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Direct contact number of the client procurement representative.</p>
              </div>
            </div>
          </div>

          {/* Workforce & Financial Calculation Inputs */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
                <Calculator size={16} className="text-crimson-600" />
                Workforce &amp; Financial Scope
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="form-label font-sans font-medium flex items-center justify-between">
                    <span>Number of Employees <span className="text-crimson-600">*</span></span>
                  </label>
                  <div className="relative">
                    <Users size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      value={form.employeeCount}
                      onChange={e => handleChange("employeeCount", e.target.value)}
                      placeholder="e.g. 10"
                      className="form-input pl-10 font-sans"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Count of client corporate users.
                  </p>
                </div>

                <div>
                  <label className="form-label font-sans font-medium flex items-center justify-between">
                    <span>Rate Per Employee (LKR) <span className="text-crimson-600">*</span></span>
                    <span className="text-[11px] font-bold text-crimson-600 bg-red-50 px-2 py-0.5 rounded border border-red-100" title="Customizable Base Rate / Head (Default: LKR 400.00)">
                      Default: 400.00
                    </span>
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={ratePerUser}
                      onChange={e => setRatePerUser(parseFloat(e.target.value) || 0)}
                      placeholder="400.00"
                      className="form-input pl-10 font-sans"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Base price quoted per user.
                  </p>
                </div>

                <div>
                  <label className="form-label font-sans font-medium flex items-center justify-between">
                    <span>Base Amount (Excl. Tax)</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {form.employeeCount || 0} × LKR {Number(ratePerUser || 0).toFixed(2)}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-heading font-semibold text-slate-400 pointer-events-none select-none">
                      Rs.
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={financials.baseAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      className="form-input pl-11 font-heading font-semibold bg-slate-50 text-slate-800 cursor-not-allowed select-none"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Subtotal excl. tax. 18% VAT will be auto-computed (+{fmt(financials.vatAmount)}).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Auto-Calculated Summary & Sales Rep Binding */}
        <div className="space-y-6">

          {/* Auto-Generated Values */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-heading font-semibold text-slate-900 uppercase tracking-wider">
                System Auto-Generated Fields
              </h3>
            </div>
            <div className="p-5 space-y-3.5 font-sans">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Proposal ID</span>
                <span className="font-mono text-xs font-bold text-crimson-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  DTPZPV••••••••
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Version</span>
                <span className="font-bold text-slate-800">1.0.0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Proposal Date</span>
                <span className="font-semibold text-slate-800">
                  {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Expiry Date (21 Days)</span>
                <span className="font-semibold text-crimson-700">
                  {new Date(Date.now() + 21 * 864e5).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Live Financial Calculation Card */}
          <div className="card border-crimson-100 bg-gradient-to-br from-white to-red-50/30">
            <div className="card-header border-crimson-100">
              <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
                <Calculator size={16} className="text-crimson-600" />
                Live Financial Computation
              </h3>
            </div>
            <div className="p-5 space-y-3 font-sans">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">
                  Base Subscription ({form.employeeCount || 0} × LKR {Number(ratePerUser || 0).toFixed(2)})
                </span>
                <span className="font-bold text-slate-800 tabular-nums">{fmt(financials.baseAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Sri Lankan VAT (18%)</span>
                <span className="font-bold text-orange-600 tabular-nums">+ {fmt(financials.vatAmount)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                <div>
                  <span className="font-heading font-semibold text-slate-900 text-sm block">Total Investment</span>
                  <span className="text-[11px] text-slate-400 font-sans">Monthly all-inclusive</span>
                </div>
                <span className="font-heading font-semibold text-2xl text-crimson-600 tabular-nums">{fmt(financials.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Authenticated Sales Representative Card */}
          <div className="card bg-slate-900 text-white">
            <div className="p-5">
              <div className="text-xs text-slate-400 font-heading font-semibold uppercase tracking-wider mb-2">
                Sales Representative (Page 7)
              </div>
              {rep ? (
                <div className="space-y-2">
                  <div className="text-lg font-heading font-semibold text-white flex items-center gap-2">
                    <User size={16} className="text-crimson-500" />
                    {rep.fullName}
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2 font-sans">
                    <Phone size={13} className="text-slate-400" />
                    {rep.mobileNumber}
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2 font-sans">
                    <Mail size={13} className="text-slate-400" />
                    {rep.email}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm font-sans">
                  <Loader2 size={16} className="animate-spin text-crimson-500" />
                  Loading representative details...
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting || financials.totalAmount <= 0}
            className="w-full btn-primary justify-center text-base py-3.5 shadow-lg shadow-crimson-600/20 font-heading font-medium"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {mode === "edit" ? "Updating & Regenerating..." : "Compiling PDF & Submitting..."}
              </>
            ) : (
              <>
                <FileText size={18} />
                {mode === "edit" ? "Update & Resubmit for Review" : "Generate & Submit for HOD Review"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
