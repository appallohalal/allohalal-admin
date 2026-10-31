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

    // 1. Fetch current Paddle API credentials and settings from AuthSettings
    let apiKey = process.env.PADDLE_API_KEY || '';
    let mode = (process.env.PADDLE_MODE || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
    let currency = 'EUR';
    let clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '';

    try {
      const { data } = await supabase
        .from('auth_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

      if (data) {
        if (data.enable_contributions === false) {
          return NextResponse.json(
            { success: false, error: 'Donations feature is currently disabled by the administrator.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.enable_paddle === false) {
          return NextResponse.json(
            { success: false, error: 'Paddle payment gateway is currently disabled by the administrator.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.paddle_api_key) {
          apiKey = data.paddle_api_key.trim();
        } else if (data.stripe_secret_key) {
          // fallback if migrated
          apiKey = data.stripe_secret_key.trim();
        }
        if (data.paddle_mode) {
          mode = data.paddle_mode === 'live' ? 'live' : 'sandbox';
        }
        if (data.paddle_currency) {
          currency = data.paddle_currency.trim().toUpperCase();
        } else if (data.stripe_currency) {
          currency = data.stripe_currency.trim().toUpperCase();
        }
        if (data.paddle_client_token) {
          clientToken = data.paddle_client_token.trim();
        }
      }
    } catch (err) {
      console.warn('Could not read Paddle settings from database, falling back to env:', err);
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Paddle API Key is not configured in Admin panel or environment variables.',
        },
        { status: 500, headers: corsHeaders() }
      );
    }

    const baseUrl =
      mode === 'sandbox'
        ? 'https://sandbox-api.paddle.com'
        : 'https://api.paddle.com';

    // Build origin for default return URLs
    const requestUrl = new URL(request.url);
    const fallbackOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
    const successUrl = clientSuccessUrl || `${fallbackOrigin}/payment-success`;
    const cancelUrl = clientCancelUrl || `${fallbackOrigin}/payment-cancelled`;

    // Amount in minor currency units (cents for EUR/USD)
    const unitAmountMinor = String(Math.round(amount * 100));

    // Create a transaction on Paddle Billing API
    const transactionPayload: Record<string, any> = {
      items: [
        {
          quantity: 1,
          price: {
            description: `Support Allo Halal Community (${currency} ${amount.toFixed(2)})`,
            name: `Community Contribution (${tier})`,
            unit_price: {
              amount: unitAmountMinor,
              currency_code: currency,
            },
            product: {
              name: 'Community Support',
              tax_category: 'standard',
            },
          },
        },
      ],
      custom_data: {
        donor_name: donorName,
        donor_email: donorEmail,
        message: message,
        tier: tier,
        source: 'Allo Halal Mobile App / Web',
      },
    };

    const paddleRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Paddle-Version': '1',
      },
      body: JSON.stringify(transactionPayload),
    });

    const session = await paddleRes.json().catch(() => ({}));

    if (!paddleRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            session.error?.detail ||
            session.error?.message ||
            'Failed to create Paddle transaction.',
        },
        { status: paddleRes.status, headers: corsHeaders() }
      );
    }

    const transactionId = session.data?.id;
    // Paddle returns checkout URL if default payment link is configured in dashboard
    let checkoutUrl = session.data?.checkout?.url;

    // Fallback: If no direct checkout.url returned by Paddle, point to our hosted Next.js checkout page
    if (!checkoutUrl && transactionId) {
      checkoutUrl = `${fallbackOrigin}/paddle/checkout?txn_id=${transactionId}&mode=${mode}&token=${encodeURIComponent(clientToken)}`;
    }

    return NextResponse.json(
      {
        success: true,
        transactionId: transactionId,
        sessionId: transactionId,
        url: checkoutUrl,
        mode: mode,
        amount,
        currency,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while initializing Paddle checkout.',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

