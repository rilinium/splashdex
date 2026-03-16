import { parseSetsText, parseWeekCode } from '@/lib/gameHelpers';
import SetsGrid from '@/components/SetsGrid';

export async function generateMetadata({ searchParams }) {
  const p = await searchParams;
  const setCode = p?.set;
  if (setCode) {
    try {
      const res = await fetch('https://www.nimblebit.com/sets.txt', { next: { revalidate: 3600 } });
      if (res.ok) {
        const sets = parseSetsText(await res.text());
        const found = sets.find(s => String(s.code) === String(setCode));
        if (found) {
          return {
            title: found.name,
            description: `${found.name} · ${parseWeekCode(found.code)} · Pocket Frogs weekly set`,
            openGraph: {
              title: found.name + ' — Splashdex',
              images: [{ url: `/api/og?set=${encodeURIComponent(setCode)}` }],
            },
          };
        }
      }
    } catch (_) {}
  }
  return { title: 'Weekly Sets', openGraph: { images: [{ url: '/embedbanner.png' }] } };
}

export default async function SetPage({ searchParams }) {
  const p = await searchParams;
  let initialSets = [];
  try {
    const res = await fetch('https://www.nimblebit.com/sets.txt', { next: { revalidate: 3600 } });
    if (res.ok) initialSets = parseSetsText(await res.text());
  } catch (_) {}
  return <SetsGrid initialSets={initialSets} initialSetCode={p?.set ?? null} />;
}
