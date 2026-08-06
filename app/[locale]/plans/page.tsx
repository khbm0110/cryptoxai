import { getTranslations } from 'next-intl/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import PlanCard from '@/components/plans/PlanCard';

export default async function PlansPage({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  const t = await getTranslations('plans');
  const admin = createAdminSupabase();
  const { data: plans } = await admin
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 30 }}>{t('title')}</h1>
      <p style={{ color: 'var(--muted)' }}>{t('subtitle')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 40 }}>
        {plans?.map((plan, i) => (
          <PlanCard key={plan.id} plan={{ ...plan, featured: i === 1 }} locale={locale} />
        ))}
      </div>
    </main>
  );
}
