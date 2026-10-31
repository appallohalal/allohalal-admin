import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

export async function GET() {
  try {
    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection unavailable' },
        { status: 500 }
      );
    }

    const query = `
      SELECT 
        u.id,
        u.email,
        u.raw_user_meta_data->>'name' as name,
        COALESCE(u.raw_user_meta_data->>'role', 'Halal Auditor') as role,
        u.created_at,
        u.last_sign_in_at,
        f.id as factor_id,
        COALESCE(f.is_enabled, false) as is_2fa_enabled,
        COALESCE(f.status, 'disabled') as two_factor_status,
        f.setup_at as two_factor_setup_at,
        f.failed_attempts,
        f.locked_until
      FROM auth.users u
      LEFT JOIN public.admin_2fa_factors f ON f.user_id = u.id
      WHERE COALESCE(u.raw_user_meta_data->>'account_type', 'admin') != 'mobile_user'
      ORDER BY u.created_at ASC;
    `;

    const result = await db.query(query);

    const admins = result.rows.map((row) => {
      const name = row.name || row.email?.split('@')[0] || 'Admin';
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .map((w: string) => w[0])
          .join('')
          .substring(0, 2)
          .toUpperCase() || 'AD';

      const role = row.role || 'Halal Auditor';
      // Classify role category: Admin vs Moderator
      const isRoleAdmin = role === 'Super Admin' || role === 'System Admin';
      const roleCategory: 'Admin' | 'Moderator' = isRoleAdmin ? 'Admin' : 'Moderator';

      // Status can be: 'active', 'disabled', 'pending_setup'
      let status: 'active' | 'disabled' | 'pending_setup' = row.two_factor_status;
      if (!row.factor_id) {
        status = 'disabled';
      }

      return {
        id: row.id,
        email: row.email,
        name,
        role,
        roleCategory,
        avatarInitials: initials,
        createdAt: row.created_at,
        lastSignInAt: row.last_sign_in_at,
        is2FAEnabled: Boolean(row.is_2fa_enabled && status === 'active'),
        twoFactorStatus: status,
        twoFactorSetupAt: row.two_factor_setup_at,
        isLocked: row.locked_until ? new Date(row.locked_until) > new Date() : false,
      };
    });

    const totalCount = admins.length;
    const enabledCount = admins.filter((a) => a.is2FAEnabled).length;
    const disabledCount = totalCount - enabledCount;
    const superAdminCount = admins.filter((a) => a.role === 'Super Admin').length;

    return NextResponse.json({
      success: true,
      admins,
      stats: {
        totalCount,
        enabledCount,
        disabledCount,
        superAdminCount,
        protectionRate: totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0,
      },
    });
  } catch (err: unknown) {
    console.error('Failed to fetch 2FA admin list:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

