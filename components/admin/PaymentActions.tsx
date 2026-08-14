'use client';

import { useTransition } from 'react';
import { verifyPayment, rejectPayment } from '@/lib/actions/payments';
import { useToast } from '@/components/Toast';

export default function PaymentActions({ paymentId, locale }: { paymentId: string; locale: 'en' | 'ar' }) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  const handleVerify = () => {
    if (!confirm('Confirm this transaction is real and fully paid on-chain?')) return;
    startTransition(async () => {
      const result = await verifyPayment(paymentId, locale);
      if (result.ok) push('Payment verified — subscription activated.', 'success');
      else push(result.message ?? 'Failed to verify.', 'error');
    });
  };

  const handleReject = () => {
    const reason = prompt('Reason for rejecting (shown to the user):') ?? '';
    startTransition(async () => {
      const result = await rejectPayment(paymentId, reason, locale);
      if (result.ok) push('Payment rejected.', 'success');
      else push(result.message ?? 'Failed to reject.', 'error');
    });
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        disabled={pending}
        onClick={handleVerify}
        style={{ fontSize: 12.5, color: 'var(--gain)', background: 'rgba(16,185,129,0.12)', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.6 : 1 }}
      >
        Verify
      </button>
      <button
        disabled={pending}
        onClick={handleReject}
        style={{ fontSize: 12.5, color: 'var(--loss)', background: 'rgba(239,68,68,0.12)', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.6 : 1 }}
      >
        Reject
      </button>
    </div>
  );
}
