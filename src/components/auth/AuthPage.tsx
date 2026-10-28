'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { AdminUser, loginAdmin, registerAdmin, checkAuthSetupStatus } from '@/lib/auth';

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

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        const result = await loginAdmin(email, password);
        if (result.success && result.user) {
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

  // While checking setup status
  if (isFirstUser === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#088839]">
          <div className="w-5 h-5 border-2 border-[#088839] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl overflow-hidden bg-[#088839] items-center justify-center shadow-lg shadow-[#088839]/25 mb-1">
            <img src="/logo.png" alt="Allo Halal" className="w-full h-full object-cover" />
          </div>

          {isFirstUser ? (
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
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
                placeholder="admin@yourdomain.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
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
        </form>
      </div>
    </div>
  );
};
