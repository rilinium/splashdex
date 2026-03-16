'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { frogFullName, parseWeekCode } from '@/lib/gameHelpers';
import { useChromaSync } from '@/hooks/useChromaSync';
import FrogCanvas from '@/components/FrogCanvas';

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function safeFilename(name) {
  return (name || 'set').replace(/[^\w\- ]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'set';
}

export default function SetsGrid({ initialSets, initialSetCode }) {
  const router = useRouter();
  const chromaCanvasesRef = useChromaSync();

  const [query,    setQuery]    = useState('');
  const [sort,     setSort]     = useState('newest');
  const [viewMode, setViewMode] = useState('card');


  // Deep-link scroll
  useEffect(() => {
    if (!initialSetCode || !initialSets.length) return;
    // Use requestAnimationFrame to wait for DOM to settle
    const tryScroll = () => {
      const target = document.querySelector('[data-set-code="' + initialSetCode + '"]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.outline = '2px solid var(--mauve)';
        target.style.outlineOffset = '3px';
        setTimeout(() => {
          target.style.outline = '';
          target.style.outlineOffset = '';
        }, 3000);
      }
    };
    const raf = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(raf);
  }, [initialSetCode, initialSets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? initialSets.filter(set => {
          if (set.name.toLowerCase().includes(q)) return true;
          return set.frogs.some(([, cId, pId, gId]) =>
            frogFullName(cId, pId, gId).toLowerCase().includes(q));
        })
      : [...initialSets];
    if (sort === 'oldest') list = list.reverse();
    return list;
  }, [initialSets, query, sort]);

  const handleExportSet = async (set, transparent) => {
    const { renderFrogOffscreen } = await import('@/lib/renderEngine');
    const FROG_SIZE = 88, GAP = 4;
    const frogCanvases = [];
    for (const [count, colorId, patternId, genusId] of set.frogs) {
      for (let n = 0; n < count; n++) {
        frogCanvases.push(await renderFrogOffscreen(colorId, patternId, genusId, FROG_SIZE, hueRef.current));
      }
    }
    if (!frogCanvases.length) return;
    const totalW = frogCanvases.length * (FROG_SIZE + GAP) - GAP;
    const safeName = safeFilename(set.name);

    if (transparent) {
      const out = document.createElement('canvas');
      out.width = totalW; out.height = FROG_SIZE;
      const ctx = out.getContext('2d');
      frogCanvases.forEach((fc, i) => ctx.drawImage(fc, i * (FROG_SIZE + GAP), 0));
      downloadDataUrl(out.toDataURL('image/png'), safeName + '_frogs.png');
      return;
    }

    const H_PAD = 18, V_PAD = 14;
    const LABEL_H = set.code ? 72 : 58;
    const out = document.createElement('canvas');
    out.width  = totalW + H_PAD * 2;
    out.height = FROG_SIZE + V_PAD * 2 + LABEL_H;
    const ctx = out.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, out.width, out.height);
    grad.addColorStop(0, '#38384e');
    grad.addColorStop(1, '#1e1e2e');
    ctx.fillStyle = grad;
    roundRectPath(ctx, 0, 0, out.width, out.height, 20);
    ctx.fill();
    frogCanvases.forEach((fc, i) =>
      ctx.drawImage(fc, H_PAD + i * (FROG_SIZE + GAP), V_PAD, FROG_SIZE, FROG_SIZE));
    const labelTop = FROG_SIZE + V_PAD;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (set.name) {
      ctx.fillStyle = 'rgba(205,214,244,0.55)';
      ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(set.name, out.width / 2, labelTop + 8);
    }
    if (set.code) {
      ctx.fillStyle = 'rgba(166,173,200,0.35)';
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(parseWeekCode(set.code), out.width / 2, labelTop + 32);
    }
    ctx.fillStyle = 'rgba(166,173,200,0.25)';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('splashdex', out.width / 2, labelTop + (set.code ? 50 : 34));
    downloadDataUrl(out.toDataURL('image/png'), safeName + '_set.png');
  };

  return (
    <div className="page-panel">
      <div className="sets-note">
        Sets data is fetched live from <strong>nimblebit.com/sets.txt</strong>.
        The most recent set is shown first.
      </div>

      <div className="sets-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search set names or frog species…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <span className="count-lbl">{filtered.length} / {initialSets.length} sets</span>
        <div className="view-toggle">
          <button
            className={'view-toggle-btn' + (viewMode === 'card' ? ' active' : '')}
            onClick={() => setViewMode('card')}
          >⊞ Card</button>
          <button
            className={'view-toggle-btn' + (viewMode === 'game' ? ' active' : '')}
            onClick={() => setViewMode('game')}
          >🎮 Game</button>
        </div>
      </div>

      <div className="sets-grid">
        {filtered.map(set => (
          viewMode === 'card'
            ? <SetCard
                key={set.code}
                set={set}
                router={router}
                hueRef={hueRef}
                chromaCanvasesRef={chromaCanvasesRef}
                onExport={handleExportSet}
              />
            : <GameStrip
                key={set.code}
                set={set}
                router={router}
                hueRef={hueRef}
                chromaCanvasesRef={chromaCanvasesRef}
                onExport={handleExportSet}
              />
        ))}
      </div>
    </div>
  );
}

