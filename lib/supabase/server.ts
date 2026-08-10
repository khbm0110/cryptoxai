import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Server components / route handlers: respects the logged-in user's session (RLS applies).
// Next.js 15 made cookies() async — this must be awaited by every caller.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies directly.
            // Safe to ignore as long as the session is also refreshed in middleware,
            // or in this app's case, as long as Server Actions (which CAN set cookies) are what call this.
          }
        },
      },
    }
  );
}

// Privileged client: bypasses RLS. ONLY use for admin actions that have already
// been authorized (role checked against `users.role` in the DB, not from a JWT claim).
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
// Uses a static import (not require()) so the client keeps its generated types
// instead of collapsing to `any` everywhere it's used.
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
