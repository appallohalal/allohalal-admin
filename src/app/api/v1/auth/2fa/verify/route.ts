import { NextRequest, NextResponse } from 'next/server';
import {
  getDbPool,
  decryptSecret,
  verifyTOTP,
  logSecurityAuditEvent,
} from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code, isSetup } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { success: false, error: 'User ID and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().replace(/\s+/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 6-digit code.' },
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

    // Retrieve user and their 2FA factor record
    const factorRes = await db.query(
      `
      SELECT 
        f.*,
        u.email,
        u.raw_user_meta_data->>'name' as name,
        COALESCE(u.raw_user_meta_data->>'role', 'Halal Auditor') as role
      FROM public.admin_2fa_factors f
      JOIN auth.users u ON u.id = f.user_id
      WHERE f.user_id = $1
    `,
      [userId]
    );

    if (factorRes.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: '2FA has not been initialized for this account.' },
        { status: 400 }
      );
    }

    const factor = factorRes.rows[0];
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. Rate Limiting Check
    if (factor.locked_until && new Date(factor.locked_until) > new Date()) {
      const waitMinutes = Math.ceil(
        (new Date(factor.locked_until).getTime() - Date.now()) / (60 * 1000)
      );
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed verification attempts. Account 2FA is temporarily locked. Please try again in ${waitMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    // Determine if we are verifying a fresh setup/reconfiguration or a login challenge
    const isSetupVerification =
      Boolean(isSetup) ||
      (!factor.is_enabled && Boolean(factor.temp_secret_encrypted)) ||
      Boolean(factor.temp_secret_encrypted && factor.status === 'pending_setup');

    let secretToVerify = '';

    if (isSetupVerification && factor.temp_secret_encrypted) {
      try {
        secretToVerify = decryptSecret(
          factor.temp_secret_encrypted,
          factor.temp_secret_iv,
          factor.temp_secret_tag
        );
      } catch {
        return NextResponse.json(
          { success: false, error: 'Failed to decrypt pending authenticator secret.' },
          { status: 500 }
        );
      }
    } else {
      if (!factor.is_enabled || factor.status !== 'active') {
        return NextResponse.json(
          { success: false, error: '2FA is not currently enabled for this account.' },
          { status: 400 }
        );
      }
      try {
        secretToVerify = decryptSecret(
          factor.secret_encrypted,
          factor.secret_iv,
          factor.secret_tag
        );
      } catch {
        return NextResponse.json(
          { success: false, error: 'Failed to decrypt active authenticator secret.' },
          { status: 500 }
        );
      }
    }

    // Verify TOTP code with +/- 1 interval window (30-second intervals = 60-90s tolerance)
    const verification = verifyTOTP(secretToVerify, cleanCode, {
      window: 1, // accommodates up to 30-second clock skew seamlessly
      lastVerifiedStep: isSetupVerification ? null : factor.last_verified_step,
    });

    if (!verification.valid) {
      // Failed verification: increment failed attempts counter
      const newAttempts = (factor.failed_attempts || 0) + 1;
      let lockUntilSql = 'locked_until';

      if (newAttempts >= 5) {
        lockUntilSql = "NOW() + INTERVAL '5 minutes'";
        await logSecurityAuditEvent({
          eventType: '2FA_LOCKED',
          actorId: userId,
          actorEmail: factor.email,
          actorRole: factor.role,
          targetUserId: userId,
          targetUserEmail: factor.email,
          ipAddress: clientIp,
          userAgent,
          details: {
            reason: '5 consecutive failed 2FA verification attempts; locked for 5 minutes',
            attempts: newAttempts,
          },
        });
      } else {
        await logSecurityAuditEvent({
          eventType: '2FA_FAILED_ATTEMPT',
          actorId: userId,
          actorEmail: factor.email,
          actorRole: factor.role,
          targetUserId: userId,
          targetUserEmail: factor.email,
          ipAddress: clientIp,
          userAgent,
          details: {
            reason: verification.reason || 'Invalid code submitted',
            attemptNumber: newAttempts,
          },
        });
      }

      await db.query(
        `
        UPDATE public.admin_2fa_factors 
        SET 
          failed_attempts = $1,
          locked_until = ${lockUntilSql},
          updated_at = NOW()
        WHERE user_id = $2;
      `,
        [newAttempts, userId]
      );

      return NextResponse.json(
        {
          success: false,
          error:
            newAttempts >= 5
              ? 'Too many failed attempts. Account 2FA has been temporarily locked for 5 minutes.'
              : 'Invalid 6-digit code. Please verify the code in your authenticator app and try again.',
        },
        { status: 400 }
      );
    }

    // Verification SUCCESSFUL
    if (isSetupVerification) {
      // Promote temporary secret to primary active secret
      await db.query(
        `
        UPDATE public.admin_2fa_factors 
        SET 
          secret_encrypted = COALESCE(temp_secret_encrypted, secret_encrypted),
          secret_iv = COALESCE(temp_secret_iv, secret_iv),
          secret_tag = COALESCE(temp_secret_tag, secret_tag),
          temp_secret_encrypted = NULL,
          temp_secret_iv = NULL,
          temp_secret_tag = NULL,
          temp_created_at = NULL,
          is_enabled = TRUE,
          status = 'active',
          setup_at = NOW(),
          last_verified_step = $1,
          failed_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
        WHERE user_id = $2;
      `,
        [verification.matchedStep?.toString() || '0', userId]
      );

      await logSecurityAuditEvent({
        eventType: factor.is_enabled ? '2FA_RECONFIGURED' : '2FA_VERIFIED',
        actorId: userId,
        actorEmail: factor.email,
        actorRole: factor.role,
        targetUserId: userId,
        targetUserEmail: factor.email,
        ipAddress: clientIp,
        userAgent,
        details: {
          action: '2FA successfully verified and activated',
          timeStep: verification.matchedStep?.toString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Two-Factor Authentication has been successfully activated and verified.',
      });
    }

    // Login verification SUCCESSFUL: update replay step & reset counters
    await db.query(
      `
      UPDATE public.admin_2fa_factors 
      SET 
        last_verified_step = $1,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
      WHERE user_id = $2;
    `,
      [verification.matchedStep?.toString() || '0', userId]
    );

    await logSecurityAuditEvent({
      eventType: '2FA_LOGIN_SUCCESS',
      actorId: userId,
      actorEmail: factor.email,
      actorRole: factor.role,
      targetUserId: userId,
      targetUserEmail: factor.email,
      ipAddress: clientIp,
      userAgent,
      details: {
        action: '2FA login challenge verified successfully',
        timeStep: verification.matchedStep?.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      message: '2FA code verified successfully.',
    });
  } catch (err) {
    console.error('2FA verification exception:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Verification process failed.' },
      { status: 500 }
    );
  }
}

