import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // 1. File size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds 2MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` },
        { status: 400 }
      );
    }

    // 2. MIME type validation
    const mimeType = file.type.toLowerCase();
    if (mimeType.includes('svg')) {
      return NextResponse.json(
        { error: 'SVG uploads are rejected for security. Please upload a PNG, JPG/JPEG, or WebP image.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type (${mimeType}). Only PNG, JPG/JPEG, and WebP images are permitted.` },
        { status: 400 }
      );
    }

    // Determine extension
    let extension = 'png';
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') extension = 'jpg';
    else if (mimeType === 'image/webp') extension = 'webp';

    const uniqueId = crypto.randomBytes(12).toString('hex');
    const safeFilename = `${Date.now()}-${uniqueId}.${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let publicUrl: string | null = null;
    let storageProvider: 'supabase-storage' | 'local-disk' | 'inline-data-uri' = 'inline-data-uri';

    // 3. Attempt upload to Supabase Storage bucket 'kofyone-media'
    if (hasAdminCredentials()) {
      try {
        const supabaseAdmin = createAdminClient();

        // Ensure bucket 'kofyone-media' exists; auto-provision if missing
        try {
          const { data: buckets } = await supabaseAdmin.storage.listBuckets();
          const bucketExists = buckets?.some((b) => b.name === 'kofyone-media');
          if (!bucketExists) {
            await supabaseAdmin.storage.createBucket('kofyone-media', {
              public: true,
              fileSizeLimit: 5 * 1024 * 1024,
              allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
            });
          }
        } catch (bucketCheckErr) {
          console.warn('Bucket verification/creation notice:', bucketCheckErr);
        }

        // Upload with service role client (bypasses storage.objects RLS)
        const { data, error } = await supabaseAdmin.storage
          .from('kofyone-media')
          .upload(`logos/${safeFilename}`, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (!error && data) {
          const { data: urlData } = supabaseAdmin.storage
            .from('kofyone-media')
            .getPublicUrl(`logos/${safeFilename}`);

          if (urlData?.publicUrl) {
            publicUrl = urlData.publicUrl;
            storageProvider = 'supabase-storage';
          }
        } else if (error) {
          console.warn('Supabase admin storage upload error:', error);
        }
      } catch (adminClientErr) {
        console.warn('Supabase admin storage client failure:', adminClientErr);
      }
    } else {
      // Fallback: Attempt upload using standard SSR server client
      try {
        const supabase = await createClient();
        const { data, error } = await supabase.storage
          .from('kofyone-media')
          .upload(`logos/${safeFilename}`, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('kofyone-media')
            .getPublicUrl(`logos/${safeFilename}`);

          if (urlData?.publicUrl) {
            publicUrl = urlData.publicUrl;
            storageProvider = 'supabase-storage';
          }
        }
      } catch (standardClientErr) {
        console.warn('Standard client storage upload failure:', standardClientErr);
      }
    }

    // 4. In development only, attempt local public/uploads directory fallback
    if (!publicUrl && process.env.NODE_ENV !== 'production') {
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const localFilePath = path.join(uploadDir, safeFilename);
        fs.writeFileSync(localFilePath, fileBuffer);
        publicUrl = `/uploads/${safeFilename}`;
        storageProvider = 'local-disk';
      } catch (localWriteErr) {
        console.warn('Local disk fallback failed:', localWriteErr);
      }
    }

    // 5. Resilient fallback: Convert to Base64 Data URI if storage or disk is unavailable
    if (!publicUrl) {
      const base64Data = fileBuffer.toString('base64');
      publicUrl = `data:${mimeType};base64,${base64Data}`;
      storageProvider = 'inline-data-uri';
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFilename,
      size: file.size,
      storage: storageProvider,
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'File upload failed.' },
      { status: 500 }
    );
  }
}
