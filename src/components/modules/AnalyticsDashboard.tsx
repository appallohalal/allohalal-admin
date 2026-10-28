'use client';

import React, { useState, useMemo } from 'react';
import { Product, UserAccount, Additive, GroqApiLog } from '@/lib/types';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Package,
  Layers,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  products: Product[];
  users: UserAccount[];
  additives?: Additive[];
  logs?: GroqApiLog[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  products,
  users,
  additives = [],
  logs = [],
}) => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D'>('7D');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // 1. Real Products & Compliance Metrics
  const totalProducts = products.length;
  const overriddenCount = products.filter((p) => p.isOverridden).length;

  const halalCount = products.filter(
    (p) => (p.manualStatus || p.aiStatus) === 'HALAL'
  ).length;
  const haramCount = products.filter(
    (p) => (p.manualStatus || p.aiStatus) === 'HARAM'
  ).length;
  const mushboohCount = products.filter(
    (p) => (p.manualStatus || p.aiStatus) === 'MUSHBOOH'
  ).length;

  const halalPercent = totalProducts > 0 ? Math.round((halalCount / totalProducts) * 100) : 0;
  const haramPercent = totalProducts > 0 ? Math.round((haramCount / totalProducts) * 100) : 0;
  const mushboohPercent = totalProducts > 0 ? Math.round((mushboohCount / totalProducts) * 100) : 0;

  // 2. Real Scans & Users Count (Zero fake multipliers)
  const totalCatalogScans = products.reduce((acc, p) => acc + (p.scansCount || 0), 0);
  const totalScans = Math.max(totalCatalogScans, logs.length);

  const realUserCount = users.length;
  const proUserCount = users.filter((u) => u.isPremium).length;
  const proPercent = realUserCount > 0 ? Math.round((proUserCount / realUserCount) * 100) : 0;

  // 3. Real AI Telemetry from Supabase logs
  const totalLogsCount = logs.length;
  const successLogsCount = logs.filter((l) => l.status === 'SUCCESS').length;
  const successRate = totalLogsCount > 0 ? Math.round((successLogsCount / totalLogsCount) * 100) : 100;
  const avgLatency = totalLogsCount > 0
    ? Math.round(logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / totalLogsCount)
    : 0;

  // 4. Real Top Scanned Products (Sorted by real scans count)
  const topScannedProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.scansCount || 0) - (a.scansCount || 0))
      .slice(0, 5);
  }, [products]);

  // 5. Real 7-Days Chart Data (Calculated dynamically from real logs timestamps)
  const data7D = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const points = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const dayLogs = logs.filter((l) => {
        const t = new Date(l.timestamp).getTime();
        return t >= startOfDay.getTime() && t <= endOfDay.getTime();
      });

      const successDayLogs = dayLogs.filter((l) => l.status === 'SUCCESS');

      return {
        label: dayNames[d.getDay()],
        fullLabel: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        scans: dayLogs.length,
        halal: successDayLogs.length,
        x: 20 + i * 90,
        y: 135,
      };
    });

    const maxScans = Math.max(...points.map((p) => p.scans), 1);
    return points.map((p) => ({
      ...p,
      y: p.scans === 0 ? 135 : Math.round(135 - (p.scans / maxScans) * 105),
    }));
  }, [logs]);

  // 6. Real 30-Days Chart Data (Weekly intervals from real logs)
  const data30D = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const points = Array.from({ length: 4 }, (_, i) => {
      const start = new Date(today);
      start.setDate(today.getDate() - (28 - i * 7));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const weekLogs = logs.filter((l) => {
        const t = new Date(l.timestamp).getTime();
        return t >= start.getTime() && t <= end.getTime();
      });

      const successWeekLogs = weekLogs.filter((l) => l.status === 'SUCCESS');

      return {
        label: `Week ${i + 1}`,
        fullLabel: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        scans: weekLogs.length,
        halal: successWeekLogs.length,
        x: 30 + i * 175,
        y: 135,
      };
    });

    const maxScans = Math.max(...points.map((p) => p.scans), 1);
    return points.map((p) => ({
      ...p,
      y: p.scans === 0 ? 135 : Math.round(135 - (p.scans / maxScans) * 105),
    }));
  }, [logs]);

  const currentChartData = timeframe === '7D' ? data7D : data30D;
  const activeDataPoint = hoveredPointIndex !== null && currentChartData[hoveredPointIndex]
    ? currentChartData[hoveredPointIndex]
    : currentChartData[currentChartData.length - 1];

  const totalPeriodScans = currentChartData.reduce((sum, d) => sum + d.scans, 0);

  // Generate smooth Bézier curve
  const generateSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = generateSmoothPath(currentChartData);
  const areaPath = currentChartData.length > 0
    ? `${linePath} L ${currentChartData[currentChartData.length - 1].x} 150 L ${currentChartData[0].x} 150 Z`
    : '';

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 4 Core Metrics Cards (100% Real Live Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Real Total Scans */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Scans</span>
            <div className="w-8 h-8 rounded-xl bg-[#e6f4eb] text-[#088839] flex items-center justify-center border border-[#ccebd7]">
              <ScanLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalScans.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            <span className="font-semibold text-[#066d2e]">{totalLogsCount}</span> AI inference traces
          </div>
        </div>

        {/* 2. Real Registered Users */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Registered App Users</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {realUserCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            <span className="font-semibold text-purple-700">{proUserCount}</span> Pro ({proPercent}%)
          </div>
        </div>

        {/* 3. Real Products in Catalog */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Products in Catalog</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalProducts.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            <span className="font-semibold text-emerald-700">{overriddenCount}</span> audited overrides
          </div>
        </div>

        {/* 4. Real E-Numbers & Additives */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">E-Codes & Additives</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {additives.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            <span className="font-semibold text-amber-700">14 languages</span> localized
          </div>
        </div>
      </div>

      {/* Main Grid: Real Scan Activity Chart & Real Compliance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Real Scan Volume Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Scan Activity & Inference Volume</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {totalPeriodScans} Scans in Period
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Live volume of product barcode and image analyses recorded in Supabase
              </p>
            </div>

            {/* Timeframe Toggle Buttons */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTimeframe('7D');
                  setHoveredPointIndex(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  timeframe === '7D'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeframe('30D');
                  setHoveredPointIndex(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  timeframe === '30D'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          {/* Active Hover Point Details */}
          {activeDataPoint && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium">
              <div>
                <span className="text-slate-500">Window: </span>
                <span className="font-bold text-slate-900">{activeDataPoint.fullLabel}</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500">Total Scans: </span>
                  <span className="font-bold text-slate-900 font-mono">{activeDataPoint.scans}</span>
                </div>
                <div>
                  <span className="text-slate-500">Successful: </span>
                  <span className="font-bold text-emerald-700 font-mono">{activeDataPoint.halal}</span>
                </div>
              </div>
            </div>
          )}

          {/* SVG Smooth Curve Area Chart */}
          <div className="relative w-full h-44 select-none">
            <svg
              viewBox="0 0 580 160"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="realAnalyticsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#088839" stopOpacity="0.22" />
                  <stop offset="85%" stopColor="#088839" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#088839" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line x1="0" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="580" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="580" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="150" x2="580" y2="150" stroke="#e2e8f0" strokeWidth="1" />

              {/* Area Fill */}
              {areaPath && <path d={areaPath} fill="url(#realAnalyticsAreaGradient)" />}

              {/* Curve Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#088839"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover Cursor Line */}
              {activeDataPoint && (
                <line
                  x1={activeDataPoint.x}
                  y1={20}
                  x2={activeDataPoint.x}
                  y2={150}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Data Point Circles */}
              {currentChartData.map((pt, idx) => (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPointIndex === idx ? 6 : 4}
                    fill={hoveredPointIndex === idx ? '#088839' : '#ffffff'}
                    stroke="#088839"
                    strokeWidth={hoveredPointIndex === idx ? 2.5 : 2}
                    className="transition-all duration-150"
                  />
                  {hoveredPointIndex === idx && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="12"
                      fill="#088839"
                      fillOpacity="0.15"
                    />
                  )}
                </g>
              ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[11px] text-slate-400 font-medium px-2 pt-2 border-t border-slate-100">
              {currentChartData.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHoveredPointIndex(i)}
                  className={`transition-colors cursor-pointer ${
                    hoveredPointIndex === i
                      ? 'text-[#066d2e] font-bold'
                      : 'hover:text-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real Compliance Ratio Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Compliance Ratio</h3>
              <span className="text-xs font-semibold text-slate-400 font-mono">{totalProducts} products</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Actual breakdown of verified products in your database
            </p>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex">
            <div
              style={{ width: `${halalPercent}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Halal: ${halalCount} (${halalPercent}%)`}
            />
            <div
              style={{ width: `${haramPercent}%` }}
              className="bg-rose-500 h-full transition-all"
              title={`Haram: ${haramCount} (${haramPercent}%)`}
            />
            <div
              style={{ width: `${mushboohPercent}%` }}
              className="bg-amber-500 h-full transition-all"
              title={`Mushbooh: ${mushboohCount} (${mushboohPercent}%)`}
            />
          </div>

          {/* Real Compliance Stats Rows */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-700">Halal Compliant</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-slate-900">{halalCount}</span>
                <span className="text-slate-400 text-[11px]">({halalPercent}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="font-semibold text-slate-700">Haram / Prohibited</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-slate-900">{haramCount}</span>
                <span className="text-slate-400 text-[11px]">({haramPercent}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-semibold text-slate-700">Mushbooh (Doubtful)</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-slate-900">{mushboohCount}</span>
                <span className="text-slate-400 text-[11px]">({mushboohPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Audit Rate Summary */}
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between font-medium">
            <span>Verified: <strong className="text-slate-700 font-semibold">{totalProducts > 0 ? Math.round(((halalCount + haramCount) / totalProducts) * 100) : 0}%</strong></span>
            <span className="text-emerald-700 font-semibold">{halalPercent}% Halal safe</span>
          </div>
        </div>
      </div>

      {/* Real AI Performance Telemetry Card */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Inference Telemetry</h3>
              <p className="text-xs text-slate-400 font-medium">Real-time latency and reliability from live Groq API logs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {successRate}% Success Rate
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Average Latency</span>
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">
              {avgLatency} ms
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Total Inferences</span>
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">
              {totalLogsCount.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Rate Limits / Errors</span>
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">
              {logs.filter((l) => l.status === 'RATE_LIMITED' || l.status === 'ERROR').length}
            </div>
          </div>
        </div>
      </div>

      {/* Top Scanned Products Leaderboard (Real scansCount) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Top Scanned Products Leaderboard</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Actual barcodes scanned by users ranked by volume</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">Ranked by volume</span>
        </div>

        {topScannedProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No products found in the catalog yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-2.5 px-4"># Rank</th>
                  <th className="py-2.5 px-4">Product Details</th>
                  <th className="py-2.5 px-4">Barcode</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Total Scans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {topScannedProducts.map((product, idx) => {
                  const status = product.manualStatus || product.aiStatus;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.imageUrl || 'https://placehold.co/80x80/f1f5f9/64748b?text=Halal'}
                            alt={product.name}
                            className="w-9 h-9 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{product.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">{product.brand || 'Unbranded'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {product.barcode}
                      </td>
                      <td className="py-3 px-4">
                        {status === 'HALAL' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Halal
                          </span>
                        )}
                        {status === 'HARAM' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Haram
                          </span>
                        )}
                        {status === 'MUSHBOOH' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Mushbooh
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {(product.scansCount || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
