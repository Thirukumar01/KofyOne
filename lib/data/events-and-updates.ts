import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface StudentEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  event_date: string;
  location: string;
  category: string;
  official_url: string | null;
  is_published: boolean;
  display_order?: number;
  created_at?: string;
}

export interface PlatformUpdate {
  id: string;
  title: string;
  slug: string;
  description: string;
  published_date: string;
  badge: string;
  is_published: boolean;
  display_order?: number;
  created_at?: string;
}

export const SEED_EVENTS: StudentEvent[] = [
  {
    id: 'ev-1',
    title: 'Microsoft Imagine Cup 2026',
    slug: 'microsoft-imagine-cup-2026',
    description: 'The premier global student competition for building innovative AI and cloud technology solutions with mentorship and global prizes.',
    event_date: 'November 15, 2026',
    location: 'Virtual / Global',
    category: 'Hackathon',
    official_url: 'https://imaginecup.microsoft.com/',
    is_published: true,
    display_order: 1,
    created_at: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'ev-2',
    title: 'GitHub Global Campus Challenge',
    slug: 'github-global-campus-challenge',
    description: 'Build and showcase open-source developer workflows, actions, and collaborative software projects with student leaders worldwide.',
    event_date: 'December 1, 2026',
    location: 'Online Livestream',
    category: 'Challenge',
    official_url: 'https://education.github.com/',
    is_published: true,
    display_order: 2,
    created_at: '2026-10-05T00:00:00.000Z',
  },
  {
    id: 'ev-3',
    title: 'Google Cloud AI Study Jam',
    slug: 'google-cloud-ai-study-jam',
    description: 'Hands-on interactive learning sprint covering Vertex AI, Gemini models, and generative cloud development for campus chapters.',
    event_date: 'October 28, 2026',
    location: 'Community Hubs & Online',
    category: 'Workshop',
    official_url: 'https://cloud.google.com/innovators/',
    is_published: true,
    display_order: 3,
    created_at: '2026-10-10T00:00:00.000Z',
  },
];

export const SEED_UPDATES: PlatformUpdate[] = [
  {
    id: 'up-1',
    title: 'Azure AI Foundry Integration',
    slug: 'azure-ai-foundry-integration',
    description: 'Added complete learning path for Azure AI model catalog, inference endpoints, and enterprise generative AI SDKs.',
    published_date: 'October 2026',
    badge: 'Major',
    is_published: true,
    display_order: 1,
    created_at: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'up-2',
    title: 'Multi-Provider Student Hub Launch',
    slug: 'multi-provider-student-hub-launch',
    description: 'Expanded student and developer resources across AWS, Google Cloud, and GitHub ecosystems with centralized discovery.',
    published_date: 'October 2026',
    badge: 'Feature',
    is_published: true,
    display_order: 2,
    created_at: '2026-10-20T00:00:00.000Z',
  },
  {
    id: 'up-3',
    title: 'Student Developer Pack Direct Verification',
    slug: 'student-developer-pack-direct-verification',
    description: 'Streamlined authentication and free credit claiming flows without credit card requirements across student programs.',
    published_date: 'September 2026',
    badge: 'Release',
    is_published: true,
    display_order: 3,
    created_at: '2026-09-28T00:00:00.000Z',
  },
];

export async function getPublishedEvents(): Promise<StudentEvent[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as StudentEvent[];
    }
    return SEED_EVENTS;
  } catch {
    return SEED_EVENTS;
  }
}

export async function getAllAdminEvents(): Promise<StudentEvent[]> {
  try {
    const supabase = await createClient();
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    const client = adminClient || supabase;

    const { data, error } = await client
      .from('events')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as StudentEvent[];
    }
    return SEED_EVENTS;
  } catch {
    return SEED_EVENTS;
  }
}

export async function getPublishedUpdates(): Promise<PlatformUpdate[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as PlatformUpdate[];
    }
    return SEED_UPDATES;
  } catch {
    return SEED_UPDATES;
  }
}

export async function getAllAdminUpdates(): Promise<PlatformUpdate[]> {
  try {
    const supabase = await createClient();
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    const client = adminClient || supabase;

    const { data, error } = await client
      .from('updates')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as PlatformUpdate[];
    }
    return SEED_UPDATES;
  } catch {
    return SEED_UPDATES;
  }
}

