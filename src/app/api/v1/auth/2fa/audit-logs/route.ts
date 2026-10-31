import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const targetUserId = searchParams.get('targetUserId');

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection unavailable' },
        { status: 500 }
      );
    }

    let query = `
      SELECT 
        id,
        event_type,
        actor_id,
        actor_email,
        actor_role,
        target_user_id,
        target_user_email,
        ip_address,
        user_agent,
        details,
        created_at
      FROM public.security_audit_logs
    `;

    const params: (string | number)[] = [];
    if (targetUserId) {
      query += ` WHERE target_user_id = $1 `;
      params.push(targetUserId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1};`;
    params.push(limit);

    const res = await db.query(query, params);

    return NextResponse.json({
      success: true,
      logs: res.rows,
    });
  } catch (err: unknown) {
    console.error('Failed to fetch security audit logs:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error loading security logs' },
      { status: 500 }
    );
  }
}

