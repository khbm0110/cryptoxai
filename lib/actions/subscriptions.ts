'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { FormState } from './types';

/**
 * Subscribes the current user to a plan, in USDT.
 * Enforces plan.min_capital_usdt against the user's last-verified Binance balance
 * BEFORE creating a payable subscription — a user under the capital requirement
 * never reaches the payment step. Returns FormState so the UI can show the exact
 * numbers inline instead of a generic thrown error.
 */
export async function subscribeToPlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const planId = formData.get('planId') as string;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'Please log in first.' };

  const admin = createAdminSupabase();

  const { data: plan } = await admin.from('plans').select('*').eq('id', planId).single();
  if (!plan || !plan.is_active) return { status: 'error', message: 'This plan is no longer available.' };

  const { data: profile } = await admin
    .from('users')
    .select('binance_verified_capital_usdt, binance_api_key_enc')
    .eq('id', user.id)
    .single();

  if (!profile?.binance_api_key_enc) {
    return { status: 'error', message: 'Connect your Binance account before subscribing.' };
  }

  const verifiedCapital = profile?.binance_verified_capital_usdt ?? 0;

  if (verifiedCapital < plan.min_capital_usdt) {
    await admin.from('subscriptions').insert({
      user_id: user.id,
      plan_id: planId,
      status: 'rejected_capital',
      usdt_amount_due: plan.price_usdt,
      capital_check_passed: false,
      capital_checked_at: new Date().toISOString(),
    });

    return {
      status: 'error',
      message: `Your verified balance (${verifiedCapital} USDT) is below the ${plan.min_capital_usdt} USDT required for this plan.`,
    };
  }

  const { error } = await admin.from('subscriptions').insert({
    user_id: user.id,
    plan_id: planId,
    status: 'pending_payment',
    usdt_amount_due: plan.price_usdt,
    capital_check_passed: true,
    capital_checked_at: new Date().toISOString(),
  });

  if (error) return { status: 'error', message: 'Could not create the subscription. Please try again.' };

  // Next step (separate module): generate a USDT payment address/invoice
  // (TRC20/ERC20/BEP20) and hand it to the client for the checkout screen.
  return { status: 'success', message: 'Subscription created — proceed to USDT payment.' };
}

