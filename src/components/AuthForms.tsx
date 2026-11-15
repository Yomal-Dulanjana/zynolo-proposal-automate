// src/components/AuthForms.tsx — Login, Signup, Forgot/Reset Password forms
import { useState } from "react";
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

// ── Login Form ────────────────────────────────────────────────────────────────
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirectUrl || "/dashboard";
      } else {
        setError(data.message ?? data.error ?? "Login failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-semibold text-3xl text-slate-900 tracking-tight">Welcome back</h1>
        <p className="text-slate-500 mt-2 text-sm font-sans">Sign in to your proposal portal</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-crimson-700 px-4 py-3 rounded-xl mb-5 animate-slide-up">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="form-label">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="form-input pl-10"
              required autoComplete="email" autoFocus
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="form-label mb-0">Password</label>
            <a href="/forgot-password" className="text-xs text-crimson-600 hover:text-crimson-700 font-semibold">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input pl-10 pr-11"
              required autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Don't have an account?{" "}
        <a href="/signup" className="text-crimson-600 font-bold hover:text-crimson-700">Create one</a>
      </p>
    </div>
  );
}

// ── Sign Up Form ──────────────────────────────────────────────────────────────
export function SignUpForm() {
  const [form, setForm] = useState({ fullName: "", email: "", mobileNumber: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, mobileNumber: form.mobileNumber, password: form.password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
      } else {
        setError(data.message ?? "Sign up failed.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="text-center py-10 animate-fade-in">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-green-600" />
      </div>
      <h2 className="font-heading font-semibold text-xl text-slate-900">Account Created!</h2>
      <p className="text-slate-500 text-sm mt-2 font-sans">Redirecting to your dashboard...</p>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-semibold text-3xl text-slate-900 tracking-tight">Create account</h1>
        <p className="text-slate-500 mt-2 text-sm font-sans">Join the D-Tech proposal portal</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-crimson-700 px-4 py-3 rounded-xl mb-5">
          <AlertCircle size={16} /> <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input type="text" value={form.fullName} onChange={set("fullName")} placeholder="John Smith" className="form-input pl-10" required />
          </div>
        </div>
        <div>
          <label className="form-label">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input type="email" value={form.email} onChange={set("email")} placeholder="john@company.com" className="form-input pl-10" required />
          </div>
        </div>
        <div>
          <label className="form-label">Mobile Number</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input type="tel" value={form.mobileNumber} onChange={set("mobileNumber")} placeholder="+1 (555) 000-0000" className="form-input pl-10" required />
          </div>
        </div>
        <div>
          <label className="form-label">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Min 8 characters" className="form-input pl-10 pr-11" required minLength={8} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-3 text-slate-400">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="form-label">Confirm Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" className={`form-input pl-10 ${form.confirm && form.confirm !== form.password ? "border-crimson-500" : ""}`} required />
          </div>
          {form.confirm && form.confirm !== form.password && <p className="form-error">Passwords do not match</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account? <a href="/login" className="text-crimson-600 font-bold hover:text-crimson-700">Sign in</a>
      </p>
    </div>
  );
}

// ── Forgot / Reset Password ───────────────────────────────────────────────────
export function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=email, 2=OTP+new, 3=done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) setStep(2);
      else setError(data.message ?? "Failed to send OTP.");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (data.success) setStep(3);
      else setError(data.message ?? "Reset failed.");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in">
      {step === 3 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="font-heading font-semibold text-xl text-slate-900">Password Reset!</h2>
          <p className="text-slate-500 text-sm mt-2 font-sans">Your password has been updated successfully.</p>
          <a href="/login" className="btn-primary mt-6 inline-flex font-heading font-medium">Sign In Now</a>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="font-heading font-semibold text-3xl text-slate-900 tracking-tight">
              {step === 1 ? "Forgot password?" : "Enter OTP"}
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-sans">
              {step === 1
                ? "We'll send a 6-digit OTP to your email address."
                : `Enter the OTP sent to ${email} and your new password.`
              }
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-crimson-700 px-4 py-3 rounded-xl mb-5">
              <AlertCircle size={16} /> <span className="text-sm">{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="form-input pl-10" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="form-label">6-Digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="form-input text-center text-2xl font-black tracking-[12px] py-4"
                  required
                />
              </div>
              <div>
                <label className="form-label">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input type={showPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="form-input pl-10 pr-11" required minLength={8} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-3 text-slate-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="form-input" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button type="button" onClick={() => { setStep(1); setError(null); }} className="btn-ghost w-full justify-center text-sm">
                ← Back to email entry
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Remembered it? <a href="/login" className="text-crimson-600 font-bold">Sign in</a>
          </p>
        </>
      )}
    </div>
  );
}
