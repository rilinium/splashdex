import './globals.css';
import Nav from '@/components/Nav';
import { SettingsProvider } from '@/contexts/SettingsContext';

export const metadata = {
  title: { default: 'Splashdex', template: '%s — Splashdex' },
  description: 'Pocket Frogs breed reference — 44,160 combinations, weekly sets, and frog builder.',
  icons: { icon: '/favicon.ico', apple: '/icon-192.png' },
  manifest: '/manifest.json',
  themeColor: '#1e1e2e',
  openGraph: {
    siteName: 'Splashdex',
    images: [{ url: '/embedbanner.png' }],
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <header className="hdr">
            <div className="hdr-inner">
              <img src="/Splashdex.svg" alt="Splashdex" className="hdr-logo" />
              <div className="hdr-right">
                23 colors · 16 patterns · 120 genera<br />
                44,160 total combinations
              </div>
            </div>
          </header>
          <Nav />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>
          <div className="hdr-version">
            splashdex by{' '}
            <a href="https://github.com/rilinium" target="_blank" rel="noopener">rilinium</a>
            {' · '}v2.0.0 partiri{' · '}
            <span title="Splashdex is an unofficial fan tool and is not affiliated with Nimblebit LLC.">
              not affiliated with nimblebit
            </span>
          </div>
          <script defer src="/_vercel/insights/script.js" />
        </SettingsProvider>
      </body>
    </html>
  );
}
