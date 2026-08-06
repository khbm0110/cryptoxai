import { createBrowserClient } from '@supabase/ssr';

// Used in client components only. Relies on RLS — never trust this
// connection for writes to roles, plans, or subscription status.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
