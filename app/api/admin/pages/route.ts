import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getAllAdminPages } from '@/lib/data/site-pages';

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const pages = await getAllAdminPages();
    return NextResponse.json({ success: true, pages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve site pages.' },
      { status: 500 }
    );
  }
}
