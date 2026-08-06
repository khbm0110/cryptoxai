'use client';
import { useActionState, useEffect } from 'react';
import { updatePassword } from '@/lib/actions/auth';
import { initialFormState } from '@/lib/actions/types';
import { Button, Input, Card } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function ResetPasswordForm({ locale }: { locale: 'en' | 'ar' }) {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState(updatePassword, initialFormState);
  const { push } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'success') {
      push(state.message!, 'success');
      router.push(`/${locale}/login`);
    }
    if (state.status === 'error' && state.message) push(state.message, 'error');
  }, [state, push, router, locale]);

  return (
    <Card style={{ maxWidth: 380, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 22 }}>{t('resetTitle')}</h1>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input name="password" type="password" label={t('newPassword')} error={state.fieldErrors?.password} required minLength={8} />
        <Button type="submit" loading={pending}>{t('updatePassword')}</Button>
      </form>
    </Card>
  );
}
