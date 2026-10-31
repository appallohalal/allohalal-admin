import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: 'User ID or email is required.' },
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

    let query = '';
    let params: string[] = [];

    if (userId) {
      query = `
        SELECT f.id, f.is_enabled, f.status, f.setup_at, f.locked_until
        FROM public.admin_2fa_factors f
        WHERE f.user_id = $1
      `;
      params = [userId];
    } else {
      query = `
        SELECT f.id, f.is_enabled, f.status, f.setup_at, f.locked_until
        FROM public.admin_2fa_factors f
        JOIN auth.users u ON u.id = f.user_id
        WHERE LOWER(u.email) = LOWER($1)
      `;
      params = [email as string];
    }

    const res = await db.query(query, params);

    if (res.rowCount === 0) {
      return NextResponse.json({
        success: true,
        isEnabled: false,
        status: 'disabled',
        setupAt: null,
      });
    }

    const row = res.rows[0];
    const isLocked = row.locked_until ? new Date(row.locked_until) > new Date() : false;

    return NextResponse.json({
      success: true,
      isEnabled: Boolean(row.is_enabled && row.status === 'active'),
      status: row.status,
      setupAt: row.setup_at,
      isLocked,
    });
  } catch (err: unknown) {
    console.error('2FA status check error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error checking 2FA status' },
      { status: 500 }
    );
  }
}

