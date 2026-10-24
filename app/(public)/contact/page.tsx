import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicPage } from '@/lib/data/site-pages';
import { LegalContentViewer } from '@/components/legal/legal-content-viewer';
import { ContactForm } from '@/components/contact/contact-form';
import { Mail, ArrowLeft, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact & Support — KofyOne',
  description: 'Reach out to the KofyOne team for platform assistance, feedback, or resource submissions.',
};

export default async function ContactPage() {
  const page = await getPublicPage('contact');

  if (!page) {
    notFound();
  }

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
          <span className="text-xs font-medium text-zinc-400">Community Support</span>
        </div>

        {/* Page Header */}
        <div className="mb-10 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white p-6 sm:p-10 shadow-xs dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-950">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            <Mail className="h-4 w-4" />
            Help & Communication
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

        {/* Interactive Form Section */}
        <div className="mb-12">
          <ContactForm />
        </div>

        {/* Contact Information & FAQs */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <HelpCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            Frequently Asked Questions & Contact Channels
          </div>
          <LegalContentViewer content={page.content} />
        </div>
      </div>
    </div>
  );
}
