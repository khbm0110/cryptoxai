'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
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
  const locale = (formData.get('locale') as 'en' | 'ar') ?? 'en';

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

  const { data: subscription, error } = await admin
    .from('subscriptions')
    .insert({
      user_id: user.id,
      plan_id: planId,
      status: 'pending_payment',
      usdt_amount_due: plan.price_usdt,
      capital_check_passed: true,
      capital_checked_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !subscription) return { status: 'error', message: 'Could not create the subscription. Please try again.' };

  redirect(`/${locale}/checkout/${subscription.id}`);
}

/**
 * User submits proof of an on-chain USDT payment (network + tx hash) for one
 * of their own pending_payment subscriptions. This does NOT activate the
 * subscription — an admin still has to verify it against the chain via
 * verifyPayment() in lib/actions/payments.ts. The unique(network, tx_hash)
 * constraint on `payments` blocks the same transaction being claimed twice.
 */
export async function submitPaymentProof(_prev: FormState, formData: FormData): Promise<FormState> {
  const subscriptionId = formData.get('subscriptionId') as string;
  const network = formData.get('network') as string;
  const txHash = (formData.get('txHash') as string)?.trim();

  const fieldErrors: Record<string, string> = {};
  if (!['TRC20', 'ERC20', 'BEP20'].includes(network)) fieldErrors.network = 'Select a network.';
  if (!txHash || txHash.length < 10) fieldErrors.txHash = 'Enter a valid transaction hash.';
  if (Object.keys(fieldErrors).length) return { status: 'error', fieldErrors };

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'Please log in first.' };

  const admin = createAdminSupabase();

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, user_id, status, usdt_amount_due')
    .eq('id', subscriptionId)
    .single();

  if (!subscription || subscription.user_id !== user.id) {
    return { status: 'error', message: 'Subscription not found.' };
  }
  if (subscription.status !== 'pending_payment') {
    return { status: 'error', message: 'This subscription is not awaiting payment.' };
  }

  const { error } = await admin.from('payments').insert({
    subscription_id: subscriptionId,
    user_id: user.id,
    amount_usdt: subscription.usdt_amount_due,
    network,
    tx_hash: txHash,
    status: 'submitted',
  });

  if (error) {
    // most likely cause: unique(network, tx_hash) — this exact transaction was already submitted
    if (error.code === '23505') {
      return { status: 'error', fieldErrors: { txHash: 'This transaction hash was already submitted.' } };
    }
    return { status: 'error', message: 'Could not submit payment proof. Please try again.' };
  }

  revalidatePath('/[locale]/checkout/[subscriptionId]', 'page');
  return { status: 'success', message: 'Payment submitted — we will verify it shortly.' };
}

