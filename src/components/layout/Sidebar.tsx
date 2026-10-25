'use client';

import React from 'react';
import {
  LayoutDashboard,
  PackageSearch,
  BookOpenCheck,
  Users,
  MapPin,
  BarChart3,
  Terminal,
  ShieldCheck,
  UserCog,
  Radio,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'products' | 'additives' | 'users' | 'admins' | 'ads' | 'admob' | 'analytics' | 'logs';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  counts: {
    pendingReviews: number;
    totalAdditives: number;
    bannedUsers: number;
    activeAds: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, counts }) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard Overview',
      sublabel: 'Daily Analytics & Queue',
      icon: LayoutDashboard,
    },
    {
      id: 'products' as NavTab,
      label: 'Products & AI Review',
      sublabel: 'Catalog & OCR Overrides',
      icon: PackageSearch,
      badge: counts.pendingReviews > 0 ? `${counts.pendingReviews} review` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    },
    {
      id: 'additives' as NavTab,
      label: 'E-Numbers & Additives',
      sublabel: '14 Languages Dictionary',
      icon: BookOpenCheck,
      badge: `${counts.totalAdditives}`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    },
    {
      id: 'users' as NavTab,
      label: 'Mobile App Users',
      sublabel: 'Quota, Ban & Premium',
      icon: Users,
      badge: counts.bannedUsers > 0 ? `${counts.bannedUsers} banned` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 border border-rose-200',
    },
    {
      id: 'admins' as NavTab,
      label: 'Admin & Team',
      sublabel: 'Roles & Staff Permissions',
      icon: UserCog,
      badge: 'Super Admin',
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
    },
    {
      id: 'admob' as NavTab,
      label: 'Google AdMob Ads',
      sublabel: 'IDs, Formats & Remote Config',
      icon: Radio,
      badge: 'Live Remote',
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    },
    {
      id: 'ads' as NavTab,
      label: 'Geo-Targeted Ads',
      sublabel: 'Banners & GPS Radius',
      icon: MapPin,
      badge: `${counts.activeAds} active`,
      badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics & Growth',
      sublabel: 'Scan Trends & Metrics',
      icon: BarChart3,
    },
    {
      id: 'logs' as NavTab,
      label: 'Groq AI Logs',
      sublabel: 'Tokens, Latency & Errors',
      icon: Terminal,
      badge: 'Groq Cloud',
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
    },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm h-screen sticky top-0">
      {/* Brand Logo & Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">HalalLens</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Moderation & AI Engine</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <div className="truncate">
                  <div className={`text-sm leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">{item.sublabel}</div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`ml-2 shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
