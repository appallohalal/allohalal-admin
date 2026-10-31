import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import {
  getDbPool,
  ensure2FATables,
  generateBase32Secret,
  encryptSecret,
  getAuthenticatorUri,
  logSecurityAuditEvent,
} from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, actorId, actorEmail, actorRole } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'User ID and email are required for 2FA setup.' },
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

    // Verify user exists in auth.users
    const userRes = await db.query(
      `SELECT id, email, raw_user_meta_data->>'name' as name, raw_user_meta_data->>'role' as role FROM auth.users WHERE id = $1`,
      [userId]
    );

    if (userRes.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found in system.' },
        { status: 404 }
      );
    }

    const targetUser = userRes.rows[0];

    // Generate fresh cryptographically secure Base32 secret
    const secret = generateBase32Secret(20);
    const issuer = 'Allo Halal Admin';
    const uri = getAuthenticatorUri(secret, targetUser.email || email, issuer);

    // Generate high quality QR code data URL
    const qrCode = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    // Encrypt the temporary secret at rest
    const { encrypted, iv, tag } = encryptSecret(secret);

    // Upsert into admin_2fa_factors with temporary secret
    await db.query(
      `
      INSERT INTO public.admin_2fa_factors (
        user_id,
        secret_encrypted,
        secret_iv,
        secret_tag,
        is_enabled,
        status,
        temp_secret_encrypted,
        temp_secret_iv,
        temp_secret_tag,
        temp_created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, false, 'pending_setup', $2, $3, $4, NOW(), NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        temp_secret_encrypted = EXCLUDED.temp_secret_encrypted,
        temp_secret_iv = EXCLUDED.temp_secret_iv,
        temp_secret_tag = EXCLUDED.temp_secret_tag,
        temp_created_at = NOW(),
        updated_at = NOW();
    `,
      [userId, encrypted, iv, tag]
    );

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await logSecurityAuditEvent({
      eventType: '2FA_ENROLLED',
      actorId: actorId || userId,
      actorEmail: actorEmail || email,
      actorRole: actorRole || targetUser.role,
      targetUserId: userId,
      targetUserEmail: targetUser.email || email,
      ipAddress: clientIp,
      userAgent,
      details: {
        action: 'Setup initialized; pending code verification',
      },
    });

    return NextResponse.json({
      success: true,
      secret,
      qrCode,
      uri,
    });
  } catch (err: unknown) {
    console.error('2FA setup error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to initialize 2FA setup.' },
      { status: 500 }
    );
  }
}

