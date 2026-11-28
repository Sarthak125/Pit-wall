/** Account settings baked in at build time. With no Supabase project configured, sign-in is hidden. */
export type Provider = 'github' | 'google';

export function cloudConfig(): { url: string; key: string; providers: Provider[] } {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
  const providers = ((import.meta.env.VITE_SUPABASE_PROVIDERS as string | undefined) ?? '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is Provider => p === 'github' || p === 'google');
  return { url, key, providers };
}

export function cloudEnabled(): boolean {
  const { url, key } = cloudConfig();
  return /^https:\/\/[a-z0-9.-]+$/i.test(url.replace(/\/$/, '')) && key.length > 20;
}

/** True when this browser holds a Supabase sign-in, or is coming back from one, so the SDK should load at start. */
export function hasStoredSession(): boolean {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.has('code') || q.has('error_description')) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? '';
      if (k.startsWith('sb-') && k.includes('-auth-token')) return true;
    }
  } catch {
    // Storage blocked: nothing saved.
  }
  return false;
}
