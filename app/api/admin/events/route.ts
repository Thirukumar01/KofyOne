import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllAdminEvents } from '@/lib/data/events-and-updates';
import { recordAuditLog } from '@/lib/data/audit-logs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const events = await getAllAdminEvents();
    return NextResponse.json({ success: true, events });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch events.' },
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
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const event_date = typeof body.event_date === 'string' ? body.event_date.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : 'Virtual / Global';
    const category = typeof body.category === 'string' ? body.category.trim() : 'Hackathon';
    const official_url = typeof body.official_url === 'string' ? body.official_url.trim() : null;
    const is_published = body.is_published !== false;

    if (!title || !description || !event_date) {
      return NextResponse.json({ error: 'Title, description, and event date are required.' }, { status: 400 });
    }

    const slug = body.slug
      ? String(body.slug).trim().toLowerCase()
      : title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');

    const supabase = await createClient();
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    const client = adminClient || supabase;

    const newEvent = {
      title,
      slug,
      description,
      event_date,
      location,
      category,
      official_url,
      is_published,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('events') as any)
      .insert(newEvent)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await recordAuditLog({
      action: 'create_event',
      entityType: 'event',
      entityId: slug,
      details: { title, category, event_date },
      actorId: profile.id,
    });

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create event.' },
      { status: 500 }
    );
  }
}
