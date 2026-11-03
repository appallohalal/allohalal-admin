import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

export async function GET() {
  try {
    const dbPool = getDbPool();
    if (!dbPool) {
      return NextResponse.json({ isFirstUser: false, userCount: 1 });
    }

    // Purge legacy placeholder user if present
    try {
      await dbPool.query("DELETE FROM auth.users WHERE LOWER(email) = 'halallens@softsync.agency'");
    } catch (_) {}

    const res = await dbPool.query(
      "SELECT count(*)::int as count FROM auth.users WHERE COALESCE(raw_user_meta_data->>'account_type', 'admin') != 'mobile_user' AND LOWER(email) != 'halallens@softsync.agency'"
    );
    const userCount = res.rows[0]?.count || 0;
    return NextResponse.json({
      isFirstUser: userCount === 0,
      userCount,
    });
  } catch (err: any) {
    console.error('Failed to query user count:', err.message);
    return NextResponse.json({ isFirstUser: false, userCount: 1 });
  }
}
