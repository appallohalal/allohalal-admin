import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = (body.apiKey || body.secretKey || '').trim();
    const mode = (body.mode || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Paddle API Key is required to verify connection.' },
        { status: 400 }
      );
    }

    const baseUrl =
      mode === 'sandbox'
        ? 'https://sandbox-api.paddle.com'
        : 'https://api.paddle.com';

    // Verify key using Paddle /event-types endpoint (lightweight check that authenticates credentials)
    const response = await fetch(`${baseUrl}/event-types`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Paddle-Version': '1',
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data.error?.detail ||
            data.error?.message ||
            'Paddle rejected the API key.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      message: `Connection successful! Paddle account authenticated in ${mode.toUpperCase()} mode.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify Paddle connection.' },
      { status: 500 }
    );
  }
}

