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
        <div className="mb-10 rounded-2xl border border-[#F0DCDD] bg-white p-6 sm:p-10 shadow-xs dark:border-[#2E2C30] dark:bg-[#1E1E22] transition-colors">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#B94A50] dark:text-[#D98C91] uppercase tracking-wider">
            <Mail className="h-4 w-4" />
            Help & Communication
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

        {/* Interactive Form Section */}
        <div className="mb-12">
          <ContactForm />
        </div>

        {/* Contact Information & FAQs */}
        <div className="rounded-2xl border border-[#F0DCDD] bg-white p-6 sm:p-10 shadow-xs dark:border-[#2E2C30] dark:bg-[#1E1E22] transition-colors">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#292526] dark:text-[#F6F5F3]">
            <HelpCircle className="h-4 w-4 text-[#B94A50] dark:text-[#D98C91]" />
            Frequently Asked Questions & Contact Channels
          </div>
          <LegalContentViewer content={page.content} />
        </div>
      </div>
    </div>
  );
}
