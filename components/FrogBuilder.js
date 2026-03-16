'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, PATTERNS, GENERA, PATTERN_COLORS, COLOR_KEYS, PATTERN_KEYS, GENUS_KEYS } from '@/lib/gameData';
import { frogFullName, fdexBit, toHex } from '@/lib/gameHelpers';
import { useChromaSync } from '@/hooks/useChromaSync';
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
  return (name || 'frog').replace(/[^\w\- ]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'frog';
}

export default function FrogBuilder({ initialFrog }) {
  const router = useRouter();
  const chromaCanvasesRef = useChromaSync();

  const [colorId,   setColorId]   = useState(null);
  const [patternId, setPatternId] = useState(null);
  const [genusId,   setGenusId]   = useState(null);
  const [inited,    setInited]    = useState(false);


  // Initialize from prop or randomize
  useEffect(() => {
    if (initialFrog) {
      const parts = initialFrog.split('-').map(Number);
      const [c, p, g] = parts;
      if (
        !isNaN(c) && !isNaN(p) && !isNaN(g) &&
        COLORS[c] && PATTERNS[p] !== undefined && GENERA[g] !== undefined
      ) {
        setColorId(c);
        setPatternId(p);
        setGenusId(g);
        setInited(true);
        return;
      }
    }
    setColorId(randomFrom(COLOR_KEYS));
    setPatternId(randomFrom(PATTERN_KEYS));
    setGenusId(randomFrom(GENUS_KEYS));
    setInited(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // URL sync
  useEffect(() => {
    if (!inited || colorId === null || patternId === null || genusId === null) return;
    router.replace('/frog?frog=' + colorId + '-' + patternId + '-' + genusId);
  }, [colorId, patternId, genusId, inited]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRandomize = () => {
    setColorId(randomFrom(COLOR_KEYS));
    setPatternId(randomFrom(PATTERN_KEYS));
    setGenusId(randomFrom(GENUS_KEYS));
  };

  const handleViewInBreeds = () => {
    router.push('/breeds?color=' + colorId + '&pattern=' + patternId + '&genus=' + genusId);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleExportPng = async () => {
    if (colorId === null) return;
    const { renderFrogOffscreen } = await import('@/lib/renderEngine');
    const name = frogFullName(colorId, patternId, genusId);
    const canvas = await renderFrogOffscreen(colorId, patternId, genusId, 256, hueRef.current);
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename(name) + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportWithName = async () => {
    if (colorId === null) return;
    const { renderFrogOffscreen } = await import('@/lib/renderEngine');
    const name = frogFullName(colorId, patternId, genusId);
    const SIZE = 256, PAD = 24, TEXT_H = 62;
    const frogCv = await renderFrogOffscreen(colorId, patternId, genusId, SIZE, hueRef.current);
    const out = document.createElement('canvas');
    out.width  = SIZE + PAD * 2;
    out.height = SIZE + PAD * 2 + TEXT_H;
    const ctx = out.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, out.height);
    grad.addColorStop(0, '#38384e');
    grad.addColorStop(1, '#1e1e2e');
    ctx.fillStyle = grad;
    roundRectPath(ctx, 0, 0, out.width, out.height, 20);
    ctx.fill();
    ctx.drawImage(frogCv, PAD, PAD, SIZE, SIZE);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(205,214,244,0.90)';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(name, out.width / 2, SIZE + PAD + 10);
    ctx.fillStyle = 'rgba(166,173,200,0.35)';
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('splashdex', out.width / 2, SIZE + PAD + 36);
    const url = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename(name) + '_card.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!inited || colorId === null || patternId === null || genusId === null) {
    return <div className="page-panel" />;
  }

  const name = frogFullName(colorId, patternId, genusId);
  const bit  = fdexBit(colorId, patternId, genusId);
  const [, cr, cg, cb] = COLORS[colorId] || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId] || [null, 128, 128, 128];

  return (
    <div className="page-panel">
      <div className="card">
        <div className="card-title">Build a Frog</div>
        <div className="builder-layout">

          <div className="builder-preview">
            <div className="preview-canvas-wrap" style={{ width: 280, height: 280 }}>
              <FrogCanvas
                colorId={colorId}
                patternId={patternId}
                genusId={genusId}
                size={280}

                chromaCanvasesRef={chromaCanvasesRef}
                observe={false}
              />
            </div>
            <div className="frog-name-display">{name}</div>
            <div className="frog-combo-display">
              Color {colorId} · Pattern {patternId} · Genus {genusId}
            </div>
            <div className="dex-id-display">
              Splashdex Index: <strong>#{bit}</strong>
              {bit >= 44160 && <span style={{ color: '#ff8060' }}> (out of range)</span>}
            </div>
            <div className="btn-row" style={{ marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-export" onClick={handleExportPng} title="Download transparent PNG">⬇ PNG</button>
              <button className="btn-export" onClick={handleExportWithName} title="Download PNG with name card">⬇ with name</button>
            </div>
          </div>

          <div className="builder-controls">
            <div className="form-group">
              <label className="form-label">Body Color</label>
              <div className="color-preview-row">
                <div className="color-dot" style={{ background: toHex(cr, cg, cb) }} />
                <select
                  className="form-input"
                  value={colorId}
                  onChange={e => setColorId(Number(e.target.value))}
                >
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
                <select
                  className="form-input"
                  value={patternId}
                  onChange={e => setPatternId(Number(e.target.value))}
                >
                  {PATTERN_KEYS.map(id => (
                    <option key={id} value={id}>{PATTERNS[id]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Genus</label>
              <div className="genus-preview-row">
                <FrogCanvas
                  colorId={colorId}
                  patternId={patternId}
                  genusId={genusId}
                  size={56}
  
                  chromaCanvasesRef={chromaCanvasesRef}
                  observe={false}
                />
                <select
                  className="form-input"
                  value={genusId}
                  onChange={e => setGenusId(Number(e.target.value))}
                >
                  {GENUS_KEYS.map(id => (
                    <option key={id} value={id}>{GENERA[id]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn btn-primary" onClick={handleRandomize}>🎲 Randomize</button>
              <button className="btn btn-gold btn-sm" onClick={handleViewInBreeds}>View in Breeds</button>
              <button className="btn-export" onClick={handleCopyLink} title="Copy shareable link to this frog">🔗 Copy link</button>
            </div>
          </div>

        </div>
      </div>

      <div className="card">
        <div className="card-title">How Frog Rendering Works</div>
        <p style={{ color: 'var(--subtext0)', fontSize: 12, lineHeight: 1.7 }}>
          Each frog is composited from three layers:<br />
          <strong style={{ color: 'var(--text)' }}>1. Base layer</strong> — a grayscale frog silhouette, tinted with the body color.<br />
          <strong style={{ color: 'var(--text)' }}>2. Genus layer</strong> — genus-specific markings (spots, stripes, etc.), tinted with the pattern color.<br />
          <strong style={{ color: 'var(--text)' }}>3. Overlay</strong> — a shading mask applied with a hard-light blend to add depth and restore eye whites.<br />
          Special: <em>Chroma</em> pattern animates through the full RGB spectrum. <em>Glass</em> color makes the frog semi-transparent.
        </p>
      </div>
    </div>
  );
}
