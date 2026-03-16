'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, PATTERNS, GENERA, PATTERN_COLORS, COLOR_KEYS, PATTERN_KEYS, GENUS_KEYS } from '@/lib/gameData';
import { frogFullName, toHex, parseWeekCode } from '@/lib/gameHelpers';
import { useChromaAnimation } from '@/hooks/useChromaAnimation';
import FrogCanvas from '@/components/FrogCanvas';

function randomFrom(keys) {
  return keys[Math.floor(Math.random() * keys.length)];
}

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

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

export default function CustomSetBuilder({ initialBuilder, initialName }) {
  const router = useRouter();
  const hueRef = useChromaAnimation();
  const chromaCanvasesRef = useRef(new Map());

  const [setName,     setSetName]     = useState(initialName || '');
  const [sbFrogs,     setSbFrogs]     = useState([]); // [{colorId, patternId, genusId, count}]
  const [sbCount,     setSbCount]     = useState(1);
  const [colorId,     setColorId]     = useState(COLOR_KEYS[0]);
  const [patternId,   setPatternId]   = useState(PATTERN_KEYS[0]);
  const [genusId,     setGenusId]     = useState(GENUS_KEYS[0]);
  const [viewMode,    setViewMode]    = useState('card');
  const [importText,  setImportText]  = useState('');
  const [importError, setImportError] = useState('');
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [inited,      setInited]      = useState(false);

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

  // Initialize from prop
  useEffect(() => {
    if (initialName) setSetName(initialName);
    if (initialBuilder) {
      const parsed = parseBuilderString(initialBuilder);
      if (parsed) setSbFrogs(parsed.slice(0, 8));
    } else {
      // Start with a random frog picker
      setColorId(randomFrom(COLOR_KEYS));
      setPatternId(randomFrom(PATTERN_KEYS));
      setGenusId(randomFrom(GENUS_KEYS));
    }
    setInited(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // URL sync
  useEffect(() => {
    if (!inited) return;
    const builderStr = exportString(sbFrogs);
    const params = new URLSearchParams();
    if (builderStr) params.set('builder', builderStr);
    if (setName) params.set('name', setName);
    const qs = params.toString();
    router.replace('/customset' + (qs ? '?' + qs : ''));
  }, [sbFrogs, setName, inited]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportString(frogs) {
    return frogs.map(f => f.count + ':' + f.colorId + ':' + f.patternId + ':' + f.genusId).join(',');
  }

  function parseBuilderString(raw) {
    const parsed = [];
    for (const part of raw.split(',')) {
      const segs = part.trim().split(':');
      if (segs.length !== 4) return null;
      const [count, colorId, patternId, genusId] = segs.map(Number);
      if ([count, colorId, patternId, genusId].some(isNaN)) return null;
      if (!COLORS[colorId]) return null;
      if (PATTERNS[patternId] === undefined) return null;
      if (GENERA[genusId] === undefined) return null;
      parsed.push({ colorId, patternId, genusId, count: Math.max(1, count) });
    }
    return parsed;
  }

  const handleAddFrog = () => {
    if (sbFrogs.length >= 8) return;
    setSbFrogs(prev => [...prev, { colorId, patternId, genusId, count: sbCount }]);
  };

  const handleRemoveFrog = (idx) => {
    setSbFrogs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => setSbFrogs([]);

  const handleRandomizePicker = () => {
    setColorId(randomFrom(COLOR_KEYS));
    setPatternId(randomFrom(PATTERN_KEYS));
    setGenusId(randomFrom(GENUS_KEYS));
  };

  const handleImport = () => {
    setImportError('');
    if (!importText.trim()) { setImportError('Paste set data first.'); return; }
    const parsed = parseBuilderString(importText.trim());
    if (!parsed) {
      setImportError('Invalid format — expected count:colorId:patternId:genusId per frog.');
      return;
    }
    if (parsed.length > 8) {
      setImportError('Sets are capped at 8 frogs — imported first 8.');
    }
    setSbFrogs(parsed.slice(0, 8));
    setImportText('');
  };

  const handleCopyExport = () => {
    const str = exportString(sbFrogs);
    if (!str) return;
    navigator.clipboard.writeText(str).then(() => {
      setCopyConfirm(true);
      setTimeout(() => setCopyConfirm(false), 2000);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleExportPng = async (transparent) => {
    if (!sbFrogs.length) return;
    const { renderFrogOffscreen } = await import('@/lib/renderEngine');
    const FROG_SIZE = 88, GAP = 4;
    const frogCanvases = [];
    for (const f of sbFrogs) {
      for (let n = 0; n < f.count; n++) {
        frogCanvases.push(await renderFrogOffscreen(f.colorId, f.patternId, f.genusId, FROG_SIZE, hueRef.current));
      }
    }
    if (!frogCanvases.length) return;
    const totalW = frogCanvases.length * (FROG_SIZE + GAP) - GAP;
    const safeName = safeFilename(setName || 'set');

    if (transparent) {
      const out = document.createElement('canvas');
      out.width = totalW; out.height = FROG_SIZE;
      const ctx = out.getContext('2d');
      frogCanvases.forEach((fc, i) => ctx.drawImage(fc, i * (FROG_SIZE + GAP), 0));
      downloadDataUrl(out.toDataURL('image/png'), safeName + '_frogs.png');
      return;
    }

    const H_PAD = 18, V_PAD = 14, LABEL_H = 58;
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
    if (setName) {
      ctx.fillStyle = 'rgba(205,214,244,0.55)';
      ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(setName, out.width / 2, labelTop + 8);
    }
    ctx.fillStyle = 'rgba(166,173,200,0.25)';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('splashdex', out.width / 2, labelTop + 34);
    downloadDataUrl(out.toDataURL('image/png'), safeName + '_set.png');
  };

  const totalFrogs = sbFrogs.reduce((s, f) => s + f.count, 0);
  const [, cr, cg, cb] = COLORS[colorId] || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId] || [null, 128, 128, 128];

  return (
    <div className="page-panel">
      <div className="card">
        <div className="card-title">Build a Custom Set</div>
        <div className="setbuilder-layout">

          {/* Left: frog picker + set name */}
          <div className="setbuilder-picker">
            <div className="form-group">
              <label className="form-label">Set Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="My Custom Set"
                value={setName}
                onChange={e => setSetName(e.target.value)}
              />
            </div>
            <div className="setbuilder-divider" />
            <div className="setbuilder-frog-selector">
              <div className="builder-preview">
                <div className="preview-canvas-wrap" style={{ width: 140, height: 140 }}>
                  <FrogCanvas
                    colorId={colorId}
                    patternId={patternId}
                    genusId={genusId}
                    size={140}
                    chromaHueRef={patternId === 15 ? hueRef : null}
                    chromaCanvasesRef={patternId === 15 ? chromaCanvasesRef : null}
                    observe={false}
                  />
                </div>
              </div>
              <div className="setbuilder-frog-controls">
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div className="color-preview-row">
                    <div className="color-dot" style={{ background: toHex(cr, cg, cb) }} />
                    <select className="form-input" value={colorId} onChange={e => setColorId(Number(e.target.value))}>
                      {COLOR_KEYS.map(id => (
                        <option key={id} value={id}>{COLORS[id][0]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Pattern</label>
                  <div className="color-preview-row">
                    <div className="color-dot" style={{ background: toHex(pr, pg, pb) }} />
                    <select className="form-input" value={patternId} onChange={e => setPatternId(Number(e.target.value))}>
                      {PATTERN_KEYS.map(id => (
                        <option key={id} value={id}>{PATTERNS[id]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Genus</label>
                  <select className="form-input" value={genusId} onChange={e => setGenusId(Number(e.target.value))}>
                    {GENUS_KEYS.map(id => (
                      <option key={id} value={id}>{GENERA[id]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <div className="sb-count-row">
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--surface0)', border: '1px solid var(--surface1)', color: 'var(--text)' }}
                      onClick={() => setSbCount(c => Math.max(1, c - 1))}
                    >−</button>
                    <span className="sb-count-display">{sbCount}</span>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--surface0)', border: '1px solid var(--surface1)', color: 'var(--text)' }}
                      onClick={() => setSbCount(c => Math.min(99, c + 1))}
                    >+</button>
                  </div>
                </div>
                <div className="btn-row">
                  <button
                    className="btn btn-primary"
                    disabled={sbFrogs.length >= 8}
                    style={{ opacity: sbFrogs.length >= 8 ? 0.4 : undefined }}
                    onClick={handleAddFrog}
                  >+ Add to Set</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--surface0)', color: 'var(--subtext0)', border: '1px solid var(--surface1)' }}
                    onClick={handleRandomizePicker}
                  >🎲</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: live set preview */}
          <div className="setbuilder-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <div className="form-label" style={{ marginBottom: 0 }}>
                Set Preview{' '}
                <span style={{ fontSize: 10, color: 'var(--overlay0)', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                  {sbFrogs.length} / 8 frogs
                </span>
              </div>
              <div className="view-toggle" style={{ marginLeft: 'auto' }}>
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

            {sbFrogs.length === 0 ? (
              <div className="sb-empty-msg">Add frogs to start building your set.</div>
            ) : viewMode === 'card' ? (
              <div className="set-card">
                <div className="set-card-hdr">
                  <div className="set-card-name">{setName || 'My Custom Set'}</div>
                  <div className="set-card-week">{totalFrogs} {totalFrogs === 1 ? 'frog' : 'frogs'}</div>
                </div>
                <div className="set-frogs">
                  {sbFrogs.map(({ colorId: c, patternId: p, genusId: g, count }, idx) => (
                    <div key={idx} className="set-frog-tile" style={{ position: 'relative' }}>
                      <div className="set-frog-wrap">
                        <FrogCanvas
                          colorId={c}
                          patternId={p}
                          genusId={g}
                          size={56}
                          chromaHueRef={p === 15 ? hueRef : null}
                          chromaCanvasesRef={p === 15 ? chromaCanvasesRef : null}
                          observe={false}
                        />
                        {count > 1 && (
                          <div className="set-frog-count">×{count}</div>
                        )}
                      </div>
                      <div className="set-frog-name">{frogFullName(c, p, g)}</div>
                      <button
                        className="sb-remove-btn"
                        title="Remove"
                        onClick={e => { e.stopPropagation(); handleRemoveFrog(idx); }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="set-game-strip">
                <div className="set-game-frogs">
                  {sbFrogs.map(({ colorId: c, patternId: p, genusId: g, count }, idx) =>
                    Array.from({ length: count }, (_, ni) => (
                      <div key={idx + '-' + ni} className="set-game-frog-wrap">
                        <FrogCanvas
                          colorId={c}
                          patternId={p}
                          genusId={g}
                          size={88}
                          chromaHueRef={p === 15 ? hueRef : null}
                          chromaCanvasesRef={p === 15 ? chromaCanvasesRef : null}
                          observe={false}
                        />
                      </div>
                    ))
                  )}
                </div>
                <div className="set-game-label">
                  <div className="set-game-name">{setName || 'My Custom Set'}</div>
                </div>
              </div>
            )}

            {sbFrogs.length > 0 && (
              <div className="btn-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--surface0)', color: 'var(--red)', border: '1px solid var(--surface1)' }}
                  onClick={handleClear}
                >🗑 Clear Set</button>
                <button className="btn-export" onClick={() => handleExportPng(true)} title="Download transparent PNG of frogs">⬇ PNG</button>
                <button className="btn-export" onClick={() => handleExportPng(false)} title="Download set card PNG">⬇ Set card</button>
                <button className="btn-export" onClick={handleCopyLink} title="Copy shareable link to this set">🔗 Copy link</button>
              </div>
            )}
          </div>

        </div>

        {/* Import / Export */}
        <div className="setbuilder-divider" />
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

          <div className="sb-import-row" style={{ flex: 1, minWidth: 220 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Import Set Data</div>
            <p style={{ fontSize: 11, color: 'var(--overlay1)', marginBottom: 8 }}>
              Paste exported set data from Pocket Frogs (e.g.{' '}
              <code style={{ background: 'var(--surface0)', padding: '1px 5px', borderRadius: 3 }}>1:2:7:16,…</code>
              ). Overwrites current set.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <textarea
                className="form-input"
                rows={3}
                placeholder="1:2:7:16,1:1:10:16,…"
                style={{ flex: 1, minWidth: 200, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={handleImport}>Import</button>
            </div>
            {importError && (
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{importError}</div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Export Set Data</div>
            <p style={{ fontSize: 11, color: 'var(--overlay1)', marginBottom: 8 }}>
              Save your current set as game-compatible data you can re-import later.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Add frogs to your set first…"
                readOnly
                style={{ flex: 1, minWidth: 200, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', color: 'var(--subtext0)' }}
                value={exportString(sbFrogs)}
              />
              <button
                className="btn btn-sm"
                style={{ alignSelf: 'flex-end', background: 'var(--surface0)', color: 'var(--subtext0)', border: '1px solid var(--surface1)' }}
                onClick={handleCopyExport}
              >Copy</button>
            </div>
            {copyConfirm && (
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>✓ Copied to clipboard</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
