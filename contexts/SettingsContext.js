'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const DEFAULTS = {
  animationEnabled: true,
  gridDensity: 'medium',   // 'small' | 'medium' | 'large'
  accentColor: 'mauve',
  theme: 'mocha',           // 'mocha' | 'latte'
  defaultColor: '',
  defaultPattern: '',
  defaultGenus: '',
};

// Catppuccin Mocha accent palette
export const ACCENTS = {
  mauve:    '#cba6f7',
  lavender: '#b4befe',
  blue:     '#89b4fa',
  teal:     '#94e2d5',
  green:    '#a6e3a1',
  peach:    '#fab387',
  yellow:   '#f9e2af',
  red:      '#f38ba8',
};

// Catppuccin Latte accent palette (same names, darker/more saturated)
export const LATTE_ACCENTS = {
  mauve:    '#8839ef',
  lavender: '#7287fd',
  blue:     '#1e66f5',
  teal:     '#179299',
  green:    '#40a02b',
  peach:    '#fe640b',
  yellow:   '#df8e1d',
  red:      '#d20f39',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('splashdex-settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (_) {}
    setLoaded(true);
  }, []);

  // Apply theme data-attr and accent CSS var whenever either changes
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const theme = settings.theme || 'mocha';
    root.dataset.theme = theme;
    const palette = theme === 'latte' ? LATTE_ACCENTS : ACCENTS;
    root.style.setProperty('--accent', palette[settings.accentColor] || palette.mauve);
  }, [settings.accentColor, settings.theme, loaded]);

  const setSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('splashdex-settings', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, setSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
