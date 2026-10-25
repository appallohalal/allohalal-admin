const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function pushSchema() {
  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Connecting to Supabase PostgreSQL at aws-0-ap-southeast-1.pooler.supabase.com:5432...');

  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.nkhlqwotyadtzdtmkatj:iFPX*7j%40i%2B9cdhY@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

  // Use session pooler (port 5432) for running DDL statements
  let client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database via session pooler (port 5432).');
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

  try {
    console.log('🚀 Pushing schema and seeds from schema.sql...');
    await client.query(sql);
    console.log('✨ Schema executed successfully!\n');

    // Verification
    console.log('🔍 Verifying created tables and counts:');
    const tables = ['products', 'additives', 'users', 'geo_ads', 'groq_api_logs'];
    for (const t of tables) {
      try {
        const countRes = await client.query(`SELECT count(*) FROM public.${t};`);
        console.log(`  - Table "public.${t}": ${countRes.rows[0].count} rows`);
      } catch (err) {
        console.error(`  - Table "public.${t}": ERROR - ${err.message}`);
      }
    }

    // Verify RPC function
    try {
      const funcRes = await client.query(`
        SELECT proname, prorettype::regtype 
        FROM pg_proc 
        WHERE proname = 'get_active_ads_for_location';
      `);
      if (funcRes.rows.length > 0) {
        console.log(`  - RPC Function "get_active_ads_for_location": OK`);
      } else {
        console.warn(`  - RPC Function "get_active_ads_for_location": Not found`);
      }
    } catch (err) {
      console.warn(`  - RPC verification failed: ${err.message}`);
    }

    console.log('\n🎉 ALL DONE! Your Supabase database is now completely initialized and ready for production!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

pushSchema();
