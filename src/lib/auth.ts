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
      // Verify if account requires Level 2 Authenticator Assurance (2FA)
      try {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
          // User has enrolled 2FA but current session has not passed 2FA verification yet
          return null;
        }
      } catch (aalErr) {
        console.warn('MFA assurance level check warning:', aalErr);
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

    // Check if 2FA (TOTP) is required for this account
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
        const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
        if (!factorsErr && factorsData) {
          const verifiedTotp =
            factorsData.totp?.find((f) => f.status === 'verified') ||
            factorsData.all?.find((f) => f.status === 'verified' && f.factor_type === 'totp');

          if (verifiedTotp) {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
              factorId: verifiedTotp.id,
            });

            if (challengeError || !challengeData) {
              return {
                success: false,
                error: challengeError?.message || 'Failed to initiate 2FA challenge.',
              };
            }

            return {
              success: true,
              requires2FA: true,
              factorId: verifiedTotp.id,
              challengeId: challengeData.id,
              user: formatSupabaseUser(data.user),
            };
          }
        }
      }
    } catch (mfaErr: any) {
      console.warn('MFA check exception during login:', mfaErr);
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
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Invalid 2FA code. Please check your authenticator app and try again.',
      };
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
  factors: MFAFactorInfo[];
  verifiedFactorId?: string;
}> => {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) {
      return { isEnabled: false, factors: [] };
    }

    const verifiedTotp = data.all?.find(
      (f) => f.status === 'verified' && f.factor_type === 'totp'
    );

    return {
      isEnabled: Boolean(verifiedTotp),
      factors: (data.all || []).map((f) => ({
        id: f.id,
        factorType: f.factor_type,
        status: f.status as 'verified' | 'unverified',
        friendlyName: f.friendly_name,
      })),
      verifiedFactorId: verifiedTotp?.id,
    };
  } catch (err) {
    console.warn('Error checking MFA status:', err);
    return { isEnabled: false, factors: [] };
  }
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
    // Unenroll any pending unverified factors first to keep factors clean
    const { data: existing } = await supabase.auth.mfa.listFactors();
    if (existing?.all) {
      for (const f of existing.all) {
        if (f.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
      issuer,
    });

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to enroll 2FA factor.' };
    }

    const secret = data.totp?.secret || '';
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData?.session?.user?.email || 'admin@allo-halal.com';

    // Standard TOTP URI format recognized by Google Authenticator, Authy, Apple Keychain
    const customUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // Generate high-resolution, branded QR code
    let qrCode = data.totp?.qr_code;
    try {
      qrCode = await QRCode.toDataURL(customUri, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 260,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (qrErr) {
      console.warn('Custom QR generation fallback:', qrErr);
    }

    return {
      success: true,
      factorId: data.id,
      qrCode,
      secret,
      uri: customUri,
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
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challenge) {
      return {
        success: false,
        error: challengeError?.message || 'Failed to initiate 2FA verification challenge.',
      };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (verifyError) {
      return {
        success: false,
        error: verifyError.message || 'Invalid verification code. Please check your app.',
      };
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
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to disable 2FA.' };
  }
};
