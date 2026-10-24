import Link from 'next/link';
import { getSiteBranding } from '@/lib/data/site-branding';
import { BrandingLogo } from '@/components/branding/branding-logo';

export async function Footer() {
  const branding = await getSiteBranding();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <BrandingLogo branding={branding} variant="primary" showText={true} />
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed">
              An independent, student-focused technology resource discovery platform. Discover official learning paths, cloud credits, developer software, and AI programs across Microsoft, AWS, Google, and tech ecosystems.
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Not affiliated with Microsoft, AWS, or Google. Trademarks belong to their respective owners.
            </p>
          </div>

          {/* Directory Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Directory
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/resources" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Explore Resources
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/platforms" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Cloud Platforms
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  My Saved Favorites
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Community */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/about" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  About KofyOne
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Contact & Support
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/kofyone"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  GitHub Project
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Legal & Trust
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/terms" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/admin/legal" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                  Admin CMS
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-zinc-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {currentYear} {branding.app_name}. Built for students and lifelong tech builders.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
            <span>•</span>
            <Link href="/admin" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
