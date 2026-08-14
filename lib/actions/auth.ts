'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FormState } from './types';

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const fullName = (formData.get('fullName') as string)?.trim();
  const locale = (formData.get('locale') as 'en' | 'ar') ?? 'en';

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.fullName = 'Please enter your name.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Enter a valid email address.';
  if (!password || password.length < 8) fieldErrors.password = 'Password must be at least 8 characters.';
  if (Object.keys(fieldErrors).length) return { status: 'error', fieldErrors };

  const supabase = await createServerSupabase();

  // Supabase sends its own confirmation email when "Confirm email" is enabled in
  // Auth settings — emailRedirectTo points back to our callback route which
  // exchanges the confirmation code for a session.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?locale=${locale}` },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { status: 'error', fieldErrors: { email: 'This email is already registered.' } };
    }
    return { status: 'error', message: error.message };
  }
  if (!data.user) return { status: 'error', message: 'Registration failed. Please try again.' };

  const admin = createAdminSupabase();
  const { error: profileError } = await admin.from('users').insert({
    id: data.user.id,
    email,
    password_hash: 'managed_by_supabase_auth',
    full_name: fullName,
    role: 'client',
    locale,
  });
  if (profileError) return { status: 'error', message: 'Could not finish setting up your account.' };

  return { status: 'success', message: 'Check your email to confirm your account.' };
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const locale = (formData.get('locale') as 'en' | 'ar') ?? 'en';

  if (!email || !password) {
    return { status: 'error', fieldErrors: { email: !email ? 'Required' : '', password: !password ? 'Required' : '' } };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes('confirm')) {
      return { status: 'error', message: 'Please confirm your email before logging in.' };
    }
    return { status: 'error', message: 'Incorrect email or password.' };
  }

  // Route each role to the right landing page — not everyone belongs on the client dashboard.
  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profile?.role === 'super_admin' || profile?.role === 'admin') {
    redirect(`/${locale}/admin/roles`);
  }

  if (profile?.role === 'trade_supervisor') {
    redirect(`/${locale}/supervisor`);
  }

  // client falls through to the shared dashboard.
  redirect(`/${locale}/dashboard`);
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = (formData.get('email') as string)?.trim();
  const locale = (formData.get('locale') as 'en' | 'ar') ?? 'en';
  if (!email) return { status: 'error', fieldErrors: { email: 'Enter your email address.' } };

  const supabase = await createServerSupabase();
  // Always return success regardless of whether the email exists — don't leak account existence.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?locale=${locale}&next=/${locale}/reset-password`,
  });

  return { status: 'success', message: 'If that email is registered, a reset link is on its way.' };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get('password') as string;
  if (!password || password.length < 8) {
    return { status: 'error', fieldErrors: { password: 'Password must be at least 8 characters.' } };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: 'error', message: error.message };

  return { status: 'success', message: 'Password updated. You can log in now.' };
}

export async function logout(locale: 'en' | 'ar') {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
