import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { ru } from '../../lib/ru';

type Theme = 'light' | 'dark' | 'system';
const isTheme = (value: string | undefined): value is Theme => value === 'light' || value === 'dark' || value === 'system';

function applyTheme(preference: Theme) {
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themePreference = preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim());
}

export function ThemeControl() {
  const [preference, setPreference] = useState<Theme>(() => {
    const initial = document.documentElement.dataset.themePreference;
    return isTheme(initial) ? initial : 'system';
  });
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => applyTheme(preference);
    update();
    media?.addEventListener('change', update);
    return () => media?.removeEventListener('change', update);
  }, [preference]);
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun;
  return <label className="theme-control"><span className="sr-only">{ru.theme}</span><Icon size={16} aria-hidden="true" />
    <select aria-label={ru.theme} value={preference} onChange={event => {
      const value = event.target.value;
      if (!isTheme(value)) return;
      applyTheme(value);
      setPreference(value);
      try { localStorage.setItem('cctv-theme', value); } catch { /* The theme remains usable when storage is unavailable. */ }
    }}><option value="light">{ru.light}</option><option value="dark">{ru.dark}</option><option value="system">{ru.system}</option></select>
  </label>;
}
