const { Client } = require('pg');

async function migrateAdmob() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.nkhlqwotyadtzdtmkatj:iFPX*7j%40i%2B9cdhY@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

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
    CREATE TABLE IF NOT EXISTS public.admob_settings (
      id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
      
      -- Master & Mode Switches
      ads_enabled BOOLEAN DEFAULT FALSE,
      test_mode BOOLEAN DEFAULT TRUE,
      
      -- Format Toggles
      banner_enabled BOOLEAN DEFAULT TRUE,
      interstitial_enabled BOOLEAN DEFAULT TRUE,
      app_open_enabled BOOLEAN DEFAULT TRUE,
      native_enabled BOOLEAN DEFAULT TRUE,
      rewarded_enabled BOOLEAN DEFAULT FALSE,
      
      -- Frequency & Capping
      interstitial_interval_scans INTEGER DEFAULT 3,
      app_open_cooldown_minutes INTEGER DEFAULT 15,
      banner_refresh_rate_seconds INTEGER DEFAULT 60,
      
      -- Production IDs: Android
      android_app_id VARCHAR(128) DEFAULT '',
      android_banner_id VARCHAR(128) DEFAULT '',
      android_interstitial_id VARCHAR(128) DEFAULT '',
      android_app_open_id VARCHAR(128) DEFAULT '',
      android_native_id VARCHAR(128) DEFAULT '',
      android_rewarded_id VARCHAR(128) DEFAULT '',

      -- Production IDs: iOS
      ios_app_id VARCHAR(128) DEFAULT '',
      ios_banner_id VARCHAR(128) DEFAULT '',
      ios_interstitial_id VARCHAR(128) DEFAULT '',
      ios_app_open_id VARCHAR(128) DEFAULT '',
      ios_native_id VARCHAR(128) DEFAULT '',
      ios_rewarded_id VARCHAR(128) DEFAULT '',

      -- Google Official Test IDs
      test_android_app_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544~3347511713',
      test_android_banner_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/6300978111',
      test_android_interstitial_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/1033173712',
      test_android_app_open_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/9257395921',
      test_android_native_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/2247696110',
      test_android_rewarded_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/5224354917',

      test_ios_app_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544~1458002511',
      test_ios_banner_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/2934735716',
      test_ios_interstitial_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/4411468910',
      test_ios_app_open_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/5575463023',
      test_ios_native_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/3986624511',
      test_ios_rewarded_id VARCHAR(128) DEFAULT 'ca-app-pub-3940256099942544/1712485313',

      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by VARCHAR(128) DEFAULT 'Admin'
    );

    ALTER TABLE public.admob_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for admob_settings" ON public.admob_settings;
    CREATE POLICY "Allow all for admob_settings" ON public.admob_settings FOR ALL USING (true) WITH CHECK (true);

    INSERT INTO public.admob_settings (id, ads_enabled, test_mode)
    VALUES ('global', false, true)
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    console.log('Creating admob_settings table...');
    await client.query(sql);
    const res = await client.query('SELECT * FROM public.admob_settings WHERE id = $1', ['global']);
    console.log('✅ admob_settings row verified:', res.rows[0]);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateAdmob();
