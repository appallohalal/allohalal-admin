import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/totp';

function normalizeStatus(raw: string): 'HALAL' | 'HARAM' | 'MUSHBOOH' | 'UNKNOWN' {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'HALAL') return 'HALAL';
  if (s === 'HARAM') return 'HARAM';
  if (s === 'MUSHBOOH' || s === 'DOUBTFUL' || s === 'DOUTEUX') return 'MUSHBOOH';
  if (s === 'UNKNOWN' || s === 'INCONNU') return 'UNKNOWN';
  return 'MUSHBOOH';
}

function normalizeSource(raw: string): 'Plant' | 'Animal' | 'Synthetic' | 'Insect' | 'Doubtful' {
  const s = (raw || '').trim().toLowerCase();
  if (s === 'plant' || s === 'vegetal' || s === 'végétal') return 'Plant';
  if (s === 'animal') return 'Animal';
  if (s === 'synthetic' || s === 'synthétique') return 'Synthetic';
  if (s === 'insect' || s === 'insecte') return 'Insect';
  return 'Doubtful';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No additive rows provided for import.' },
        { status: 400 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable.' }, { status: 500 });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const code = String(row.code || '').trim().toUpperCase();
      const nameEn = String(row.nameEn || '').trim();

      if (!code || !nameEn) {
        skipped++;
        errors.push(`Row ${i + 1}: missing E-code or English name.`);
        continue;
      }

      const status = normalizeStatus(String(row.status || 'MUSHBOOH'));
      const source = normalizeSource(String(row.source || 'Doubtful'));
      const category = String(row.category || '').trim();

      const incomingTrans: Record<string, { name: string; description: string; halalReason: string }> = {};
      if (row.translations && typeof row.translations === 'object') {
        for (const [lang, val] of Object.entries(row.translations)) {
          if (val && typeof val === 'object') {
            const v = val as Record<string, any>;
            incomingTrans[lang] = {
              name: String(v.name || '').trim(),
              description: String(v.description || '').trim(),
              halalReason: String(v.halalReason || '').trim(),
            };
          }
        }
      }

      if (!incomingTrans.en) {
        incomingTrans.en = {
          name: nameEn,
          description: String(row.descriptionEn || '').trim(),
          halalReason: String(row.halalReasonEn || '').trim(),
        };
      } else if (!incomingTrans.en.name) {
        incomingTrans.en.name = nameEn;
      }

      const existing = await db.query(
        `SELECT id, translations FROM public.additives WHERE UPPER(code) = $1 LIMIT 1`,
        [code]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        const currentTrans = (existing.rows[0].translations && typeof existing.rows[0].translations === 'object')
          ? existing.rows[0].translations
          : {};
        const mergedTrans: Record<string, any> = { ...currentTrans };
        for (const [lang, val] of Object.entries(incomingTrans)) {
          const prev = mergedTrans[lang] || { name: '', description: '', halalReason: '' };
          mergedTrans[lang] = {
            name: val.name || prev.name || '',
            description: val.description || prev.description || '',
            halalReason: val.halalReason || prev.halalReason || '',
          };
        }

        await db.query(
          `UPDATE public.additives SET
            code = $1,
            name_en = $2,
            status = $3,
            source = $4,
            category = COALESCE(NULLIF($5, ''), category),
            translations = $6::jsonb,
            updated_at = NOW()
          WHERE id = $7`,
          [code, nameEn, status, source, category, JSON.stringify(mergedTrans), existing.rows[0].id]
        );
        updated++;
      } else {
        await db.query(
          `INSERT INTO public.additives (
            code, name_en, status, source, category, translations, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6::jsonb, NOW()
          )`,
          [code, nameEn, status, source, category, JSON.stringify(incomingTrans)]
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
    console.error('Additives CSV import error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Additives CSV import failed.' },
      { status: 500 }
    );
  }
}
