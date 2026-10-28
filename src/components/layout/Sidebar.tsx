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
  Bell,
} from 'lucide-react';

import { APP_COLORS } from '@/lib/colors';

export type NavTab = 'dashboard' | 'products' | 'additives' | 'users' | 'admins' | 'ads' | 'admob' | 'notifications' | 'analytics' | 'logs';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  counts?: {
    pendingReviews: number;
    totalAdditives: number;
    bannedUsers: number;
    activeAds: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      sublabel: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'products' as NavTab,
      label: 'Products',
      sublabel: 'Catalog & Review',
      icon: PackageSearch,
    },
    {
      id: 'additives' as NavTab,
      label: 'Additives',
      sublabel: 'E-Numbers',
      icon: BookOpenCheck,
    },
    {
      id: 'notifications' as NavTab,
      label: 'Push Alerts',
      sublabel: 'Firebase FCM',
      icon: Bell,
    },
    {
      id: 'users' as NavTab,
      label: 'Users',
      sublabel: 'App Accounts',
      icon: Users,
    },
    {
      id: 'admins' as NavTab,
      label: 'Admins',
      sublabel: 'Staff & Roles',
      icon: UserCog,
    },
    {
      id: 'admob' as NavTab,
      label: 'AdMob',
      sublabel: 'Ad Units',
      icon: Radio,
    },
    {
      id: 'ads' as NavTab,
      label: 'Geo Ads',
      sublabel: 'Banners',
      icon: MapPin,
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      sublabel: 'Metrics',
      icon: BarChart3,
    },
    {
      id: 'logs' as NavTab,
      label: 'Groq AI Logs',
      sublabel: 'Telemetry',
      icon: Terminal,
    },
  ];

  const c = APP_COLORS.classes;

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm h-screen sticky top-0">
      {/* Brand Logo & Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#088839] flex items-center justify-center shadow-md shadow-[#088839]/20 shrink-0">
            <img src="/logo.png" alt="Allo Halal" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">Allo Halal</span>
              <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder} border`}>
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full text-left flex items-center px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? `${c.primaryActiveTab}`
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? c.primaryText : 'text-slate-400'
                  }`}
                />
                <div className="truncate">
                  <div className={`text-sm leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">{item.sublabel}</div>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
