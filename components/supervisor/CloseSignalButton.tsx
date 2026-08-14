'use client';

import { useTransition } from 'react';
import { closeSignal } from '@/lib/actions/signals';

export default function CloseSignalButton({ signalId, locale }: { signalId: string; locale: 'en' | 'ar' }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm('Close this signal? Subscribers will stop copying it.')) return;
        startTransition(() => closeSignal(signalId, locale));
      }}
      style={{
        fontSize: 12.5,
        color: 'var(--loss)',
        background: 'rgba(239,68,68,0.12)',
        border: 'none',
        padding: '6px 12px',
        borderRadius: 8,
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? '…' : 'Close'}
    </button>
  );
}
