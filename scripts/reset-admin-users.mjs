import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually to ensure values are read without external dependency
const envPath = path.resolve(process.cwd(), '.env.local');
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.replace('DATABASE_URL=', '').trim();
      if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
        dbUrl = dbUrl.slice(1, -1);
      }
      break;
    }
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in environment or .env.local');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connecting to database...');
    
    // 1. Fetch current admin users
    const currentAdmins = await client.query(`
      SELECT 
        id, 
        email, 
        raw_user_meta_data->>'name' as name,
        COALESCE(raw_user_meta_data->>'role', 'Halal Auditor') as role,
        created_at
      FROM auth.users
      WHERE COALESCE(raw_user_meta_data->>'account_type', 'admin') != 'mobile_user'
      ORDER BY created_at ASC;
    `);

    console.log(`Found ${currentAdmins.rows.length} admin user(s):`);
    currentAdmins.rows.forEach((u, i) => {
      console.log(` [${i + 1}] ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Name: ${u.name}`);
    });

    if (currentAdmins.rows.length === 0) {
      console.log('No admin users found in database. Initial setup is already active.');
      return;
    }

    const adminIds = currentAdmins.rows.map(r => r.id);

    console.log('\nCleaning up admin 2FA and security tables...');
    try {
      const res2fa = await client.query(`
        DELETE FROM public.admin_2fa_factors 
        WHERE user_id = ANY($1::uuid[])
      `, [adminIds]);
      console.log(`Deleted ${res2fa.rowCount || 0} record(s) from admin_2fa_factors.`);
    } catch (e) {
      console.log('admin_2fa_factors table clean-up note:', e.message);
    }

    try {
      const resAudit = await client.query(`
        DELETE FROM public.security_audit_logs 
        WHERE target_user_id = ANY($1::uuid[]) OR actor_id = ANY($1::uuid[])
      `, [adminIds]);
      console.log(`Deleted ${resAudit.rowCount || 0} record(s) from security_audit_logs.`);
    } catch (e) {
      console.log('security_audit_logs table clean-up note:', e.message);
    }

    // 2. Delete admin users from auth.users
    console.log('\nDeleting admin users from auth.users...');
    const delRes = await client.query(`
      DELETE FROM auth.users
      WHERE id = ANY($1::uuid[])
    `, [adminIds]);
    console.log(`Successfully removed ${delRes.rowCount || 0} admin user(s).`);

    // 3. Verify status
    const statusRes = await client.query(`
      SELECT count(*)::int as count 
      FROM auth.users 
      WHERE COALESCE(raw_user_meta_data->>'account_type', 'admin') != 'mobile_user';
    `);
    const remainingCount = statusRes.rows[0]?.count || 0;
    console.log(`\nRemaining admin users count: ${remainingCount}`);
    if (remainingCount === 0) {
      console.log('SUCCESS: All admin users and Super Admin data removed. Initial setup (Create Super Admin) is now active!');
    } else {
      console.warn(`WARNING: ${remainingCount} admin users still remain.`);
    }

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

