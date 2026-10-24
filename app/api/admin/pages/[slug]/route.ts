import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getAdminPageBySlug, updateAdminPage, resetPageToDefault } from '@/lib/data/site-pages';
import { LegalPageSlug } from '@/types/legal';

const VALID_SLUGS: LegalPageSlug[] = ['terms', 'privacy', 'about', 'contact'];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { slug } = await params;
    if (!VALID_SLUGS.includes(slug as LegalPageSlug)) {
      return NextResponse.json({ error: 'Invalid page slug.' }, { status: 404 });
    }

    const page = await getAdminPageBySlug(slug as LegalPageSlug);
    return NextResponse.json({ success: true, page });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch page.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { slug } = await params;
    if (!VALID_SLUGS.includes(slug as LegalPageSlug)) {
      return NextResponse.json({ error: 'Invalid page slug.' }, { status: 404 });
    }

    const body = await request.json();
    const { title, summary, content, is_published } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Page title is required.' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Page content is required.' }, { status: 400 });
    }

    const updated = await updateAdminPage(
      slug as LegalPageSlug,
      {
        title: title.trim(),
        summary: typeof summary === 'string' ? summary.trim() : '',
        content,
        is_published: typeof is_published === 'boolean' ? is_published : true,
      },
      profile.id
    );

    return NextResponse.json({ success: true, page: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update page.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { slug } = await params;
    if (!VALID_SLUGS.includes(slug as LegalPageSlug)) {
      return NextResponse.json({ error: 'Invalid page slug.' }, { status: 404 });
    }

    const body = await request.json();
    if (body.action === 'reset') {
      const resetPage = await resetPageToDefault(slug as LegalPageSlug, profile.id);
      return NextResponse.json({ success: true, page: resetPage, message: 'Page restored to default.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process request.' },
      { status: 500 }
    );
  }
}
