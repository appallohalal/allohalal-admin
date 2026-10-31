'use client';

import { supabase } from './supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import QRCode from 'qrcode';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Chief Auditor' | 'Halal Auditor' | 'System Admin';
  avatarInitials: string;
  createdAt: string;
  is2FAEnabled?: boolean;
}

export interface AuthSetupStatus {
  isFirstUser: boolean;
  userCount: number;
}

export interface LoginResult {
  success: boolean;
  user?: AdminUser;
  requires2FA?: boolean;
  factorId?: string;
  challengeId?: string;
  error?: string;
}

export interface MFAFactorInfo {
  id: string;
  factorType: string;
  status: 'verified' | 'unverified';
  friendlyName?: string;
}

export const checkAuthSetupStatus = async (): Promise<AuthSetupStatus> => {
  try {
    const { data, error } = await supabase.rpc('get_auth_setup_status');
    if (!error && data) {
      return {
        isFirstUser: Boolean(data.is_first_user),
        userCount: Number(data.user_count || 0),
      };
    }
  } catch (err) {
    console.warn('RPC checkAuthSetupStatus warning:', err);
  }

  try {
    const res = await fetch('/api/v1/auth/setup-status');
    if (res.ok) {
      const data = await res.json();
      return {
        isFirstUser: Boolean(data.isFirstUser),
        userCount: Number(data.userCount || 0),
      };
    }
  } catch (err) {
    console.warn('API checkAuthSetupStatus warning:', err);
  }

  return { isFirstUser: false, userCount: 1 };
};

export const formatSupabaseUser = (user: SupabaseUser): AdminUser => {
  const metadata = user.user_metadata || {};
  const name = metadata.name || user.email?.split('@')[0] || 'Admin';
  const role: AdminUser['role'] = metadata.role || 'Super Admin';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'AD';

  return {
    id: user.id,
    name,
    email: user.email || '',
    role,
    avatarInitials: initials,
    createdAt: user.created_at,
  };
};

export const getStoredAuthUser = async (): Promise<AdminUser | null> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      if (session.user.user_metadata?.account_type === 'mobile_user') {
        return null;
      }

      // Check if 2FA is active for this account
      try {
        const res = await fetch(`/api/v1/auth/2fa/status?userId=${session.user.id}`);
        if (res.ok) {
          const status = await res.json();
          if (status.isEnabled) {
            // Check if current browser session passed 2FA verification
            const isVerified =
              typeof window !== 'undefined' &&
              sessionStorage.getItem(`allo_admin_2fa_verified_${session.user.id}`) === 'true';

            if (!isVerified) {
              return null; // Require 2FA verification
            }
          }
        }
      } catch (checkErr) {
        console.warn('2FA verification check warning:', checkErr);
      }

      return formatSupabaseUser(session.user);
    }
  } catch (err) {
    console.warn('Supabase getSession warning:', err);
  }
  return null;
};

export const loginAdmin = async (
  email: string,
  password: string
): Promise<LoginResult> => {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'No user returned from Supabase.' };
    }

    if (data.user.user_metadata?.account_type === 'mobile_user') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This account is registered for the Mobile App only, not the Admin Panel.',
      };
    }

    // Check if 2FA is required for this account
    try {
      const res = await fetch(`/api/v1/auth/2fa/status?userId=${data.user.id}`);
      if (res.ok) {
        const statusData = await res.json();
        if (statusData.isEnabled) {
          return {
            success: true,
            requires2FA: true,
            factorId: data.user.id,
            challengeId: 'totp',
            user: formatSupabaseUser(data.user),
          };
        }
      }
    } catch (statusErr) {
      console.warn('2FA status check warning during login:', statusErr);
    }

    // Mark as verified for session if 2FA is not active
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`allo_admin_2fa_verified_${data.user.id}`, 'true');
    }

    return {
      success: true,
      user: formatSupabaseUser(data.user),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Authentication failed.' };
  }
};

