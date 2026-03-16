'use client';
import { useSettings, ACCENTS, LATTE_ACCENTS } from '@/contexts/SettingsContext';
import { COLORS, PATTERNS, GENERA, COLOR_KEYS, PATTERN_KEYS, GENUS_KEYS } from '@/lib/gameData';

const DENSITY_OPTIONS = [
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
];

const THEME_OPTIONS = [
  { value: 'mocha', label: '🌙 Mocha' },
  { value: 'latte', label: '☀️ Latte' },
];

const ACCENT_LABELS = {
  mauve: 'Mauve', lavender: 'Lavender', blue: 'Blue', teal: 'Teal',
  green: 'Green', peach: 'Peach', yellow: 'Yellow', red: 'Red',
};

export default function SettingsPanel() {
  const { settings, setSetting } = useSettings();
  const accentPalette = settings.theme === 'latte' ? LATTE_ACCENTS : ACCENTS;

  return (
    <div className="page-panel">

      <div className="card">
        <div className="card-title">Display</div>

        {/* Theme */}
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-label">Theme</span>
            <span className="settings-hint">Catppuccin Mocha (dark) or Latte (light)</span>
          </div>
          <div className="segmented">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={'segmented-btn' + (settings.theme === opt.value ? ' active' : '')}
                onClick={() => setSetting('theme', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Animation toggle */}
        <div className="settings-row" style={{ marginTop: 16 }}>
          <div className="settings-row-label">
            <span className="settings-label">Chroma animation</span>
            <span className="settings-hint">Animate rainbow-cycling frogs in the breeds grid</span>
          </div>
          <button
            className={'pill-toggle' + (settings.animationEnabled ? ' on' : '')}
            onClick={() => setSetting('animationEnabled', !settings.animationEnabled)}
            aria-pressed={settings.animationEnabled}
          >
            <span className="pill-knob" />
            <span className="pill-text">{settings.animationEnabled ? 'On' : 'Off'}</span>
          </button>
        </div>

        {/* Grid density */}
        <div className="settings-row" style={{ marginTop: 16 }}>
          <div className="settings-row-label">
            <span className="settings-label">Grid density</span>
            <span className="settings-hint">Card size in the breeds browser</span>
          </div>
          <div className="segmented">
            {DENSITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={'segmented-btn' + (settings.gridDensity === opt.value ? ' active' : '')}
                onClick={() => setSetting('gridDensity', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="settings-row" style={{ marginTop: 16 }}>
          <div className="settings-row-label">
            <span className="settings-label">Accent color</span>
            <span className="settings-hint">Highlight color for active links and focus rings</span>
          </div>
          <div className="accent-swatches">
            {Object.entries(accentPalette).map(([key, hex]) => (
              <button
                key={key}
                className={'accent-swatch' + (settings.accentColor === key ? ' active' : '')}
                style={{ background: hex }}
                title={ACCENT_LABELS[key]}
                onClick={() => setSetting('accentColor', key)}
                aria-label={ACCENT_LABELS[key]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Default Filters</div>
        <p style={{ fontSize: 12, color: 'var(--subtext0)', marginBottom: 14 }}>
          Pre-select filters when opening the Breeds browser with no URL params.
        </p>

        <div className="settings-default-filters">
          <div className="form-group">
            <label className="form-label">Color</label>
            <select
              className="form-input"
              value={settings.defaultColor}
              onChange={e => setSetting('defaultColor', e.target.value)}
            >
              <option value="">None</option>
              {COLOR_KEYS.map(id => (
                <option key={id} value={id}>{COLORS[id][0]}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Pattern</label>
            <select
              className="form-input"
              value={settings.defaultPattern}
              onChange={e => setSetting('defaultPattern', e.target.value)}
            >
              <option value="">None</option>
              {PATTERN_KEYS.map(id => (
                <option key={id} value={id}>{PATTERNS[id]}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Genus</label>
            <select
              className="form-input"
              value={settings.defaultGenus}
              onChange={e => setSetting('defaultGenus', e.target.value)}
            >
              <option value="">None</option>
              {GENUS_KEYS.map(id => (
                <option key={id} value={id}>{GENERA[id]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 4 }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--surface0)', color: 'var(--subtext0)', border: '1px solid var(--surface1)' }}
            onClick={() => {
              setSetting('defaultColor', '');
              setSetting('defaultPattern', '');
              setSetting('defaultGenus', '');
            }}
          >
            Clear defaults
          </button>
        </div>
      </div>

    </div>
  );
}
