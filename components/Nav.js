'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const TABS = [
  { label: '🔬 Frog Builder', href: '/frog' },
  { label: '🐸 Breeds',       href: '/breeds' },
  { label: '📋 Set Builder',  href: '/customset' },
  { label: '📅 Weekly Sets',  href: '/set' },
  { label: '📊 Stats',        href: '/stats' },
];
export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="tabs">
      {TABS.map(t => (
        <Link key={t.href} href={t.href}
          className={'tab-btn' + (pathname.startsWith(t.href) ? ' active' : '')}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
