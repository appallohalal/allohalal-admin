import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('auth_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Auth config GET API warning:', error);
    }

    const s = data || {
      force_user_auth: false,
      allow_guest_scan: true,
      require_email_verification: false,
    };

    return NextResponse.json({
      success: true,
      forceUserAuth: s.force_user_auth === true,
      allowGuestScan: s.allow_guest_scan !== false,
      requireEmailVerification: s.require_email_verification === true,
      updatedAt: s.updated_at || new Date().toISOString(),
      updatedBy: s.updated_by || 'Admin',
    });
  } catch (error: any) {
    console.error('Error in GET /api/v1/auth/config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const forceUserAuth = Boolean(body.forceUserAuth);
    const allowGuestScan = !forceUserAuth;
    const requireEmailVerification = Boolean(body.requireEmailVerification);
    const updatedBy = (body.updatedBy || 'Admin').trim();

    const payload = {
      id: 'global',
      force_user_auth: forceUserAuth,
      allow_guest_scan: allowGuestScan,
      require_email_verification: requireEmailVerification,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    };

    const { data, error } = await supabase
      .from('auth_settings')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving auth settings to Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication configuration updated successfully',
      settings: {
        id: data.id,
        forceUserAuth: data.force_user_auth === true,
        allowGuestScan: data.allow_guest_scan !== false,
        requireEmailVerification: data.require_email_verification === true,
        updatedAt: data.updated_at,
        updatedBy: data.updated_by,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/v1/auth/config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
