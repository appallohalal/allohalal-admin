'use client';

import React, { useEffect, useState } from 'react';
import { toast, ToastItem } from '@/lib/toast';
import { CheckCircle2, XCircle, Info, Loader2, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
            item.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10'
              : item.type === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-500/10'
              : item.type === 'info'
              ? 'bg-blue-50/95 border-blue-200 text-blue-950 shadow-blue-500/10'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-500/10'
          }`}
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            {item.type === 'success' && (
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            {item.type === 'error' && (
              <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <XCircle className="w-4 h-4" />
              </div>
            )}
            {item.type === 'info' && (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Info className="w-4 h-4" />
              </div>
            )}
            {item.type === 'loading' && (
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-1">
            {item.title && (
              <h5 className="text-xs font-bold leading-tight mb-0.5 tracking-tight">
                {item.title}
              </h5>
            )}
            <p className="text-xs font-medium leading-relaxed opacity-90 break-words">
              {item.message}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => toast.dismiss(item.id)}
            className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
