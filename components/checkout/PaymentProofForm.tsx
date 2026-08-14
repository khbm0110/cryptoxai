'use client';

import { useActionState, useEffect, useState } from 'react';
import { submitPaymentProof } from '@/lib/actions/subscriptions';
import { initialFormState } from '@/lib/actions/types';
import { Button, Card } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { PLATFORM_WALLETS, NETWORK_LABELS, type UsdtNetwork } from '@/lib/payment-config';

export default function PaymentProofForm({ subscriptionId }: { subscriptionId: string }) {
  const { push } = useToast();
  const [state, formAction, pending] = useActionState(submitPaymentProof, initialFormState);
  const [network, setNetwork] = useState<UsdtNetwork>('TRC20');

  useEffect(() => {
    if (state.status === 'success' && state.message) push(state.message, 'success');
    if (state.status === 'error' && state.message) push(state.message, 'error');
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const address = PLATFORM_WALLETS[network];

  if (state.status === 'success') {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <h3 style={{ marginBottom: 8 }}>Payment submitted</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            We're verifying your transaction. This usually takes a few hours — your plan activates automatically once confirmed.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 style={{ fontSize: 19, marginBottom: 16 }}>Pay with USDT</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(Object.keys(NETWORK_LABELS) as UsdtNetwork[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNetwork(n)}
            style={{
              flex: 1,
              padding: '9px 6px',
              borderRadius: 8,
              border: `1px solid ${network === n ? 'var(--signal)' : 'var(--hair)'}`,
              background: network === n ? 'var(--signal-dim)' : 'transparent',
              color: network === n ? 'var(--signal)' : 'var(--muted)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{NETWORK_LABELS[network]} deposit address</div>
        {address ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: 'var(--mist)', border: '1px solid var(--hair)', borderRadius: 9,
              fontFamily: 'var(--font-mono)', fontSize: 13, wordBreak: 'break-all',
            }}
          >
            <span style={{ flex: 1 }}>{address}</span>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(address); push('Address copied', 'success'); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--signal)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
            >
              Copy
            </button>
          </div>
        ) : (
          <div style={{ color: 'var(--loss)', fontSize: 13 }}>
            This network isn't configured yet. Please choose another network.
          </div>
        )}
      </div>

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <input type="hidden" name="network" value={network} />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Transaction hash</span>
          <input
            name="txHash"
            placeholder="0x... or the tx ID from your wallet"
            style={{ padding: '11px 14px', borderRadius: 9, border: `1px solid ${state.fieldErrors?.txHash ? 'var(--loss)' : 'var(--hair)'}`, background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13.5 }}
          />
          {state.fieldErrors?.txHash && <span style={{ fontSize: 12.5, color: 'var(--loss)' }}>{state.fieldErrors.txHash}</span>}
        </label>

        <Button type="submit" loading={pending} disabled={!address}>
          I've sent the payment
        </Button>
      </form>
    </Card>
  );
}
