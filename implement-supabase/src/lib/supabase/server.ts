/**
 * Supabase Server Client
 * 
 * This client uses the service_role key and bypasses RLS.
 * ONLY use in API routes (server-side), never expose to browser.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
