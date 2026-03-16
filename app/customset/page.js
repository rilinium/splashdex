import CustomSetBuilder from '@/components/CustomSetBuilder';
export async function generateMetadata({ searchParams }) {
  const p = await searchParams;
  if (p?.builder) {
    const name = p?.name ?? 'Custom Set';
    return {
      title: name,
      description: `${name} · Custom set · Splashdex`,
      openGraph: {
        title: `${name} — Splashdex`,
        images: [{ url: `/api/og?builder=${encodeURIComponent(p.builder)}&name=${encodeURIComponent(name)}` }],
      },
    };
  }
  return { title: 'Set Builder', openGraph: { images: [{ url: '/embedbanner.png' }] } };
}
export default async function CustomSetPage({ searchParams }) {
  const p = await searchParams;
  return <CustomSetBuilder initialBuilder={p?.builder ?? null} initialName={p?.name ?? ''} />;
}
