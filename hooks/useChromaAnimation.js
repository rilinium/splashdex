'use client';
import { useRef, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export function useChromaAnimation() {
  const hueRef = useRef(0);
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.animationEnabled) return;
    let raf;
    const tick = () => {
      hueRef.current = (hueRef.current + 0.002) % 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [settings.animationEnabled]);

  return hueRef;
}
