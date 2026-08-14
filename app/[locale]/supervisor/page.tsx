import { redirect } from 'next/navigation';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { fetchLivePrices } from '@/lib/binance-public';
import OverviewCards from '@/components/supervisor/OverviewCards';
import TradeExecutionForm from '@/components/supervisor/TradeExecutionForm';
import LiveSignalsTable from '@/components/supervisor/LiveSignalsTable';
import LivePositionsTable from '@/components/supervisor/LivePositionsTable';
import SubscribersTable from '@/components/supervisor/SubscribersTable';

export default async function SupervisorPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const admin = createAdminSupabase();
  const { data: me } = await admin.from('users').select('role').eq('id', user.id).single();

  const isStaff = me?.role === 'admin' || me?.role === 'super_admin';
  if (!me || (!isStaff && me.role !== 'trade_supervisor')) {
    redirect(`/${locale}`);
  }

  // Which plans can this user publish signals for?
  let planIds: string[] = [];
  let planOptions: { id: string; name: string }[] = [];

  if (isStaff) {
    const { data: allPlans } = await admin.from('plans').select('id, name_en').eq('is_active', true);
    planIds = (allPlans ?? []).map((p) => p.id);
    planOptions = (allPlans ?? []).map((p) => ({ id: p.id, name: p.name_en }));
  } else {
    const { data: assignments } = await admin
      .from('supervisor_plan_assignments')
      .select('plan_id, plans(id, name_en)')
      .eq('supervisor_id', user.id)
      .eq('active', true);
    planIds = (assignments ?? []).map((a: any) => a.plan_id);
    planOptions = (assignments ?? [])
      .map((a: any) => a.plans)
      .filter(Boolean)
      .map((p: any) => ({ id: p.id, name: p.name_en }));
  }

  if (planIds.length === 0) {
    return (
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 26, marginBottom: 12 }}>Trade Supervisor</h1>
        <p style={{ color: 'var(--muted)' }}>
          You haven't been assigned to any plan yet. An admin needs to assign you to a plan before you can publish signals.
        </p>
      </main>
    );
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: activeSubs }, { data: liveSignals }, { count: closedCount }, { count: canceledCount }, { data: openPositions }] = await Promise.all([
    admin
      .from('subscriptions')
      .select('id, usdt_amount_due, current_period_end, plan_id, user_id, users(email, full_name), plans(name_en)')
      .in('plan_id', planIds)
      .eq('status', 'active'),
    admin
      .from('signals')
      .select('id, symbol, side, entry_price, stop_loss, status, created_at')
      .in('plan_id', planIds)
      .in('status', ['pending', 'executing'])
      .order('created_at', { ascending: false }),
    admin
      .from('signals')
      .select('id', { count: 'exact', head: true })
      .in('plan_id', planIds)
      .eq('status', 'closed')
      .gte('closed_at', since30d),
    admin
      .from('signals')
      .select('id', { count: 'exact', head: true })
      .in('plan_id', planIds)
      .eq('status', 'canceled')
      .gte('updated_at', since30d),
    admin
      .from('positions')
      .select('id, symbol, side, entry_quantity, remaining_quantity, stop_loss, take_profit, orders(price), users(email, full_name), signals!inner(plan_id)')
      .in('signals.plan_id', planIds)
      .eq('status', 'open'),
  ]);

  const positions = (openPositions ?? []).map((p: any) => ({
    id: p.id,
    symbol: p.symbol,
    side: p.side,
    entry_quantity: p.entry_quantity,
    remaining_quantity: p.remaining_quantity,
    stop_loss: p.stop_loss,
    take_profit: p.take_profit ?? [],
    entry_price: p.orders?.price ?? null,
    subscriber_email: p.users?.email ?? '—',
    subscriber_name: p.users?.full_name ?? null,
  }));

  const livePrices = await fetchLivePrices(positions.map((p) => p.symbol));

  const subscribers = (activeSubs ?? []).map((s: any) => ({
    id: s.id,
    email: s.users?.email ?? '—',
    full_name: s.users?.full_name ?? null,
    plan_name: s.plans?.name_en ?? '—',
    usdt_amount_due: s.usdt_amount_due,
    current_period_end: s.current_period_end,
  }));

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <h1 style={{ fontSize: 26 }}>Trade Supervisor</h1>

      <OverviewCards
        totalSubscribers={subscribers.length}
        activeSignals={liveSignals?.length ?? 0}
        closedSignals30d={closedCount ?? 0}
        canceledSignals30d={canceledCount ?? 0}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>
        <TradeExecutionForm plans={planOptions} />
        <LiveSignalsTable signals={liveSignals ?? []} locale={locale} />
      </div>

      <LivePositionsTable positions={positions} livePrices={livePrices} />

      <SubscribersTable subscribers={subscribers} />
    </main>
  );
}
