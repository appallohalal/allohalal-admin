import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDbPool } from '@/lib/totp';
import { FIREBASE_CONFIG } from '@/lib/firebase-config';

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getFcmAccessToken(): Promise<{ accessToken: string; projectId: string } | null> {
  try {
    const sa = FIREBASE_CONFIG.serviceAccount;
    if (!sa?.client_email || !sa?.private_key) return null;

    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64UrlEncode(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    );
    const unsigned = `${header}.${claims}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const sig = base64UrlEncode(signer.sign(sa.private_key.replace(/\\n/g, '\n')));

    const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${sig}`,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) return null;
    return { accessToken: data.access_token, projectId: sa.project_id || FIREBASE_CONFIG.projectId };
  } catch {
    return null;
  }
}

async function notifyUnknownProductSubscribers(db: any, barcode: string, productName: string) {
  try {
    const subs = await db.query(
      `SELECT id, fcm_token
       FROM public.unknown_product_submissions
       WHERE barcode = $1 AND notify_when_ready = true AND notified_at IS NULL`,
      [barcode]
    );
    if (!subs.rowCount) return;

    const tokens = subs.rows
      .map((r: any) => r.fcm_token)
      .filter((t: any) => typeof t === 'string' && t.trim().length > 0);

    if (tokens.length > 0) {
      const auth = await getFcmAccessToken();
      if (auth) {
        await Promise.all(
          tokens.map((token: string) =>
            fetch(`https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${auth.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: {
                    title: 'Fiche produit disponible !',
                    body: `${productName} (${barcode}) a été ajouté au catalogue Allo Halal.`,
                  },
                  data: {
                    type: 'product_ready',
                    barcode,
                  },
                },
              }),
            }).catch(() => null)
          )
        );
      }
    }

    await db.query(
      `UPDATE public.unknown_product_submissions
       SET notified_at = NOW()
       WHERE barcode = $1 AND notify_when_ready = true AND notified_at IS NULL`,
      [barcode]
    );
  } catch (err) {
    console.warn('Notify unknown subscribers error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      actorId,
      id,
      barcode,
      name,
      brand,
      imageUrl,
      ingredientsRaw,
      detectedAdditives,
      aiStatus,
      manualStatus,
      isOverridden,
      moderatorNote,
      certifier,
      certificationStatus,
      hasPackagingLogo,
      certificateExpiresAt,
      certificateProofUrl,
      certificateProofName,
      userAlerts,
      verifiedOfficial,
      certificationDetails,
      unknownProductId,
    } = body;

    if (!barcode || !name) {
      return NextResponse.json(
        { success: false, error: 'Barcode and product name are required.' },
        { status: 400 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    // Verify actor & role server-side (never trust client-supplied verifiedBy / timestamps)
    let verifiedByName = 'Admin';
    let verifiedById: string | null = null;
    let actorRole = 'Halal Auditor';

    if (actorId) {
      const actorRes = await db.query(
        `SELECT id, email, raw_user_meta_data->>'name' as name,
                COALESCE(raw_user_meta_data->>'role', 'Halal Auditor') as role
         FROM auth.users WHERE id = $1`,
        [actorId]
      );
      if (actorRes.rowCount === 0) {
        return NextResponse.json({ success: false, error: 'Unauthorized actor.' }, { status: 401 });
      }
      const actor = actorRes.rows[0];
      actorRole = actor.role;
      verifiedById = actor.id;
      verifiedByName = actor.name || actor.email?.split('@')[0] || 'Admin';
    }

    const isUpdate = Boolean(id && !String(id).startsWith('prod-'));
    if (isUpdate && !['Super Admin', 'Chief Auditor'].includes(actorRole)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Your role cannot edit existing products.' },
        { status: 403 }
      );
    }
    if (!isUpdate && !['Super Admin', 'Chief Auditor', 'Halal Auditor'].includes(actorRole)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Your role cannot add products.' },
        { status: 403 }
      );
    }

    const cleanBarcode = String(barcode).trim();
    const cleanAlerts = Array.isArray(userAlerts)
      ? userAlerts.map((a: any) => String(a || '').trim()).filter(Boolean)
      : [];
    const cleanCertStatus =
      certificationStatus === 'certified' ||
      certificationStatus === 'not_found' ||
      certificationStatus === 'unknown'
        ? certificationStatus
        : certifier?.trim()
          ? 'certified'
          : 'unknown';
    const cleanCertifier = certifier ? String(certifier).trim() : null;
    const isCert = cleanCertStatus === 'certified' || Boolean(cleanCertifier);
    const cleanExpiry =
      certificateExpiresAt && String(certificateExpiresAt).trim() !== ''
        ? String(certificateExpiresAt).trim()
        : null;

    // Duplicate barcode check
    const existingByBarcode = await db.query(
      `SELECT id, verified_at FROM public.products WHERE barcode = $1 LIMIT 1`,
      [cleanBarcode]
    );

    if (isUpdate && existingByBarcode.rowCount && existingByBarcode.rows[0].id !== id) {
      return NextResponse.json(
        { success: false, error: `Barcode "${cleanBarcode}" already belongs to another product.` },
        { status: 409 }
      );
    }

    const targetId = isUpdate
      ? id
      : existingByBarcode.rowCount
        ? existingByBarcode.rows[0].id
        : null;

    let savedRow: any;
    const nowIso = new Date().toISOString();

    if (targetId) {
      const updateRes = await db.query(
        `UPDATE public.products
         SET barcode = $1,
             name = $2,
             brand = $3,
             image_url = $4,
             ingredients_raw = $5,
             detected_additives = $6,
             ai_status = $7,
             manual_status = $8,
             is_overridden = $9,
             moderator_note = $10,
             verified_by = $11,
             verified_by_id = $12,
             verified_at = COALESCE(verified_at, $13::timestamptz),
             verification_updated_at = $13::timestamptz,
             certifier = $14,
             certification_status = $15,
             has_packaging_logo = $16,
             certificate_expires_at = $17::date,
             certificate_proof_url = $18,
             certificate_proof_name = $19,
             user_alerts = $20::jsonb,
             is_certified = $21,
             verified_official = $22,
             certification_details = $23,
             updated_at = $13::timestamptz
         WHERE id = $24
         RETURNING *`,
        [
          cleanBarcode,
          String(name).trim(),
          String(brand || '').trim(),
          imageUrl || null,
          String(ingredientsRaw || ''),
          Array.isArray(detectedAdditives) ? detectedAdditives : [],
          aiStatus || 'HALAL',
          manualStatus || aiStatus || 'HALAL',
          isOverridden ?? true,
          moderatorNote || '',
          verifiedByName,
          verifiedById,
          nowIso,
          cleanCertifier,
          cleanCertStatus,
          Boolean(hasPackagingLogo),
          cleanExpiry,
          certificateProofUrl || null,
          certificateProofName || null,
          JSON.stringify(cleanAlerts),
          isCert,
          Boolean(verifiedOfficial),
          certificationDetails || '',
          targetId,
        ]
      );
      savedRow = updateRes.rows[0];
    } else {
      const insertRes = await db.query(
        `INSERT INTO public.products (
           barcode, name, brand, image_url, ingredients_raw, detected_additives,
           ai_status, manual_status, is_overridden, moderator_note,
           verified_by, verified_by_id, verified_at, verification_updated_at,
           certifier, certification_status, has_packaging_logo,
           certificate_expires_at, certificate_proof_url, certificate_proof_name,
           user_alerts, is_certified, verified_official, certification_details
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12, $13::timestamptz, $13::timestamptz,
           $14, $15, $16,
           $17::date, $18, $19,
           $20::jsonb, $21, $22, $23
         )
         RETURNING *`,
        [
          cleanBarcode,
          String(name).trim(),
          String(brand || '').trim(),
          imageUrl || null,
          String(ingredientsRaw || ''),
          Array.isArray(detectedAdditives) ? detectedAdditives : [],
          aiStatus || 'HALAL',
          manualStatus || aiStatus || 'HALAL',
          isOverridden ?? true,
          moderatorNote || '',
          verifiedByName,
          verifiedById,
          nowIso,
          cleanCertifier,
          cleanCertStatus,
          Boolean(hasPackagingLogo),
          cleanExpiry,
          certificateProofUrl || null,
          certificateProofName || null,
          JSON.stringify(cleanAlerts),
          isCert,
          Boolean(verifiedOfficial),
          certificationDetails || '',
        ]
      );
      savedRow = insertRes.rows[0];
    }

    // Mark matching unknown_products record as processed ('traite') & notify subscribers
    if (savedRow?.id) {
      await db.query(
        `UPDATE public.unknown_products
         SET status = 'traite', linked_product_id = $1, updated_at = NOW()
         WHERE barcode = $2 OR id = $3`,
        [savedRow.id, cleanBarcode, unknownProductId || null]
      );
      await notifyUnknownProductSubscribers(db, cleanBarcode, savedRow.name);
    }

    return NextResponse.json({ success: true, product: savedRow });
  } catch (err: any) {
    console.error('Save product API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save product.' },
      { status: 500 }
    );
  }
}
