import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, ensure2FATables, logSecurityAuditEvent } from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUserId, actorId, reason } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Target User ID is required.' },
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

    await ensure2FATables(db);

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
          { success: false, error: 'Permission denied. Only Super Administrators can reset 2FA.' },
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

    // 3. Revoke existing secret, invalidate old configuration, require fresh configuration
    await db.query(
      `
      UPDATE public.admin_2fa_factors 
      SET 
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
        last_verified_step = 0,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
      WHERE user_id = $1;
    `,
      [targetUserId]
    );

    // Also clean up any legacy GoTrue mfa factor if present
    await db.query('DELETE FROM auth.mfa_factors WHERE user_id = $1;', [targetUserId]).catch(() => {});

    // 4. Record security audit log
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await logSecurityAuditEvent({
      eventType: '2FA_RESET',
      actorId,
      actorEmail,
      actorRole,
      targetUserId,
      targetUserEmail: targetUser.email,
      ipAddress: clientIp,
      userAgent,
      details: {
        reason: reason || '2FA secret revoked and reset by Super Admin; fresh setup required.',
        targetName: targetUser.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Two-Factor Authentication for ${targetUser.name || targetUser.email} has been revoked and reset. The user must configure 2FA again.`,
    });
  } catch (err: unknown) {
    console.error('Failed to reset 2FA:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error occurred while resetting 2FA.' },
      { status: 500 }
    );
  }
}

