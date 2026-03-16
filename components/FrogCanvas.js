'use client';
import { useRef, useEffect, useCallback } from 'react';

export default function FrogCanvas({
  colorId, patternId, genusId,
  size = 72,
  chromaCanvasesRef = null,  // Map<canvas → params> owned by BreedsGrid
  observe = false,
}) {
  const canvasRef = useRef(null);

  // One-shot async render — loads sprites into _imgCache so renderFrogSync can run later
  const doRender = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { renderFrog } = await import('@/lib/renderEngine');
    await renderFrog(canvas, colorId, patternId, genusId, 0);
  }, [colorId, patternId, genusId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (patternId === 15 && chromaCanvasesRef) {
      // Register render params (not a function) — BreedsGrid RAF calls renderFrogSync directly
      chromaCanvasesRef.current.set(canvas, { colorId, patternId, genusId });
      doRender(); // initial render; also warms _imgCache / _gdCache for the sync path
      return () => { chromaCanvasesRef.current.delete(canvas); };
    }

    if (!observe) {
      doRender();
      return;
    }

    import('@/lib/renderEngine').then(({ _drawFrogPlaceholder }) => _drawFrogPlaceholder(canvas));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) doRender();
        else import('@/lib/renderEngine').then(({ _drawFrogPlaceholder }) => _drawFrogPlaceholder(canvas));
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [colorId, patternId, genusId, observe, doRender, chromaCanvasesRef]);

  // Do NOT put width/height as JSX props — React would reset canvas.width on every
  // re-render, clearing the buffer. Canvas buffer sizing is handled entirely by renderFrog.
  return <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block' }} />;
}
