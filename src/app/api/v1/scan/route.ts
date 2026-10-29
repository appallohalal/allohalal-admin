import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const OFF_FIELDS =
  'code,product_name,product_name_fr,product_name_en,generic_name,generic_name_fr,' +
  'ingredients_text,ingredients_text_fr,ingredients_text_en,ingredients,' +
  'additives_tags,labels_tags,labels,image_front_url,image_url,brands,quantity,categories';

function getCandidateBarcodes(raw: string): string[] {
  const clean = raw.trim().replace(/\s+/g, '');
  const candidates = [clean];
  if (clean.length === 12 && /^\d{12}$/.test(clean)) {
    candidates.push('0' + clean);
  }
  if (clean.length === 13 && clean.startsWith('0')) {
    candidates.push(clean.slice(1));
  }
  return candidates;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barcode, deviceId, userLanguage = 'fr' } = body;

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    const candidates = getCandidateBarcodes(String(barcode));
    const primaryBarcode = candidates[0];

    // 1. Query live Supabase database for candidate barcodes
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .in('barcode', candidates)
      .maybeSingle();

    if (!error && product) {
      const finalStatus = product.manual_status || product.ai_status;

      // Increment scan counter in background
      supabase
        .from('products')
        .update({
          scans_count: (product.scans_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)
        .then(() => {});

      return NextResponse.json({
        found: true,
        source: product.is_overridden ? 'MODERATOR_OVERRIDE' : 'SUPABASE_CACHE',
        product: {
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          imageUrl: product.image_url,
          status: finalStatus,
          isOverridden: product.is_overridden,
          moderatorNote: product.moderator_note,
          verifiedBy: product.verified_by,
          detectedAdditives: product.detected_additives || [],
          ingredientsRaw: product.ingredients_raw,
        },
      });
    }

    // 2. Query Open Food Facts with European & French localized mirrors
    const headers = {
      'User-Agent': 'AlloHalal - Web Admin & Mobile API - https://allohalal.fr',
      'Accept': 'application/json',
    };

    for (const cand of candidates) {
      const urls = [
        `https://world.openfoodfacts.org/api/v2/product/${cand}?fields=${OFF_FIELDS}`,
        `https://fr.openfoodfacts.org/api/v2/product/${cand}?fields=${OFF_FIELDS}`,
        `https://world.openfoodfacts.org/api/v0/product/${cand}.json`,
      ];

      for (const u of urls) {
        try {
          const res = await fetch(u, { headers, signal: AbortSignal.timeout(4000) });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 1 && data.product) {
              const p = data.product;
              const name =
                p.product_name_fr ||
                p.product_name ||
                p.generic_name_fr ||
                p.product_name_en ||
                p.generic_name ||
                'Produit scanné';

              const additives = Array.isArray(p.additives_tags)
                ? p.additives_tags.map((a: any) => String(a).replace(/^[a-z]{2}:/, '').toUpperCase())
                : [];

              let ingredientsRaw =
                p.ingredients_text_fr ||
                p.ingredients_text ||
                p.ingredients_text_en ||
                '';

              if (!ingredientsRaw && Array.isArray(p.ingredients)) {
                ingredientsRaw = p.ingredients
                  .map((i: any) => i.text || i.id || '')
                  .filter(Boolean)
                  .join(', ');
              }

              const imageUrl = p.image_front_url || p.image_url || null;
              const brand = p.brands || '';

              // Asynchronously cache to Supabase so future requests are instantaneous
              supabase
                .from('products')
                .upsert(
                  {
                    barcode: cand,
                    name,
                    brand,
                    image_url: imageUrl,
                    ingredients_raw: ingredientsRaw,
                    detected_additives: additives,
                    ai_status: 'MUSHBOOH',
                    is_overridden: false,
                    scans_count: 1,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'barcode' }
                )
                .then(() => {});

              return NextResponse.json({
                found: true,
                source: 'OPEN_FOOD_FACTS',
                product: {
                  barcode: cand,
                  name,
                  brand,
                  imageUrl,
                  status: 'MUSHBOOH',
                  isOverridden: false,
                  moderatorNote: null,
                  detectedAdditives: additives,
                  ingredientsRaw,
                },
              });
            }
          }
        } catch (_) {
          // Continue to next mirror/candidate
        }
      }
    }

    return NextResponse.json({
      found: false,
      source: 'NOT_FOUND',
      message: 'Product not found in database or Open Food Facts catalog.',
      barcode: primaryBarcode,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
