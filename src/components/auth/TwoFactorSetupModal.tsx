'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  X,
  Smartphone,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  checkCurrentUserMFA,
  enrollTOTP,
  verifyAndActivateTOTP,
  disableTOTP,
} from '@/lib/auth';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: (isEnabled: boolean) => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const [step, setStep] = useState<'LOADING' | 'STATUS' | 'ENROLL' | 'SUCCESS'>('LOADING');
  const [isEnabled, setIsEnabled] = useState(false);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  // Enrollment data
  const [factorId, setFactorId] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');

  // UI state
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch MFA status when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setStep('LOADING');

    checkCurrentUserMFA()
      .then((status) => {
        if (!isMounted) return;
        setIsEnabled(status.isEnabled);
        setActiveFactorId(status.verifiedFactorId || null);
        setStep('STATUS');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to check 2FA status');
        setStep('STATUS');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEnroll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await enrollTOTP('Allo Halal Admin');
      if (res.success && res.factorId && res.qrCode) {
        setFactorId(res.factorId);
        setQrCode(res.qrCode);
        setSecret(res.secret || '');
        setVerificationCode('');
        setStep('ENROLL');
      } else {
        setError(res.error || 'Failed to initialize 2FA enrollment.');
      }
    } catch (err: any) {
      setError(err.message || 'Error initializing 2FA enrollment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await verifyAndActivateTOTP(factorId, verificationCode);
      if (res.success) {
        setIsEnabled(true);
        setActiveFactorId(factorId);
        setStep('SUCCESS');
        onStatusChanged?.(true);
      } else {
        setError(res.error || 'Invalid code. Check your authenticator app.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!activeFactorId) return;
    if (
      !confirm(
        'Are you sure you want to disable Two-Factor Authentication? Your account will only be protected by your password.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await disableTOTP(activeFactorId);
      if (res.success) {
        setIsEnabled(false);
        setActiveFactorId(null);
        setStep('STATUS');
        onStatusChanged?.(false);
      } else {
        setError(res.error || 'Failed to disable 2FA.');
      }
    } catch (err: any) {
      setError(err.message || 'Error disabling 2FA.');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#088839] shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Two-Factor Authentication (2FA)</h3>
            <p className="text-xs text-slate-500 font-medium">
              Protect your administrative privileges with TOTP verification
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-medium leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: LOADING */}
        {step === 'LOADING' && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-6 h-6 border-2 border-[#088839] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Checking security status...</span>
          </div>
        )}

        {/* STEP 2: STATUS VIEW */}
        {step === 'STATUS' && (
          <div className="space-y-5">
            {isEnabled ? (
              /* 2FA Active */
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#088839]" />
                  <span>2FA is currently ENABLED & ACTIVE</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your administrator account is actively protected. Whenever you sign in to{' '}
                  <span className="font-semibold text-slate-900">admin.allo-halal.com</span>, you will be
                  prompted for your password and a 6-digit authenticator code.
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleDisable2FA}
                    disabled={isLoading}
                    className="w-full py-2 px-3 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Disable Two-Factor Authentication</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* 2FA Disabled */
              <div className="space-y-4">
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>2FA is not yet configured for this account</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Two-Factor Authentication adds an indispensable layer of security to your admin account by
                    requiring an authentication code from your mobile device upon login.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pl-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span>Compatible with Google Authenticator, 1Password, Authy & Apple Passwords.</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Prevents unauthorized access even if your password is compromised.</span>
                  </div>
                </div>

                <button
                  onClick={handleStartEnroll}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#088839] hover:bg-[#066d2e] text-white text-xs font-bold shadow-md shadow-[#088839]/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Set Up Two-Factor Authentication</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ENROLL QR CODE & VERIFY */}
        {step === 'ENROLL' && (
          <form onSubmit={handleVerifyEnrollment} className="space-y-4">
            <div className="text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800">1. Scan QR Code</span>
              <p className="text-[11px] text-slate-500">
                Open your authenticator app and scan the code below:
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  className="w-44 h-44 object-contain rounded-xl bg-white p-1 border border-slate-100 shadow-xs"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-xs">
                  Loading QR Code...
                </div>
              )}

              {/* Secret manual key fallback */}
              {secret && (
                <div className="mt-3 w-full">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center mb-1">
                    Or Enter Secret Manually
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-700">
                    <span className="truncate flex-1 select-all text-center font-bold tracking-wider">
                      {secret}
                    </span>
                    <button
                      type="button"
                      onClick={copySecretToClipboard}
                      title="Copy Key"
                      className="p-1 text-slate-400 hover:text-[#088839] transition-colors cursor-pointer shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Code Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">2. Enter 6-digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                  setVerificationCode(val);
                }}
                placeholder="000 000"
                maxLength={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#088839] focus:bg-white transition-colors"
                required
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('STATUS')}
                disabled={isLoading}
                className="w-1/3 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="w-2/3 py-2 px-3 rounded-xl bg-[#088839] hover:bg-[#066d2e] text-white text-xs font-bold shadow-sm shadow-[#088839]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Verify & Activate</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'SUCCESS' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#088839] flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">2FA Successfully Enabled!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Your admin account is now fortified. You will need your authenticator app each time you sign in.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-[#088839] hover:bg-[#066d2e] text-white text-xs font-bold shadow-md shadow-[#088839]/20 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

