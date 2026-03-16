import { COLORS, PATTERNS, GENERA } from '@/lib/gameData';
import { frogFullName, fdexBit } from '@/lib/gameHelpers';
import FrogBuilder from '@/components/FrogBuilder';

export async function generateMetadata({ searchParams }) {
  const raw = (await searchParams)?.frog;
  if (raw) {
    const [c, p, g] = raw.split('-').map(Number);
    if (COLORS[c] && PATTERNS[p] !== undefined && GENERA[g] !== undefined) {
      const name = frogFullName(c, p, g);
      const idx  = fdexBit(c, p, g);
      const isChroma = p === 15;
      const ogUrl = `/api/og?frog=${encodeURIComponent(raw)}${isChroma ? '&gif=1' : ''}`;
      return {
        title: name,
        description: `${name} · Splashdex Index #${idx}`,
        openGraph: {
          title: name + ' — Splashdex',
          description: `${name} · Splashdex Index #${idx}`,
          images: [{ url: ogUrl }],
          ...(isChroma ? { videos: [{ url: ogUrl, type: 'image/gif', width: 608, height: 608 }] } : {}),
        },
        twitter: { card: 'summary_large_image', images: [ogUrl] },
      };
    }
  }
  return { title: 'Frog Builder', openGraph: { images: [{ url: '/embedbanner.png' }] } };
}

export default async function FrogPage({ searchParams }) {
  const params = await searchParams;
  return <FrogBuilder initialFrog={params?.frog ?? null} />;
}
