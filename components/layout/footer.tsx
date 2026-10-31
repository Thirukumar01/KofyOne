import Link from 'next/link';
import { getSiteBranding } from '@/lib/data/site-branding';
import { BrandingLogo } from '@/components/branding/branding-logo';

export async function Footer() {
  const branding = await getSiteBranding();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#F0DCDD] bg-[#FCECEB]/50 dark:border-[#2E2C30] dark:bg-[#151517]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <BrandingLogo branding={branding} variant="primary" showText={true} />
            <p className="text-xs sm:text-sm text-[#777171] dark:text-[#A8A2A2] max-w-sm leading-relaxed">
              An independent, student-focused technology resource discovery platform. Discover official learning paths, cloud credits, developer software, and AI programs across Microsoft, AWS, Google, and tech ecosystems.
            </p>
            <p className="text-[11px] text-[#777171]/80 dark:text-[#A8A2A2]/70">
              Not affiliated with Microsoft, AWS, or Google. Trademarks belong to their respective owners.
            </p>
          </div>

          {/* Directory Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#292526] dark:text-[#F6F5F3]">
              Directory
            </h4>
            <ul className="space-y-2 text-xs text-[#777171] dark:text-[#A8A2A2]">
              <li>
                <Link href="/resources" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  Explore Resources
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/platforms" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  Cloud Platforms
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  My Saved Favorites
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Community */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#292526] dark:text-[#F6F5F3]">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-[#777171] dark:text-[#A8A2A2]">
              <li>
                <Link href="/about" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  About KofyOne
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  Contact & Support
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/kofyone"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors"
                >
                  GitHub Project
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#292526] dark:text-[#F6F5F3]">
              Legal & Trust
            </h4>
            <ul className="space-y-2 text-xs text-[#777171] dark:text-[#A8A2A2]">
              <li>
                <Link href="/terms" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#B94A50] dark:hover:text-[#D98C91] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/admin/legal" className="text-[#777171] hover:text-[#292526] dark:text-[#A8A2A2] dark:hover:text-[#F6F5F3] transition-colors">
                  Admin CMS
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-[#F0DCDD] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-[#2E2C30] text-xs text-[#777171] dark:text-[#A8A2A2]">
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
            <Link href="/admin" className="text-[#B94A50] dark:text-[#D98C91] hover:underline font-medium">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
