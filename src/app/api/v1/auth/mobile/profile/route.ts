import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS response helper
function corsJson(data: any, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return corsJson({ ok: true });
}

export async function POST(req: NextRequest) {
  return handleUpdate(req);
}

export async function PUT(req: NextRequest) {
  return handleUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = (body.userId || body.id || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const username = (body.username || '').trim();
    const country = (body.country || '').trim();
    const city = (body.city || '').trim();

    if (!userId) {
      return corsJson(
        { success: false, error: 'User ID is required to update profile.' },
        { status: 400 }
      );
    }

    if (!name) {
      return corsJson(
        { success: false, error: 'Full name cannot be empty.' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return corsJson(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    // 1. Verify user exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findError || !existingUser) {
      return corsJson(
        { success: false, error: 'User account not found.' },
        { status: 404 }
      );
    }

    // 2. Check if new email is already taken by another account
    if (email !== existingUser.email) {
      const { data: conflictUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .maybeSingle();

      if (conflictUser) {
        return corsJson(
          { success: false, error: 'This email address is already registered to another account.' },
          { status: 409 }
        );
      }
    }

    // 3. Update profile fields in Supabase
    const updatePayload: Record<string, any> = {
      name,
      username: username || name,
      email,
      country: country || existingUser.country || 'France',
      city: city || existingUser.city || '',
      last_active_at: new Date().toISOString(),
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !updatedUser) {
      return corsJson(
        { success: false, error: updateError?.message || 'Failed to update user profile in database.' },
        { status: 500 }
      );
    }

    return corsJson({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        country: updatedUser.country,
        city: updatedUser.city,
        deviceId: updatedUser.device_id,
        isPremium: updatedUser.is_premium,
        totalScans: updatedUser.total_scans,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (err: any) {
    return corsJson(
      { success: false, error: err.message || 'An unexpected error occurred while updating profile.' },
      { status: 500 }
    );
  }
}

