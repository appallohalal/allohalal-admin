import { AdminUser } from './auth';
import { NavTab } from '@/components/layout/Sidebar';

export type AdminRole = AdminUser['role'];

export interface RolePermissions {
  role: AdminRole;
  allowedTabs: NavTab[];
  defaultTab: NavTab;
  // Products permissions
  canViewProducts: boolean;
  canAddProduct: boolean;
  canEditProduct: boolean;
  canOverrideProduct: boolean;
  canDeleteProduct: boolean;
  canExportCSV: boolean;
  // Unknown products & error reports
  canViewUnknownProducts: boolean;
  canManageUnknownProducts: boolean;
  canDeleteUnknownProducts: boolean;
  // Dictionaries / Additives permissions
  canViewAdditives: boolean;
  canAddAdditive: boolean;
  canEditAdditive: boolean;
  canDeleteAdditive: boolean;
  canExportAdditives: boolean;
  // Users & Team permissions
  canViewAppUsers: boolean;
  canManageTeam: boolean;
  // System Settings, Infrastructure & Logs
  canManageSystemSettings: boolean;
  canViewActivityLogs: boolean;
}

const ROLE_PERMISSIONS_MAP: Record<AdminRole, RolePermissions> = {
  'Super Admin': {
    role: 'Super Admin',
    allowedTabs: [
      'dashboard',
      'products',
      'unknown_products',
      'contributions',
      'additives',
      'cms',
      'notifications',
      'users',
      'admins',
      'security',
      'admob',
      'ads',
      'analytics',
      'logs',
    ],
    defaultTab: 'dashboard',
    canViewProducts: true,
    canAddProduct: true,
    canEditProduct: true,
    canOverrideProduct: true,
    canDeleteProduct: true,
    canExportCSV: true,
    canViewUnknownProducts: true,
    canManageUnknownProducts: true,
    canDeleteUnknownProducts: true,
    canViewAdditives: true,
    canAddAdditive: true,
    canEditAdditive: true,
    canDeleteAdditive: true,
    canExportAdditives: true,
    canViewAppUsers: true,
    canManageTeam: true,
    canManageSystemSettings: true,
    canViewActivityLogs: true,
  },

  'Chief Auditor': {
    role: 'Chief Auditor',
    allowedTabs: ['dashboard', 'products', 'unknown_products', 'additives'],
    defaultTab: 'products',
    canViewProducts: true,
    canAddProduct: true,
    canEditProduct: true,
    canOverrideProduct: true,
    canDeleteProduct: true,
    canExportCSV: true,
    canViewUnknownProducts: true,
    canManageUnknownProducts: true,
    canDeleteUnknownProducts: true,
    canViewAdditives: true,
    canAddAdditive: true,
    canEditAdditive: true,
    canDeleteAdditive: true,
    canExportAdditives: true,
    canViewAppUsers: false,
    canManageTeam: false,
    canManageSystemSettings: false,
    canViewActivityLogs: false,
  },

  'Halal Auditor': {
    role: 'Halal Auditor',
    allowedTabs: ['dashboard', 'products', 'unknown_products', 'additives'],
    defaultTab: 'products',
    canViewProducts: true,
    canAddProduct: true,
    canEditProduct: false,
    canOverrideProduct: false,
    canDeleteProduct: false,
    canExportCSV: false,
    canViewUnknownProducts: true,
    canManageUnknownProducts: true,
    canDeleteUnknownProducts: false,
    canViewAdditives: true,
    canAddAdditive: true,
    canEditAdditive: false,
    canDeleteAdditive: false,
    canExportAdditives: false,
    canViewAppUsers: false,
    canManageTeam: false,
    canManageSystemSettings: false,
    canViewActivityLogs: false,
  },

  'System Admin': {
    role: 'System Admin',
    allowedTabs: [
      'dashboard',
      'products',
      'cms',
      'notifications',
      'admob',
      'ads',
      'analytics',
      'logs',
      'security',
    ],
    defaultTab: 'logs',
    canViewProducts: true,
    canAddProduct: false,
    canEditProduct: false,
    canOverrideProduct: false,
    canDeleteProduct: false,
    canExportCSV: false,
    canViewUnknownProducts: false,
    canManageUnknownProducts: false,
    canDeleteUnknownProducts: false,
    canViewAdditives: false,
    canAddAdditive: false,
    canEditAdditive: false,
    canDeleteAdditive: false,
    canExportAdditives: false,
    canViewAppUsers: false,
    canManageTeam: false,
    canManageSystemSettings: true,
    canViewActivityLogs: true,
  },
};

export function normalizeRole(role?: string | null): AdminRole {
  if (
    role === 'Super Admin' ||
    role === 'Chief Auditor' ||
    role === 'Halal Auditor' ||
    role === 'System Admin'
  ) {
    return role;
  }
  return 'Halal Auditor';
}

export function getRolePermissions(role?: string | null): RolePermissions {
  return ROLE_PERMISSIONS_MAP[normalizeRole(role)];
}

export function canAccessTab(role: string | null | undefined, tab: NavTab): boolean {
  return getRolePermissions(role).allowedTabs.includes(tab);
}
