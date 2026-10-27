'use client';

import React, { useState, useEffect } from 'react';
import { GroqApiLog, GroqSettings } from '@/lib/types';
import { DEFAULT_GROQ_SETTINGS } from '@/lib/storage';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';
import {
  Terminal,
  Zap,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Save,
  Play,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface GroqLogsProps {
  logs: GroqApiLog[];
  settings?: GroqSettings;
  onSaveSettings?: (settings: GroqSettings) => Promise<void>;
  onRefreshLogs?: () => Promise<void>;
}

const GROQ_TEXT_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B' },
];

const GROQ_VISION_MODELS = [
  { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision' },
  { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision' },
];

export const GroqLogs: React.FC<GroqLogsProps> = ({
  logs,
  settings: initialSettings,
  onSaveSettings,
  onRefreshLogs,
}) => {
  const [form, setForm] = useState<GroqSettings>(initialSettings || DEFAULT_GROQ_SETTINGS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isTesting, setIsTesting] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'RATE_LIMITED' | 'ERROR'>('ALL');
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onSaveSettings) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings(form);
      setSaveSuccess(true);
      toast.success('Groq AI API settings and models saved successfully.', 'Settings Saved');
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message || err}`, 'Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!form.apiKey.trim()) {
      toast.error('Please enter a Groq API Key before testing.', 'API Key Required');
      return;
    }

    const toastId = toast.loading('Testing Groq AI connection...', 'Connection Test');
    setIsTesting(true);

    try {
      if (onSaveSettings) {
        await onSaveSettings(form);
      }

      const res = await fetch('/api/v1/groq/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Test Product',
          ingredientsText: 'Wheat, water, salt',
          language: 'English',
          barcode: 'TEST-PING',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const latency = data.telemetry?.latencyMs || 200;
        const model = data.telemetry?.model || form.model;
        toast.dismiss(toastId);
        toast.success(`Connected (${latency}ms) • ${model}`, 'Connection Verified');
        if (onRefreshLogs) onRefreshLogs();
      } else {
        toast.dismiss(toastId);
        toast.error(data.error || 'Connection failed. Please verify API key.', 'Connection Error');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Network error occurred during test.', 'Connection Error');
    } finally {
      setIsTesting(false);
    }
  };

  const totalLogs = logs.length;
  const successLogs = logs.filter((l) => l.status === 'SUCCESS').length;
  const rateLimitedLogs = logs.filter((l) => l.status === 'RATE_LIMITED').length;
  const errorLogs = logs.filter((l) => l.status === 'ERROR').length;
  const totalTokens = logs.reduce((acc, l) => acc + (l.promptTokens || 0) + (l.completionTokens || 0), 0);
  const avgLatency = Math.round(
    logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / (logs.length || 1)
  );
  const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

  const filteredLogs = statusFilter === 'ALL' ? logs : logs.filter((log) => log.status === statusFilter);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handleCopyLog = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const c = APP_COLORS.classes;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. API Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-900">Groq AI API & Models</h3>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Key className={`w-3.5 h-3.5 ${c.primaryText}`} />
              <span>Groq API Key</span>
            </label>

            <div className="relative flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="gsk_..."
                value={form.apiKey}
                onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value.trim() }))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-20 text-xs font-mono text-slate-800 focus:bg-white ${c.primaryFocus} transition-all`}
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  title={showApiKey ? 'Hide' : 'Show'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {form.apiKey && (
                  <button
                    type="button"
                    onClick={() => handleCopyLog(form.apiKey)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Models */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className={`w-3.5 h-3.5 ${c.primaryText}`} />
                <span>Text Model</span>
              </label>

              <select
                value={form.model}
                onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white ${c.primaryFocus} transition-all cursor-pointer`}
              >
                {GROQ_TEXT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${c.primaryText}`} />
                <span>Vision Model</span>
              </label>

              <select
                value={form.visionModel}
                onChange={(e) => setForm((p) => ({ ...p, visionModel: e.target.value }))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white ${c.primaryFocus} transition-all cursor-pointer`}
              >
                {GROQ_VISION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !form.apiKey}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className={`w-3.5 h-3.5 ${c.primaryText}`} />
              )}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={`px-6 py-2 text-xs font-bold rounded-xl ${c.primaryBg} ${c.primaryBgHover} text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Requests</span>
            <Activity className={`w-4 h-4 ${c.primaryText}`} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {totalLogs.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {successRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {successLogs} success
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Avg Latency</span>
            <Zap className={`w-4 h-4 ${c.primaryText}`} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {avgLatency} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Tokens</span>
            <Cpu className={`w-4 h-4 ${c.primaryText}`} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {totalTokens.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {rateLimitedLogs} limits • {errorLogs} errors
          </div>
        </div>
      </div>

      {/* 3. Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setStatusFilter('SUCCESS')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'SUCCESS'
                  ? `${c.primaryBg} text-white font-bold shadow-2xs`
                  : `text-slate-600 ${c.primaryBgHover}`
              }`}
            >
              Success ({successLogs})
            </button>
            <button
              onClick={() => setStatusFilter('RATE_LIMITED')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'RATE_LIMITED'
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Limits ({rateLimitedLogs})
            </button>
            <button
              onClick={() => setStatusFilter('ERROR')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'ERROR'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Errors ({errorLogs})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Endpoint</th>
                <th className="py-2.5 px-4">Model</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-center">Tokens</th>
                <th className="py-2.5 px-4 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No logs found
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    <td className="py-2.5 px-4 text-slate-900 font-medium">
                      {log.endpoint}
                      {log.barcode && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {log.barcode}
                        </span>
                      )}
                    </td>

                    <td className={`py-2.5 px-4 font-semibold whitespace-nowrap ${c.primaryText}`}>
                      {log.model}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {log.status === 'SUCCESS' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold text-[11px]">
                          200 OK
                        </span>
                      )}
                      {log.status === 'RATE_LIMITED' && (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold text-[11px]">
                          429 Limit
                        </span>
                      )}
                      {log.status === 'ERROR' && (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold text-[11px]">
                          {log.statusCode || 500} Error
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center text-slate-700 font-semibold">
                      {log.promptTokens + log.completionTokens}
                    </td>

                    <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                      {log.latencyMs}ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
            <div className="text-xs text-slate-500 font-medium font-sans">
              Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
              <span className="font-semibold text-slate-800">{filteredLogs.length}</span> logs
            </div>

            <div className="flex items-center gap-1.5 font-sans">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={`page-${item}`}
                        type="button"
                        onClick={() => setCurrentPage(item as number)}
                        className={`w-7 h-7 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          currentPage === item
                            ? `${c.primaryBg} text-white shadow-2xs`
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
