import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/config/site';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AnalyticsProvider } from '@/components/common/analytics-provider';
import { ThemeProvider } from '@/components/common/theme-provider';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('kofyone-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var el=document.documentElement;el.classList.toggle('dark',d);el.classList.toggle('light',!d);el.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-white text-slate-900 font-sans transition-colors duration-150 dark:bg-zinc-950 dark:text-zinc-50">
        <ThemeProvider>
          <AnalyticsProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
