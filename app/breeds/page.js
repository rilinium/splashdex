import BreedsGrid from '@/components/BreedsGrid';
export const metadata = {
  title: 'Breeds',
  description: 'Browse all 44,160 Pocket Frogs frog combinations.',
  openGraph: { images: [{ url: '/embedbanner.png' }] },
};
export default async function BreedsPage({ searchParams }) {
  const p = await searchParams;
  return <BreedsGrid initialColor={p?.color ?? ''} initialPattern={p?.pattern ?? ''} initialGenus={p?.genus ?? ''} />;
}
