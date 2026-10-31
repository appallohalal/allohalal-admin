import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkqovvoarufmawtosfbi.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_hUN6voInwirFJLjhmee8fg_t1THznkJ';

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch Paddle Settings from Supabase auth_settings
    let apiKey = process.env.PADDLE_API_KEY || '';
    let mode = process.env.PADDLE_MODE || 'sandbox';

    const { data: authData } = await supabase
      .from('auth_settings')
      .select('paddle_api_key, paddle_mode')
      .eq('id', 'global')
      .maybeSingle();

    if (authData?.paddle_api_key && authData.paddle_api_key.trim().startsWith('pdl_')) {
      apiKey = authData.paddle_api_key.trim();
    }
    if (authData?.paddle_mode) {
      mode = authData.paddle_mode === 'live' ? 'live' : 'sandbox';
    }

    const baseUrl = mode === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';

    // 2. Query Paddle API for real transactions
    const paddleRes = await fetch(`${baseUrl}/transactions?per_page=50&order_by=created_at[DESC]`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Paddle-Version': '1',
      },
      cache: 'no-store',
    });

    if (!paddleRes.ok) {
      const errText = await paddleRes.text().catch(() => '');
      return NextResponse.json(
        { success: false, error: `Paddle API responded with HTTP ${paddleRes.status}`, details: errText },
        { status: paddleRes.status, headers: corsHeaders() }
      );
    }

    const paddleData = await paddleRes.json();
    const transactions: any[] = paddleData.data || [];

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // 3. Sync each transaction into Supabase contributions
    for (const txn of transactions) {
      const txnId = txn.id;
      if (!txnId) continue;

      const rawStatus = String(txn.status || '').toLowerCase();
      // Only process completed, paid, or billed transactions (or draft if needed)
      const isCompleted = rawStatus === 'completed' || rawStatus === 'paid' || rawStatus === 'billed';
      const status = isCompleted ? 'COMPLETED' : (rawStatus === 'draft' ? 'PENDING' : 'REFUNDED');

      // Amount calculation
      const totals = txn.details?.totals;
      const rawTotal = totals?.total ? Number(totals.total) : (totals?.subtotal ? Number(totals.subtotal) : 0);
      const amount = rawTotal > 0 ? Number((rawTotal / 100).toFixed(2)) : 0;
      const currency = (txn.currency_code || 'EUR').toUpperCase();

      const customData = txn.custom_data || {};
      const donorName = customData.donor_name || 'Allo Halal Mobile Supporter';
      const donorEmail = customData.donor_email || '';
      const tier = (customData.tier || (amount <= 2 ? 'COFFEE' : amount <= 5 ? 'SERVER' : 'GROWTH')).toUpperCase();
      const message = customData.message || 'Paddle Community Contribution';

      // Check if already in Supabase
      const { data: existing } = await supabase
        .from('contributions')
        .select('id, status')
        .eq('transaction_id', txnId)
        .maybeSingle();

      if (existing) {
        // Update status if it changed
        if (existing.status !== status) {
          await supabase
            .from('contributions')
            .update({ status })
            .eq('id', existing.id);
          updatedCount++;
        }
      } else if (isCompleted) {
        // Insert new completed transaction
        const recordId = `pdl_${txnId.slice(-10)}_${Date.now().toString(36)}`;
        const { error: insertErr } = await supabase.from('contributions').insert({
          id: recordId,
          donor_name: donorName,
          donor_email: donorEmail,
          donor_location: 'Online',
          amount: amount,
          currency: currency,
          tier: tier,
          payment_method: 'PADDLE',
          transaction_id: txnId,
          message: message,
          status: 'COMPLETED',
          is_anonymous: false,
          reviewed_by: 'Paddle API Live Sync',
          created_at: txn.created_at || new Date().toISOString(),
        });

        if (!insertErr) {
          createdCount++;
        }
      }
      syncedCount++;
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully synchronized ${syncedCount} Paddle transactions. (${createdCount} new imported, ${updatedCount} updated).`,
        totalPaddleTransactions: transactions.length,
        createdCount,
        updatedCount,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('[Paddle Sync] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error syncing Paddle transactions' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

