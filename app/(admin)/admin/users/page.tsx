import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/admin-header';
import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';

interface UserProfileRow {
  id: string;
  email: string | null;
  role: string;
  full_name: string | null;
  created_at?: string;
}

export default async function AdminUsersPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/users');
  if (profile.role !== 'admin') redirect('/');

  let users: UserProfileRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select('id, email, role, full_name');
    if (data && data.length > 0) {
      users = data as unknown as UserProfileRow[];
    }
  } catch {}

  // Guarantee the current admin user is listed
  if (!users.some((u) => u.email === profile.email)) {
    users.unshift({
      id: profile.id,
      email: profile.email,
      role: 'admin',
      full_name: profile.full_name || 'System Administrator',
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="User Roles & Access Control"
        description="Manage user profiles, permissions, and administrator authorizations."
      />

      <div className="flex items-center gap-2">
        <Badge variant="brand">{users.length} Users Registered</Badge>
        <Badge variant="outline">
          {users.filter((u) => u.role === 'admin').length} Administrator
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Permissions</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium text-xs">
                      {u.role === 'admin' ? <Shield className="h-4 w-4 text-orange-600" /> : <User className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {u.full_name || 'Platform User'}
                      </div>
                      <div className="text-xs text-zinc-500">{u.email || 'No email attached'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={u.role === 'admin' ? 'brand' : 'outline'} className="capitalize">
                    {u.role}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">
                  {u.role === 'admin'
                    ? 'Full Administrator Access (Catalog, Users, Settings)'
                    : 'Standard User (Favorites, History, Discovery)'}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
