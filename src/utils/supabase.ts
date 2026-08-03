/**
 * utils/supabase.ts
 * =================
 * Supabase client for the frontend.
 * Used to trigger Google OAuth sign-in flow and listen for auth state changes.
 *
 * Required environment variables (in root .env and Vercel dashboard):
 *   VITE_SUPABASE_URL=https://your-project-id.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const _configured = !!(supabaseUrl && supabaseAnonKey);

if (!_configured) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Google OAuth will not work. Add these to your Vercel environment variables.'
  );
}

/**
 * supabase — Supabase JS client.
 * Will be `null` when the required env vars are not set, so that the app
 * doesn't crash at startup with "supabaseKey is required".
 * Always check `supabase` for null before calling auth methods.
 */
export const supabase: SupabaseClient | null = _configured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
