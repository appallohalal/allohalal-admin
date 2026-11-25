import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

function normalizeStatus(raw: string): 'HALAL' | 'HARAM' | 'MUSHBOOH' | 'UNKNOWN' {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'HALAL') return 'HALAL';
  if (s === 'HARAM') return 'HARAM';
  if (s === 'MUSHBOOH' || s === 'DOUTEUX' || s === 'DOUBTFUL') return 'MUSHBOOH';
  if (s === 'UNKNOWN' || s === 'INCONNU') return 'UNKNOWN';
  return 'HALAL';
}

function parseBool(raw: any): boolean {
  if (typeof raw === 'boolean') return raw;
  const s = String(raw || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'oui' || s === '1';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorId, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No product rows provided for import.' },
        { status: 400 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

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

    if (!['Super Admin', 'Chief Auditor', 'Halal Auditor'].includes(actorRole)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Your role cannot import products.' },
        { status: 403 }
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const nowIso = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const barcode = String(row.barcode || '').trim();
      const name = String(row.name || '').trim();

      if (!barcode || !name) {
        skipped++;
        errors.push(`Row ${i + 1}: missing barcode or product name.`);
        continue;
      }

      const brand = String(row.brand || '').trim();
      const imageUrl = String(row.imageUrl || '').trim();
      const ingredientsRaw = String(row.ingredientsRaw || '').trim();
      const status = normalizeStatus(String(row.status || row.manualStatus || row.aiStatus || 'HALAL'));
      const certifier = String(row.certifier || '').trim() || null;
      const isCert = Boolean(certifier) || parseBool(row.isCertified);
      const certStatus = isCert ? 'certified' : 'unknown';
      const verifiedOfficial = parseBool(row.verifiedOfficial);
      const moderatorNote = String(row.moderatorNote || 'Imported via Admin CSV').trim();
      const additives = Array.isArray(row.detectedAdditives)
        ? row.detectedAdditives.map((a: any) => String(a).trim()).filter(Boolean)
        : String(row.additives || '')
            .split(/[,;|]/)
            .map((a) => a.trim())
            .filter(Boolean);

      const existing = await db.query(
        `SELECT id FROM public.products WHERE barcode = $1 LIMIT 1`,
        [barcode]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        if (!['Super Admin', 'Chief Auditor'].includes(actorRole)) {
          skipped++;
          errors.push(`Row ${i + 1} (${barcode}): your role cannot update existing products.`);
          continue;
        }
        await db.query(
          `UPDATE public.products SET
            name = $1,
            brand = COALESCE(NULLIF($2, ''), brand),
            image_url = COALESCE(NULLIF($3, ''), image_url),
            ingredients_raw = COALESCE(NULLIF($4, ''), ingredients_raw),
            detected_additives = CASE WHEN array_length($5::text[], 1) > 0 THEN $5::text[] ELSE detected_additives END,
            ai_status = $6,
            manual_status = $6,
            is_overridden = true,
            moderator_note = $7,
            verified_by = $8,
            verified_by_id = $9,
            verified_at = $10,
            certifier = COALESCE($11, certifier),
            certification_status = $12,
            is_certified = $13,
            verified_official = $14
          WHERE id = $15`,
          [
            name,
            brand,
            imageUrl,
            ingredientsRaw,
            additives,
            status,
            moderatorNote,
            verifiedByName,
            verifiedById,
            nowIso,
            certifier,
            certStatus,
            isCert,
            verifiedOfficial,
            existing.rows[0].id,
          ]
        );
        updated++;
      } else {
        await db.query(
          `INSERT INTO public.products (
            barcode, name, brand, image_url, ingredients_raw, detected_additives,
            ai_status, manual_status, is_overridden, moderator_note,
            verified_by, verified_by_id, verified_at, certifier,
            certification_status, is_certified, verified_official, scans_count
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $7, true, $8,
            $9, $10, $11, $12,
            $13, $14, $15, 0
          )`,
          [
            barcode,
            name,
            brand,
            imageUrl,
            ingredientsRaw,
            additives,
            status,
            moderatorNote,
            verifiedByName,
            verifiedById,
            nowIso,
            certifier,
            certStatus,
            isCert,
            verifiedOfficial,
          ]
        );
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      errors: errors.slice(0, 20),
    });
  } catch (err: any) {
    console.error('Products CSV import error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'CSV import failed.' },
      { status: 500 }
    );
  }
}
