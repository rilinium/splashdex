import { COLORS, PATTERN_COLORS, GENERA } from '@/lib/gameData';
import { parseSetsText } from '@/lib/gameHelpers';

export const metadata = {
  title: 'Stats',
  description: 'Splashdex server statistics and game data.',
};

function fmt(n) { return n.toLocaleString('en-US'); }
function uptimeStr(sec) {
  const s = Math.floor(sec);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

export default async function StatsPage() {
  const N_COLORS   = Object.keys(COLORS).length;
  const N_PATTERNS = Object.keys(PATTERN_COLORS).length;
  const N_GENERA   = Object.keys(GENERA).length;
  const N_TOTAL    = N_COLORS * N_PATTERNS * N_GENERA;
  let sets = 0;
  try {
    const res = await fetch('https://www.nimblebit.com/sets.txt', { next: { revalidate: 3600 } });
    if (res.ok) sets = parseSetsText(await res.text()).length;
  } catch (_) {}

  return (
    <div className="page-panel">
      <h2 style={{ color: 'var(--lavender)', marginBottom: '1.5rem' }}>Splashdex Stats</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Combinations', value: fmt(N_TOTAL), color: 'var(--blue)' },
          { label: 'Colors',   value: N_COLORS,   color: 'var(--green)' },
          { label: 'Patterns', value: N_PATTERNS, color: 'var(--mauve)' },
          { label: 'Genera',   value: N_GENERA,   color: 'var(--peach)' },
          { label: 'Weekly Sets Tracked', value: sets, color: 'var(--teal)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem 1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: '0.35rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Container Uptime', value: uptimeStr(process.uptime()) },
          { label: 'Server Time', value: new Date().toUTCString() },
          { label: 'Runtime', value: `Node ${process.version}` },
          { label: 'Platform', value: `${process.platform} ${process.arch}` },
        ].map(r => (
          <div key={r.label} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--overlay1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</span>
            <span style={{ fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
