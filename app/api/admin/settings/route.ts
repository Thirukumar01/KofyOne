/**
 * KofyOne - Admin Settings API Route
 * Handles reading and updating platform settings, contributor tracking configs, and catalog defaults.
 */

import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getAdminSettings, saveAdminSettings } from '@/lib/data/admin-settings';
import { createClient } from '@/lib/supabase/server';
import { recordAuditLog } from '@/lib/data/audit-logs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const settings = await getAdminSettings();

    // Check live system health indicators
    let dbConnected = true;
    let publishedCount = 0;
    let storageBucketActive = true;

    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      if (error) {
        dbConnected = false;
      } else if (count !== null) {
        publishedCount = count;
      }

      // Check kofyone-media bucket status
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (!bucketError && buckets) {
        storageBucketActive = buckets.some((b) => b.name === 'kofyone-media');
      }
    } catch {
      dbConnected = false;
    }

    return NextResponse.json({
      settings,
      systemHealth: {
        dbConnected,
        publishedCount,
        storageBucketActive,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Configured',
        nodeEnv: process.env.NODE_ENV || 'development',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch admin settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const updated = await saveAdminSettings(body);

    await recordAuditLog({
      action: 'update_admin_settings',
      entityType: 'settings',
      details: { updated_by: profile.email },
      actorId: profile.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Admin settings saved successfully.',
      settings: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save admin settings' },
      { status: 500 }
    );
  }
}
