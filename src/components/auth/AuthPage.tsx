'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import {
  AdminUser,
  loginAdmin,
  registerAdmin,
  checkAuthSetupStatus,
  verifyLogin2FA,
  logoutAdmin,
} from '@/lib/auth';

interface AuthPageProps {
  onAuthSuccess: (user: AdminUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2FA Challenge States
  const [requires2FA, setRequires2FA] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const totpInputRef = useRef<HTMLInputElement>(null);

  // Check if system has any registered admin users
  useEffect(() => {
    let isMounted = true;
    checkAuthSetupStatus().then((status) => {
      if (isMounted) {
        setIsFirstUser(status.isFirstUser);
        if (status.isFirstUser) {
          setMode('REGISTER');
        } else {
          setMode('LOGIN');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto focus 2FA input when step opens
  useEffect(() => {
    if (requires2FA) {
      totpInputRef.current?.focus();
    }
  }, [requires2FA]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (requires2FA) {
        // Handle 2FA TOTP verification
        if (!pendingUser) throw new Error('Missing user session for 2FA.');
        const res = await verifyLogin2FA(factorId, challengeId, totpCode, pendingUser);
        if (res.success && res.user) {
          onAuthSuccess(res.user);
        } else {
          setError(res.error || 'Invalid 2FA verification code. Please check your app.');
        }
        return;
      }

      if (mode === 'LOGIN') {
        const result = await loginAdmin(email, password);
        if (result.requires2FA && result.factorId && result.challengeId && result.user) {
          // Account is secured with 2FA, proceed to second factor verification
          setRequires2FA(true);
          setFactorId(result.factorId);
          setChallengeId(result.challengeId);
          setPendingUser(result.user);
          setError(null);
        } else if (result.success && result.user) {
          onAuthSuccess(result.user);
        } else {
          setError(result.error || 'Failed to authenticate.');
        }
      } else {
        // First user is automatically assigned Super Admin role
        const assignedRole: AdminUser['role'] = isFirstUser ? 'Super Admin' : 'Halal Auditor';
        const result = await registerAdmin(name, email, password, assignedRole);
        if (result.success && result.user) {
          if (result.needsConfirmation) {
            setSuccessMsg(
              `Registration successful! A confirmation email has been dispatched to ${email}. Please confirm your email to sign in.`
            );
            setMode('LOGIN');
            setIsFirstUser(false);
          } else {
            onAuthSuccess(result.user);
          }
        } else {
          setError(result.error || 'Failed to create account.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel2FA = async () => {
    await logoutAdmin();
    setRequires2FA(false);
    setTotpCode('');
    setFactorId('');
    setChallengeId('');
    setPendingUser(null);
    setError(null);
  };

  // While checking setup status
  if (isFirstUser === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#088839]">
          <div className="w-5 h-5 border-2 border-[#088839] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading security parameters...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          {requires2FA ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Two-Factor Authentication</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security Verification</h2>
              <p className="text-xs text-slate-500 font-medium">
                Enter the 6-digit code from your Authenticator app (Google Authenticator, Authy, Apple Passwords).
              </p>
            </>
          ) : isFirstUser ? (
            <>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                Initial Setup · Super Admin Registration
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Super Admin</h2>
              <p className="text-xs text-slate-500 font-medium">
                Welcome! As the first user, your account will be granted full Super Admin authority.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Allo Halal Admin</h2>
              <p className="text-xs text-slate-500 font-medium">
                Sign in to access AI Moderation & Certification Management
              </p>
            </>
          )}
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 font-medium leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-medium leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {requires2FA ? (
            /* 2FA Step Form */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700">Authentication Code</label>
                  <span className="text-[11px] text-slate-400">6 digits</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setTotpCode(val);
                    }}
                    placeholder="000 000"
                    maxLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#088839] focus:bg-white transition-colors"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-1">
                  Signed in as <span className="font-semibold text-slate-600">{pendingUser?.email}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-[#088839] hover:bg-[#066d2e] text-white text-xs font-bold shadow-md shadow-[#088839]/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel2FA}
                disabled={isLoading}
                className="w-full py-2 px-3 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:underline cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : (
            /* Normal Login/Register Form */
            <>
              {mode === 'REGISTER' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Admin User"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#088839] focus:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@allo-halal.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#088839] focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (minimum 6 characters)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#088839] focus:bg-white transition-colors"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#088839] hover:bg-[#066d2e] text-white text-xs font-bold shadow-md shadow-[#088839]/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isFirstUser ? 'Create Super Admin Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
