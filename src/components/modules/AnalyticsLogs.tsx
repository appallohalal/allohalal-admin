'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
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
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

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

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

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
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2 font-medium">
            <span className="font-semibold text-emerald-700">{logs.length}</span> live AI inference traces
          </div>
        </div>

        {/* Registered Users Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Registered Users</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {users.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-2">
            <span className="text-purple-700 font-bold">{users.filter((u) => u.isPremium).length}</span> Pro subscribers
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
              <span className="font-semibold text-slate-800">{filteredLogs.length}</span> logs
            </div>

            <div className="flex items-center gap-1.5">
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
                            ? 'bg-purple-600 text-white shadow-2xs'
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
