import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

const VALID_STATUSES = new Set(['nouveau', 'en_cours', 'traite', 'rejete']);

export async function GET(req: NextRequest) {
  try {
    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status !== 'ALL' && VALID_STATUSES.has(status)) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.barcode ILIKE $${params.length} OR COALESCE(u.notes, '') ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*)::int as total FROM public.unknown_products u ${whereClause}`,
      params
    );

    const listParams = [...params, limit, offset];
    const listRes = await db.query(
      `SELECT u.*,
              COALESCE(
                (SELECT json_agg(s ORDER BY s.created_at DESC)
                 FROM public.unknown_product_submissions s
                 WHERE s.unknown_product_id = u.id),
                '[]'::json
              ) as submissions
       FROM public.unknown_products u
       ${whereClause}
       ORDER BY u.last_scanned_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return NextResponse.json({
      success: true,
      items: listRes.rows,
      total: countRes.rows[0]?.total || 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('GET unknown-products error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error fetching unknown products.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      barcode,
      userId,
      userEmail,
      deviceId,
      fcmToken,
      notifyWhenReady,
      frontImageUrl,
      ingredientsImageUrl,
      certifierImageUrl,
      scanOnly,
    } = body;

    if (!barcode || !String(barcode).trim()) {
      return NextResponse.json({ success: false, error: 'Barcode is required.' }, { status: 400 });
    }

    const cleanBarcode = String(barcode).trim();
    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    const hasPhotos = Boolean(frontImageUrl || ingredientsImageUrl || certifierImageUrl);
    const incrementSubmissions = scanOnly ? 0 : 1;

    // Upsert unknown_products record
    const upRes = await db.query(
      `INSERT INTO public.unknown_products (
         barcode, status, scans_count, submissions_count,
         front_image_url, ingredients_image_url, certifier_image_url,
         first_scanned_at, last_scanned_at, updated_at
       ) VALUES (
         $1, 'nouveau', 1, $2,
         $3, $4, $5,
         NOW(), NOW(), NOW()
       )
       ON CONFLICT (barcode) DO UPDATE SET
         scans_count = public.unknown_products.scans_count + 1,
         submissions_count = public.unknown_products.submissions_count + $2,
         front_image_url = COALESCE(NULLIF($3, ''), public.unknown_products.front_image_url),
         ingredients_image_url = COALESCE(NULLIF($4, ''), public.unknown_products.ingredients_image_url),
         certifier_image_url = COALESCE(NULLIF($5, ''), public.unknown_products.certifier_image_url),
         last_scanned_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [
        cleanBarcode,
        incrementSubmissions,
        frontImageUrl || null,
        ingredientsImageUrl || null,
        certifierImageUrl || null,
      ]
    );

    const unknownProduct = upRes.rows[0];
    let submission: any = null;

    if (!scanOnly && (hasPhotos || notifyWhenReady)) {
      const wantNotify = Boolean(notifyWhenReady);

      // Prevent duplicate notification subscription for same user/device + barcode
      if (wantNotify && (userId || deviceId || fcmToken)) {
        const dupRes = await db.query(
          `SELECT id FROM public.unknown_product_submissions
           WHERE barcode = $1
             AND notify_when_ready = true
             AND (
               ($2::uuid IS NOT NULL AND user_id = $2::uuid)
               OR ($3::text IS NOT NULL AND device_id = $3::text)
               OR ($4::text IS NOT NULL AND fcm_token = $4::text)
             )
           LIMIT 1`,
          [cleanBarcode, userId || null, deviceId || null, fcmToken || null]
        );

        if (dupRes.rowCount && dupRes.rowCount > 0) {
          // Update existing submission with any new photos without duplicating subscription
          const upd = await db.query(
            `UPDATE public.unknown_product_submissions
             SET front_image_url = COALESCE(NULLIF($1, ''), front_image_url),
                 ingredients_image_url = COALESCE(NULLIF($2, ''), ingredients_image_url),
                 certifier_image_url = COALESCE(NULLIF($3, ''), certifier_image_url),
                 fcm_token = COALESCE(NULLIF($4, ''), fcm_token)
             WHERE id = $5
             RETURNING *`,
            [
              frontImageUrl || null,
              ingredientsImageUrl || null,
              certifierImageUrl || null,
              fcmToken || null,
              dupRes.rows[0].id,
            ]
          );
          submission = upd.rows[0];
          return NextResponse.json({
            success: true,
            unknownProduct,
            submission,
            duplicateNotificationPrevented: true,
          });
        }
      }

      const subRes = await db.query(
        `INSERT INTO public.unknown_product_submissions (
           unknown_product_id, barcode, user_id, user_email, device_id,
           fcm_token, notify_when_ready,
           front_image_url, ingredients_image_url, certifier_image_url
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          unknownProduct.id,
          cleanBarcode,
          userId || null,
          userEmail || null,
          deviceId || null,
          fcmToken || null,
          wantNotify,
          frontImageUrl || null,
          ingredientsImageUrl || null,
          certifierImageUrl || null,
        ]
      );
      submission = subRes.rows[0];
    }

    return NextResponse.json({
      success: true,
      unknownProduct,
      submission,
    });
  } catch (err: any) {
    console.error('POST unknown-products error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Submission failed.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes, linkedProductId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required.' }, { status: 400 });
    }
    if (status && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 });
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    const res = await db.query(
      `UPDATE public.unknown_products
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           linked_product_id = COALESCE($3::uuid, linked_product_id),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status || null, notes !== undefined ? notes : null, linkedProductId || null, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: res.rows[0] });
  } catch (err: any) {
    console.error('PATCH unknown-products error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Update failed.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required.' }, { status: 400 });
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    await db.query(`DELETE FROM public.unknown_products WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE unknown-products error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Delete failed.' }, { status: 500 });
  }
}
