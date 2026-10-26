'use client';

import React, { useState, useEffect } from 'react';
import { GroqApiLog, GroqSettings } from '@/lib/types';
import { DEFAULT_GROQ_SETTINGS } from '@/lib/storage';
import { APP_COLORS } from '@/lib/colors';
import {
  Terminal,
  Zap,
  Cpu,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  X,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Play,
  Activity,
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [testResult, setTestResult] = useState<{
    testing: boolean;
    success?: boolean;
    latencyMs?: number;
    model?: string;
    error?: string;
  } | null>(null);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'RATE_LIMITED' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<GroqApiLog | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onSaveSettings) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert(`Save failed: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!form.apiKey.trim()) {
      alert('Please enter a Groq API Key.');
      return;
    }

    setTestResult({ testing: true });
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
          barcode: 'TEST',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          testing: false,
          success: true,
          latencyMs: data.telemetry?.latencyMs || 200,
          model: data.telemetry?.model || form.model,
        });
        if (onRefreshLogs) onRefreshLogs();
      } else {
        setTestResult({
          testing: false,
          success: false,
          error: data.error || 'Connection failed',
        });
      }
    } catch (err: any) {
      setTestResult({
        testing: false,
        success: false,
        error: err.message || 'Network error',
      });
    }
  };

  const handleManualRefresh = async () => {
    if (!onRefreshLogs) return;
    setIsRefreshing(true);
    try {
      await onRefreshLogs();
    } finally {
      setIsRefreshing(false);
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

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.endpoint.toLowerCase().includes(q) ||
      (log.barcode && log.barcode.toLowerCase().includes(q)) ||
      log.model.toLowerCase().includes(q) ||
      (log.errorMessage && log.errorMessage.toLowerCase().includes(q))
    );
  });

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

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                testResult.testing
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.testing ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {testResult.testing
                    ? 'Testing connection...'
                    : testResult.success
                    ? `Connected (${testResult.latencyMs}ms) • ${testResult.model}`
                    : `Error: ${testResult.error}`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testResult?.testing || !form.apiKey}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${c.primaryText}`} />
              <span>Test Connection</span>
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

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white ${c.primaryFocus} focus:outline-none w-44`}
              />
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? `animate-spin ${c.primaryText}` : ''}`} />
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
                <th className="py-2.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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

                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Trace Details</h4>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Time:</span>
                <span className="text-slate-900 font-semibold">{selectedLog.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Endpoint:</span>
                <span className="text-slate-900 font-semibold">{selectedLog.endpoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Model:</span>
                <span className={`font-semibold ${c.primaryText}`}>{selectedLog.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Latency:</span>
                <span className="text-slate-900 font-semibold">{selectedLog.latencyMs}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tokens:</span>
                <span className="text-slate-900 font-semibold">
                  {selectedLog.promptTokens} prompt + {selectedLog.completionTokens} completion
                </span>
              </div>
              {selectedLog.barcode && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Barcode:</span>
                  <span className="text-slate-900 font-semibold">{selectedLog.barcode}</span>
                </div>
              )}
              {selectedLog.errorMessage && (
                <div className="pt-2 border-t border-slate-200 text-rose-700 leading-relaxed font-sans">
                  <span className="font-bold">Error:</span> {selectedLog.errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleCopyLog(JSON.stringify(selectedLog, null, 2))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className={`px-4 py-1.5 rounded-xl ${c.primaryBg} ${c.primaryBgHover} text-white text-xs font-bold shadow-xs cursor-pointer`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
