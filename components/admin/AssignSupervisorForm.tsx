'use client';
import { useActionState, useEffect } from 'react';
import { assignSupervisorToPlanAction } from '@/lib/actions/admin';
import { initialFormState } from '@/lib/actions/types';
import { Button } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useTranslations } from 'next-intl';

interface Person { id: string; email: string }
interface PlanOption { id: string; name: string }

export default function AssignSupervisorForm({ supervisors, plans }: { supervisors: Person[]; plans: PlanOption[] }) {
  const t = useTranslations('admin.roles');
  const [state, formAction, pending] = useActionState(assignSupervisorToPlanAction, initialFormState);
  const { push } = useToast();

  useEffect(() => {
    if (state.status === 'success') push(state.message!, 'success');
    if (state.status === 'error') push(state.message!, 'error');
  }, [state, push]);

  const selectStyle = { padding: '10px 12px', borderRadius: 9, border: '1px solid var(--hair)', fontFamily: 'inherit', background: 'var(--paper)' };

  return (
    <form action={formAction} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <select name="supervisorId" required style={selectStyle}>
        {supervisors.length === 0 && <option value="">No supervisors yet</option>}
        {supervisors.map((s) => (
          <option key={s.id} value={s.id}>{s.email}</option>
        ))}
      </select>
      <select name="planId" required style={selectStyle}>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <Button type="submit" loading={pending}>{t('assignSupervisor')}</Button>
    </form>
  );
}
