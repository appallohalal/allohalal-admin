import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';
import { notifyUnknownProductSubscribers } from '@/lib/notify-subscribers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      actorId,
      id,
      barcode,
      name,
      nameI18n,
      brand,
      imageUrl,
      ingredientsRaw,
      ingredientsI18n,
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
      userAlertsI18n,
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

    await db.query(
      `ALTER TABLE public.products
       ADD COLUMN IF NOT EXISTS name_i18n JSONB DEFAULT '{}'::jsonb,
       ADD COLUMN IF NOT EXISTS ingredients_i18n JSONB DEFAULT '{}'::jsonb`
    );

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
    const cleanAlertsI18n: Record<string, string[]> = {};
    if (userAlertsI18n && typeof userAlertsI18n === 'object') {
      for (const [lang, arr] of Object.entries(userAlertsI18n)) {
        if (Array.isArray(arr)) {
          const cleaned = arr.map((x: any) => String(x || '').trim()).filter(Boolean);
          if (cleaned.length > 0) cleanAlertsI18n[lang] = cleaned;
        }
      }
    }
    const cleanStringMap = (raw: any): Record<string, string> => {
      const out: Record<string, string> = {};
      if (raw && typeof raw === 'object') {
        for (const [lang, val] of Object.entries(raw)) {
          const s = String(val || '').trim();
          if (s) out[lang] = s;
        }
      }
      return out;
    };
    const cleanNameI18n = cleanStringMap(nameI18n);
    const cleanIngredientsI18n = cleanStringMap(ingredientsI18n);
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
             user_alerts_i18n = $21::jsonb,
             is_certified = $22,
             verified_official = $23,
             certification_details = $24,
             name_i18n = $25::jsonb,
             ingredients_i18n = $26::jsonb,
             updated_at = $13::timestamptz
         WHERE id = $27
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
          JSON.stringify(cleanAlertsI18n),
          isCert,
          Boolean(verifiedOfficial),
          certificationDetails || '',
          JSON.stringify(cleanNameI18n),
          JSON.stringify(cleanIngredientsI18n),
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
           user_alerts, user_alerts_i18n, is_certified, verified_official, certification_details,
           name_i18n, ingredients_i18n
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, $12, $13::timestamptz, $13::timestamptz,
           $14, $15, $16,
           $17::date, $18, $19,
           $20::jsonb, $21::jsonb, $22, $23, $24,
           $25::jsonb, $26::jsonb
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
          JSON.stringify(cleanAlertsI18n),
          isCert,
          Boolean(verifiedOfficial),
          certificationDetails || '',
          JSON.stringify(cleanNameI18n),
          JSON.stringify(cleanIngredientsI18n),
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
