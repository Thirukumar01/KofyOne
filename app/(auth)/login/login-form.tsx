'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      setStatus('sent');
      setMessage('Check your inbox for a secure sign-in link.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send sign-in link.');
    }
  }
  return <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">Email address</label><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div><Button className="w-full" disabled={status === 'loading'}>{status === 'loading' ? 'Sending…' : 'Continue with email'}</Button>{message && <p role={status === 'error' ? 'alert' : 'status'} className={status === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-700'}>{message}</p>}</form>;
}
