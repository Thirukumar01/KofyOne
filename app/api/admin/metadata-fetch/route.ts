import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { fetchUrlMetadata } from '@/lib/admin/metadata-service';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const body = await request.json();
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ error: 'A valid URL is required.' }, { status: 400 });
    }

    const metadata = await fetchUrlMetadata(url);
    return NextResponse.json({ success: true, metadata });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch metadata.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
