const { Client } = require('pg');

async function migrateAuthSettings() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres.nkhlqwotyadtzdtmkatj:iFPX*7j%40i%2B9cdhY@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

  let client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL.');
  } catch (err) {
    console.log(`Port 5432 failed (${err.message}). Trying transaction pooler (port 6543)...`);
    client = new Client({
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.nkhlqwotyadtzdtmkatj',
      password: 'iFPX*7j@i+9cdhY',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    await client.connect();
    console.log('✅ Connected to database via transaction pooler (port 6543).');
  }

  const sql = `
    -- 1. Create auth_settings table for Force User Authentication / Mandatory Account Creation toggle
    CREATE TABLE IF NOT EXISTS public.auth_settings (
      id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
      force_user_auth BOOLEAN DEFAULT FALSE,
      allow_guest_scan BOOLEAN DEFAULT TRUE,
      require_email_verification BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by VARCHAR(128) DEFAULT 'Admin'
    );

    ALTER TABLE public.auth_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for auth_settings" ON public.auth_settings;
    CREATE POLICY "Allow all for auth_settings" ON public.auth_settings FOR ALL USING (true) WITH CHECK (true);

    INSERT INTO public.auth_settings (id, force_user_auth, allow_guest_scan)
    VALUES ('global', false, true)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Enhance public.users with registration fields: city, username, password_hash
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city VARCHAR(128) DEFAULT '';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(128);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    
    -- Relax device_id NOT NULL if present to support email-registered users
    ALTER TABLE public.users ALTER COLUMN device_id DROP NOT NULL;
    DROP INDEX IF EXISTS idx_users_device;
    CREATE INDEX IF NOT EXISTS idx_users_device ON public.users(device_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
  `;

  try {
    console.log('Applying auth_settings migration & user fields...');
    await client.query(sql);
    const res = await client.query('SELECT * FROM public.auth_settings WHERE id = $1', ['global']);
    console.log('✅ auth_settings row verified:', res.rows[0]);
    console.log('✅ public.users schema updated with city, username, password_hash.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateAuthSettings();
