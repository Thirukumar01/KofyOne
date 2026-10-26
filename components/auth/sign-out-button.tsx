'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Non-fatal if logout fetch encounters network issue
    } finally {
      router.push('/');
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
    >
      {loading ? 'Signing out…' : 'Sign Out'}
    </button>
  );
}
