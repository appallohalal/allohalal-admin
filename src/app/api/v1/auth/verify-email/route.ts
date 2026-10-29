import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmailVerificationToken } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const token = (body.token || '').trim();
    const tokenHash = (body.token_hash || '').trim();
    const type = (body.type || 'signup').trim();

    if (tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      const verifiedEmail = data.user?.email?.toLowerCase();
      if (verifiedEmail) {
        await supabase
          .from('users')
          .update({ email_verified: true })
          .eq('email', verifiedEmail);
      }

      return NextResponse.json({
        success: true,
        email: verifiedEmail,
        message: 'Your email has been verified successfully!',
      });
    }

    if (email && token) {
      const expectedToken = generateEmailVerificationToken(email);
      if (token !== expectedToken) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired confirmation link.' },
          { status: 400 }
        );
      }

      await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('email', email);

      return NextResponse.json({
        success: true,
        email,
        message: 'Your email address has been confirmed!',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing verification parameters.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
