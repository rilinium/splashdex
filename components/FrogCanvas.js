'use client';
import { useRef, useEffect, useCallback } from 'react';

export default function FrogCanvas({
  colorId, patternId, genusId,
  size = 72,
  chromaHueRef = null,
  chromaCanvasesRef = null,
  observe = false,
}) {
  const canvasRef = useRef(null);

  const doRender = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { renderFrog } = await import('@/lib/renderEngine');
    const hue = chromaHueRef ? chromaHueRef.current : 0;
    await renderFrog(canvas, colorId, patternId, genusId, hue);
  }, [colorId, patternId, genusId, chromaHueRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (patternId === 15 && chromaCanvasesRef) {
      chromaCanvasesRef.current.set(canvas, doRender);
      doRender(); // initial render
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

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />;
}
