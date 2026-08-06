'use client';
import { useActionState, useEffect } from 'react';
import { connectBinanceAction } from '@/lib/actions/binance';
import { initialFormState } from '@/lib/actions/types';
import { Button, Input, Card } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function BinanceConnectForm({ alreadyConnected }: { alreadyConnected: boolean }) {
  const [state, formAction, pending] = useActionState(connectBinanceAction, initialFormState);
  const { push } = useToast();

  useEffect(() => {
    if (state.status === 'success' && state.message) push(state.message, 'success');
    if (state.status === 'error' && state.message) push(state.message, 'error');
  }, [state, push]);

  return (
    <Card style={{ maxWidth: 460 }}>
      {alreadyConnected && (
        <p style={{ fontSize: 13, color: 'var(--gain)', marginBottom: 16 }}>
          ✓ A Binance account is already connected. Submitting new keys replaces it.
        </p>
      )}
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input name="apiKey" label="Binance API key" error={state.fieldErrors?.apiKey} autoComplete="off" />
        <Input name="apiSecret" type="password" label="Binance secret key" error={state.fieldErrors?.apiSecret} autoComplete="off" />
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          Create a <strong>trade-only</strong> key in Binance (disable withdrawals). We verify this on connect and reject
          any key that can withdraw funds.
        </p>
        <Button type="submit" loading={pending}>Connect account</Button>
      </form>
    </Card>
  );
}
