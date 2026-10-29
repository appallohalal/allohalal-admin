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
      send_welcome_email: true,
      email_provider: 'BOTH',
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      smtp_from_email: '',
      smtp_from_name: 'Allo Halal',
    };

    return NextResponse.json({
      success: true,
      forceUserAuth: s.force_user_auth === true,
      allowGuestScan: s.allow_guest_scan !== false,
      requireEmailVerification: s.require_email_verification === true,
      sendWelcomeEmail: s.send_welcome_email !== false,
      emailProvider: s.email_provider || 'BOTH',
      smtpHost: s.smtp_host || '',
      smtpPort: Number(s.smtp_port || 587),
      smtpUser: s.smtp_user || '',
      smtpFromEmail: s.smtp_from_email || '',
      smtpFromName: s.smtp_from_name || 'Allo Halal',
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
    const sendWelcomeEmail = body.sendWelcomeEmail !== false;
    const emailProvider = (body.emailProvider || 'BOTH').toUpperCase();
    const updatedBy = (body.updatedBy || 'Admin').trim();

    const payload: Record<string, any> = {
      id: 'global',
      force_user_auth: forceUserAuth,
      allow_guest_scan: allowGuestScan,
      require_email_verification: requireEmailVerification,
      send_welcome_email: sendWelcomeEmail,
      email_provider: emailProvider,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    };

    if (body.smtpHost !== undefined) payload.smtp_host = String(body.smtpHost).trim();
    if (body.smtpPort !== undefined) payload.smtp_port = Number(body.smtpPort || 587);
    if (body.smtpUser !== undefined) payload.smtp_user = String(body.smtpUser).trim();
    if (body.smtpPass !== undefined) payload.smtp_pass = String(body.smtpPass);
    if (body.smtpFromEmail !== undefined) payload.smtp_from_email = String(body.smtpFromEmail).trim();
    if (body.smtpFromName !== undefined) payload.smtp_from_name = String(body.smtpFromName || 'Allo Halal').trim();

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
      message: 'Authentication & Email configuration updated successfully',
      settings: {
        id: data.id,
        forceUserAuth: data.force_user_auth === true,
        allowGuestScan: data.allow_guest_scan !== false,
        requireEmailVerification: data.require_email_verification === true,
        sendWelcomeEmail: data.send_welcome_email !== false,
        emailProvider: data.email_provider || 'BOTH',
        smtpHost: data.smtp_host || '',
        smtpPort: Number(data.smtp_port || 587),
        smtpUser: data.smtp_user || '',
        smtpFromEmail: data.smtp_from_email || '',
        smtpFromName: data.smtp_from_name || 'Allo Halal',
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
