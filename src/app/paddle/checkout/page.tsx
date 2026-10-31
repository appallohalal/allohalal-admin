'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const txnId = searchParams.get('txn_id') || searchParams.get('_ptxn') || '';
  const mode = searchParams.get('mode') || 'sandbox';
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || searchParams.get('_email') || searchParams.get('donor_email') || '';

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!txnId) {
      setErrorMessage('No transaction identifier provided.');
      setLoading(false);
      return;
    }

    // Load Paddle.js v2 dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;

    script.onload = () => {
      const Paddle = (window as any).Paddle;
      if (!Paddle) {
        setErrorMessage('Failed to initialize Paddle Checkout script.');
        setLoading(false);
        return;
      }

      try {
        if (mode === 'sandbox') {
          Paddle.Environment.set('sandbox');
        }

        if (token) {
          Paddle.Initialize({
            token: token,
          });
        }

        const checkoutOptions: any = {
          transactionId: txnId,
          settings: {
            displayMode: 'inline',
            frameTarget: 'paddle-checkout-frame',
            frameInitialHeight: 450,
            frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
            successUrl: `${window.location.origin}/payment-success?session_id=${encodeURIComponent(txnId)}`,
          },
        };

        if (email && email.trim()) {
          checkoutOptions.customer = {
            email: email.trim(),
          };
        }

        Paddle.Checkout.open(checkoutOptions);

        setLoading(false);
      } catch (err: any) {
        console.error('Paddle open error:', err);
        setErrorMessage(err.message || 'Error opening Paddle Checkout.');
        setLoading(false);
      }
    };

    script.onerror = () => {
      setErrorMessage('Could not reach Paddle CDN. Please check your network connection.');
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [txnId, mode, token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">
              AH
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Allo Halal Community Support</h1>
              <p className="text-[11px] text-slate-400">Paddle Secure Checkout</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {mode === 'sandbox' ? 'Sandbox' : 'Live'}
          </span>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-600">Connecting to Paddle Secure Checkout...</p>
            </div>
          )}

          {errorMessage && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                !
              </div>
              <p className="text-sm font-semibold text-rose-800">{errorMessage}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Retry
              </button>
            </div>
          )}

          {/* Paddle inline checkout mount container */}
          <div className="paddle-checkout-frame" />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Powered by Paddle • 256-Bit SSL Encrypted
        </div>
      </div>
    </div>
  );
}

export default function PaddleCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

