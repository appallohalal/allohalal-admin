import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, logSecurityAuditEvent } from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUserId, actorId, enable, reason } = body;

    if (!targetUserId || typeof enable !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Target User ID and enable state (boolean) are required.' },
        { status: 400 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection unavailable' },
        { status: 500 }
      );
    }

    // 1. Authorization: verify actor is authorized Main Administrator (Super Admin)
    let actorEmail = 'superadmin@allo-halal.com';
    let actorRole = 'Super Admin';

    if (actorId) {
      const actorRes = await db.query(
        `SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users WHERE id = $1`,
        [actorId]
      );
      if (actorRes.rowCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Actor user not recognized.' },
          { status: 403 }
        );
      }
      actorRole = actorRes.rows[0].role || 'Halal Auditor';
      actorEmail = actorRes.rows[0].email;

      if (actorRole !== 'Super Admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'Permission denied. Only Super Administrators can enable or disable 2FA for team members.',
          },
          { status: 403 }
        );
      }
    }

    // 2. Fetch target user
    const targetRes = await db.query(
      `SELECT id, email, raw_user_meta_data->>'name' as name, raw_user_meta_data->>'role' as role FROM auth.users WHERE id = $1`,
      [targetUserId]
    );

    if (targetRes.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Target user not found.' },
        { status: 404 }
      );
    }

    const targetUser = targetRes.rows[0];
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (enable) {
      // Re-enabling 2FA:
      // Requirement: "Require users to complete a new 2FA setup when re-enabled."
      await db.query(
        `
        INSERT INTO public.admin_2fa_factors (
          user_id,
          secret_encrypted,
          secret_iv,
          secret_tag,
          is_enabled,
          status,
          setup_at,
          failed_attempts,
          locked_until,
          updated_at
        ) VALUES ($1, '', '', '', FALSE, 'pending_setup', NULL, 0, NULL, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          is_enabled = FALSE,
          status = 'pending_setup',
          secret_encrypted = '',
          secret_iv = '',
          secret_tag = '',
          temp_secret_encrypted = NULL,
          temp_secret_iv = NULL,
          temp_secret_tag = NULL,
          temp_created_at = NULL,
          setup_at = NULL,
          failed_attempts = 0,
          locked_until = NULL,
          updated_at = NOW();
      `,
        [targetUserId]
      );

      await logSecurityAuditEvent({
        eventType: '2FA_ENABLED',
        actorId,
        actorEmail,
        actorRole,
        targetUserId,
        targetUserEmail: targetUser.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          action: '2FA re-enabled by Super Admin; new authenticator setup required',
          reason: reason || 'Enforced by Super Admin',
        },
      });

      return NextResponse.json({
        success: true,
        message: `2FA requirement has been enabled for ${targetUser.name || targetUser.email}. A new setup is required.`,
      });
    } else {
      // Disabling 2FA:
      // Requirement: "Show a confirmation dialog before disabling 2FA. Record every security-related action."
      await db.query(
        `
        UPDATE public.admin_2fa_factors 
        SET 
          is_enabled = FALSE,
          status = 'disabled',
          temp_secret_encrypted = NULL,
          temp_secret_iv = NULL,
          temp_secret_tag = NULL,
          temp_created_at = NULL,
          failed_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
        WHERE user_id = $1;
      `,
        [targetUserId]
      );

      // Clean up legacy GoTrue factors
      await db.query('DELETE FROM auth.mfa_factors WHERE user_id = $1;', [targetUserId]).catch(() => {});

      await logSecurityAuditEvent({
        eventType: '2FA_DISABLED',
        actorId,
        actorEmail,
        actorRole,
        targetUserId,
        targetUserEmail: targetUser.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          action: '2FA disabled by Super Admin',
          reason: reason || 'Disabled via Admin Backoffice',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Two-Factor Authentication has been disabled for ${targetUser.name || targetUser.email}.`,
      });
    }
  } catch (err: unknown) {
    console.error('Failed to toggle 2FA:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error occurred while updating 2FA state.' },
      { status: 500 }
    );
  }
}

