'use client';
import { useActionState, useEffect } from 'react';
import { appointRoleAction } from '@/lib/actions/admin';
import { initialFormState } from '@/lib/actions/types';
import { useToast } from '@/components/Toast';
import { useTranslations } from 'next-intl';

export default function AppointRoleForm({ userId, currentRole }: { userId: string; currentRole: string }) {
  const tr = useTranslations('roles');
  const [state, formAction, pending] = useActionState(appointRoleAction, initialFormState);
  const { push } = useToast();

  useEffect(() => {
    if (state.status === 'success') push(state.message!, 'success');
    if (state.status === 'error') push(state.message!, 'error');
  }, [state, push]);

  return (
    <form action={formAction} style={{ display: 'flex', gap: 8 }}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--hair)', fontFamily: 'inherit' }}
      >
        <option value="client">{tr('client')}</option>
        <option value="trade_supervisor">{tr('trade_supervisor')}</option>
        <option value="admin">{tr('admin')}</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--hair)', background: 'var(--paper)', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {pending ? '…' : 'Save'}
      </button>
    </form>
  );
}
