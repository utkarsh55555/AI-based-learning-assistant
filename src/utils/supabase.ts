/**
 * utils/supabase.ts
 * =================
 * Supabase client for the frontend.
 * Used to trigger Google OAuth sign-in flow and listen for auth state changes.
 *
 * Required environment variables (in root .env):
 *   VITE_SUPABASE_URL=https://your-project-id.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Google Login will not work. Please add these to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
