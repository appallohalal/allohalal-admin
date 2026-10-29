import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Enable CORS for mobile application requests
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

    // 1. Fetch current Stripe Secret Key and currency from AuthSettings
    let secretKey = process.env.STRIPE_SECRET_KEY || '';
    let currency = 'eur';

    try {
      const { data } = await supabase
        .from('auth_settings')
        .select('stripe_secret_key, stripe_currency, enable_stripe, enable_contributions')
        .eq('id', 'global')
        .maybeSingle();

      if (data) {
        if (data.enable_contributions === false) {
          return NextResponse.json(
            { success: false, error: 'Donations feature is currently disabled by the administrator.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.enable_stripe === false) {
          return NextResponse.json(
            { success: false, error: 'Stripe payments are currently disabled by the administrator.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.stripe_secret_key) {
          secretKey = data.stripe_secret_key.trim();
        }
        if (data.stripe_currency) {
          currency = data.stripe_currency.trim().toLowerCase();
        }
      }
    } catch (err) {
      console.warn('Could not read Stripe secret from database, falling back to env:', err);
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

    // Build origin for default return URLs
    const requestUrl = new URL(request.url);
    const fallbackOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
    const successUrl = clientSuccessUrl || `${fallbackOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = clientCancelUrl || `${fallbackOrigin}/payment-cancelled`;

    // Amount in Stripe cents / smallest unit
    const unitAmount = Math.round(amount * 100);

    // Form encoded params for Stripe REST API
    const params = new URLSearchParams();
    params.append('payment_method_types[0]', 'card');
    params.append('mode', 'payment');
    params.append('line_items[0][price_data][currency]', currency);
    params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
    params.append('line_items[0][price_data][product_data][name]', `Allo Halal Community Support (€${amount})`);
    params.append(
      'line_items[0][price_data][product_data][description]',
      'Ethical Halal Verification, Server Sustainability & Solidarity'
    );
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);

    if (donorEmail) {
      params.append('customer_email', donorEmail);
    }

    // Metadata for tracking
    params.append('metadata[donor_name]', donorName);
    if (donorEmail) params.append('metadata[donor_email]', donorEmail);
    if (message) params.append('metadata[message]', message);
    params.append('metadata[tier]', tier);
    params.append('metadata[source]', 'Allo Halal Mobile App / Web');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

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
        url: session.url,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error creating checkout session.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

