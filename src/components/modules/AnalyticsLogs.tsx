'use client';

import React, { useState } from 'react';
import { GroqApiLog, Product, UserAccount } from '@/lib/types';
import {
  BarChart3,
  Terminal,
  Activity,
  Zap,
  TrendingUp,
  AlertOctagon,
  Clock,
  Sparkles,
  Cpu,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface AnalyticsLogsProps {
  logs: GroqApiLog[];
  products: Product[];
  users: UserAccount[];
}

export const AnalyticsLogs: React.FC<AnalyticsLogsProps> = ({
  logs,
  products,
  users,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'RATE_LIMITED' | 'ERROR'>('ALL');
  const [selectedLog, setSelectedLog] = useState<GroqApiLog | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute metrics
  const totalScans = products.reduce((acc, p) => acc + p.scansCount, 0);
  const halalCount = products.filter((p) => (p.manualStatus || p.aiStatus) === 'HALAL').length;
  const haramCount = products.filter((p) => (p.manualStatus || p.aiStatus) === 'HARAM').length;
  const mushboohCount = products.filter((p) => (p.manualStatus || p.aiStatus) === 'MUSHBOOH').length;

  const totalTokens = logs.reduce((acc, l) => acc + l.promptTokens + l.completionTokens, 0);
  const avgLatency = Math.round(
    logs.reduce((acc, l) => acc + l.latencyMs, 0) / (logs.length || 1)
  );
  const successLogs = logs.filter((l) => l.status === 'SUCCESS').length;
  const successRate = logs.length > 0 ? Math.round((successLogs / logs.length) * 100) : 100;

  const filteredLogs = logs.filter((log) => {
    if (statusFilter === 'ALL') return true;
    return log.status === statusFilter;
  });

  const handleCopyLog = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* High-Level Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Mobile Scans</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalScans.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mt-2 font-bold">
            <TrendingUp className="w-3.5 h-3.5" /> +28.4% from last month
          </div>
        </div>

        {/* Registered Users Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Devices & Users</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {(users.length * 1420).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2">
            <span className="text-amber-800 font-bold">{users.filter((u) => u.isPremium).length * 128}</span> Pro subscribers
          </div>
        </div>

        {/* Groq AI Avg Latency */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Groq AI Speed</span>
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {avgLatency} <span className="text-sm font-normal text-slate-500">ms</span>
          </div>
          <div className="text-[11px] text-purple-700 mt-2 font-semibold">
            Ultra-fast LPU inference (GPT-OSS-120B)
          </div>
        </div>

        {/* AI Health & Success Rate */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>API Reliability</span>
            <Cpu className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-700 mt-2 font-mono">
            {successRate}%
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2">
            Total Tokens: <span className="text-slate-900 font-bold font-mono">{totalTokens.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Halal vs Haram Distribution Visual */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Scanned Catalog Compliance Ratio</h4>
            <p className="text-xs text-slate-500 font-medium">Overall categorization across all catalog entries</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700">Halal ({halalCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-700">Haram ({haramCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-700">Mushbooh ({mushboohCount})</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Distribution */}
        <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex">
          <div
            style={{ width: `${(halalCount / (products.length || 1)) * 100}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`Halal: ${halalCount}`}
          />
          <div
            style={{ width: `${(haramCount / (products.length || 1)) * 100}%` }}
            className="bg-rose-500 h-full transition-all"
            title={`Haram: ${haramCount}`}
          />
          <div
            style={{ width: `${(mushboohCount / (products.length || 1)) * 100}%` }}
            className="bg-amber-500 h-full transition-all"
            title={`Mushbooh: ${mushboohCount}`}
          />
        </div>
      </div>

      {/* GROQ AI REQUEST LOGS & TELEMETRY SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-0">
        {/* Section Header */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Groq AI API Request Logs & Error Telemetry
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Live Stream
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Audit every barcode AI inference, prompt token usage, response latency, and rate-limit triggers.
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Logs ({logs.length})
            </button>
            <button
              onClick={() => setStatusFilter('SUCCESS')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'SUCCESS'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Success ({logs.filter((l) => l.status === 'SUCCESS').length})
            </button>
            <button
              onClick={() => setStatusFilter('RATE_LIMITED')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'RATE_LIMITED'
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Rate Limited ({logs.filter((l) => l.status === 'RATE_LIMITED').length})
            </button>
            <button
              onClick={() => setStatusFilter('ERROR')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'ERROR'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Errors ({logs.filter((l) => l.status === 'ERROR').length})
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Groq Model</th>
                <th className="py-3 px-4">Status & Code</th>
                <th className="py-3 px-4 text-center">Tokens</th>
                <th className="py-3 px-4 text-right">Latency</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>

                  {/* Endpoint */}
                  <td className="py-3 px-4 text-slate-900 font-bold">
                    {log.endpoint}
                    {log.barcode && (
                      <span className="block text-[10px] text-slate-500 font-normal">
                        Barcode: {log.barcode}
                      </span>
                    )}
                  </td>

                  {/* Model */}
                  <td className="py-3 px-4 text-purple-700 font-bold whitespace-nowrap">
                    {log.model}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {log.status === 'SUCCESS' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 200 OK
                      </span>
                    )}
                    {log.status === 'RATE_LIMITED' && (
                      <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> 429 Limit
                      </span>
                    )}
                    {log.status === 'ERROR' && (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
                        <XCircle className="w-3 h-3 text-rose-600" /> {log.statusCode} Error
                      </span>
                    )}
                  </td>

                  {/* Tokens */}
                  <td className="py-3 px-4 text-center text-slate-700 font-bold">
                    {log.promptTokens + log.completionTokens}
                  </td>

                  {/* Latency */}
                  <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                    <span
                      className={
                        log.latencyMs < 500
                          ? 'text-emerald-700'
                          : log.latencyMs < 1500
                          ? 'text-amber-800'
                          : 'text-rose-700'
                      }
                    >
                      {log.latencyMs} ms
                    </span>
                  </td>

                  {/* Inspect Details */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-[11px] font-bold transition-colors"
                    >
                      View Trace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT LOG TRACE MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Groq AI Telemetry Trace</h4>
                  <p className="text-[11px] font-mono text-slate-500 font-medium">{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-900 font-bold">{selectedLog.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Model:</span>
                <span className="text-purple-700 font-bold">{selectedLog.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Response Latency:</span>
                <span className="text-slate-900 font-bold">{selectedLog.latencyMs}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Prompt Tokens:</span>
                <span className="text-slate-900 font-bold">{selectedLog.promptTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Completion Tokens:</span>
                <span className="text-slate-900 font-bold">{selectedLog.completionTokens}</span>
              </div>
              {selectedLog.errorMessage && (
                <div className="pt-2 border-t border-slate-200 text-rose-700 leading-relaxed font-sans">
                  <span className="font-bold">Error Traceback:</span> {selectedLog.errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleCopyLog(JSON.stringify(selectedLog, null, 2))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied JSON' : 'Copy Log JSON'}
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
