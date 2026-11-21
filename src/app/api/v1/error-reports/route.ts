import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

export async function GET() {
  try {
    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }
    const res = await db.query(
      `SELECT * FROM public.product_error_reports ORDER BY created_at DESC LIMIT 200`
    );
    return NextResponse.json({ success: true, reports: res.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error fetching reports.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barcode, productId, productName, reportType, message, userId, userEmail, deviceId } = body;

    if (!barcode || !message || !String(message).trim()) {
      return NextResponse.json(
        { success: false, error: 'Barcode and error description are required.' },
        { status: 400 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    const allowedTypes = new Set(['ingredients', 'certifier', 'status', 'other']);
    const cleanType = allowedTypes.has(reportType) ? reportType : 'other';

    const res = await db.query(
      `INSERT INTO public.product_error_reports (
         barcode, product_id, product_name, report_type, message,
         user_id, user_email, device_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'nouveau')
       RETURNING *`,
      [
        String(barcode).trim(),
        productId || null,
        productName || null,
        cleanType,
        String(message).trim(),
        userId || null,
        userEmail || null,
        deviceId || null,
      ]
    );

    return NextResponse.json({ success: true, report: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to submit report.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, adminNote, reviewedBy } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Report ID is required.' }, { status: 400 });
    }
    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    const res = await db.query(
      `UPDATE public.product_error_reports
       SET status = COALESCE($1, status),
           admin_note = COALESCE($2, admin_note),
           reviewed_by = COALESCE($3, reviewed_by),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status || null, adminNote ?? null, reviewedBy || null, id]
    );

    return NextResponse.json({ success: true, report: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update report.' }, { status: 500 });
  }
}
