/**
 * KofyOne - Admin Cache Revalidation Route
 * 1-click revalidation of all public cached routes and layout surfaces.
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/lib/supabase/auth';

export async function POST() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    // Revalidate root layout and resource catalog
    revalidatePath('/', 'layout');
    revalidatePath('/resources');
    revalidatePath('/categories');
    revalidatePath('/platforms');

    return NextResponse.json({
      success: true,
      revalidated: true,
      timestamp: new Date().toISOString(),
      message: 'Public cache revalidated successfully across all routes and layout surfaces.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cache revalidation failed' },
      { status: 500 }
    );
  }
}
