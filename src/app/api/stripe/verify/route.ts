import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const secretKey = (body.secretKey || '').trim();

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe Secret Key is required to verify connection.' },
        { status: 400 }
      );
    }

    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Stripe Secret Key format. It must begin with "sk_test_" or "sk_live_".',
        },
        { status: 400 }
      );
    }

    // Direct Stripe API call using native fetch (zero external library dependency)
    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error?.message || 'Stripe rejected the secret API key.',
        },
        { status: response.status }
      );
    }

    const available = data.available?.[0] || {};
    const currency = (available.currency || 'eur').toUpperCase();

    return NextResponse.json({
      success: true,
      mode: data.livemode ? 'live' : 'test',
      currency,
      message: `Connection successful! Stripe account authenticated in ${
        data.livemode ? 'LIVE' : 'TEST'
      } mode.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify Stripe connection.' },
      { status: 500 }
    );
  }
}

