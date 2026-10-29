'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const emailParam = searchParams.get('email');
        const tokenParam = searchParams.get('token');
        const tokenHash = searchParams.get('token_hash');
        const typeParam = searchParams.get('type') || 'signup';

        // 1. Check URL hash from Supabase implicit redirect (#access_token=...)
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
          const { data } = await supabase.auth.getSession();
          const sessionEmail = data.session?.user?.email;
          if (sessionEmail) {
            await supabase
              .from('users')
              .update({ email_verified: true })
              .eq('email', sessionEmail.toLowerCase());
            setVerifiedEmail(sessionEmail);
          }
          setStatus('success');
          setMessage('Your email has been confirmed and your Allo Halal account is now active!');
          return;
        }

        // 2. Check query params (?email=...&token=... or ?token_hash=...)
        if ((emailParam && tokenParam) || tokenHash) {
          const res = await fetch('/api/v1/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailParam,
              token: tokenParam,
              token_hash: tokenHash,
              type: typeParam,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setVerifiedEmail(data.email || emailParam);
            setStatus('success');
            setMessage(data.message || 'Your email address has been verified successfully!');
          } else {
            setStatus('error');
            setMessage(data.error || 'Could not verify this confirmation link.');
          }
          return;
        }

        // 3. Default success if redirected after Supabase verification
        setStatus('success');
        setMessage('Your email has been confirmed! You can now return to the Allo Halal mobile app.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'An unexpected error occurred while confirming your email.');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 text-center space-y-5">
        <div className="inline-flex w-16 h-16 rounded-2xl overflow-hidden bg-[#088839] items-center justify-center shadow-lg shadow-[#088839]/25 mx-auto">
          <img src="/logo.png" alt="Allo Halal" className="w-full h-full object-cover" />
        </div>

        {status === 'loading' && (
          <div className="space-y-3 py-4">
            <div className="w-8 h-8 border-3 border-[#088839] border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-extrabold text-slate-900">Confirming Email...</h2>
            <p className="text-xs text-slate-500">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6f4eb] border border-[#b5e0c5] text-[#066d2e] text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#088839]" />
              <span>Email Confirmed</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome to Allo Halal!
            </h2>
            {verifiedEmail && (
              <p className="text-xs font-mono font-semibold text-[#088839] bg-[#e6f4eb]/60 py-1.5 px-3 rounded-lg inline-block">
                {verifiedEmail}
              </p>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
            <div className="pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                You may now close this window and continue using the <strong>Allo Halal</strong> mobile application.
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Verification Issue</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Confirmation Link Invalid</h2>
            <p className="text-sm text-slate-600">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#088839] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
