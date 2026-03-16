'use client';
import { useRef, useEffect } from 'react';
export function useChromaAnimation() {
  const hueRef = useRef(0);
  useEffect(() => {
    let raf;
    const tick = () => {
      hueRef.current = (hueRef.current + 0.002) % 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return hueRef;
}
