import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Wrench, User, LogIn, UserPlus, LogOut, Sparkles, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { user, login, register, logout } = useAuth();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'citizen' | 'admin' | 'worker'>('citizen');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        if (!displayName.trim()) {
          throw new Error('Please enter your full name');
        }
        const createdUser = await register(
          email.trim(),
          displayName.trim(),
          password,
          role,
          phone.trim() || undefined
        );
        if (createdUser.role === 'admin') navigate('/admin');
        else if (createdUser.role === 'worker') navigate('/worker');
        else navigate('/my-reports');
      } else {
        const loggedUser = await login(email.trim(), password);
        if (loggedUser.role === 'admin') navigate('/admin');
        else if (loggedUser.role === 'worker') navigate('/worker');
        else navigate('/my-reports');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to pre-fill test credentials into inputs without auto-submitting
  const handlePrefillDemo = (demoEmail: string, demoRole: 'citizen' | 'admin' | 'worker') => {
    setIsRegisterMode(false);
    setRole(demoRole);
    setEmail(demoEmail);
    setPassword(demoEmail.split('@')[0] + '123');
    setError(null);
    setSuccessMsg(`Sample credentials for ${demoRole} pre-filled below. Review and click "Sign In" when ready.`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-white">
          {isRegisterMode ? 'Create Your Account' : 'CleanTrack AI Portal'}
        </h1>
        <p className="text-xs text-slate-400">
          {isRegisterMode
            ? 'Enter your own details below to register your personal CleanTrack account.'
            : 'Enter your email and password below to access your account.'}
        </p>
      </div>

      {/* If currently logged in as a different user (e.g. Pooja Verma) */}
      {user && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 space-y-3 text-xs shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Currently Logged In As:</div>
                <div className="font-bold text-white text-sm">{user.display_name}</div>
                <div className="text-[11px] text-indigo-400 font-mono">{user.email} · {user.role}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs transition border border-red-500/30"
              title="Sign out of this account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 border-t border-white/5 pt-2">
            To sign in or create an account with your own details, click <strong>Log Out</strong> above or enter your credentials below.
          </p>
        </div>
      )}

      {/* Portal / Role Target Selection (Does NOT auto-login, only selects role) */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
          Select Portal Role
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setRole('citizen');
              setError(null);
            }}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
              role === 'citizen'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <User className={`w-4 h-4 ${role === 'citizen' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span className="font-bold">Citizen</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('worker');
              setError(null);
            }}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
              role === 'worker'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <Wrench className={`w-4 h-4 ${role === 'worker' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="font-bold">Worker</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setError(null);
            }}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
              role === 'admin'
                ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <Shield className={`w-4 h-4 ${role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="font-bold">Admin</span>
          </button>
        </div>
      </div>

      {/* Auth Card */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-white/10 pb-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 text-center transition ${
              !isRegisterMode ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In with Email
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 text-center transition ${
              isRegisterMode ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create New Account
          </button>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* The Actual Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Registration Fields */}
          {isRegisterMode && (
            <>
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold flex items-center justify-between">
                  <span>Your Full Name *</span>
                  <span className="text-[10px] text-indigo-400 font-normal">This will be your account name</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('citizen')}
                    className={`py-2 px-3 rounded-xl border text-center transition ${
                      role === 'citizen'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Citizen / Resident
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('worker')}
                    className={`py-2 px-3 rounded-xl border text-center transition ${
                      role === 'worker'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    Sanitation Worker
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">
                  Phone Number <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                />
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRegisterMode ? "yourname@example.com" : "Enter your email"}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500 transition text-xs"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500 transition text-xs"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : isRegisterMode ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create My Account & Enter</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In as {role === 'admin' ? 'Admin' : role === 'worker' ? 'Worker' : 'Citizen'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle between Register and Sign In */}
        <div className="text-center pt-2 border-t border-white/5">
          {isRegisterMode ? (
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className="text-indigo-400 hover:underline font-bold"
              >
                Sign In here
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className="text-indigo-400 hover:underline font-bold"
              >
                Register your own account
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Evaluation / Sample Demo Credentials (Pre-fill ONLY, does NOT auto-submit) */}
      {!isRegisterMode && (
        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-2 text-center">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Need sample credentials to test?</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Clicking a demo button below only pre-fills the input boxes so you can review them before signing in.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handlePrefillDemo('citizen@cleantrack.gov.in', 'citizen')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold transition"
            >
              Fill Citizen Demo
            </button>
            <button
              type="button"
              onClick={() => handlePrefillDemo('worker@cleantrack.gov.in', 'worker')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
            >
              Fill Worker Demo
            </button>
            <button
              type="button"
              onClick={() => handlePrefillDemo('admin@cleantrack.gov.in', 'admin')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition"
            >
              Fill Admin Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
