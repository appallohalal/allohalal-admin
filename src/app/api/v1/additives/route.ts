import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') || 'en';

  try {
    const { data, error } = await supabase
      .from('additives')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        additives: [],
      }, { status: 500 });
    }

    const formatted = (data || []).map((row: any) => {
      const translations = row.translations || {};
      const translation = translations[lang] || translations['en'] || {
        name: row.name_en,
        description: '',
        halalReason: '',
      };

      return {
        code: row.code,
        name: translation.name || row.name_en,
        status: row.status,
        source: row.source,
        category: row.category,
        description: translation.description || '',
        halalReason: translation.halalReason || '',
        translations: translations,
      };
    });

    return NextResponse.json({
      success: true,
      total: formatted.length,
      language: lang,
      additives: formatted,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Server error',
      additives: [],
    }, { status: 500 });
  }
}
