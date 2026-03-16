'use client';
import { useRef, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * Drives chroma frog animation with a fully synchronous RAF loop.
 *
 * Components using this hook should:
 *  - Pass the returned chromaCanvasesRef to <FrogCanvas chromaCanvasesRef={...} /> for chroma frogs
 *  - NOT pass chromaHueRef to FrogCanvas (hue is managed internally here)
 *
 * FrogCanvas registers { colorId, patternId, genusId } in the map when mounted.
 * The RAF loop calls renderFrogSync directly — no async, no Promise chains.
 */
export function useChromaSync() {
  const { settings } = useSettings();
  const hueRef           = useRef(0);
  const animEnabledRef   = useRef(settings.animationEnabled);
  const renderEngineRef  = useRef(null);
  const chromaCanvasesRef = useRef(new Map());

  // Keep animEnabledRef in sync without recreating the RAF loop
  useEffect(() => {
    animEnabledRef.current = settings.animationEnabled;
  }, [settings.animationEnabled]);

  // Pre-load renderEngine module (cached after first import)
  useEffect(() => {
    import('@/lib/renderEngine').then(m => { renderEngineRef.current = m; });
  }, []);

  // Single RAF: increment hue + synchronously render all registered chroma canvases
  useEffect(() => {
    let raf;
    const tick = () => {
      if (animEnabledRef.current) {
        hueRef.current = (hueRef.current + 0.002) % 1;
      }
      const engine = renderEngineRef.current;
      if (engine) {
        chromaCanvasesRef.current.forEach((params, canvas) => {
          engine.renderFrogSync(canvas, params.colorId, params.patternId, params.genusId, hueRef.current);
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // stable — all state accessed via refs

  return chromaCanvasesRef;
}
