import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { ThemeControl } from './ThemeControl';

const media = Object.assign(new EventTarget(), { matches: false });
beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.themePreference = 'system';
  media.matches = false;
  vi.stubGlobal('matchMedia', () => media);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('theme control', () => {
  it('responds to system changes', () => {
    render(<ThemeControl />);
    expect(document.documentElement.dataset.theme).toBe('light');
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('persists an explicit choice and ignores system changes', async () => {
    render(<ThemeControl />);
    await userEvent.selectOptions(screen.getByLabelText('Оформление'), 'dark');
    expect(localStorage.getItem('cctv-theme')).toBe('dark');
    media.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('uses the preference supplied by the pre-paint bootstrap', () => {
    document.documentElement.dataset.themePreference = 'light';
    media.matches = true;
    render(<ThemeControl />);
    expect(screen.getByLabelText('Оформление')).toHaveValue('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('remains usable with unavailable browser storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    render(<ThemeControl />);
    await userEvent.selectOptions(screen.getByLabelText('Оформление'), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
