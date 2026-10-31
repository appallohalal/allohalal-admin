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

// GET: Load all contributions directly from Supabase server
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, contributions: data || [] },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// POST: Add new contribution directly to Supabase server
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const id = body.id || body.sessionId || body.transactionId || `don_${Date.now()}`;
    const donorName = (body.donorName || body.donor_name || 'Allo Halal Mobile Supporter').trim();
    const donorEmail = (body.donorEmail || body.donor_email || '').trim();
    const amount = Number(body.amount || 0);
    const currency = (body.currency || 'EUR').toUpperCase();
    const tier = (body.tier || 'SERVER').toUpperCase();
    const transactionId = body.transactionId || body.transaction_id || body.paddle_transaction_id || body.stripe_session_id || id;
    const message = body.message || 'Community Contribution via Allo Halal App';
    const status = (body.status || 'COMPLETED').toUpperCase();

    const payload = {
      id,
      donor_name: donorName,
      donor_email: donorEmail,
      amount,
      currency,
      tier,
      payment_method: 'PADDLE',
      transaction_id: transactionId,
      paddle_transaction_id: transactionId,
      message,
      status,
      is_anonymous: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contributions')
      .upsert(payload)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, contribution: data || payload },
      { status: 201, headers: corsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

