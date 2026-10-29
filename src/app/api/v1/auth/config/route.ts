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
      enableContributions: s.enable_contributions !== false,
      requireEmailVerification: s.require_email_verification === true,
      sendWelcomeEmail: s.send_welcome_email !== false,
      emailProvider: s.email_provider || 'BOTH',
      smtpHost: s.smtp_host || '',
      smtpPort: Number(s.smtp_port || 587),
      smtpUser: s.smtp_user || '',
      smtpFromEmail: s.smtp_from_email || '',
      smtpFromName: s.smtp_from_name || 'Allo Halal',
      welcomeEmailSubject: s.welcome_email_subject || 'Welcome to Allo Halal! Your Account is Ready',
      welcomeEmailTitle: s.welcome_email_title || 'Welcome to Allo Halal!',
      welcomeEmailSubtitle: s.welcome_email_subtitle || 'Your trusted AI-powered companion for verifying Halal products & ingredients',
      welcomeEmailBody: s.welcome_email_body || '',
      confirmationEmailSubject: s.confirmation_email_subject || 'Confirm Your Allo Halal Account',
      confirmationEmailTitle: s.confirmation_email_title || 'Verify Your Email Address',
      confirmationEmailSubtitle: s.confirmation_email_subtitle || 'Please verify your email address to secure and activate your account',
      confirmationEmailBody: s.confirmation_email_body || '',
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
    const enableContributions = body.enableContributions !== false;
    const requireEmailVerification = Boolean(body.requireEmailVerification);
    const sendWelcomeEmail = body.sendWelcomeEmail !== false;
    const emailProvider = (body.emailProvider || 'BOTH').toUpperCase();
    const updatedBy = (body.updatedBy || 'Admin').trim();

    const payload: Record<string, any> = {
      id: 'global',
      force_user_auth: forceUserAuth,
      allow_guest_scan: allowGuestScan,
      enable_contributions: enableContributions,
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
    if (body.welcomeEmailSubject !== undefined) payload.welcome_email_subject = String(body.welcomeEmailSubject).trim();
    if (body.welcomeEmailTitle !== undefined) payload.welcome_email_title = String(body.welcomeEmailTitle).trim();
    if (body.welcomeEmailSubtitle !== undefined) payload.welcome_email_subtitle = String(body.welcomeEmailSubtitle).trim();
    if (body.welcomeEmailBody !== undefined) payload.welcome_email_body = String(body.welcomeEmailBody);
    if (body.confirmationEmailSubject !== undefined) payload.confirmation_email_subject = String(body.confirmationEmailSubject).trim();
    if (body.confirmationEmailTitle !== undefined) payload.confirmation_email_title = String(body.confirmationEmailTitle).trim();
    if (body.confirmationEmailSubtitle !== undefined) payload.confirmation_email_subtitle = String(body.confirmationEmailSubtitle).trim();
    if (body.confirmationEmailBody !== undefined) payload.confirmation_email_body = String(body.confirmationEmailBody);

    let { data, error } = await supabase
      .from('auth_settings')
      .upsert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Initial auth_settings upsert error, attempting fallback without template fields:', error.message);
      // Fallback in case Postgres columns are not migrated yet
      const fallbackPayload = {
        id: 'global',
        force_user_auth: forceUserAuth,
        allow_guest_scan: allowGuestScan,
        enable_contributions: enableContributions,
        require_email_verification: requireEmailVerification,
        send_welcome_email: sendWelcomeEmail,
        email_provider: emailProvider,
        smtp_host: payload.smtp_host,
        smtp_port: payload.smtp_port,
        smtp_user: payload.smtp_user,
        smtp_pass: payload.smtp_pass,
        smtp_from_email: payload.smtp_from_email,
        smtp_from_name: payload.smtp_from_name,
        updated_at: payload.updated_at,
        updated_by: updatedBy,
      };
      const retryResult = await supabase
        .from('auth_settings')
        .upsert(fallbackPayload)
        .select()
        .maybeSingle();
      data = retryResult.data || (fallbackPayload as any);
      error = retryResult.error;
    }

    if (error && !data) {
      console.error('Error saving auth settings to Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const resData = data || payload;

    return NextResponse.json({
      success: true,
      message: 'Authentication & Email configuration updated successfully',
      settings: {
        id: resData.id,
        forceUserAuth: resData.force_user_auth === true,
        allowGuestScan: resData.allow_guest_scan !== false,
        enableContributions: resData.enable_contributions !== false,
        requireEmailVerification: resData.require_email_verification === true,
        sendWelcomeEmail: resData.send_welcome_email !== false,
        emailProvider: resData.email_provider || 'BOTH',
        smtpHost: resData.smtp_host || '',
        smtpPort: Number(resData.smtp_port || 587),
        smtpUser: resData.smtp_user || '',
        smtpFromEmail: resData.smtp_from_email || '',
        smtpFromName: resData.smtp_from_name || 'Allo Halal',
        welcomeEmailSubject: resData.welcome_email_subject || body.welcomeEmailSubject,
        welcomeEmailTitle: resData.welcome_email_title || body.welcomeEmailTitle,
        welcomeEmailSubtitle: resData.welcome_email_subtitle || body.welcomeEmailSubtitle,
        welcomeEmailBody: resData.welcome_email_body !== undefined ? resData.welcome_email_body : body.welcomeEmailBody,
        confirmationEmailSubject: resData.confirmation_email_subject || body.confirmationEmailSubject,
        confirmationEmailTitle: resData.confirmation_email_title || body.confirmationEmailTitle,
        confirmationEmailSubtitle: resData.confirmation_email_subtitle || body.confirmationEmailSubtitle,
        confirmationEmailBody: resData.confirmation_email_body !== undefined ? resData.confirmation_email_body : body.confirmationEmailBody,
        updatedAt: resData.updated_at,
        updatedBy: resData.updated_by,
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
