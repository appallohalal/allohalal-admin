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
    const sessionId = (body.sessionId || body.session_id || '').trim();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Fetch Stripe Secret Key
    let secretKey = process.env.STRIPE_SECRET_KEY || '';

    try {
      const { data } = await supabase
        .from('auth_settings')
        .select('stripe_secret_key')
        .eq('id', 'global')
        .maybeSingle();

      if (data?.stripe_secret_key) {
        secretKey = data.stripe_secret_key.trim();
      }
    } catch (_) {}

    // 2. Fetch session details directly from Stripe API
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const session = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: session.error?.message || 'Failed to verify session with Stripe.' },
        { status: response.status, headers: corsHeaders() }
      );
    }

    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    if (!isPaid) {
      return NextResponse.json(
        { success: false, error: 'Payment is not completed yet.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 3. Extract transaction info
    const rawAmount = session.amount_total || session.amount_subtotal || 0;
    const amount = Number((rawAmount / 100).toFixed(2));
    const currency = (session.currency || 'eur').toUpperCase();
    const transactionId = session.payment_intent || session.id;

    const donorName =
      session.metadata?.donor_name ||
      session.customer_details?.name ||
      'Community Supporter';

    const donorEmail =
      session.metadata?.donor_email ||
      session.customer_details?.email ||
      '';

    const city = session.customer_details?.address?.city;
    const country = session.customer_details?.address?.country;
    const donorLocation = [city, country].filter(Boolean).join(', ') || 'Online';

    const tier = (session.metadata?.tier || 'SERVER').toUpperCase();
    const message = session.metadata?.message || '';

    // Check if record already exists to avoid duplicates
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

    const recordId = `stripe_${session.id.slice(-8)}_${Date.now().toString(36)}`;

    // Insert record into Supabase contributions ledger
    const { error: insertError } = await supabase.from('contributions').insert({
      id: recordId,
      donor_name: donorName,
      donor_email: donorEmail,
      donor_location: donorLocation,
      amount: amount,
      currency: currency,
      tier: tier,
      payment_method: 'STRIPE',
      transaction_id: transactionId,
      message: message,
      status: 'COMPLETED',
      is_anonymous: !donorName || donorName === 'Community Supporter',
      reviewed_by: 'Stripe Direct Verification (No Webhook Required)',
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
      { success: false, error: error.message || 'Internal server error confirming payment.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

