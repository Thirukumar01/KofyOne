'use client';

import { useState } from 'react';
import { PresetAvatar } from '@/components/common/preset-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, ShieldAlert, User, Search, RefreshCw, CheckCircle2 } from 'lucide-react';

export interface AdminUserItem {
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
}

interface UsersDirectoryProps {
  initialUsers: AdminUserItem[];
  currentAdminId: string;
}

export function UsersDirectory({ initialUsers, currentAdminId }: UsersDirectoryProps) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (u.display_name || u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const learnerRole = (u.learner_role || '').toLowerCase();
    const platform = (u.preferred_platform || '').toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      username.includes(q) ||
      learnerRole.includes(q) ||
      platform.includes(q)
    );
  });

  const handleToggleRole = async (targetUser: AdminUserItem) => {
    if (targetUser.id === currentAdminId) {
      setFeedback({ message: 'Security restriction: You cannot demote or alter your own administrator account.', isError: true });
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'student' : 'admin';
    const confirmText = targetUser.role === 'admin'
      ? `Revoke administrator privileges for ${targetUser.display_name || targetUser.full_name || targetUser.email}?`
      : `Grant administrator privileges to ${targetUser.display_name || targetUser.full_name || targetUser.email}?`;

    if (!window.confirm(confirmText)) return;

    setLoadingId(targetUser.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update user role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      setFeedback({ message: `Successfully updated ${targetUser.display_name || targetUser.email}'s role to ${newRole}.` });
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'An error occurred while updating role.',
        isError: true,
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by name, email, @username, or ecosystem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-500 mr-1">Filter Role:</span>
          {(['all', 'admin', 'student'] as const).map((rf) => (
            <button
              key={rf}
              type="button"
              onClick={() => setRoleFilter(rf)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                roleFilter === rf
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {rf}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
            feedback.isError
              ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
          }`}
        >
          {feedback.isError ? (
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-4">User & Identity</th>
              <th className="px-6 py-4">Stage & Focus</th>
              <th className="px-6 py-4">Ecosystem</th>
              <th className="px-6 py-4">System Role</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-xs text-zinc-500">
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isCurrent = u.id === currentAdminId;
                const isAdmin = u.role === 'admin';
                const displayName = u.display_name || u.full_name || 'Platform User';
                const userHandle = u.username ? `@${u.username}` : (u.email ? u.email.split('@')[0] : 'user');

                return (
                  <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <PresetAvatar avatarId={u.avatar_url} size={36} />
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            {displayName}
                            {isCurrent && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 border-orange-300 text-orange-600 dark:text-orange-400">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">{userHandle} • {u.email || 'No email attached'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {u.learner_role || 'student'}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {u.preferred_platform || 'Microsoft'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        variant={isAdmin ? 'brand' : 'outline'}
                        className={`capitalize text-xs flex items-center gap-1 w-fit ${
                          isAdmin ? 'bg-orange-600 text-white' : ''
                        }`}
                      >
                        {isAdmin ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {u.role}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-xs text-zinc-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {isCurrent ? (
                        <span className="text-xs font-medium text-zinc-400 italic" title="Cannot modify your own administrator role">
                          Active Admin
                        </span>
                      ) : (
                        <Button
                          variant={isAdmin ? 'outline' : 'primary'}
                          size="sm"
                          disabled={loadingId === u.id}
                          onClick={() => handleToggleRole(u)}
                          className="h-8 text-xs"
                        >
                          {loadingId === u.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : isAdmin ? (
                            'Demote to Student'
                          ) : (
                            'Make Admin'
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
