import { getTranslations } from 'next-intl/server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { logout } from '@/lib/actions/auth';
import OrdersLiveList from '@/components/OrdersLiveList';
import { Card, Button } from '@/components/ui';

export default async function DashboardPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  const t = await getTranslations('dashboard');
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminSupabase();

  const [{ data: profile }, { data: subscription }, { data: orders }] = await Promise.all([
    admin.from('users').select('*').eq('id', user.id).single(),
    admin
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
    admin.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);

  const planName = subscription?.plans
    ? locale === 'ar' ? subscription.plans.name_ar : subscription.plans.name_en
    : null;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26 }}>{t('title', { name: profile?.full_name ?? '' })}</h1>
        <form action={logout.bind(null, locale)}>
          <Button variant="ghost" type="submit">{t('logout')}</Button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, margin: '28px 0' }}>
        <StatCard label={t('plan')} value={planName ?? t('noPlan')} />
        <StatCard
          label={t('binanceStatus')}
          value={profile?.binance_api_key_enc ? t('connected') : t('notConnected')}
          warn={!profile?.binance_api_key_enc}
        />
        <StatCard
          label={t('verifiedCapital')}
          value={`${profile?.binance_verified_capital_usdt ?? 0} USDT`}
        />
      </div>

      {!profile?.binance_api_key_enc && (
        <Card style={{ borderColor: 'var(--loss)', background: 'var(--loss-bg)', marginBottom: 28 }}>
          {t('connectBinancePrompt')} <a href={`/${locale}/settings/binance`}>{t('connectNow')}</a>
        </Card>
      )}

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>{t('recentTrades')}</h2>
        <OrdersLiveList userId={user.id} initialOrders={orders ?? []} />
      </section>
    </main>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card style={{ borderColor: warn ? 'var(--loss)' : 'var(--hair)', padding: 18 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: warn ? 'var(--loss)' : 'var(--ink)' }}>{value}</div>
    </Card>
  );
}
