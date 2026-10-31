'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'loading') return;

    if (!email.trim() || !message.trim()) {
      setStatus('error');
      setFeedback('Please provide both your email address and message.');
      return;
    }

    setStatus('loading');
    setFeedback('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          hp: honeypot, // Honeypot field for bot detection
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit message.');
      }

      setStatus('success');
      setFeedback(data.message || 'Thank you! Your message has been received.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setFeedback(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }

  return (
    <div className="rounded-2xl border border-[#F0DCDD] bg-white p-6 shadow-sm dark:border-[#2E2C30] dark:bg-[#1E1E22] sm:p-8 transition-colors">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-[#292526] dark:text-[#F6F5F3]">
          Send Us a Message
        </h2>
        <p className="mt-1 text-sm text-[#777171] dark:text-[#A8A2A2]">
          Have a question, resource suggestion, or feedback? Drop us a note below.
        </p>
      </div>

      {status === 'success' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm">
            <p className="font-semibold">Message Delivered!</p>
            <p className="mt-0.5">{feedback}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-50/50 p-4 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-sm">
            <p className="font-semibold">Could Not Send</p>
            <p className="mt-0.5">{feedback}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hidden Honeypot to detect bots */}
        <input
          type="text"
          name="website_url"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Your Name
            </label>
            <Input
              id="contact-name"
              type="text"
              placeholder="e.g. Alex Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <Input
              id="contact-email"
              type="email"
              required
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-subject" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Subject
          </label>
          <Input
            id="contact-subject"
            type="text"
            placeholder="e.g. Suggestion for Microsoft Azure Student credits"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={status === 'loading'}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-message" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Message <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="contact-message"
            required
            rows={5}
            placeholder="Tell us what's on your mind..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === 'loading'}
            className="w-full rounded-xl border border-[#F0DCDD] bg-[#FCECEB] p-3 text-sm text-[#292526] placeholder:text-[#777171] shadow-xs focus:border-[#B94A50] focus:outline-hidden focus:ring-2 focus:ring-[#B94A50]/20 dark:border-[#2E2C30] dark:bg-[#252429] dark:text-[#F6F5F3] dark:placeholder:text-[#A8A2A2] dark:focus:border-[#D98C91] transition-colors"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={status === 'loading'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending Message...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
