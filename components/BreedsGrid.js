'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  COLORS, PATTERNS, GENERA,
  COLOR_KEYS, PATTERN_KEYS, GENUS_KEYS,
  BREEDS_PER_PAGE,
} from '@/lib/gameData';
import { frogFullName, fdexBit } from '@/lib/gameHelpers';
import { useChromaAnimation } from '@/hooks/useChromaAnimation';
import FrogCanvas from '@/components/FrogCanvas';
import { useSettings } from '@/contexts/SettingsContext';

const GRID_MIN = { small: '100px', medium: '130px', large: '170px' };

export default function BreedsGrid({ initialColor, initialPattern, initialGenus }) {
  const router = useRouter();
  const hueRef = useChromaAnimation();
  const chromaCanvasesRef = useRef(new Map());
  const { settings } = useSettings();

  const [query,      setQuery]      = useState('');
  const [colorF,     setColorF]     = useState(initialColor ?? '');
  const [patternF,   setPatternF]   = useState(initialPattern ?? '');
  const [genusF,     setGenusF]     = useState(initialGenus ?? '');
  const [page,       setPage]       = useState(0);
  const [inited,     setInited]     = useState(false);

  // RAF loop to re-render Chroma canvases
  useEffect(() => {
    let raf;
    const tick = () => {
      chromaCanvasesRef.current.forEach(renderFn => renderFn());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Initialize from URL on mount; fall back to saved defaults if no URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const hasParams = sp.get('color') || sp.get('pattern') || sp.get('genus');
      if (hasParams) {
        if (sp.get('color'))   setColorF(sp.get('color'));
        if (sp.get('pattern')) setPatternF(sp.get('pattern'));
        if (sp.get('genus'))   setGenusF(sp.get('genus'));
      } else {
        if (settings.defaultColor)   setColorF(settings.defaultColor);
        if (settings.defaultPattern) setPatternF(settings.defaultPattern);
        if (settings.defaultGenus)   setGenusF(settings.defaultGenus);
      }
    }
    setInited(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // URL sync
  useEffect(() => {
    if (!inited) return;
    const params = new URLSearchParams();
    if (colorF)   params.set('color',   colorF);
    if (patternF) params.set('pattern', patternF);
    if (genusF)   params.set('genus',   genusF);
    const qs = params.toString();
    router.replace('/breeds' + (qs ? '?' + qs : ''));
  }, [colorF, patternF, genusF, inited]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [query, colorF, patternF, genusF]);

  const { pageItems, total } = useMemo(() => {
    const cFilter = colorF   !== '' ? parseInt(colorF)   : null;
    const pFilter = patternF !== '' ? parseInt(patternF) : null;
    const gFilter = genusF   !== '' ? parseInt(genusF)   : null;
    const q = query.trim().toLowerCase();

    const pageStart = page * BREEDS_PER_PAGE;
    const pageEnd   = pageStart + BREEDS_PER_PAGE;
    let total = 0;
    const pageItems = [];

    for (const c of COLOR_KEYS) {
      if (cFilter !== null && c !== cFilter) continue;
      for (const p of PATTERN_KEYS) {
        if (pFilter !== null && p !== pFilter) continue;
        for (const g of GENUS_KEYS) {
          if (gFilter !== null && g !== gFilter) continue;
          if (q) {
            const cleanQ = q.startsWith('#') ? q.slice(1) : q;
            const isDexSearch = /^\d+$/.test(cleanQ);
            if (isDexSearch) {
              if (String(fdexBit(c, p, g)) !== cleanQ) continue;
            } else {
              if (!frogFullName(c, p, g).toLowerCase().includes(q)) continue;
            }
          }
          if (total >= pageStart && total < pageEnd) pageItems.push([c, p, g]);
          total++;
        }
      }
    }
    return { pageItems, total };
  }, [query, colorF, patternF, genusF, page]);

  const totalPages = Math.max(1, Math.ceil(total / BREEDS_PER_PAGE));

  const handleReset = () => {
    setQuery('');
    setColorF('');
    setPatternF('');
    setGenusF('');
    setPage(0);
  };

  const handleCardClick = (c, p, g) => {
    router.push('/frog?frog=' + c + '-' + p + '-' + g);
  };

  const handlePageChange = (delta) => {
    setPage(prev => Math.max(0, Math.min(prev + delta, totalPages - 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-panel">
      <div className="species-toolbar">
        <div className="breeds-search-row">
          <input
            className="search-input"
            type="search"
            placeholder="Search color, pattern, genus, or #index…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="count-lbl">{total.toLocaleString()} / 44,160 breeds</span>
        </div>
        <div className="breeds-filter-row">
          <select className="filter-select" value={colorF} onChange={e => setColorF(e.target.value)}>
            <option value="">All Colors</option>
            {COLOR_KEYS.map(id => (
              <option key={id} value={id}>{COLORS[id][0]}</option>
            ))}
          </select>
          <select className="filter-select" value={patternF} onChange={e => setPatternF(e.target.value)}>
            <option value="">All Patterns</option>
            {PATTERN_KEYS.map(id => (
              <option key={id} value={id}>{PATTERNS[id]}</option>
            ))}
          </select>
          <select className="filter-select" value={genusF} onChange={e => setGenusF(e.target.value)}>
            <option value="">All Genera</option>
            {GENUS_KEYS.map(id => (
              <option key={id} value={id}>{GENERA[id]}</option>
            ))}
          </select>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--surface0)', color: 'var(--subtext0)', border: '1px solid var(--surface1)' }}
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="species-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_MIN[settings.gridDensity] || '130px'}, 1fr))` }}>
        {pageItems.map(([c, p, g]) => {
          const label = frogFullName(c, p, g);
          const dexId = fdexBit(c, p, g);
          return (
            <div
              key={dexId}
              className="species-card"
              title={label}
              onClick={() => handleCardClick(c, p, g)}
            >
              <FrogCanvas
                colorId={c}
                patternId={p}
                genusId={g}
                size={72}
                chromaHueRef={p === 15 ? hueRef : null}
                chromaCanvasesRef={p === 15 ? chromaCanvasesRef : null}
                observe={p !== 15}
              />
              <div className="species-name">{label}</div>
              <div className="species-id">#{dexId}</div>
            </div>
          );
        })}
      </div>

      {total > BREEDS_PER_PAGE && (
        <div className="breeds-pagination">
          <button
            className="btn"
            style={{ background: 'var(--surface0)', color: 'var(--subtext0)', border: '1px solid var(--surface1)' }}
            disabled={page === 0}
            onClick={() => handlePageChange(-1)}
          >
            ← Prev
          </button>
          <span className="breeds-page-lbl">Page {page + 1} of {totalPages}</span>
          <button
            className="btn"
            style={{ background: 'var(--surface0)', color: 'var(--subtext0)', border: '1px solid var(--surface1)' }}
            disabled={page >= totalPages - 1}
            onClick={() => handlePageChange(1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
