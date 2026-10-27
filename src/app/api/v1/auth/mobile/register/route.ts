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

    const name = (body.name || '').trim();
    const username = (body.username || name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const country = (body.country || 'Unknown').trim();
    const city = (body.city || '').trim();
    const deviceId = (body.deviceId || `device_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`).trim();

    // Validation
    if (!name && !username) {
      return NextResponse.json(
        { success: false, error: 'Name or Username is required.' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid Email address is required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (!country) {
      return NextResponse.json(
        { success: false, error: 'Country is required.' },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City is required.' },
        { status: 400 }
      );
    }

    // Check if email already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email address already exists. Please log in.' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    const newUserPayload = {
      device_id: deviceId,
      email,
      name: name || username,
      username: username || name,
      country,
      city,
      password_hash: passwordHash,
      is_premium: false,
      is_banned: false,
      total_scans: 0,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert(newUserPayload)
      .select()
      .single();

    if (insertError) {
      console.error('Registration insertion error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message || 'Failed to create user account.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: insertedUser.id,
        name: insertedUser.name,
        username: insertedUser.username,
        email: insertedUser.email,
        country: insertedUser.country,
        city: insertedUser.city,
        deviceId: insertedUser.device_id,
        isPremium: insertedUser.is_premium,
        totalScans: insertedUser.total_scans,
        createdAt: insertedUser.created_at,
      },
    });
  } catch (err: any) {
    console.error('Error in mobile register:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
