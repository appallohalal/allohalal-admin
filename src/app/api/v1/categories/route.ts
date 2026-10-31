import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PARTNER_CATEGORIES } from '@/lib/storage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('partner_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    const categories = (data && data.length > 0)
      ? data.map((item: any) => ({
          id: item.id,
          name: item.name,
          displayOrder: item.display_order ?? 0,
          isActive: item.is_active !== false,
          createdAt: item.created_at,
        }))
      : DEFAULT_PARTNER_CATEGORIES;

    return NextResponse.json(
      {
        success: true,
        count: categories.length,
        categories,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.warn('Categories GET fallback:', err?.message || err);
    return NextResponse.json(
      {
        success: true,
        count: DEFAULT_PARTNER_CATEGORIES.length,
        categories: DEFAULT_PARTNER_CATEGORIES,
      },
      { headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, displayOrder, isActive } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanName = name.trim();
    const catId = (id && typeof id === 'string' && id.trim())
      ? id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    const payload = {
      id: catId,
      name: cleanName,
      display_order: typeof displayOrder === 'number' ? displayOrder : 10,
      is_active: isActive !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('partner_categories')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { success: true, category: data },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('Categories POST error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save category' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from('partner_categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { success: true, message: `Category ${id} deleted` },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('Categories DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete category' },
      { status: 500, headers: corsHeaders }
    );
  }
}

