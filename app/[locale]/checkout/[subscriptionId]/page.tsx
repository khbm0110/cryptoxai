import { redirect } from 'next/navigation';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import PaymentProofForm from '@/components/checkout/PaymentProofForm';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ar'; subscriptionId: string }>;
}) {
  const { locale, subscriptionId } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminSupabase();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, user_id, status, usdt_amount_due, plans(name_en, name_ar, billing_period)')
    .eq('id', subscriptionId)
    .single();

  if (!subscription || subscription.user_id !== user.id) {
    redirect(`/${locale}/plans`);
  }

  if (subscription.status === 'active') {
    redirect(`/${locale}/dashboard`);
  }
  if (subscription.status !== 'pending_payment') {
    redirect(`/${locale}/plans`);
  }

  const { data: existingPayments } = await admin
    .from('payments')
    .select('id, network, tx_hash, status, created_at')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false });

  const plan = (subscription as any).plans;
  const planName = locale === 'ar' ? plan?.name_ar : plan?.name_en;
  const hasSubmitted = (existingPayments ?? []).some((p) => p.status === 'submitted');

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Complete your subscription</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {planName} — <span className="num">{subscription.usdt_amount_due} USDT</span> ({plan?.billing_period})
        </p>
      </div>

      {hasSubmitted ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <h3 style={{ marginBottom: 8 }}>Payment submitted</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              We're verifying your transaction. Your plan activates automatically once confirmed.
            </p>
          </div>
        </Card>
      ) : (
        <PaymentProofForm subscriptionId={subscriptionId} />
      )}

      {(existingPayments ?? []).some((p) => p.status === 'rejected') && (
        <Card style={{ borderColor: 'var(--loss)' }}>
          <div style={{ fontSize: 13.5, color: 'var(--loss)' }}>
            A previous submission was rejected. Double-check the transaction hash and network, then submit again.
          </div>
        </Card>
      )}
    </main>
  );
}
