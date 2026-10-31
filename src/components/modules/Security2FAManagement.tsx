'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminUser } from '@/lib/auth';
import { AdminSecurityUser, SecurityAuditLog } from '@/lib/types';
import { APP_COLORS } from '@/lib/colors';
import { toast } from '@/lib/toast';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  KeyRound,
  RotateCcw,
  Power,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Clock,
  History,
  Copy,
  Check,
  Users,
  Crown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Security2FAManagementProps {
  currentUser: AdminUser | null;
  searchQuery?: string;
}

export const Security2FAManagement: React.FC<Security2FAManagementProps> = ({
  currentUser,
  searchQuery = '',
}) => {
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const c = APP_COLORS.classes;

  const [users, setUsers] = useState<AdminSecurityUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    enabledCount: 0,
    disabledCount: 0,
    superAdminCount: 0,
    protectionRate: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Filters & Tabs
  const [filterQuery, setFilterQuery] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [activeTab, setActiveTab] = useState<'STAFF' | 'AUDIT_TRAIL'>('STAFF');

  // Audit Logs Pagination (10 per page)
  const [logsPage, setLogsPage] = useState(1);
  const logsPerPage = 10;
  const totalLogPages = Math.ceil(auditLogs.length / logsPerPage) || 1;
  const paginatedLogs = auditLogs.slice((logsPage - 1) * logsPerPage, logsPage * logsPerPage);

  // Confirmation Modals
  const [resetTargetUser, setResetTargetUser] = useState<AdminSecurityUser | null>(null);
  const [toggleTargetUser, setToggleTargetUser] = useState<{
    user: AdminSecurityUser;
    enable: boolean;
  } | null>(null);

  // Reconfigure Modal State
  const [reconfigureTargetUser, setReconfigureTargetUser] = useState<AdminSecurityUser | null>(null);
  const [setupStep, setSetupStep] = useState<'LOADING' | 'VERIFY' | 'SUCCESS'>('LOADING');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupQrCode, setSetupQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Sync prop changes without effect cascade
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setFilterQuery(searchQuery);
  }

  const loadSecurityData = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const [listRes, logsRes] = await Promise.all([
        fetch('/api/v1/auth/2fa/list'),
        fetch('/api/v1/auth/2fa/audit-logs?limit=50'),
      ]);

      const listData = await listRes.json();
      const logsData = await logsRes.json();

      if (listData.success) {
        setUsers(listData.admins || []);
        if (listData.stats) {
          setStats(listData.stats);
        }
      } else if (showLoading) {
        toast.error(listData.error || 'Failed to load security records.', 'Error');
      }

      if (logsData.success) {
        setAuditLogs(logsData.logs || []);
      }
    } catch (err: unknown) {
      if (showLoading) {
        toast.error((err as Error).message || 'Error communicating with security backend.', 'Network Error');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial Load
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSecurityData(false);

    // 2. Supabase Realtime Subscription
    const channel = supabase
      .channel('security-2fa-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_2fa_factors' },
        () => void loadSecurityData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'security_audit_logs' },
        () => void loadSecurityData(false)
      )
      .subscribe();

    // 3. Background live sync every 4 seconds when tab is active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadSecurityData(false);
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [loadSecurityData]);

  // 1. Reset 2FA Handler
  const handleConfirmReset = async () => {
    if (!resetTargetUser) return;
    setIsSubmittingAction(true);

    try {
      const res = await fetch('/api/v1/auth/2fa/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: resetTargetUser.id,
          actorId: currentUser?.id,
          reason: `2FA reset by ${currentUser?.name || 'Super Admin'}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          `2FA reset for ${resetTargetUser.name}.`,
          'Reset Complete'
        );
        setResetTargetUser(null);
        await loadSecurityData(true);
      } else {
        toast.error(data.error || 'Failed to reset 2FA.', 'Error');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error resetting 2FA.', 'Error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 2. Enable / Disable 2FA Handler
  const handleConfirmToggle = async () => {
    if (!toggleTargetUser) return;
    setIsSubmittingAction(true);

    try {
      const res = await fetch('/api/v1/auth/2fa/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: toggleTargetUser.user.id,
          actorId: currentUser?.id,
          enable: toggleTargetUser.enable,
          reason: toggleTargetUser.enable
            ? `2FA enabled by ${currentUser?.name || 'Super Admin'}`
            : `2FA disabled by ${currentUser?.name || 'Super Admin'}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          toggleTargetUser.enable
            ? `2FA enabled for ${toggleTargetUser.user.name}.`
            : `2FA disabled for ${toggleTargetUser.user.name}.`,
          toggleTargetUser.enable ? '2FA Enabled' : '2FA Disabled'
        );
        setToggleTargetUser(null);
        await loadSecurityData(true);
      } else {
        toast.error(data.error || 'Failed to update 2FA state.', 'Error');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error updating 2FA state.', 'Error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 3. Start Reconfiguration
  const handleStartReconfigure = async (target: AdminSecurityUser) => {
    setReconfigureTargetUser(target);
    setSetupStep('LOADING');
    setSetupError(null);
    setVerificationCode('');

    try {
      const res = await fetch('/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: target.id,
          email: target.email,
          actorId: currentUser?.id,
          actorEmail: currentUser?.email,
          actorRole: currentUser?.role,
        }),
      });

      const data = await res.json();
      if (data.success && data.secret && data.qrCode) {
        setSetupSecret(data.secret);
        setSetupQrCode(data.qrCode);
        setSetupStep('VERIFY');
      } else {
        setSetupError(data.error || 'Failed to generate reconfiguration keys.');
      }
    } catch (err: unknown) {
      setSetupError((err as Error).message || 'Error initializing 2FA setup.');
    }
  };

  // 4. Verify Reconfiguration Code
  const handleVerifyReconfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconfigureTargetUser || verificationCode.length !== 6) return;

    setIsSubmittingAction(true);
    setSetupError(null);

    try {
      const res = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: reconfigureTargetUser.id,
          code: verificationCode.trim(),
          isSetup: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSetupStep('SUCCESS');
        toast.success(
          `2FA activated for ${reconfigureTargetUser.name}.`,
          'Activated'
        );
        await loadSecurityData(true);
      } else {
        setSetupError(data.error || 'Invalid 6-digit code. Check your authenticator app.');
      }
    } catch (err: unknown) {
      setSetupError((err as Error).message || 'Verification failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const copySecret = () => {
    if (!setupSecret) return;
    navigator.clipboard.writeText(setupSecret);
    setCopiedKey(true);
    toast.info('Secret key copied', 'Copied');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const q = filterQuery.toLowerCase();
    const matchesQuery =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (statusFilter === 'ENABLED') return u.is2FAEnabled;
    if (statusFilter === 'DISABLED') return !u.is2FAEnabled;
    return true;
  });

  const getRoleBadge = (role: AdminUser['role']) => {
    switch (role) {
      case 'Super Admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Crown className="w-3 h-3 text-purple-600" />
            Super Admin
          </span>
        );
      case 'System Admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Shield className="w-3 h-3 text-blue-600" />
            System Admin
          </span>
        );
      case 'Chief Auditor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            Chief Auditor
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder} border`}>
            <ShieldCheck className={`w-3 h-3 ${c.primaryText}`} />
            Halal Auditor
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-2xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0 shadow-xs`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Security & 2FA Management
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Two-factor authentication management and access security
            </p>
          </div>
        </div>
      </div>

      {/* 2. Overview Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.totalCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[#088839]">
            <span className="text-[11px] font-bold uppercase tracking-wider">2FA Protected</span>
            <ShieldCheck className="w-4 h-4 text-[#088839]" />
          </div>
          <div className="text-2xl font-black text-[#088839] mt-2">{stats.enabledCount}</div>
          <p className="text-[11px] text-[#066d2e] font-semibold mt-1">
            {stats.protectionRate}% coverage
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">2FA Inactive</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{stats.disabledCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Super Admins</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">{stats.superAdminCount}</div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'STAFF'
              ? `${c.primaryBg} text-white shadow-xs`
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Team Members ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_TRAIL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'AUDIT_TRAIL'
              ? `${c.primaryBg} text-white shadow-xs`
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* 4. Tab A: Staff 2FA Table */}
      {activeTab === 'STAFF' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search staff by name or email..."
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none ${c.primaryFocus} focus:bg-white transition-all`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs gap-1">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setStatusFilter('ENABLED')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'ENABLED'
                      ? `${c.primaryLightBg} ${c.primaryLightText} shadow-xs`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({stats.enabledCount})
                </button>
                <button
                  onClick={() => setStatusFilter('DISABLED')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'DISABLED'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inactive ({stats.disabledCount})
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#088839] border-t-transparent rounded-full animate-spin" />
              <span>Loading staff...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              No staff members found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">2FA Status</th>
                    <th className="py-3 px-4">Setup Date</th>
                    <th className="py-3 px-4">Last Sign In</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const canManage = isSuperAdmin;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* User Name & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${c.primaryGradient} text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0`}>
                              {user.avatarInitials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder} border`}>
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {getRoleBadge(user.role)}
                        </td>

                        {/* 2FA Status */}
                        <td className="py-3.5 px-4">
                          {user.is2FAEnabled ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder} border shadow-2xs`}>
                              <ShieldCheck className={`w-3.5 h-3.5 ${c.primaryText}`} />
                              <span>Enabled</span>
                            </span>
                          ) : user.twoFactorStatus === 'pending_setup' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                              <span>Setup Required</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                              <span>Disabled</span>
                            </span>
                          )}
                        </td>

                        {/* 2FA Setup Date */}
                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {user.twoFactorSetupAt ? (
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {new Date(user.twoFactorSetupAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">—</span>
                          )}
                        </td>

                        {/* Last Sign In */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {user.lastSignInAt
                                ? new Date(user.lastSignInAt).toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Available Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reconfigure 2FA Action */}
                            <button
                              onClick={() => handleStartReconfigure(user)}
                              title="Reconfigure Authenticator"
                              className={`px-2.5 py-1 text-slate-700 hover:${c.primaryLightText} bg-slate-100 hover:${c.primaryLightBg} border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1`}
                            >
                              <KeyRound className={`w-3.5 h-3.5 ${c.primaryText}`} />
                              <span>Reconfigure</span>
                            </button>

                            {/* Enable / Disable 2FA Action */}
                            {user.is2FAEnabled ? (
                              <button
                                onClick={() => setToggleTargetUser({ user, enable: false })}
                                disabled={!canManage}
                                title={canManage ? 'Disable 2FA for this user' : 'Super Admin required'}
                                className="px-2 py-1 text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                <Power className="w-3 h-3 text-rose-600" />
                                <span>Disable</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setToggleTargetUser({ user, enable: true })}
                                disabled={!canManage}
                                title={canManage ? 'Enforce 2FA for this user' : 'Super Admin required'}
                                className={`px-2 py-1 ${c.primaryLightText} ${c.primaryLightBg} hover:bg-[#d5e8dc] ${c.primaryLightBorder} border rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1`}
                              >
                                <Power className={`w-3 h-3 ${c.primaryText}`} />
                                <span>Enable</span>
                              </button>
                            )}

                            {/* Reset 2FA Action */}
                            <button
                              onClick={() => setResetTargetUser(user)}
                              disabled={!canManage}
                              title={canManage ? 'Revoke secret and require new setup' : 'Super Admin required'}
                              className="px-2 py-1 text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-600" />
                              <span>Reset</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab B: Security Audit Trail */}
      {activeTab === 'AUDIT_TRAIL' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Security Audit Logs</h3>
            <span className="text-xs text-slate-400 font-medium">
              Showing {paginatedLogs.length} of {auditLogs.length} events
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              No audit logs recorded yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Target User</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLogs.map((log) => {
                      let eventBadgeColor = 'bg-slate-100 text-slate-700';
                      if (log.event_type.includes('SUCCESS') || log.event_type.includes('VERIFIED')) {
                        eventBadgeColor = `${c.primaryLightBg} ${c.primaryLightText} ${c.primaryLightBorder} border`;
                      } else if (log.event_type.includes('RESET') || log.event_type.includes('DISABLED')) {
                        eventBadgeColor = 'bg-amber-50 text-amber-800 border border-amber-200';
                      } else if (log.event_type.includes('LOCKED') || log.event_type.includes('FAILED')) {
                        eventBadgeColor = 'bg-rose-50 text-rose-800 border border-rose-200';
                      } else if (log.event_type.includes('ENABLED') || log.event_type.includes('ENROLLED')) {
                        eventBadgeColor = 'bg-blue-50 text-blue-800 border border-blue-200';
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${eventBadgeColor}`}>
                              {log.event_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div className="font-semibold">{log.actor_email || 'System'}</div>
                            {log.actor_role && (
                              <span className="text-[10px] text-slate-400 font-medium">{log.actor_role}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {log.target_user_email || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 10 Items Pagination Footer */}
              {totalLogPages > 1 && (
                <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                  <span>
                    Showing {(logsPage - 1) * logsPerPage + 1} to{' '}
                    {Math.min(logsPage * logsPerPage, auditLogs.length)} of {auditLogs.length} events
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2 font-bold text-slate-700">
                      {logsPage} / {totalLogPages}
                    </span>
                    <button
                      onClick={() => setLogsPage((p) => Math.min(totalLogPages, p + 1))}
                      disabled={logsPage === totalLogPages}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL 1: Confirm Reset 2FA */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset 2FA</h3>
                <p className="text-xs text-slate-500 font-medium">Revoke current configuration</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
              <p>
                Are you sure you want to reset 2FA for <strong className="text-slate-900">{resetTargetUser.name}</strong> ({resetTargetUser.email})?
              </p>
              <p className="text-slate-600 font-medium">
                Their existing secret key will be revoked immediately and they will be required to configure 2FA again.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                disabled={isSubmittingAction}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isSubmittingAction}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingAction ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Reset 2FA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirm Enable / Disable 2FA */}
      {toggleTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                  toggleTargetUser.enable
                    ? `${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder}`
                    : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}
              >
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {toggleTargetUser.enable ? 'Enable 2FA' : 'Disable 2FA'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {toggleTargetUser.user.name} ({toggleTargetUser.user.email})
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl text-xs space-y-1.5 border ${
                toggleTargetUser.enable
                  ? `${c.primaryLightBg} ${c.primaryLightBorder} ${c.primaryLightText}`
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <p>
                {toggleTargetUser.enable
                  ? 'The user will be required to set up 2FA upon their next login.'
                  : 'Are you sure? The user will be able to log in with only their password.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setToggleTargetUser(null)}
                disabled={isSubmittingAction}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isSubmittingAction}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                  toggleTargetUser.enable
                    ? `${c.primaryBg} ${c.primaryBgHover} shadow-[#088839]/20`
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {isSubmittingAction ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Power className="w-3.5 h-3.5" />
                )}
                <span>
                  {toggleTargetUser.enable ? 'Enable 2FA' : 'Disable 2FA'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reconfigure / Setup 2FA */}
      {reconfigureTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 relative animate-in zoom-in-95">
            <button
              onClick={() => setReconfigureTargetUser(null)}
              className="absolute right-5 top-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl ${c.primaryLightBg} ${c.primaryText} ${c.primaryLightBorder} border flex items-center justify-center shrink-0 shadow-xs`}>
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {reconfigureTargetUser.is2FAEnabled ? 'Reconfigure 2FA' : 'Configure 2FA'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {reconfigureTargetUser.name} ({reconfigureTargetUser.email})
                </p>
              </div>
            </div>

            {setupError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{setupError}</span>
              </div>
            )}

            {setupStep === 'LOADING' && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-6 h-6 border-2 border-[#088839] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Generating key & QR code...</span>
              </div>
            )}

            {setupStep === 'VERIFY' && (
              <form onSubmit={handleVerifyReconfigure} className="space-y-4">
                <div className="text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800">Scan QR Code</span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Scan with Google Authenticator or Microsoft Authenticator:
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  {setupQrCode ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={setupQrCode}
                      alt="2FA QR Code"
                      className="w-44 h-44 object-contain rounded-xl bg-white p-2 border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-xs">
                      Loading...
                    </div>
                  )}

                  {setupSecret && (
                    <div className="mt-3 w-full">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-700">
                        <span className="truncate flex-1 select-all text-center font-bold tracking-wider">
                          {setupSecret}
                        </span>
                        <button
                          type="button"
                          onClick={copySecret}
                          title="Copy Key"
                          className="p-1 text-slate-400 hover:text-[#088839] transition-colors cursor-pointer shrink-0"
                        >
                          {copiedKey ? (
                            <Check className="w-4 h-4 text-[#088839]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6-Digit Verification Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Enter 6-digit Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setVerificationCode(val);
                    }}
                    placeholder="000 000"
                    maxLength={6}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 placeholder-slate-300 focus:outline-none ${c.primaryFocus} focus:bg-white transition-colors`}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReconfigureTargetUser(null)}
                    disabled={isSubmittingAction}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAction || verificationCode.length !== 6}
                    className={`px-4 py-2.5 ${c.primaryBg} ${c.primaryBgHover} text-white rounded-xl text-xs font-bold shadow-md shadow-[#088839]/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50`}
                  >
                    {isSubmittingAction ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Verify & Save</span>
                  </button>
                </div>
              </form>
            )}

            {setupStep === 'SUCCESS' && (
              <div className="py-6 text-center space-y-4">
                <div className={`w-16 h-16 rounded-full ${c.primaryLightBg} ${c.primaryText} flex items-center justify-center mx-auto shadow-md shadow-[#088839]/10`}>
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900">
                    2FA Successfully Configured
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
                    Your authenticator app is now actively synchronized.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReconfigureTargetUser(null)}
                  className={`w-full py-2.5 px-4 rounded-xl ${c.primaryBg} ${c.primaryBgHover} text-white text-xs font-bold shadow-md shadow-[#088839]/20 transition-all cursor-pointer`}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
