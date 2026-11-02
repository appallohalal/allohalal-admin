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

    // 1. Fetch PayPal API credentials from Supabase auth_settings
    let clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    let secretKey = process.env.PAYPAL_SECRET_KEY || '';
    let mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
    let currency = 'EUR';
    let paypalMe = process.env.NEXT_PUBLIC_PAYPAL_ME_URL || '';

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
        if (data.enable_paypal === false) {
          return NextResponse.json(
            { success: false, error: 'PayPal payments are currently disabled.' },
            { status: 403, headers: corsHeaders() }
          );
        }
        if (data.paypal_client_id && data.paypal_client_id.trim().length > 0) {
          clientId = data.paypal_client_id.trim();
        }
        if (data.paypal_secret_key && data.paypal_secret_key.trim().length > 0) {
          secretKey = data.paypal_secret_key.trim();
        }
        if (data.paypal_mode) {
          mode = data.paypal_mode === 'live' ? 'live' : 'sandbox';
        }
        if (data.paypal_currency) {
          currency = data.paypal_currency.trim().toUpperCase();
        }
        if (data.paypal_me_url) {
          paypalMe = data.paypal_me_url.trim();
        }
      }
    } catch (err) {
      console.warn('Could not read PayPal settings from database, using env:', err);
    }

    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;
    const successUrl = clientSuccessUrl || `${origin}/payment-success?provider=paypal`;
    const cancelUrl = clientCancelUrl || `${origin}/payment-cancelled?provider=paypal`;

    // If client ID and secret are present, create an official PayPal Order via REST API
    if (clientId && secretKey) {
      const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      // 1. Get access token
      const authHeader = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.access_token) {
        return NextResponse.json(
          {
            success: false,
            error: tokenData.error_description || 'Failed to authenticate with PayPal API.',
          },
          { status: tokenRes.status || 500, headers: corsHeaders() }
        );
      }

      const accessToken = tokenData.access_token;

      // 2. Create order
      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: `don_${Date.now()}`,
              description: `Soutien Communautaire Allo Halal (${tier})`,
              amount: {
                currency_code: currency,
                value: amount.toFixed(2),
              },
            },
          ],
          application_context: {
            brand_name: 'Allo Halal',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: successUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      const orderData = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok || !orderData.id) {
        return NextResponse.json(
          {
            success: false,
            error: orderData.message || 'Failed to create PayPal Order.',
          },
          { status: orderRes.status || 500, headers: corsHeaders() }
        );
      }

      const approveLink = (orderData.links || []).find((l: any) => l.rel === 'approve')?.href;

      return NextResponse.json(
        {
          success: true,
          orderId: orderData.id,
          transactionId: orderData.id,
          url: approveLink || `https://www.${mode === 'live' ? '' : 'sandbox.'}paypal.com/checkoutnow?token=${orderData.id}`,
          amount,
          currency,
          mode,
        },
        { headers: corsHeaders() }
      );
    }

    // Fallback: If PayPal.me is configured, provide direct checkout link
    if (paypalMe) {
      const cleanMe = paypalMe.replace(/\/+$/, '');
      const meUrl = cleanMe.includes('http') ? cleanMe : `https://paypal.me/${cleanMe}`;
      const checkoutUrl = `${meUrl}/${amount.toFixed(2)}${currency}`;
      return NextResponse.json(
        {
          success: true,
          orderId: `pp_${Date.now()}`,
          transactionId: `pp_${Date.now()}`,
          url: checkoutUrl,
          amount,
          currency,
          isDirectLink: true,
        },
        { headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'PayPal Client ID and Secret Key are not configured in Admin panel.',
      },
      { status: 500, headers: corsHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while initializing PayPal order.',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

