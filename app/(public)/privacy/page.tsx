import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicPage } from '@/lib/data/site-pages';
import { LegalContentViewer } from '@/components/legal/legal-content-viewer';
import { Lock, Calendar, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — KofyOne',
  description: 'How KofyOne collects, processes, and protects your personal data and account credentials.',
};

export default async function PrivacyPage() {
  const page = await getPublicPage('privacy');

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
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F0DCDD] dark:border-[#2E2C30] bg-[#FCECEB] dark:bg-[#252429] px-3 py-1 text-xs text-[#777171] dark:text-[#A8A2A2]">
              <Calendar className="h-3 w-3 text-[#B94A50] dark:text-[#D98C91]" />
              Effective: {formattedDate}
            </div>
          )}
        </div>

        {/* Page Header */}
        <div className="mb-10 rounded-2xl border border-[#F0DCDD] bg-white p-6 sm:p-10 shadow-xs dark:border-[#2E2C30] dark:bg-[#1E1E22] transition-colors">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#B94A50] dark:text-[#D98C91] uppercase tracking-wider">
            <Lock className="h-4 w-4" />
            Privacy & Data Security
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#292526] dark:text-[#F6F5F3]">
            {page.title}
          </h1>
          {page.summary && (
            <p className="mt-3 text-base sm:text-lg text-[#777171] dark:text-[#A8A2A2] leading-relaxed">
              {page.summary}
            </p>
          )}
        </div>

        {/* Policy Body */}
        <div className="rounded-2xl border border-[#F0DCDD] bg-white p-6 sm:p-10 shadow-xs dark:border-[#2E2C30] dark:bg-[#1E1E22] transition-colors">
          <LegalContentViewer content={page.content} />
        </div>

        {/* Footer Support Notice */}
        <div className="mt-10 rounded-xl border border-[#F0DCDD] bg-[#FCECEB]/50 p-6 text-center dark:border-[#2E2C30] dark:bg-[#252429]/50">
          <p className="text-sm text-[#777171] dark:text-[#A8A2A2]">
            Want to exercise your data rights or request account deletion? Visit your{' '}
            <Link href="/settings/security" className="font-semibold text-[#B94A50] dark:text-[#D98C91] hover:underline">
              Security Settings
            </Link>{' '}
            or contact our privacy team via{' '}
            <Link href="/contact" className="font-semibold text-[#B94A50] dark:text-[#D98C91] hover:underline">
              Contact Portal
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
