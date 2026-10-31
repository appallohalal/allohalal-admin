import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const transactionId = (
      body.transactionId ||
      body.transaction_id ||
      body.sessionId ||
      body.session_id ||
      body.txn_id ||
      ''
    ).trim();

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Fetch Paddle API credentials
    let apiKey = process.env.PADDLE_API_KEY || '';
    let mode = (process.env.PADDLE_MODE || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';

    try {
      const { data } = await supabase
        .from('auth_settings')
        .select('paddle_api_key, paddle_mode, stripe_secret_key')
        .eq('id', 'global')
        .maybeSingle();

      if (data?.paddle_api_key) {
        apiKey = data.paddle_api_key.trim();
      } else if (data?.stripe_secret_key) {
        apiKey = data.stripe_secret_key.trim();
      }
      if (data?.paddle_mode) {
        mode = data.paddle_mode === 'live' ? 'live' : 'sandbox';
      }
    } catch (_) {}

    const baseUrl =
      mode === 'sandbox'
        ? 'https://sandbox-api.paddle.com'
        : 'https://api.paddle.com';

    // 2. Fetch transaction details directly from Paddle Billing API
    const response = await fetch(`${baseUrl}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Paddle-Version': '1',
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data.error?.detail ||
            data.error?.message ||
            'Failed to verify transaction with Paddle.',
        },
        { status: response.status, headers: corsHeaders() }
      );
    }

    const txn = data.data;
    const status = txn?.status; // 'billed', 'paid', 'completed', etc.
    const isPaid = status === 'paid' || status === 'completed' || status === 'billed';

    if (!isPaid) {
      return NextResponse.json(
        {
          success: false,
          status: status || 'pending',
          error: `Transaction status is '${status}'. Payment is not finalized yet.`,
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 3. Extract transaction details
    const totals = txn.details?.totals;
    const rawTotal = totals?.total ? Number(totals.total) : (totals?.subtotal ? Number(totals.subtotal) : 0);
    // Paddle returns minor units (e.g. 500 = 5.00) in totals or formatted string
    const amount = Number((rawTotal / 100).toFixed(2));
    const currency = (txn.currency_code || 'EUR').toUpperCase();

    const customData = txn.custom_data || {};
    const donorName =
      customData.donor_name ||
      txn.customer?.name ||
      'Community Supporter';

    const donorEmail =
      customData.donor_email ||
      txn.customer?.email ||
      '';

    const city = txn.address?.city;
    const country = txn.address?.country_code;
    const donorLocation = [city, country].filter(Boolean).join(', ') || 'Online';

    const tier = (customData.tier || 'SERVER').toUpperCase();
    const message = customData.message || 'Free-will Community Contribution';

    // 4. Check if record already exists to avoid duplicates
    const { data: existing } = await supabase
      .from('contributions')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: true, message: 'Contribution already recorded.', id: existing.id },
        { headers: corsHeaders() }
      );
    }

    const recordId = `pdl_${transactionId.slice(-10)}_${Date.now().toString(36)}`;

    // Insert record into Supabase contributions ledger
    const { error: insertError } = await supabase.from('contributions').insert({
      id: recordId,
      donor_name: donorName,
      donor_email: donorEmail,
      donor_location: donorLocation,
      amount: amount,
      currency: currency,
      tier: tier,
      payment_method: 'PADDLE',
      transaction_id: transactionId,
      message: message,
      status: 'COMPLETED',
      is_anonymous: !donorName || donorName === 'Community Supporter',
      reviewed_by: 'Paddle Direct Verification (No Webhook Required)',
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.warn('Could not insert contribution to Supabase, but payment verified:', insertError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payment verified and contribution recorded successfully.',
        contribution: {
          id: recordId,
          amount,
          currency,
          donorName,
          transactionId,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while confirming Paddle payment.',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