export const verifyLogin2FA = async (
  factorId: string,
  challengeId: string,
  code: string,
  user: AdminUser
): Promise<{ success: boolean; user?: AdminUser; error?: string }> => {
  if (!code || code.trim().length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit code.' };
  }

  try {
    const res = await fetch('/api/v1/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id || factorId,
        code: code.trim(),
        isSetup: false,
        actorEmail: user.email,
        actorRole: user.role,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Invalid 2FA code. Please check your authenticator app and try again.',
      };
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`allo_admin_2fa_verified_${user.id || factorId}`, 'true');
    }

    return {
      success: true,
      user,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify 2FA code.' };
  }
};

export const registerAdmin = async (
  name: string,
  email: string,
  password: string,
  role: AdminUser['role'] = 'Super Admin'
): Promise<{ success: boolean; user?: AdminUser; needsConfirmation?: boolean; error?: string }> => {
  if (!name.trim() || !email.trim() || !password) {
    return { success: false, error: 'All fields are required.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          role,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Could not create account in Supabase.' };
    }

    const adminUser = formatSupabaseUser(data.user);

    // If email confirmation is required, session might be null
    if (!data.session) {
      return {
        success: true,
        needsConfirmation: true,
        user: adminUser,
      };
    }

    return {
      success: true,
      user: adminUser,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration failed.' };
  }
};

export const logoutAdmin = async (): Promise<void> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user && typeof window !== 'undefined') {
      sessionStorage.removeItem(`allo_admin_2fa_verified_${session.user.id}`);
    }
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase logout error:', err);
  }
};

// ==============================================================================
// Two-Factor Authentication (2FA) Management Methods (TOTP)
// ==============================================================================

export const checkCurrentUserMFA = async (): Promise<{
  isEnabled: boolean;
  status?: string;
  setupAt?: string | null;
  factors: MFAFactorInfo[];
  verifiedFactorId?: string;
}> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { isEnabled: false, factors: [] };
    }

    const res = await fetch(`/api/v1/auth/2fa/status?userId=${session.user.id}`);
    if (res.ok) {
      const data = await res.json();
      return {
        isEnabled: Boolean(data.isEnabled),
        status: data.status,
        setupAt: data.setupAt,
        factors: data.isEnabled
          ? [
              {
                id: session.user.id,
                factorType: 'totp',
                status: 'verified',
                friendlyName: 'Allo Halal Authenticator',
              },
            ]
          : [],
        verifiedFactorId: session.user.id,
      };
    }
  } catch (err) {
    console.warn('Error checking MFA status:', err);
  }
  return { isEnabled: false, factors: [] };
};

export const enrollTOTP = async (
  friendlyName: string = 'Allo Halal Admin',
  issuer: string = 'Allo Halal Admin'
): Promise<{
  success: boolean;
  factorId?: string;
  qrCode?: string;
  secret?: string;
  uri?: string;
  error?: string;
}> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: 'User session not found.' };
    }

    const res = await fetch('/api/v1/auth/2fa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.user.id,
        email: session.user.email,
        actorId: session.user.id,
        actorEmail: session.user.email,
        actorRole: session.user.user_metadata?.role || 'Halal Auditor',
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to initialize 2FA setup.' };
    }

    return {
      success: true,
      factorId: session.user.id,
      qrCode: data.qrCode,
      secret: data.secret,
      uri: data.uri,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error during 2FA enrollment.' };
  }
};

export const verifyAndActivateTOTP = async (
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  if (!code || code.trim().length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit code.' };
  }

  try {
    const res = await fetch('/api/v1/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: factorId,
        code: code.trim(),
        isSetup: true,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Invalid verification code. Please check your authenticator app.',
      };
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`allo_admin_2fa_verified_${factorId}`, 'true');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error activating 2FA.' };
  }
};

export const disableTOTP = async (
  factorId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const currentUserId = session?.user?.id || factorId;

    const res = await fetch('/api/v1/auth/2fa/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: factorId,
        actorId: currentUserId,
        enable: false,
        reason: 'Disabled by user from 2FA settings modal',
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to disable 2FA.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to disable 2FA.' };
  }
};
