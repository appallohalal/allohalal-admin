import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = 'halallens_salt_v1';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const deviceId = (body.deviceId || '').trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'No user account found with this email address.' },
        { status: 404 }
      );
    }

    if (user.is_banned) {
      return NextResponse.json(
        {
          success: false,
          error: `This account has been suspended by administration. Reason: ${user.ban_reason || 'Policy violation'}`,
        },
        { status: 403 }
      );
    }

    // Verify password if user has password_hash
    if (user.password_hash) {
      const inputHash = hashPassword(password);
      if (inputHash !== user.password_hash) {
        return NextResponse.json(
          { success: false, error: 'Incorrect password. Please try again.' },
          { status: 401 }
        );
      }
    }

    // Update last active timestamp and optional deviceId
    const updatePayload: Record<string, any> = {
      last_active_at: new Date().toISOString(),
    };
    if (deviceId) {
      updatePayload.device_id = deviceId;
    }

    await supabase.from('users').update(updatePayload).eq('id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        name: user.name,
        username: user.username || user.name,
        email: user.email,
        country: user.country,
        city: user.city || '',
        deviceId: user.device_id || deviceId,
        isPremium: user.is_premium === true,
        totalScans: user.total_scans || 0,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Error in mobile login:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
