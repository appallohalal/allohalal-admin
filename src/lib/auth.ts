'use client';

import { supabase } from './supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Chief Auditor' | 'Halal Auditor' | 'System Admin';
  avatarInitials: string;
  createdAt: string;
}

export interface AuthSetupStatus {
  isFirstUser: boolean;
  userCount: number;
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
  const initials = name
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
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
): Promise<{ success: boolean; user?: AdminUser; error?: string }> => {
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

    return {
      success: true,
      user: formatSupabaseUser(data.user),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Authentication failed.' };
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
