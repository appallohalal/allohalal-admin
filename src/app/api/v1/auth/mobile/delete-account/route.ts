import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS response helper
function corsJson(data: any, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return corsJson({ ok: true });
}

export async function POST(req: NextRequest) {
  return handleDelete(req);
}

export async function DELETE(req: NextRequest) {
  return handleDelete(req);
}

async function handleDelete(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const userId = (body.userId || body.id || '').trim();
    const email = (body.email || '').trim().toLowerCase();

    if (!userId && !email) {
      return corsJson(
        { success: false, error: 'User ID or Email is required to delete account.' },
        { status: 400 }
      );
    }

    // 1. Locate the user
    let query = supabase.from('users').select('id, email, name');
    if (userId) {
      query = query.eq('id', userId);
    } else {
      query = query.eq('email', email);
    }

    const { data: user, error: findError } = await query.maybeSingle();

    if (findError || !user) {
      return corsJson(
        { success: false, error: 'User account not found or already deleted.' },
        { status: 404 }
      );
    }

    // 2. Permanently delete user from database (GDPR Art. 17 - Right to be forgotten)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      return corsJson(
        { success: false, error: deleteError.message || 'Failed to delete user account.' },
        { status: 500 }
      );
    }

    return corsJson({
      success: true,
      message: 'Account and associated personal data permanently deleted in compliance with GDPR (Art. 17).',
      deletedUserId: user.id,
    });
  } catch (err: any) {
    return corsJson(
      { success: false, error: err.message || 'An unexpected error occurred while deleting account.' },
      { status: 500 }
    );
  }
}

