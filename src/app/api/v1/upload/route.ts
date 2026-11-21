import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PROOF_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folderRaw = (formData.get('folder')?.toString() || 'unknown-products').trim();
    const barcodeRaw = (formData.get('barcode')?.toString() || 'item').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const folder = folderRaw === 'proofs' ? 'proofs' : 'unknown-products';
    const allowedTypes = folder === 'proofs' ? ALLOWED_PROOF_TYPES : ALLOWED_IMAGE_TYPES;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            folder === 'proofs'
              ? 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF.'
              : 'Invalid image type. Allowed: JPEG, PNG, WebP.',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const extFromType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    const ext = extFromType[file.type] || 'bin';
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${folder}/${barcodeRaw || 'item'}/${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message || 'Storage upload failed.' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from('product-media').getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
      fileName: file.name || safeName,
      contentType: file.type,
      size: file.size,
    });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected upload error.' },
      { status: 500 }
    );
  }
}
