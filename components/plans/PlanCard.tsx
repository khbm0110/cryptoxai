'use client';
import { useActionState, useEffect } from 'react';
import { subscribeToPlanAction } from '@/lib/actions/subscriptions';
import { initialFormState } from '@/lib/actions/types';
import { Button, Card } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useTranslations } from 'next-intl';

interface Plan {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price_usdt: number;
  min_capital_usdt: number;
  includes_telegram: boolean;
  featured?: boolean;
}

export default function PlanCard({ plan, locale }: { plan: Plan; locale: 'en' | 'ar' }) {
  const t = useTranslations('plans');
  const [state, formAction, pending] = useActionState(subscribeToPlanAction, initialFormState);
  const { push } = useToast();

  useEffect(() => {
    if (state.status === 'success' && state.message) push(state.message, 'success');
    if (state.status === 'error' && state.message) push(state.message, 'error');
  }, [state, push]);

  const name = locale === 'ar' ? plan.name_ar : plan.name_en;
  const description = locale === 'ar' ? plan.description_ar : plan.description_en;

  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderColor: plan.featured ? 'var(--signal)' : 'var(--hair)',
        background: plan.featured ? 'linear-gradient(180deg, var(--signal-dim), var(--paper) 40%)' : 'var(--paper)',
        position: 'relative',
      }}
    >
      {plan.featured && (
        <span
          style={{
            position: 'absolute', top: -13, insetInlineEnd: 24,
            background: 'var(--signal)', color: '#fff', fontSize: 12, fontWeight: 700,
            padding: '5px 14px', borderRadius: 100,
          }}
        >
          ★
        </span>
      )}

      <h3 style={{ fontSize: 19, marginBottom: 6 }}>{name}</h3>
      {description && <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>{description}</p>}

      <div className="num" style={{ fontSize: 30, margin: '4px 0 4px' }}>
        {plan.price_usdt} <span style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>USDT{t('priceSuffix')}</span>
      </div>

      {plan.min_capital_usdt > 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--amber)', margin: '10px 0 18px' }}>
          {t('minCapitalNotice', { amount: plan.min_capital_usdt })}
        </p>
      )}

      {plan.includes_telegram && (
        <p style={{ fontSize: 12.5, color: '#2AA9DE', marginBottom: 18 }}>📣 Telegram channel included</p>
      )}

      <form action={formAction} style={{ marginTop: 'auto' }}>
        <input type="hidden" name="planId" value={plan.id} />
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant={plan.featured ? 'primary' : 'ghost'} loading={pending} style={{ width: '100%' }}>
          {t('subscribe')}
        </Button>
      </form>
    </Card>
  );
}
