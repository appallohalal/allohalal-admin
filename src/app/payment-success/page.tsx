'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, HeartHandshake, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [confirmedData, setConfirmedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const confirmPayment = async () => {
      try {
        const res = await fetch('/api/stripe/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();
        if (data.success) {
          setConfirmedData(data.contribution);
        } else {
          setError(data.error || 'Could not verify payment record.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error while verifying payment.');
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
        {loading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="w-10 h-10 text-[#088839] animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Verifying Payment...</h2>
            <p className="text-xs text-slate-500">
              Confirming your contribution with Stripe and updating the ledger.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide mb-2">
                Payment Successful
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                JazakAllah Khair!
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Thank you for supporting Allo Halal. Your contribution helps sustain free Halal verification for the community.
              </p>
            </div>

            {confirmedData && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Amount:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    €{Number(confirmedData.amount).toFixed(2)} {confirmedData.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Donor:</span>
                  <span className="font-semibold text-slate-800">{confirmedData.donorName}</span>
                </div>
                {confirmedData.transactionId && (
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                    <span className="text-slate-400 font-mono">Reference:</span>
                    <span className="font-mono text-slate-600 truncate max-w-[180px]">
                      {confirmedData.transactionId}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#088839] hover:bg-[#066e2e] transition-all shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
            <div className="py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-[#088839] animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-slate-800">Verifying Payment...</h2>
              <p className="text-xs text-slate-500">
                Confirming your contribution with Stripe and updating the ledger.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}

