import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendRegistrationWelcomeEmail } from '@/lib/email';
import { getDbPool, ensure2FATables } from '@/lib/totp';

const getPool = getDbPool;

// GET all admin team users
export async function GET() {
  try {
    const dbPool = getDbPool();
    if (!dbPool) {
      return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    // Ensure 2FA tables exist before querying
    await ensure2FATables(dbPool);

    let res;
    try {
      res = await dbPool.query(`
        SELECT 
          u.id,
          u.email,
          u.raw_user_meta_data->>'name' as name,
          COALESCE(u.raw_user_meta_data->>'role', 'Halal Auditor') as role,
          u.created_at,
          u.last_sign_in_at,
          (
            EXISTS(
              SELECT 1 FROM public.admin_2fa_factors af 
              WHERE af.user_id = u.id AND af.is_enabled = TRUE AND af.status = 'active'
            )
            OR EXISTS(
              SELECT 1 FROM auth.mfa_factors f 
              WHERE f.user_id = u.id AND f.status = 'verified'
            )
          ) as is_2fa_enabled
        FROM auth.users u
        WHERE COALESCE(u.raw_user_meta_data->>'account_type', 'admin') != 'mobile_user'
        ORDER BY u.created_at ASC;
      `);
    } catch (queryErr: any) {
      // If table still doesn't exist, fallback query without admin_2fa_factors join
      if (queryErr.code === '42P01' || queryErr.message?.includes('admin_2fa_factors')) {
        res = await dbPool.query(`
          SELECT 
            u.id,
            u.email,
            u.raw_user_meta_data->>'name' as name,
            COALESCE(u.raw_user_meta_data->>'role', 'Halal Auditor') as role,
            u.created_at,
            u.last_sign_in_at,
            EXISTS(
              SELECT 1 FROM auth.mfa_factors f 
              WHERE f.user_id = u.id AND f.status = 'verified'
            ) as is_2fa_enabled
          FROM auth.users u
          WHERE COALESCE(u.raw_user_meta_data->>'account_type', 'admin') != 'mobile_user'
          ORDER BY u.created_at ASC;
        `);
      } else {
        throw queryErr;
      }
    }

    const admins = res.rows.map((row) => {
      const name = row.name || row.email?.split('@')[0] || 'Admin';
      const initials = name
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'AD';

      return {
        id: row.id,
        email: row.email,
        name,
        role: row.role,
        avatarInitials: initials,
        createdAt: row.created_at,
        lastSignInAt: row.last_sign_in_at,
        is2FAEnabled: Boolean(row.is_2fa_enabled),
      };
    });

    return NextResponse.json({ success: true, admins });
  } catch (err: any) {
    console.error('Failed to fetch admin users:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST create / invite new admin user
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const assignedRole = role || 'Halal Auditor';

    // 1. Create account via Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          role: assignedRole,
          account_type: 'admin',
        },
      },
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // 2. Auto-confirm email so they can log in immediately
    const dbPool = getPool();
    if (dbPool) {
      await dbPool.query(`
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = jsonb_set(
              jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb($1::text)),
              '{name}', to_jsonb($2::text)
            )
        WHERE email = $3;
      `, [assignedRole, name.trim(), email.trim().toLowerCase()]);
    }

    // 3. Send transactional welcome email if SMTP is configured
    try {
      const originUrl = new URL(req.url).origin;
      await sendRegistrationWelcomeEmail({
        name: name.trim(),
        username: name.trim().toLowerCase().replace(/\s+/g, '.'),
        email: email.trim().toLowerCase(),
        password,
        country: assignedRole,
        city: 'Admin Panel',
        originUrl,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: data.user?.id,
        email,
        name,
        role: assignedRole,
      },
    });
  } catch (err: any) {
    console.error('Failed to create admin user:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH update admin user role or name, or reset 2FA
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, role, name, action } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const dbPool = getPool();
    if (!dbPool) {
      return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    // Reset 2FA action for Super Admin
    if (action === 'reset_2fa') {
      await dbPool.query(`
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
          failed_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
        WHERE user_id = $1;
      `, [id]);
      await dbPool.query('DELETE FROM auth.mfa_factors WHERE user_id = $1;', [id]).catch(() => {});
      return NextResponse.json({ success: true, message: '2FA has been successfully reset for this admin user.' });
    }

    let query = '';
    let params: any[] = [];

    if (role && name) {
      query = `
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(
          jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb($1::text)),
          '{name}', to_jsonb($2::text)
        )
        WHERE id = $3;
      `;
      params = [role, name, id];
    } else if (role) {
      query = `
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb($1::text))
        WHERE id = $2;
      `;
      params = [role, id];
    } else if (name) {
      query = `
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', to_jsonb($1::text))
        WHERE id = $2;
      `;
      params = [name, id];
    }

    if (query) {
      await dbPool.query(query, params);
    }

    return NextResponse.json({ success: true, message: 'Admin updated successfully' });
  } catch (err: any) {
    console.error('Failed to update admin user:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE admin user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const dbPool = getPool();
    if (!dbPool) {
      return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    // Safety check: Prevent deleting the last Super Admin
    const countRes = await dbPool.query(`
      SELECT count(*)::int as count 
      FROM auth.users 
      WHERE COALESCE(raw_user_meta_data->>'role', '') = 'Super Admin';
    `);

    const userRes = await dbPool.query(`
      SELECT COALESCE(raw_user_meta_data->>'role', '') as role 
      FROM auth.users 
      WHERE id = $1;
    `, [id]);

    const isTargetSuperAdmin = userRes.rows[0]?.role === 'Super Admin';
    if (isTargetSuperAdmin && (countRes.rows[0]?.count || 0) <= 1) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete the only remaining Super Admin account.',
      }, { status: 400 });
    }

    await dbPool.query('DELETE FROM auth.users WHERE id = $1;', [id]);

    return NextResponse.json({ success: true, message: 'Admin deleted successfully' });
  } catch (err: any) {
    console.error('Failed to delete admin user:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
