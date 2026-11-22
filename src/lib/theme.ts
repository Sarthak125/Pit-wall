/**
 * Dark or light colours. The choice (Settings: Dark, Light or Auto, which follows the device) goes on <html> as
 * data-theme, where the stylesheet picks it up; index.html sets it before the first paint so there is no flash.
 */
import { useSyncExternalStore } from 'react';
import { getSettings, subscribe } from './settings';

export type ThemeChoice = 'dark' | 'light' | 'auto';

const media = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null);

export function resolveTheme(choice: ThemeChoice): 'dark' | 'light' {
  if (choice === 'auto') return media()?.matches ? 'light' : 'dark';
  return choice;
}

export function applyTheme(choice: ThemeChoice = getSettings().theme) {
  const root = document.documentElement;
  root.dataset.theme = choice;
  const resolved = resolveTheme(choice);
  root.dataset.resolvedTheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#FFFFFF' : '#0F1215');
}

/** The theme in use, following both the setting and, on Auto, the device. */
export function useResolvedTheme(): 'dark' | 'light' {
  return useSyncExternalStore(
    (cb) => {
      const m = media();
      const onChange = () => {
        applyTheme();
        cb();
      };
      m?.addEventListener('change', onChange);
      const off = subscribe(onChange);
      return () => {
        m?.removeEventListener('change', onChange);
        off();
      };
    },
    () => resolveTheme(getSettings().theme),
  );
}

export function isLight(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.resolvedTheme === 'light';
}
