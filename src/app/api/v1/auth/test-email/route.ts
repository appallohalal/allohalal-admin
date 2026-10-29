import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toEmail = (body.toEmail || '').trim().toLowerCase();
    const templateType = body.templateType === 'confirmation' ? 'confirmation' : 'welcome';
    const subject = body.subject;
    const title = body.title;
    const subtitle = body.subtitle;
    const bodyText = body.bodyText;

    if (!toEmail || !toEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email address is required.' },
        { status: 400 }
      );
    }

    const originUrl = new URL(req.url).origin;
    const result = await sendTestEmail({
      toEmail,
      templateType,
      subject,
      title,
      subtitle,
      bodyText,
      originUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send test email.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test ${templateType === 'welcome' ? 'Welcome' : 'Confirmation'} email sent successfully to ${toEmail}.`,
    });
  } catch (err: any) {
    console.error('Test email API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error while sending test email.' },
      { status: 500 }
    );
  }
}

