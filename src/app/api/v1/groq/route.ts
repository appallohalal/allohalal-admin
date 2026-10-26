import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('groq_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Groq GET API warning:', error);
    }

    const s = data || {
      is_enabled: true,
      api_key: '',
      model: 'llama-3.3-70b-versatile',
      vision_model: 'llama-3.2-11b-vision-preview',
      temperature: 0.1,
      max_tokens: 2048,
    };

    return NextResponse.json({
      success: true,
      isEnabled: s.is_enabled !== false,
      apiKey: s.api_key || '',
      model: s.model || 'llama-3.3-70b-versatile',
      visionModel: s.vision_model || 'llama-3.2-11b-vision-preview',
      temperature: s.temperature ?? 0.1,
      maxTokens: s.max_tokens ?? 2048,
      updatedAt: s.updated_at,
      updatedBy: s.updated_by,
    });
  } catch (error: any) {
    console.error('Error in GET /api/v1/groq:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = {
      id: 'global',
      api_key: (body.apiKey || '').trim(),
      model: (body.model || 'llama-3.3-70b-versatile').trim(),
      vision_model: (body.visionModel || 'llama-3.2-11b-vision-preview').trim(),
      is_enabled: Boolean(body.isEnabled),
      temperature: Number(body.temperature) || 0.1,
      max_tokens: Number(body.maxTokens) || 2048,
      updated_at: new Date().toISOString(),
      updated_by: body.updatedBy || 'Admin',
    };

    const { data, error } = await supabase
      .from('groq_settings')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving Groq settings to Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Groq configuration saved successfully',
      settings: data,
    });
  } catch (error: any) {
    console.error('Error in POST /api/v1/groq:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
