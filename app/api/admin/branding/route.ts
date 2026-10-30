import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getSiteBranding, updateSiteBranding, resetSiteBranding } from '@/lib/data/site-branding';
import { recordAuditLog } from '@/lib/data/audit-logs';

export async function GET() {
  try {
    const branding = await getSiteBranding();
    return NextResponse.json({ success: true, branding });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve site branding.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const body = await request.json();
    const app_name = typeof body.app_name === 'string' && body.app_name.trim() ? body.app_name.trim() : 'KofyOne';
    const tagline = typeof body.tagline === 'string' ? body.tagline.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const primary_logo_url = typeof body.primary_logo_url === 'string' && body.primary_logo_url.trim() ? body.primary_logo_url.trim() : null;
    const compact_logo_url = typeof body.compact_logo_url === 'string' && body.compact_logo_url.trim() ? body.compact_logo_url.trim() : null;
    const square_icon_url = typeof body.square_icon_url === 'string' && body.square_icon_url.trim() ? body.square_icon_url.trim() : null;
    const favicon_url = typeof body.favicon_url === 'string' && body.favicon_url.trim() ? body.favicon_url.trim() : null;
    const logo_alt = typeof body.logo_alt === 'string' && body.logo_alt.trim() ? body.logo_alt.trim() : 'KofyOne Logo';

    const updated = await updateSiteBranding(
      {
        app_name,
        tagline,
        description,
        primary_logo_url,
        compact_logo_url,
        square_icon_url,
        favicon_url,
        logo_alt,
      },
      profile.id
    );

    await recordAuditLog({
      action: 'update_site_branding',
      entityType: 'site_branding',
      entityId: 'current',
      details: { app_name, tagline, description },
      actorId: profile.id,
    });

    return NextResponse.json({ success: true, branding: updated });
  } catch (err) {
    console.error('Error updating site branding:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update site branding.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const reset = await resetSiteBranding(profile.id);

    await recordAuditLog({
      action: 'reset_site_branding',
      entityType: 'site_branding',
      entityId: 'current',
      details: { reset_to_defaults: true },
      actorId: profile.id,
    });

    return NextResponse.json({ success: true, branding: reset });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reset site branding.' },
      { status: 500 }
    );
  }
}