function SetCard({ set, router, hueRef, chromaCanvasesRef, onExport }) {
  const handleFrogClick = (colorId, patternId, genusId) => {
    router.push('/frog?frog=' + colorId + '-' + patternId + '-' + genusId);
  };

  return (
    <div className="set-card" data-set-code={set.code}>
      <div className="set-card-hdr">
        <div className="set-card-name">{set.name}</div>
        <div className="set-card-week">{parseWeekCode(set.code)}</div>
      </div>
      <div className="set-frogs">
        {set.frogs.map(([count, colorId, patternId, genusId], fi) =>
          Array.from({ length: count }, (_, ni) => (
            <div
              key={fi + '-' + ni}
              className="set-frog-tile"
              style={{ cursor: 'pointer' }}
              title={frogFullName(colorId, patternId, genusId) + ' — click to build'}
              onClick={() => handleFrogClick(colorId, patternId, genusId)}
            >
              <div className="set-frog-wrap">
                <FrogCanvas
                  colorId={colorId}
                  patternId={patternId}
                  genusId={genusId}
                  size={56}

                  chromaCanvasesRef={patternId === 15 ? chromaCanvasesRef : null}
                  observe={patternId !== 15}
                />
              </div>
              <div className="set-frog-name">{frogFullName(colorId, patternId, genusId)}</div>
            </div>
          ))
        )}
      </div>
      <div className="set-export-row">
        <button className="btn-export" title="Download transparent PNG of frogs" onClick={() => onExport(set, true)}>⬇ PNG</button>
        <button className="btn-export" title="Download set card PNG" onClick={() => onExport(set, false)}>⬇ Set card</button>
        <button className="btn-export" title="Copy shareable link to this set" onClick={() => {
          navigator.clipboard.writeText(window.location.origin + '/set?set=' + set.code);
        }}>🔗 Copy link</button>
      </div>
    </div>
  );
}

function GameStrip({ set, router, hueRef, chromaCanvasesRef, onExport }) {
  const handleFrogClick = (colorId, patternId, genusId) => {
    router.push('/frog?frog=' + colorId + '-' + patternId + '-' + genusId);
  };

  return (
    <div className="set-game-strip" data-set-code={set.code}>
      <div className="set-game-frogs">
        {set.frogs.map(([count, colorId, patternId, genusId], fi) =>
          Array.from({ length: count }, (_, ni) => (
            <div
              key={fi + '-' + ni}
              className="set-game-frog-wrap"
              title={frogFullName(colorId, patternId, genusId) + ' — click to build'}
              style={{ cursor: 'pointer' }}
              onClick={() => handleFrogClick(colorId, patternId, genusId)}
            >
              <FrogCanvas
                colorId={colorId}
                patternId={patternId}
                genusId={genusId}
                size={88}

                chromaCanvasesRef={patternId === 15 ? chromaCanvasesRef : null}
                observe={patternId !== 15}
              />
            </div>
          ))
        )}
      </div>
      <div className="set-game-label">
        <div className="set-game-name">{set.name}</div>
        {set.code && <div className="set-game-week">{parseWeekCode(set.code)}</div>}
      </div>
      <div className="set-export-row" style={{ justifyContent: 'center' }}>
        <button className="btn-export" title="Download transparent PNG of frogs" onClick={() => onExport(set, true)}>⬇ PNG</button>
        <button className="btn-export" title="Download set card PNG" onClick={() => onExport(set, false)}>⬇ Set card</button>
        {set.code && (
          <button className="btn-export" title="Copy shareable link to this set" onClick={() => {
            navigator.clipboard.writeText(window.location.origin + '/set?set=' + set.code);
          }}>🔗 Copy link</button>
        )}
      </div>
    </div>
  );
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
