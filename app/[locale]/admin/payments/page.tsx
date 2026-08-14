import { redirect } from 'next/navigation';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import PaymentActions from '@/components/admin/PaymentActions';

export default async function AdminPaymentsPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminSupabase();
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin' && me?.role !== 'super_admin') redirect(`/${locale}`);

  const { data: pending } = await admin
    .from('payments')
    .select('id, amount_usdt, network, tx_hash, created_at, users(email, full_name), subscriptions(plans(name_en))')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true });

  const payments = pending ?? [];

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>Payments awaiting verification</h1>
        <a href={`/${locale}/admin/roles`} style={{ fontSize: 13.5, color: 'var(--signal)' }}>← Roles</a>
      </div>

      <Card>
        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
            Nothing to verify right now.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hair)', fontSize: 12.5, color: 'var(--muted)' }}>
                  <th style={{ textAlign: 'start', padding: '0 0 10px' }}>User</th>
                  <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Plan</th>
                  <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Amount</th>
                  <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Network</th>
                  <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Tx hash</th>
                  <th style={{ textAlign: 'end', padding: '0 0 10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--hair)' }}>
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ fontWeight: 600 }}>{p.users?.full_name ?? p.users?.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.users?.email}</div>
                    </td>
                    <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{p.subscriptions?.plans?.name_en}</td>
                    <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)' }}>{p.amount_usdt}</td>
                    <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{p.network}</td>
                    <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.tx_hash}>
                      {p.tx_hash}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'end' }}>
                      <PaymentActions paymentId={p.id} locale={locale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
