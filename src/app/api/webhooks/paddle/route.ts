import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

// Enable CORS for webhook calls
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Paddle-Signature, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'active',
      service: 'Paddle Billing Webhook Listener',
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders() }
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('paddle-signature') || '';

    // 1. Fetch current webhook secret from database or env
    let webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || '';

    try {
      const { data } = await supabase
        .from('auth_settings')
        .select('paddle_webhook_secret')
        .eq('id', 'global')
        .maybeSingle();

      if (data?.paddle_webhook_secret) {
        webhookSecret = data.paddle_webhook_secret.trim();
      }
    } catch (_) {}

    // 2. Verify signature if webhook secret is configured
    if (webhookSecret && signatureHeader) {
      const isSignatureValid = verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
      if (!isSignatureValid) {
        console.warn('[Paddle Webhook] Signature verification failed. Proceeding with caution.');
      }
    }

    // 3. Parse event payload
    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const eventType = event.event_type || event.alert_name || '';
    const eventData = event.data || {};
    const transactionId = eventData.id || event.order_id || event.p_order_id;

    console.log(`[Paddle Webhook] Received event: ${eventType} (Transaction: ${transactionId})`);

    // 4. Handle completed / paid transaction events
    const completedEvents = [
      'transaction.completed',
      'transaction.paid',
      'transaction.billed',
      'payment_succeeded',
    ];

    if (completedEvents.includes(eventType) && transactionId) {
      // Extract amounts and details
      const totals = eventData.details?.totals;
      const rawTotal = totals?.total ? Number(totals.total) : (totals?.subtotal ? Number(totals.subtotal) : 0);
      const amount = rawTotal > 0 ? Number((rawTotal / 100).toFixed(2)) : Number(eventData.amount || event.sale_gross || 0);
      const currency = (eventData.currency_code || event.currency || 'EUR').toUpperCase();

      const customData = eventData.custom_data || {};
      const donorName =
        customData.donor_name ||
        eventData.customer?.name ||
        event.customer_name ||
        'Community Supporter';

      const donorEmail =
        customData.donor_email ||
        eventData.customer?.email ||
        event.email ||
        '';

      const city = eventData.address?.city || '';
      const country = eventData.address?.country_code || event.country || '';
      const donorLocation = [city, country].filter(Boolean).join(', ') || 'Online';

      const tier = (customData.tier || 'SERVER').toUpperCase();
      const message = customData.message || 'Free-will Community Contribution';

      // Check if already recorded
      const { data: existing } = await supabase
        .from('contributions')
        .select('id')
        .eq('transaction_id', String(transactionId))
        .maybeSingle();

      if (existing) {
        console.log(`[Paddle Webhook] Transaction ${transactionId} already recorded (id: ${existing.id}).`);
      } else {
        const recordId = `pdl_${String(transactionId).slice(-10)}_${Date.now().toString(36)}`;
        const { error: insertError } = await supabase.from('contributions').insert({
          id: recordId,
          donor_name: donorName,
          donor_email: donorEmail,
          donor_location: donorLocation,
          amount: amount,
          currency: currency,
          tier: tier,
          payment_method: 'PADDLE',
          transaction_id: String(transactionId),
          message: message,
          status: 'COMPLETED',
          is_anonymous: !donorName || donorName === 'Community Supporter',
          reviewed_by: `Paddle Webhook (${eventType})`,
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error('[Paddle Webhook] Supabase insert error:', insertError.message);
        } else {
          console.log(`[Paddle Webhook] Contribution recorded successfully: ${recordId} (€${amount})`);
        }
      }
    }

    // Always respond 200 OK within 5s to acknowledge receipt
    return NextResponse.json(
      { success: true, event: eventType, transactionId },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('[Paddle Webhook] Error processing event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secretKey: string
): boolean {
  try {
    const parts = signatureHeader.split(';');
    const timestampPart = parts.find((p) => p.trim().startsWith('ts='));
    const signatureParts = parts.filter((p) => p.trim().startsWith('h1='));

    if (!timestampPart || signatureParts.length === 0) return false;

    const timestamp = timestampPart.split('=')[1].trim();
    const signatures = signatureParts.map((p) => p.split('=')[1].trim());

    // Build signed payload string: ts:rawBody
    const signedPayload = `${timestamp}:${rawBody}`;

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signedPayload)
      .digest('hex');

    return signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(sig, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );
      } catch (_) {
        return false;
      }
    });
  } catch (_) {
    return false;
  }
}

