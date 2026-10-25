'use client';

import React, { useState } from 'react';
import { UserAccount } from '@/lib/types';
import {
  Users,
  Crown,
  Ban,
  CheckCircle,
  Smartphone,
  Calendar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  X,
  AlertCircle,
} from 'lucide-react';

interface UserManagementProps {
  users: UserAccount[];
  onToggleBan: (userId: string, reason?: string) => void;
  onTogglePremium: (userId: string) => void;
  searchQuery: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onToggleBan,
  onTogglePremium,
  searchQuery,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'PREMIUM' | 'BANNED'>('ALL');
  const [banModalUser, setBanModalUser] = useState<UserAccount | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.deviceId.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.country.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterType === 'PREMIUM') return u.isPremium;
    if (filterType === 'BANNED') return u.isBanned;
    return true;
  });

  const handleConfirmBan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!banModalUser) return;
    onToggleBan(banModalUser.id, banReasonInput);
    setBanModalUser(null);
    setBanReasonInput('');
  };

  return (
    <div className="space-y-6">
      {/* Metrics & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setFilterType('PREMIUM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'PREMIUM'
                ? 'bg-amber-100 text-amber-800 font-semibold border border-amber-200'
                : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
            }`}
          >
            Premium Subscribed ({users.filter((u) => u.isPremium).length})
          </button>
          <button
            onClick={() => setFilterType('BANNED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === 'BANNED'
                ? 'bg-rose-100 text-rose-800 font-semibold border border-rose-200'
                : 'text-slate-600 hover:text-rose-800 hover:bg-rose-50'
            }`}
          >
            Banned ({users.filter((u) => u.isBanned).length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> active device records
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">User / Device Identifier</th>
                <th className="py-3.5 px-4">Country & Region</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Membership Plan</th>
                <th className="py-3.5 px-4 text-center">Total Scans</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Quick Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No mobile users recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Active mobile devices scanning barcodes will be recorded here in Supabase.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* User & Device */}
                  <td className="py-4 px-4 min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {user.name || 'Anonymous User'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          {user.deviceId}
                        </div>
                        {user.email && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Country */}
                  <td className="py-4 px-4 whitespace-nowrap text-xs font-medium text-slate-700">
                    {user.country}
                  </td>

                  {/* Account Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {user.isBanned ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <Ban className="w-3 h-3" /> Banned
                        </span>
                        {user.banReason && (
                          <p className="text-[10px] text-rose-600 max-w-xs truncate" title={user.banReason}>
                            {user.banReason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    )}
                  </td>

                  {/* Membership Plan */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {user.isPremium ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                        <Crown className="w-3.5 h-3.5 text-amber-600" /> Premium Pro
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Free Tier
                      </span>
                    )}
                  </td>

                  {/* Total Scans */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {user.totalScans.toLocaleString()}
                    </span>
                    {user.totalScans > 5000 && (
                      <span className="block text-[10px] text-amber-700 font-bold">High Volume</span>
                    )}
                  </td>

                  {/* Last Activity */}
                  <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(user.lastActiveAt).toLocaleString()}
                    </div>
                  </td>

                  {/* Moderation Actions */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {/* Premium Toggle */}
                      <button
                        onClick={() => onTogglePremium(user.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          user.isPremium
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                        title={user.isPremium ? 'Downgrade to Free' : 'Grant Premium Access'}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {user.isPremium ? 'Revoke VIP' : 'Grant VIP'}
                      </button>

                      {/* Ban / Unban Toggle */}
                      {user.isBanned ? (
                        <button
                          onClick={() => onToggleBan(user.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setBanModalUser(user);
                            setBanReasonInput('Exceeded automated OCR rate limit / suspicious traffic');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 transition-all"
                        >
                          <Ban className="w-3.5 h-3.5 text-rose-600" />
                          Ban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BAN CONFIRMATION MODAL */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ban User Account</h3>
                  <p className="text-xs text-slate-500 font-medium">Block mobile app access for this device.</p>
                </div>
              </div>
              <button
                onClick={() => setBanModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div><span className="text-slate-500">Target Device:</span> <span className="font-mono text-slate-900 font-bold">{banModalUser.deviceId}</span></div>
              <div><span className="text-slate-500">Total Scans:</span> <span className="text-slate-900 font-bold">{banModalUser.totalScans}</span></div>
            </div>

            <form onSubmit={handleConfirmBan} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reason for Suspension:</label>
                <textarea
                  rows={3}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="Specify violation (scraping, abuse, invalid payment)..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBanModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  Confirm Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
