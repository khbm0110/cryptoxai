'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireStaff() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminSupabase();
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin' && me?.role !== 'super_admin') return null;

  return { admin, staffId: user.id };
}

/**
 * Marks a submitted payment as verified and activates its subscription —
 * this is the only place a subscription actually transitions to 'active'
 * once real money is involved. Sets current_period_start/end based on the
 * plan's billing_period so the worker's `get_eligible_subscribers` query
 * (status = 'active') starts including this user immediately.
 */
export async function verifyPayment(paymentId: string, locale: 'en' | 'ar') {
  const staff = await requireStaff();
  if (!staff) return { ok: false, message: 'Not authorized.' };
  const { admin, staffId } = staff;

  const { data: payment } = await admin
    .from('payments')
    .select('id, subscription_id, status, subscriptions(plan_id, plans(billing_period))')
    .eq('id', paymentId)
    .single();

  if (!payment || payment.status !== 'submitted') {
    return { ok: false, message: 'Payment is not awaiting verification.' };
  }

  const billingPeriod = (payment as any).subscriptions?.plans?.billing_period ?? 'monthly';
  const interval = billingPeriod === 'yearly' ? '1 year' : '1 month';

  const { error: paymentError } = await admin
    .from('payments')
    .update({ status: 'verified', verified_by: staffId, verified_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (paymentError) return { ok: false, message: 'Could not update payment.' };

  // interval math done in SQL — safer than reconstructing "add 1 month" in JS
  const { error: subError } = await admin.rpc('activate_subscription', {
    p_subscription_id: payment.subscription_id,
    p_interval: interval,
  });
  if (subError) return { ok: false, message: 'Payment verified but activating the subscription failed — check manually.' };

  revalidatePath(`/${locale}/admin/payments`);
  return { ok: true };
}

export async function rejectPayment(paymentId: string, reason: string, locale: 'en' | 'ar') {
  const staff = await requireStaff();
  if (!staff) return { ok: false, message: 'Not authorized.' };
  const { admin, staffId } = staff;

  const { error } = await admin
    .from('payments')
    .update({ status: 'rejected', rejection_reason: reason || null, verified_by: staffId, verified_at: new Date().toISOString() })
    .eq('id', paymentId)
    .eq('status', 'submitted');

  if (error) return { ok: false, message: 'Could not reject payment.' };

  revalidatePath(`/${locale}/admin/payments`);
  return { ok: true };
}
