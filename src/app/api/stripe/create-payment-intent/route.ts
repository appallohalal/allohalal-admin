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
    const currency = (body.currency || 'eur').toLowerCase();
    const donorName = (body.donorName || 'Allo Halal Supporter').trim();
    const donorEmail = (body.donorEmail || '').trim();
    const message = (body.message || '').trim();
    const tier = (body.tier || 'COMMUNITY').toUpperCase();

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid amount is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    let secretKey = process.env.STRIPE_SECRET_KEY || '';

    try {
      const { data } = await supabase
        .from('auth_settings')
        .select('stripe_secret_key, enable_stripe, enable_contributions')
        .eq('id', 'global')
        .maybeSingle();

      if (data) {
        if (data.enable_contributions === false || data.enable_stripe === false) {
          return NextResponse.json(
            { success: false, error: 'Stripe payments are disabled.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.stripe_secret_key && data.stripe_secret_key.trim().length > 0) {
          secretKey = data.stripe_secret_key.trim();
        }
      }
    } catch (_) {}

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe Secret Key is not configured.' },
        { status: 500, headers: corsHeaders() }
      );
    }

    const unitAmountCents = Math.round(amount * 100);

    const params = new URLSearchParams();
    params.append('amount', unitAmountCents.toString());
    params.append('currency', currency);
    params.append('automatic_payment_methods[enabled]', 'true');
    params.append('description', `Contribution Allo Halal (${tier})`);
    if (donorEmail) params.append('receipt_email', donorEmail);
    params.append('metadata[donor_name]', donorName);
    params.append('metadata[tier]', tier);
    params.append('metadata[message]', message);

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const paymentIntent = await stripeRes.json().catch(() => ({}));

    if (!stripeRes.ok) {
      return NextResponse.json(
        { success: false, error: paymentIntent.error?.message || 'Failed to create PaymentIntent.' },
        { status: stripeRes.status, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error creating payment intent.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

