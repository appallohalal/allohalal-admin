'use client';

import React from 'react';
import { Search, LogOut } from 'lucide-react';
import { NavTab } from './Sidebar';
import { AdminUser } from '@/lib/auth';

interface HeaderProps {
  activeTab: NavTab;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser?: AdminUser | null;
  onLogout?: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; desc: string }> = {
  dashboard: {
    title: 'Dashboard',
    desc: 'Overview of scans and activity',
  },
  products: {
    title: 'Products',
    desc: 'Catalog and review',
  },
  additives: {
    title: 'Additives',
    desc: 'E-numbers dictionary',
  },
  cms: {
    title: 'Legal Pages & App CMS (GDPR Compliance)',
    desc: 'Manage Privacy Policy (GDPR), Help & Support, About, and UI copy live',
  },
  notifications: {
    title: 'Push Notifications',
    desc: 'Send push notifications to mobile devices',
  },
  users: {
    title: 'Users',
    desc: 'App accounts and devices',
  },
  admins: {
    title: 'Admins',
    desc: 'Team and roles',
  },
  admob: {
    title: 'AdMob',
    desc: 'Ad unit configuration',
  },
  ads: {
    title: 'Geo Ads',
    desc: 'Sponsored banners',
  },
  analytics: {
    title: 'Analytics',
    desc: 'Trends and metrics',
  },
  logs: {
    title: 'Groq AI Logs & Telemetry',
    desc: 'API logs and metrics',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  currentUser,
  onLogout,
}) => {
  const current = TAB_TITLES[activeTab] || { title: 'Dashboard', desc: '' };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {current.title}
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{current.desc}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="relative w-64 lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search items, codes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#088839] focus:bg-white transition-colors"
          />
        </div>

        {/* User profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#088839] flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {currentUser?.avatarInitials || 'AH'}
          </div>
          <div className="text-left hidden lg:block">
            <div className="text-xs font-bold text-slate-900">
              {currentUser?.name || 'Chief Auditor'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <span>{currentUser?.role || 'Halal Certification Board'}</span>
            </div>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={() => {
                if (confirm('Log out from Allo Halal Admin?')) {
                  onLogout();
                }
              }}
              title="Log out"
              className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
