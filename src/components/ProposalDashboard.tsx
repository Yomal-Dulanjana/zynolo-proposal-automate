// src/components/ProposalDashboard.tsx — Proposal history data table & embedded sales rep profile management
import { useState, useEffect, useCallback } from "react";
import {
  FileText, CheckCircle2, AlertCircle, X,
  User, Lock, Phone, Save, Eye, EyeOff, Loader2
} from "lucide-react";
import ProposalTable, { type Proposal } from "./ProposalTable";

interface Profile {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string;
  createdAt: string;
}

export default function ProposalDashboard() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Profile Section State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [showProfileTab, setShowProfileTab] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proposals");
      const data = await res.json();
      if (data.success && Array.isArray(data.proposals)) {
        setProposals(data.proposals);
      }
    } catch {
      showToast("error", "Failed to load proposals.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setMobileNumber(data.profile.mobileNumber);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchProposals();
    fetchProfile();
  }, [fetchProposals, fetchProfile]);

  const handleDelete = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProposals(prev => prev.filter(x => x.id !== id));
        showToast("success", "Proposal deleted successfully.");
        return true;
      } else {
        showToast("error", data.message ?? "Delete failed.");
        return false;
      }
    } catch {
      showToast("error", "Network error during deletion.");
      return false;
    }
  };

  const handleResend = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proposals/${id}/resend`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Proposal PDF resent successfully!");
        return true;
      } else {
        showToast("error", data.message ?? "Failed to resend proposal.");
        return false;
      }
    } catch {
      showToast("error", "Network error during resend.");
      return false;
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Contact details updated successfully.");
        fetchProfile();
      } else {
        showToast("error", data.message ?? "Failed to update profile.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      showToast("error", "Password must be at least 8 characters.");
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast("error", data.message ?? "Password update failed.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-sm font-semibold transition-all animate-slide-up ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-crimson-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-crimson-600 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowProfileTab(false)}
          className={`px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all flex items-center gap-2 ${
            !showProfileTab
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText size={15} />
          Proposal Pipeline &amp; History
        </button>
        <button
          onClick={() => setShowProfileTab(true)}
          className={`px-4 py-2 rounded-lg text-sm font-heading font-medium transition-all flex items-center gap-2 ${
            showProfileTab
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <User size={15} />
          My Sales Profile
        </button>
      </div>

      {!showProfileTab ? (
        /* Proposal Table with Search, Filter Bar, Deal Pipeline & Actions */
        <ProposalTable
          proposals={proposals}
          loading={loading}
          onRefresh={fetchProposals}
          onDelete={handleDelete}
          onResend={handleResend}
          showToast={showToast}
        />
      ) : (
        /* Sales Rep Profile Settings Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
          {/* Contact Details Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
                <User size={17} className="text-crimson-600" />
                Sales Representative Information
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                These credentials appear on Page 7 of every generated proposal.
              </p>
            </div>
            <form onSubmit={handleProfileSave} className="p-6 space-y-4">
              <div>
                <label className="form-label font-sans font-medium">Full Name</label>
                <input
                  type="text"
                  value={profile?.fullName ?? ""}
                  disabled
                  className="form-input opacity-60 cursor-not-allowed bg-slate-50 font-sans"
                />
              </div>
              <div>
                <label className="form-label font-sans font-medium">Corporate Email</label>
                <input
                  type="email"
                  value={profile?.email ?? ""}
                  disabled
                  className="form-input opacity-60 cursor-not-allowed bg-slate-50 font-sans"
                />
              </div>
              <div>
                <label className="form-label font-sans font-medium">
                  Mobile Number <span className="text-crimson-600">*</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="form-input pl-10 font-sans"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-primary text-xs font-heading font-medium justify-center w-full"
              >
                {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Contact Info
              </button>
            </form>
          </div>

          {/* Security & Password Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
                <Lock size={17} className="text-crimson-600" />
                Change Portal Password
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Ensure your corporate sales account remains secure.
              </p>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <div>
                <label className="form-label font-sans font-medium">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="form-input pr-10 font-sans"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label font-sans font-medium">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="form-input pr-10 font-sans"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label font-sans font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="form-input font-sans"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-secondary text-xs font-heading font-medium justify-center w-full"
              >
                {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
