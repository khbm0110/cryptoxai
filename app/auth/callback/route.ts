import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// Supabase redirects both "confirm email" and "reset password" links here.
// `next` lets the reset-password flow land on the right page after the code exchange;
// email confirmation falls through to the dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = searchParams.get('locale') ?? 'en';
  const next = searchParams.get('next') ?? `/${locale}/dashboard`;

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/${locale}/login?error=confirmation_failed`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
