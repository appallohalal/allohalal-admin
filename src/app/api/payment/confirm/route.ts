import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendContributionEmails } from '@/lib/email';

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
    const transactionId = body.transactionId || body.sessionId || body.orderId || body.txn_id;
    const provider = (body.provider || 'STRIPE').toUpperCase();

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'transactionId is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Try to update existing record in Supabase contributions table
    const { data, error } = await supabase
      .from('contributions')
      .update({
        status: 'COMPLETED',
        payment_method: provider,
      })
      .eq('transaction_id', transactionId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Could not update contribution status:', error.message);
    }

    // Trigger transactional confirmation emails to donor & alert to admin@allo-halal.com
    try {
      const record = data || {};
      const amount = Number(record.amount || body.amount || 0);
      const donorEmail = record.donor_email || body.donorEmail || body.donor_email;
      const donorName = record.donor_name || body.donorName || body.donor_name;
      const tier = record.tier || body.tier;
      const currency = record.currency || body.currency || 'EUR';
      const originUrl = request.headers.get('origin') || undefined;

      sendContributionEmails({
        donorEmail,
        donorName,
        amount,
        currency,
        tier,
        transactionId,
        paymentMethod: provider,
        originUrl,
      }).catch((e) => console.error('[sendContributionEmails error in confirm route]:', e));
    } catch (e) {
      console.error('[sendContributionEmails trigger error]:', e);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payment confirmed successfully.',
        contribution: data || {
          transactionId,
          status: 'COMPLETED',
          paymentMethod: provider,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Payment confirmation error.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

