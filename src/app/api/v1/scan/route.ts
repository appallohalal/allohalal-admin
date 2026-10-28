import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barcode, deviceId, userLanguage = 'en' } = body;

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    // Query live Supabase database for this barcode
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
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

    return NextResponse.json({
      found: false,
      source: 'OPEN_FOOD_FACTS_PROXY',
      message: 'Product not cached in Supabase. Ingesting via Groq AI...',
      barcode,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
