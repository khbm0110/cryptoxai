'use client';
import { useActionState, useEffect, useState } from 'react';
import { requestPasswordReset } from '@/lib/actions/auth';
import { initialFormState } from '@/lib/actions/types';
import { Button, Input, Card } from '@/components/ui';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordForm({ locale }: { locale: 'en' | 'ar' }) {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialFormState);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (state.status === 'success') setSent(true);
  }, [state]);

  return (
    <Card style={{ maxWidth: 380, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>{t('forgotTitle')}</h1>
      {sent ? (
        <p style={{ color: 'var(--gain)', fontSize: 14.5 }}>{state.message}</p>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>{t('forgotSubtitle')}</p>
          <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="hidden" name="locale" value={locale} />
            <Input name="email" type="email" label={t('email')} error={state.fieldErrors?.email} required />
            <Button type="submit" loading={pending}>{t('sendResetLink')}</Button>
          </form>
        </>
      )}
    </Card>
  );
}
