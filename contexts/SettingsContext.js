'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const DEFAULTS = {
  animationEnabled: true,
  gridDensity: 'medium',   // 'small' | 'medium' | 'large'
  accentColor: 'mauve',
  defaultColor: '',
  defaultPattern: '',
  defaultGenus: '',
};

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

  // Apply accent CSS var whenever accentColor changes
  useEffect(() => {
    if (!loaded) return;
    const color = ACCENTS[settings.accentColor] || ACCENTS.mauve;
    document.documentElement.style.setProperty('--accent', color);
  }, [settings.accentColor, loaded]);

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
