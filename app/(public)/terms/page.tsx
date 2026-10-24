import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicPage } from '@/lib/data/site-pages';
import { LegalContentViewer } from '@/components/legal/legal-content-viewer';
import { ShieldCheck, Calendar, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions — KofyOne',
  description: 'Terms governing access and educational use of the KofyOne discovery platform.',
};

export default async function TermsPage() {
  const page = await getPublicPage('terms');

  if (!page) {
    notFound();
  }

  const formattedDate = page.updated_at
    ? new Date(page.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
          {formattedDate && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400">
              <Calendar className="h-3 w-3 text-orange-600 dark:text-orange-400" />
              Effective: {formattedDate}
            </div>
          )}
        </div>

        {/* Page Header */}
        <div className="mb-10 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white p-6 sm:p-10 shadow-xs dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-950">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Legal Agreement
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {page.title}
          </h1>
          {page.summary && (
            <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {page.summary}
            </p>
          )}
        </div>

        {/* Policy Body */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <LegalContentViewer content={page.content} />
        </div>

        {/* Footer Support Notice */}
        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Have questions regarding these terms? Reach out through our{' '}
            <Link href="/contact" className="font-semibold text-orange-600 dark:text-orange-400 hover:underline">
              Contact & Support Portal
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
