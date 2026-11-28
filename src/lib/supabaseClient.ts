/**
 * The Supabase client, in its own module so the SDK only downloads when someone signs in or is already signed in.
 * The project URL and public ("anon") key come from the build (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). The
 * public key is meant to be in the page: the database's row rules (supabase/migrations) let each signed-in person
 * read and write only their own row.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cloudConfig } from './cloudConfig';

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!client) {
    const { url, key } = cloudConfig();
    client = createClient(url, key, {
      auth: {
        // PKCE puts ?code= in the query string, which leaves the app's #/route hash alone.
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}
