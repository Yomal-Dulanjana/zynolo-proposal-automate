// src/components/ProfileModal.tsx — Sales rep profile update form
import { useState, useEffect } from "react";
import {
  User, Phone, Lock, Eye, EyeOff, CheckCircle2,
  AlertCircle, Loader2, Save, X
} from "lucide-react";

interface Profile {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string;
  createdAt: string;
}

export default function ProfileModal() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProfile(data.profile);
          setMobileNumber(data.profile.mobileNumber);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      showToast("error", "New passwords do not match.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      showToast("error", "New password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (mobileNumber !== profile?.mobileNumber) payload.mobileNumber = mobileNumber;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        showToast("error", "No changes to save.");
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", "Profile updated successfully!");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        if (mobileNumber && profile) setProfile({ ...profile, mobileNumber });
      } else {
        showToast("error", data.message ?? "Update failed.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-crimson-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border animate-slide-up
          ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-crimson-700"}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-auto"><X size={16} className="opacity-60" /></button>
        </div>
      )}

      {/* Profile header */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-crimson-600 rounded-2xl flex items-center justify-center text-white font-heading font-semibold text-2xl flex-shrink-0">
          {profile?.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-heading font-semibold text-xl text-slate-900">{profile?.fullName}</h2>
          <p className="text-slate-500 text-sm font-sans">{profile?.email}</p>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Member since {profile ? new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : ""}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact info */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
              <User size={15} className="text-crimson-600" />
              Contact Information
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="form-label">Full Name</label>
              <input value={profile?.fullName ?? ""} disabled className="form-input opacity-60 cursor-not-allowed" />
              <p className="text-xs text-slate-400 mt-1">Contact admin to update your name</p>
            </div>
            <div>
              <label className="form-label">Email Address</label>
              <input value={profile?.email ?? ""} disabled className="form-input opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="form-label">
                Mobile Number <span className="text-crimson-600">*</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="form-input pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Password change */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
              <Lock size={15} className="text-crimson-600" />
              Change Password
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">Leave blank to keep your current password</p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="form-label">Current Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="form-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="form-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`form-input pl-10 ${confirmPassword && confirmPassword !== newPassword ? "border-crimson-500 ring-1 ring-crimson-500" : ""}`}
                />
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="form-error">Passwords do not match</p>
              )}
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3 text-base">
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={18} /> Save Changes</>
          )}
        </button>
      </form>
    </div>
  );
}
