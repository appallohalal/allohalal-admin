'use client';

import React, { useState, useEffect } from 'react';
import { AdminUser } from '@/lib/auth';
import {
  ShieldCheck,
  UserPlus,
  Crown,
  Shield,
  Trash2,
  Mail,
  Lock,
  User,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  UserCog,
} from 'lucide-react';

interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: AdminUser['role'];
  avatarInitials: string;
  createdAt: string;
  lastSignInAt: string | null;
}

interface AdminManagementProps {
  currentUser: AdminUser | null;
  searchQuery: string;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({
  currentUser,
  searchQuery,
}) => {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<AdminMember | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminMember | null>(null);

  // New Admin Form fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminUser['role']>('Halal Auditor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected role for editing
  const [selectedRole, setSelectedRole] = useState<AdminUser['role']>('Halal Auditor');

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin-users');
      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins || []);
      } else {
        setError(data.error || 'Failed to load admin team.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch admin users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Admin account created for ${newName}!`);
        setIsAddModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('Halal Auditor');
        await fetchAdmins();
      } else {
        setError(data.error || 'Failed to create admin.');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating admin user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editRoleUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editRoleUser.id,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Role updated to "${selectedRole}" for ${editRoleUser.name}`);
        setEditRoleUser(null);
        await fetchAdmins();
      } else {
        setError(data.error || 'Failed to update role.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating user role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteConfirmUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/admin-users?id=${deleteConfirmUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Admin user ${deleteConfirmUser.name} deleted.`);
        setDeleteConfirmUser(null);
        await fetchAdmins();
      } else {
        setError(data.error || 'Failed to delete admin.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting admin user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered by search query
  const filteredAdmins = admins.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
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
      case 'Chief Auditor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            Chief Auditor
          </span>
        );
      case 'System Admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-[#b5e0c5]">
            <Shield className="w-3 h-3 text-[#088839]" />
            System Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Halal Auditor
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin & Team Management</h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage system administrators, certifier roles, and staff permissions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setError(null);
            setSuccessMsg(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add New Admin
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Team</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{admins.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase">Super Admins</span>
          <div className="text-2xl font-black text-purple-700 mt-1">
            {admins.filter((a) => a.role === 'Super Admin').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase">Chief Auditors</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {admins.filter((a) => a.role === 'Chief Auditor').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Halal Auditors</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {admins.filter((a) => a.role === 'Halal Auditor').length}
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800">
            Team Members ({filteredAdmins.length})
          </div>
          <div className="text-xs text-slate-400">
            {currentUser?.role === 'Super Admin' ? 'Full User Management Access' : 'View Team'}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            Loading admin team...
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No admin accounts found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role & Access</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAdmins.map((admin) => {
                  const isCurrent = admin.id === currentUser?.id;
                  const canEdit = currentUser?.role === 'Super Admin';

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {admin.avatarInitials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {admin.name}
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getRoleBadge(admin.role)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {admin.lastSignInAt
                            ? new Date(admin.lastSignInAt).toLocaleString()
                            : 'Never logged in'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRole(admin.role);
                              setEditRoleUser(admin);
                            }}
                            disabled={!canEdit}
                            title={canEdit ? 'Change role' : 'Super Admin permission required'}
                            className="px-2.5 py-1 text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Change Role
                          </button>

                          <button
                            onClick={() => setDeleteConfirmUser(admin)}
                            disabled={!canEdit || isCurrent}
                            title={isCurrent ? 'Cannot delete your own account' : 'Delete user'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add New Admin Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Admin User</h3>
                  <p className="text-[11px] text-slate-500">Provide credentials to invite an auditor or admin</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Dr. Ahmad Tariq"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="auditor@halallens.org"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="•••••••• (minimum 6 characters)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Role & Access Level</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AdminUser['role'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                >
                  <option value="Halal Auditor">Halal Auditor (Verification & Dictionaries)</option>
                  <option value="Chief Auditor">Chief Auditor (Products & Overrides)</option>
                  <option value="System Admin">System Admin (Infrastructure & Logs)</option>
                  <option value="Super Admin">Super Admin (Full Platform Authority)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Change Admin Role</h3>
              <button onClick={() => setEditRoleUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select new role for <strong className="text-slate-900">{editRoleUser.name}</strong> ({editRoleUser.email}):
            </p>

            <div className="space-y-2">
              {(['Super Admin', 'Chief Auditor', 'Halal Auditor', 'System Admin'] as AdminUser['role'][]).map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    selectedRole === r
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="roleOption"
                      checked={selectedRole === r}
                      onChange={() => setSelectedRole(r)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{r}</span>
                  </div>
                  {getRoleBadge(r)}
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditRoleUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete admin account for{' '}
              <strong className="text-slate-900">{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
