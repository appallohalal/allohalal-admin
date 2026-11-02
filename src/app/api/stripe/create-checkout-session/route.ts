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
    const amount = Number(body.amount);
    const donorName = (body.donorName || 'Allo Halal Supporter').trim();
    const donorEmail = (body.donorEmail || '').trim();
    const message = (body.message || '').trim();
    const tier = (body.tier || 'COMMUNITY').toUpperCase();
    const clientSuccessUrl = body.successUrl || body.returnUrl;
    const clientCancelUrl = body.cancelUrl;

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid contribution amount is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 1. Fetch Stripe API credentials from Supabase auth_settings
    let secretKey = process.env.STRIPE_SECRET_KEY || '';
    let currency = 'eur';

    try {
      const { data } = await supabase
        .from('auth_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

      if (data) {
        if (data.enable_contributions === false) {
          return NextResponse.json(
            { success: false, error: 'Donations are currently disabled by the administrator.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.enable_stripe === false) {
          return NextResponse.json(
            { success: false, error: 'Stripe payments are currently disabled.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.stripe_secret_key && data.stripe_secret_key.trim().length > 0) {
          secretKey = data.stripe_secret_key.trim();
        }
        if (data.stripe_currency) {
          currency = data.stripe_currency.trim().toLowerCase();
        }
      }
    } catch (err) {
      console.warn('Could not read Stripe settings from database, using env:', err);
    }

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe Secret Key is not configured in Admin panel or environment variables.',
        },
        { status: 500, headers: corsHeaders() }
      );
    }

    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;
    const successUrl = clientSuccessUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&provider=stripe`;
    const cancelUrl = clientCancelUrl || `${origin}/payment-cancelled?provider=stripe`;

    const unitAmountCents = Math.round(amount * 100);

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', currency);
    params.append('line_items[0][price_data][unit_amount]', unitAmountCents.toString());
    params.append('line_items[0][price_data][product_data][name]', `Soutien Communautaire Allo Halal (${tier})`);
    params.append('line_items[0][price_data][product_data][description]', message || 'Contribution libre pour soutenir les serveurs et le développement d\'Allo Halal');
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    if (donorEmail) {
      params.append('customer_email', donorEmail);
    }
    params.append('client_reference_id', `don_${Date.now()}`);
    params.append('metadata[donor_name]', donorName);
    params.append('metadata[donor_email]', donorEmail);
    params.append('metadata[tier]', tier);
    params.append('metadata[message]', message);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json().catch(() => ({}));

    if (!stripeRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: session.error?.message || 'Failed to create Stripe Checkout session.',
        },
        { status: stripeRes.status, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        transactionId: session.id,
        url: session.url,
        amount,
        currency,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while initializing Stripe checkout.',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

