'use client';

import React, { useState } from 'react';
import { Product, Additive, UserAccount, GeoAd, GroqApiLog, HalalStatus } from '@/lib/types';
import { AdminUser } from '@/lib/auth';
import { NavTab } from '@/components/layout/Sidebar';
import {
  ScanLine,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Users,
  MapPin,
  Clock,
  ArrowUpRight,
  Check,
  X,
  Zap,
  PackageSearch,
  BookOpenCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardOverviewProps {
  products: Product[];
  additives: Additive[];
  users: UserAccount[];
  ads: GeoAd[];
  logs: GroqApiLog[];
  currentUser: AdminUser | null;
  onNavigateTab: (tab: NavTab) => void;
  onQuickVerify: (productId: string, status: HalalStatus) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  products,
  additives,
  users,
  ads,
  logs,
  currentUser,
  onNavigateTab,
  onQuickVerify,
}) => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D'>('7D');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Aggregate Metrics (100% Real Live Data)
  const totalCatalogScans = products.reduce((acc, p) => acc + (p.scansCount || 0), 0);
  const totalScans = Math.max(totalCatalogScans, logs.length);
  const pendingReviews = products.filter((p) => (p.manualStatus || p.aiStatus) === 'MUSHBOOH');
  const halalCount = products.filter((p) => (p.manualStatus || p.aiStatus) === 'HALAL').length;
  const haramCount = products.filter((p) => (p.manualStatus || p.aiStatus) === 'HARAM').length;
  const premiumCount = users.filter((u) => u.isPremium).length;
  const activeAdsCount = ads.filter((a) => a.isActive).length;

  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / logs.length)
    : 0;

  // Real 7 Days Data (Dynamic from live logs timestamps)
  const data7D = React.useMemo(() => {
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

  // Real 30 Days Data (Dynamic 4 weekly windows from live logs)
  const data30D = React.useMemo(() => {
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

  // Generate smooth SVG Bézier path
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

  const totalPeriodScans = currentChartData.reduce((sum, d) => sum + d.scans, 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 4 Minimal Metric Cards (100% Real Live Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Total Scans</div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">
            {totalScans.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            <span className="font-semibold text-emerald-700">{logs.length}</span> live AI inference traces
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Pending Review</div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">
            {pendingReviews.length}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            Requires Shariah audit
          </div>
        </div>

        {/* Registered Users */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Registered App Users</div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">
            {users.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            <span className="font-semibold text-purple-700">{premiumCount}</span> Pro subscribers
          </div>
        </div>

        {/* Groq AI Speed */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Groq AI Inference</div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">
            {avgLatency} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Real latency from live logs
          </div>
        </div>
      </div>

      {/* Main Grid: Weekly Trend & Database Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Scan Volume - Interactive Area & Curve Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Scan Volume & AI Activity</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {totalPeriodScans} Scans Recorded
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time barcode scans and ingredient analyses recorded in Supabase
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

          {/* Interactive Metric Highlight Badge on Hover */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500">Selected: </span>
              <span className="font-bold text-slate-900">{activeDataPoint.fullLabel}</span>
            </div>
            <div className="flex items-center gap-4 font-medium">
              <div>
                <span className="text-slate-500">Scans: </span>
                <span className="font-bold text-slate-900 font-mono">{activeDataPoint.scans.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Halal Verified: </span>
                <span className="font-bold text-emerald-700 font-mono">{activeDataPoint.halal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* SVG Smooth Area & Line Chart */}
          <div className="relative w-full h-44 select-none">
            <svg
              viewBox="0 0 580 160"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Emerald Area Gradient */}
                <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="85%" stopColor="#10b981" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line x1="0" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="580" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="580" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="150" x2="580" y2="150" stroke="#e2e8f0" strokeWidth="1" />

              {/* Shaded Area Fill */}
              <path d={areaPath} fill="url(#emeraldAreaGradient)" />

              {/* Main Curve Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Vertical Cursor Guide */}
              {activeDataPoint && (
                <line
                  x1={activeDataPoint.x}
                  y1={20}
                  x2={activeDataPoint.x}
                  y2={150}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Interactive Data Points */}
              {currentChartData.map((pt, idx) => {
                const isSelected = hoveredPointIndex === idx;
                return (
                  <g
                    key={pt.label}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                  >
                    {/* Invisible larger hover hit target */}
                    <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />

                    {/* Point Circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#059669' : '#ffffff'}
                      stroke="#059669"
                      strokeWidth={isSelected ? 3 : 2}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between pt-2 px-3 text-[11px] font-semibold text-slate-500">
              {currentChartData.map((pt, idx) => (
                <button
                  key={pt.label}
                  onClick={() => setHoveredPointIndex(idx)}
                  className={`transition-colors ${
                    hoveredPointIndex === idx ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Database Compliance Breakdown */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Compliance Ratio</h3>
            <p className="text-xs text-slate-400">Status distribution of scanned products</p>
          </div>

          {/* Distribution Lines */}
          <div className="space-y-3.5">
            {/* Halal */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Halal</span>
                <span className="font-bold text-slate-900">{Math.round((halalCount / (products.length || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(halalCount / (products.length || 1)) * 100}%` }}
                  className="bg-emerald-500 h-full rounded-full"
                />
              </div>
            </div>

            {/* Haram */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Haram</span>
                <span className="font-bold text-slate-900">{Math.round((haramCount / (products.length || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(haramCount / (products.length || 1)) * 100}%` }}
                  className="bg-rose-500 h-full rounded-full"
                />
              </div>
            </div>

            {/* Mushbooh */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Mushbooh (Review)</span>
                <span className="font-bold text-slate-900">{Math.round((pendingReviews.length / (products.length || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(pendingReviews.length / (products.length || 1)) * 100}%` }}
                  className="bg-amber-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('additives')}
              className="w-full py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              Additives Dictionary ({additives.length}) <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Moderation Queue Table & Active Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Moderation Queue */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Moderation Queue</h3>
              <p className="text-xs text-slate-400">Products flagged by AI requiring confirmation</p>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              All Items <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Barcode</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.slice(0, 4).map((p) => {
                  const status = p.manualStatus || p.aiStatus;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 truncate max-w-[200px]">
                        {p.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{p.brand}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {p.barcode}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            status === 'HALAL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'HARAM'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onQuickVerify(p.id, 'HALAL')}
                            className="p-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors"
                            title="Approve as Halal"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onQuickVerify(p.id, 'HARAM')}
                            className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 transition-colors"
                            title="Flag as Haram"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Geo Ads Mini-List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Active Geo Campaigns</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {activeAdsCount} Running
              </span>
            </div>
            <p className="text-xs text-slate-400">Local banners targeted by GPS radius</p>
          </div>

          <div className="space-y-2">
            {ads.slice(0, 3).map((ad) => (
              <div key={ad.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="truncate max-w-[170px]">{ad.title}</span>
                  <span className="text-slate-500 font-mono text-[10px]">{ad.radiusKm}km</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{ad.sponsorName}</span>
                  <span className="font-semibold text-slate-600">{ad.clickCount} clicks</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('ads')}
            className="w-full py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1"
          >
            Manage Campaigns <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
