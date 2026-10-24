import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicPage } from '@/lib/data/site-pages';
import { LegalContentViewer } from '@/components/legal/legal-content-viewer';
import { Sparkles, ArrowLeft, Compass, GraduationCap, Code2, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About — KofyOne',
  description: 'The mission, values, and community behind KofyOne student technology discovery platform.',
};

export default async function AboutPage() {
  const page = await getPublicPage('about');

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
          <span className="text-xs font-medium text-zinc-400">Student Technology Discovery</span>
        </div>

        {/* Page Header */}
        <div className="mb-10 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white p-6 sm:p-10 shadow-xs dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-950">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            Platform Overview
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {page.title}
          </h1>
          {page.summary && (
            <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {page.summary}
            </p>
          )}

          {/* Value Highlights Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200/60 bg-white/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <Compass className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="mt-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">Multi-Cloud</h3>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Microsoft, AWS, Google</p>
            </div>
            <div className="rounded-xl border border-zinc-200/60 bg-white/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <GraduationCap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="mt-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">Student Free</h3>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Credits, certs, sandboxes</p>
            </div>
            <div className="rounded-xl border border-zinc-200/60 bg-white/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <Code2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="mt-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">Dev Tooling</h3>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">IDEs, AI, GitHub Packs</p>
            </div>
            <div className="rounded-xl border border-zinc-200/60 bg-white/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="mt-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">Independent</h3>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Community-curated</p>
            </div>
          </div>
        </div>

        {/* Story Body */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <LegalContentViewer content={page.content} />
        </div>

        {/* CTA Footer */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 p-8 text-center text-white shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold">Ready to Start Learning?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-orange-50">
            Explore hundreds of verified courses, developer programs, and cloud sandboxes right now.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/resources"
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-zinc-900 shadow-xs hover:bg-zinc-100 transition-colors"
            >
              Explore Directory
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
