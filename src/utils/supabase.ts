/**
 * utils/supabase.ts
 * =================
 * Supabase client — kept for backward-compatibility but NO LONGER REQUIRED
 * for Google OAuth. Google OAuth now goes through the Flask backend directly.
 *
 * The supabase client initializes only if VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * are present. If they are not set, supabase will be null and that is fine —
 * all auth (email/password + Google OAuth) now works through the Flask backend.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const _configured = !!(supabaseUrl && supabaseAnonKey);

/**
 * supabase — Supabase JS client.
 * Will be `null` when the required env vars are not set.
 * Google OAuth NO LONGER uses this — it goes through the backend API.
 * Only check/use this if you are using Supabase for other features.
 */
export const supabase: SupabaseClient | null = _configured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
