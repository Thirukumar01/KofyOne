import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminHeader } from '@/components/admin/admin-header';
import { Badge } from '@/components/ui/badge';
import { UsersDirectory, AdminUserItem } from '@/components/admin/users-directory';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/users');
  if (profile.role !== 'admin') redirect('/');

  let users: AdminUserItem[] = [];

  try {
    const supabase = await createClient();
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    const client = adminClient || supabase;

    // Fetch registered profiles
    const { data: rawProfiles } = await client
      .from('profiles')
      .select('id, email, role, full_name, display_name, username, avatar_url, learner_role, preferred_platform, created_at')
      .order('created_at', { ascending: false });

    // Fetch user roles to guarantee authoritative synchronization
    const { data: rawRoles } = await client
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map<string, string>();
    if (rawRoles) {
      const roles = rawRoles as unknown as Array<{ user_id: string; role: string }>;
      for (const r of roles) {
        roleMap.set(r.user_id, r.role);
      }
    }

    if (rawProfiles && rawProfiles.length > 0) {
      const profilesData = rawProfiles as unknown as Array<{
        id: string;
        email: string | null;
        role: string;
        full_name: string | null;
        display_name?: string | null;
        username?: string | null;
        avatar_url?: string | null;
        learner_role?: string | null;
        preferred_platform?: string | null;
        created_at?: string;
      }>;

      users = profilesData.map((p) => ({
        id: p.id,
        email: p.email,
        role: roleMap.get(p.id) || p.role || 'student',
        full_name: p.full_name,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        learner_role: p.learner_role || 'student',
        preferred_platform: p.preferred_platform || 'Microsoft',
        created_at: p.created_at,
      }));
    }
  } catch (err) {
    console.warn('[AdminUsers] Failed to fetch users:', err);
  }

  // Guarantee the current admin user is present
  if (!users.some((u) => u.id === profile.id || u.email === profile.email)) {
    users.unshift({
      id: profile.id,
      email: profile.email,
      role: 'admin',
      full_name: profile.full_name || 'System Administrator',
      display_name: profile.display_name || 'Admin',
      username: profile.username || 'admin',
      avatar_url: profile.avatar_url || 'avatar-student-1',
      learner_role: profile.learner_role || 'developer',
      preferred_platform: profile.preferred_platform || 'Microsoft',
      created_at: profile.created_at || new Date().toISOString(),
    });
  }

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const studentCount = users.length - adminCount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="User Roles & Access Control"
        description="Manage user profiles, learner stages, preferred ecosystems, and system administrator access."
      />

      <div className="flex items-center gap-2">
        <Badge variant="brand">{users.length} Users Registered</Badge>
        <Badge variant="outline">{adminCount} Administrators</Badge>
        <Badge variant="outline">{studentCount} Students & Learners</Badge>
      </div>

      <UsersDirectory initialUsers={users} currentAdminId={profile.id} />
    </div>
  );
}
