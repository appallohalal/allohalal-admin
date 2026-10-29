import { NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function GET() {
  try {
    const dbPool = getPool();
    if (!dbPool) {
      return NextResponse.json({ isFirstUser: false, userCount: 1 });
    }
    const res = await dbPool.query(
      "SELECT count(*)::int as count FROM auth.users WHERE COALESCE(raw_user_meta_data->>'account_type', 'admin') != 'mobile_user'"
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
