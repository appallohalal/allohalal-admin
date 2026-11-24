import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDbPool } from '@/lib/totp';
import { getActiveEmailConfig, sendSmtpEmail } from '@/lib/email';

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + 'halallens_salt_v1')
    .digest('hex');
}

function buildResetEmailHtml(code: string, userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
              <tr>
                <td style="background:#059669;padding:24px 32px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Allo Halal</h1>
                  <p style="margin:6px 0 0;color:#d1fae5;font-size:13px;">Password Reset Request</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;color:#1f2937;">
                  <p style="margin:0 0 14px;font-size:15px;">Hello ${userName || 'there'},</p>
                  <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563;">
                    We received a request to reset your Allo Halal account password. Use the 6-digit verification code below in the app to set a new password:
                  </p>
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px;text-align:center;margin-bottom:20px;">
                    <span style="font-size:30px;font-weight:800;letter-spacing:8px;color:#059669;font-family:monospace;">${code}</span>
                  </div>
                  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
                    This code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required.' },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json(
        { success: false, error: 'Database connection is not configured.' },
        { status: 500 }
      );
    }

    if (action === 'request_code') {
      const userRes = await pool.query(
        'SELECT id, name, email FROM public.users WHERE lower(email) = $1 LIMIT 1',
        [email]
      );

      if (userRes.rows.length === 0) {
        // Return generic error or clear message? Clear message helps mobile UX, or return 404.
        return NextResponse.json(
          { success: false, error: 'No account found with this email address.' },
          { status: 404 }
        );
      }

      const user = userRes.rows[0];
      const code = String(crypto.randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await pool.query(
        'UPDATE public.mobile_password_resets SET used = true WHERE lower(email) = $1 AND used = false',
        [email]
      );

      await pool.query(
        `INSERT INTO public.mobile_password_resets (email, code, expires_at, used)
         VALUES ($1, $2, $3, false)`,
        [email, code, expiresAt]
      );

      const emailConfig = await getActiveEmailConfig();
      const smtpResult = await sendSmtpEmail(
        emailConfig.smtpConfig,
        email,
        'Allo Halal — Password Reset Code',
        buildResetEmailHtml(code, user.name || '')
      );

      if (!smtpResult.success) {
        return NextResponse.json(
          { success: false, error: smtpResult.error || 'Failed to send reset email.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email.',
      });
    }

    if (action === 'reset_password') {
      const code = String(body.code || '').trim();
      const newPassword = String(body.newPassword || '');

      if (!code || code.length !== 6) {
        return NextResponse.json(
          { success: false, error: 'A valid 6-digit verification code is required.' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      const resetRes = await pool.query(
        `SELECT id, expires_at
         FROM public.mobile_password_resets
         WHERE lower(email) = $1 AND code = $2 AND used = false
         ORDER BY created_at DESC
         LIMIT 1`,
        [email, code]
      );

      if (resetRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired verification code.' },
          { status: 400 }
        );
      }

      const resetRow = resetRes.rows[0];
      if (new Date(resetRow.expires_at).getTime() < Date.now()) {
        await pool.query('UPDATE public.mobile_password_resets SET used = true WHERE id = $1', [resetRow.id]);
        return NextResponse.json(
          { success: false, error: 'Verification code has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      const passwordHash = hashPassword(newPassword);
      const updateRes = await pool.query(
        'UPDATE public.users SET password_hash = $1 WHERE lower(email) = $2 RETURNING id',
        [passwordHash, email]
      );

      if (updateRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Account not found.' },
          { status: 404 }
        );
      }

      await pool.query('UPDATE public.mobile_password_resets SET used = true WHERE id = $1', [resetRow.id]);

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/v1/auth/mobile/forgot-password:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
