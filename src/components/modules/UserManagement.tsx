'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount, AuthSettings } from '@/lib/types';
import { DEFAULT_AUTH_SETTINGS } from '@/lib/storage';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';
import {
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  Ban,
  Crown,
  MapPin,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  ShieldAlert,
} from 'lucide-react';

interface UserManagementProps {
  users?: UserAccount[];
  onToggleBan?: (userId: string, reason?: string) => void;
  onTogglePremium?: (userId: string) => void;
  searchQuery?: string;
  authSettings?: AuthSettings;
  onSaveAuthSettings?: (settings: AuthSettings) => Promise<void>;
  currentAdminName?: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users = [],
  onToggleBan,
  onTogglePremium,
  searchQuery = '',
  authSettings: initialSettings,
  onSaveAuthSettings,
  currentAdminName = 'Admin',
}) => {
  const [form, setForm] = useState<AuthSettings>(initialSettings || DEFAULT_AUTH_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Users table state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BANNED' | 'PREMIUM'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [banModalUser, setBanModalUser] = useState<UserAccount | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const itemsPerPage = 20;

  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const handleToggle = async () => {
    if (!onSaveAuthSettings || isSaving) return;
    const nextState = !form.forceUserAuth;
    setIsSaving(true);

    const updatedPayload: AuthSettings = {
      ...form,
      id: 'global',
      forceUserAuth: nextState,
      allowGuestScan: !nextState,
      updatedAt: new Date().toISOString(),
      updatedBy: currentAdminName,
    };

    setForm(updatedPayload);

    try {
      await onSaveAuthSettings(updatedPayload);
      toast.success(
        nextState
          ? 'Login is now REQUIRED. Mobile users must log in to scan.'
          : 'Login is now OPTIONAL. Mobile users can scan as guests.',
        'Policy Updated'
      );
    } catch (err: any) {
      console.error('Failed to save auth settings:', err);
      // Revert on error
      setForm((p) => ({ ...p, forceUserAuth: !nextState }));
      toast.error(err.message || 'Failed to update policy.', 'Update Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmBan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!banModalUser || !onToggleBan) return;
    const finalReason = banReasonInput.trim() || 'Terms of Service & Community Guidelines violation';
    onToggleBan(banModalUser.id, finalReason);
    toast.success(`User ${banModalUser.name || banModalUser.email || 'account'} has been banned.`, 'User Banned');
    setBanModalUser(null);
    setBanReasonInput('');
  };

  const handleUnban = (user: UserAccount) => {
    if (!onToggleBan) return;
    onToggleBan(user.id);
    toast.success(`User ${user.name || user.email || 'account'} has been unbanned.`, 'User Unbanned');
  };

  const c = APP_COLORS.classes;

  // Filter users
  const q = searchQuery.toLowerCase().trim();
  const filteredUsers = users.filter((u) => {
    if (q) {
      const match =
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.country && u.country.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (statusFilter === 'ACTIVE') return !u.isBanned;
    if (statusFilter === 'BANNED') return u.isBanned;
    if (statusFilter === 'PREMIUM') return u.isPremium;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const activeCount = users.filter((u) => !u.isBanned).length;
  const bannedCount = users.filter((u) => u.isBanned).length;
  const premiumCount = users.filter((u) => u.isPremium).length;

  const getInitials = (user: UserAccount) => {
    if (user.name && user.name.trim()) {
      const parts = user.name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    if (user.username && user.username.trim()) {
      return user.username.slice(0, 2).toUpperCase();
    }
    if (user.email && user.email.trim()) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Master Login Required Switch (AdMob Pattern, clean without Last Updated / Save footer) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              form.forceUserAuth
                ? `${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border shadow-xs`
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            {form.forceUserAuth ? (
              <Lock className="w-6 h-6 animate-pulse" />
            ) : (
              <Unlock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Login Required
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                  form.forceUserAuth
                    ? `${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder}`
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {form.forceUserAuth ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {form.forceUserAuth
                ? 'Login is mandatory to scan products in the mobile app'
                : 'Guest scanning is allowed without login'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={form.forceUserAuth}
          onClick={handleToggle}
          disabled={isSaving}
          className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 ${
            form.forceUserAuth ? c.primaryBg : 'bg-slate-200'
          }`}
        >
          <span className="sr-only">Toggle Login Required</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              form.forceUserAuth ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 2. Registered App Users List (Clean project pattern) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Header & Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                App Users
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {users.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Information of users registered and logged in via the mobile app
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('BANNED')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'BANNED'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Banned ({bannedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PREMIUM')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'PREMIUM'
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Premium ({premiumCount})
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Joined Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No app users found</p>
                      <p className="text-[11px] text-slate-400">
                        {searchQuery ? 'No accounts matched your search criteria.' : 'Users who register or log in on mobile will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const locationStr = [user.city, user.country].filter(Boolean).join(', ');

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* User (Avatar, Name, Username) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${c.primaryBg} text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0`}>
                            {getInitials(user)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.name || user.username || 'App User'}</span>
                              {user.isPremium && (
                                <span title="Premium Subscriber">
                                  <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            {user.username && (
                              <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-slate-600">
                        {user.email ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{user.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No email</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-600">
                        {locationStr ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{locationStr}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unknown</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {user.isBanned ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px] font-bold">
                              <Ban className="w-3 h-3" /> Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}

                          {user.isPremium && (
                            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px] font-bold">
                              PRO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {user.isBanned ? (
                          <button
                            type="button"
                            onClick={() => handleUnban(user)}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setBanModalUser(user);
                              setBanReasonInput('');
                            }}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition-colors cursor-pointer"
                          >
                            Ban
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 font-sans">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
              <span className="font-semibold text-slate-800">{filteredUsers.length}</span> users
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
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (page as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`w-7 h-7 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          currentPage === item
                            ? `${c.primaryBg} text-white shadow-2xs`
                            : 'text-slate-600 hover:bg-slate-100'
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

      {/* 3. Ban Confirmation Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Ban User Account</span>
              </div>
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Are you sure you want to ban{' '}
                <strong className="text-slate-900 font-semibold">
                  {banModalUser.name || banModalUser.email || 'this user'}
                </strong>
                ? Banned users will not be able to scan or use the app.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Ban (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terms of Service violation"
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
