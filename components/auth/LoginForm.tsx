'use client';
import { useActionState, useEffect } from 'react';
import { loginAction } from '@/lib/actions/auth';
import { initialFormState } from '@/lib/actions/types';
import { Button, Input, Card } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useTranslations } from 'next-intl';

export default function LoginForm({ locale }: { locale: 'en' | 'ar' }) {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState(loginAction, initialFormState);
  const { push } = useToast();

  useEffect(() => {
    if (state.status === 'error' && state.message) push(state.message, 'error');
  }, [state, push]);

  return (
    <Card style={{ maxWidth: 380, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 22 }}>{t('loginTitle')}</h1>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input type="hidden" name="locale" value={locale} />
        <Input name="email" type="email" label={t('email')} error={state.fieldErrors?.email} required />
        <Input name="password" type="password" label={t('password')} error={state.fieldErrors?.password} required />
        <Button type="submit" loading={pending}>{t('loginButton')}</Button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13.5, color: 'var(--muted)' }}>
        <a href={`/${locale}/forgot-password`}>{t('forgotPassword')}</a>
      </p>
      <p style={{ marginTop: 8, fontSize: 13.5 }}>
        {t('noAccount')} <a href={`/${locale}/register`}>{t('registerLink')}</a>
      </p>
    </Card>
  );
}
