import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CMS_TEXTS } from '@/lib/storage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cms_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error) {
      throw error;
    }

    const texts = {
      ...DEFAULT_CMS_TEXTS,
      ...(data?.texts || {}),
    };

    return NextResponse.json(
      {
        success: true,
        id: 'global',
        texts,
        translations: data?.translations || {},
        updatedAt: data?.updated_at || new Date().toISOString(),
        updatedBy: data?.updated_by || 'Admin',
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('CMS GET error:', err);
    return NextResponse.json(
      {
        success: true,
        id: 'global',
        texts: DEFAULT_CMS_TEXTS,
        translations: {},
        updatedAt: new Date().toISOString(),
        updatedBy: 'System',
      },
      { headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { texts, translations, updatedBy } = body;

    const mergedTexts = {
      ...DEFAULT_CMS_TEXTS,
      ...(texts || {}),
    };

    const payload = {
      id: 'global',
      texts: mergedTexts,
      translations: translations || {},
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || 'Admin',
    };

    const { error } = await supabase.from('cms_settings').upsert(payload);
    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        id: 'global',
        texts: mergedTexts,
        translations: payload.translations,
        updatedAt: payload.updated_at,
        updatedBy: payload.updated_by,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('CMS POST error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to update CMS texts',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
