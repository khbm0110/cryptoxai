'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { publishSignal } from '@/lib/redis';
import { revalidatePath } from 'next/cache';
import { FormState } from './types';

type TakeProfitTarget = { price: number; percentage: number };

/**
 * A trade_supervisor publishes a new signal for one of their assigned plans.
 * This writes the signal to Postgres (for the dashboard + audit trail) AND
 * publishes it to the Redis stream the Python worker consumes — the DB row
 * alone never reaches Binance; the worker doesn't poll Postgres.
 */
export async function createSignal(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'Not authenticated.' };

  const planId = formData.get('planId') as string;
  const symbol = (formData.get('symbol') as string)?.trim();
  const side = formData.get('side') as string;
  const entryPriceRaw = (formData.get('entryPrice') as string)?.trim();
  const stopLossRaw = (formData.get('stopLoss') as string)?.trim();
  const takeProfitRaw = formData.get('takeProfit') as string; // JSON string built client-side

  const fieldErrors: Record<string, string> = {};
  if (!planId) fieldErrors.planId = 'Select a plan.';
  if (!symbol) fieldErrors.symbol = 'Select a pair.';
  if (side !== 'BUY' && side !== 'SELL') fieldErrors.side = 'Choose Buy or Sell.';

  // Required — the worker validates slippage by comparing this to the live
  // price at execution time. There is no "market order" in this pipeline.
  const entryPrice = parseFloat(entryPriceRaw);
  if (!entryPriceRaw || isNaN(entryPrice) || entryPrice <= 0) {
    fieldErrors.entryPrice = 'Enter the reference price — required for slippage protection.';
  }

  const stopLoss = parseFloat(stopLossRaw);
  if (!stopLossRaw || isNaN(stopLoss) || stopLoss <= 0) fieldErrors.stopLoss = 'Enter a valid stop loss price.';

  let takeProfit: TakeProfitTarget[] = [];
  try {
    takeProfit = takeProfitRaw ? JSON.parse(takeProfitRaw) : [];
  } catch {
    fieldErrors.takeProfit = 'Invalid take-profit data.';
  }
  const totalPct = takeProfit.reduce((sum, tp) => sum + (Number(tp.percentage) || 0), 0);
  if (totalPct > 100) fieldErrors.takeProfit = 'Take-profit percentages cannot exceed 100%.';

  if (Object.keys(fieldErrors).length) return { status: 'error', fieldErrors };

  const admin = createAdminSupabase();

  // authorize: this user must actually be an active supervisor on this plan
  // (or an admin/super_admin acting on the supervisor's behalf).
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single();
  const isStaff = me?.role === 'admin' || me?.role === 'super_admin';

  if (!isStaff) {
    const { data: assignment } = await admin
      .from('supervisor_plan_assignments')
      .select('id')
      .eq('supervisor_id', user.id)
      .eq('plan_id', planId)
      .eq('active', true)
      .maybeSingle();
    if (!assignment) return { status: 'error', message: 'You are not assigned to this plan.' };
  }

  const { data: inserted, error } = await admin
    .from('signals')
    .insert({
      plan_id: planId,
      supervisor_id: user.id,
      symbol,
      side,
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !inserted) return { status: 'error', message: 'Could not publish the signal. Please try again.' };

  try {
    await publishSignal({ signalId: inserted.id, planId, symbol, side: side as 'BUY' | 'SELL', price: entryPrice });
  } catch {
    // The signal is saved but never reached the worker — mark it so it doesn't
    // sit silently as "pending" forever, and tell the supervisor honestly.
    await admin.from('signals').update({ status: 'canceled' }).eq('id', inserted.id);
    return { status: 'error', message: 'Signal saved but could not reach the execution engine. It was canceled — please retry.' };
  }

  // Now that the worker has picked it up, reflect that in the dashboard.
  await admin.from('signals').update({ status: 'executing' }).eq('id', inserted.id);

  revalidatePath('/[locale]/supervisor', 'page');
  return { status: 'success', message: 'Signal published and dispatched to subscribers.' };
}

/** Close/cancel an open signal. Only the publishing supervisor or staff can do this. */
export async function closeSignal(signalId: string, locale: 'en' | 'ar') {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminSupabase();
  const { data: signal } = await admin.from('signals').select('supervisor_id').eq('id', signalId).single();
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single();
  const isStaff = me?.role === 'admin' || me?.role === 'super_admin';

  if (!signal || (!isStaff && signal.supervisor_id !== user.id)) return;

  await admin.from('signals').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', signalId);
  revalidatePath(`/${locale}/supervisor`);
}
