'use client';

import React, { useActionState, useMemo, useState } from 'react';
import { createSignal } from '@/lib/actions/signals';
import { initialFormState } from '@/lib/actions/types';
import { Button, Card, Input } from '@/components/ui';
import { useToast } from '@/components/Toast';

const ASSET_PAIRS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT',
  'AVAX/USDT', 'DOT/USDT', 'LINK/USDT', 'MATIC/USDT', 'LTC/USDT', 'ATOM/USDT', 'NEAR/USDT',
];

type TakeProfitTarget = { id: number; price: string; percentage: string };

export default function TradeExecutionForm({ plans }: { plans: { id: string; name: string }[] }) {
  const { push } = useToast();
  const [state, formAction, pending] = useActionState(createSignal, initialFormState);

  const [search, setSearch] = useState('');
  const [pair, setPair] = useState(ASSET_PAIRS[0]);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [takeProfits, setTakeProfits] = useState<TakeProfitTarget[]>([{ id: 1, price: '', percentage: '' }]);

  const filteredPairs = useMemo(
    () => ASSET_PAIRS.filter((p) => p.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const totalPct = takeProfits.reduce((sum, tp) => sum + (parseFloat(tp.percentage) || 0), 0);

  React.useEffect(() => {
    if (state.status === 'success') push(state.message ?? 'Signal published.', 'success');
    if (state.status === 'error' && state.message) push(state.message, 'error');
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <h2 style={{ fontSize: 19, marginBottom: 16 }}>Publish a trade signal</h2>
      <form
        action={formAction}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        onSubmit={() => {
          // stash the take-profit array as JSON just before submit
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Plan</span>
          <select
            name="planId"
            required
            style={{ padding: '11px 14px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 14.5 }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {state.fieldErrors?.planId && <span style={{ fontSize: 12.5, color: 'var(--loss)' }}>{state.fieldErrors.planId}</span>}
        </label>

        <Input label="Search pair" placeholder="e.g. BTC, ETH..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Pair</span>
          <select
            name="symbol"
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            style={{ padding: '11px 14px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 14.5 }}
          >
            {filteredPairs.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {state.fieldErrors?.symbol && <span style={{ fontSize: 12.5, color: 'var(--loss)' }}>{state.fieldErrors.symbol}</span>}
        </label>

        <Input
          label="Reference price (used for slippage protection)"
          type="number"
          step="any"
          name="entryPrice"
          placeholder="Required"
          error={state.fieldErrors?.entryPrice}
        />
        <Input
          label="Stop loss"
          type="number"
          step="any"
          name="stopLoss"
          placeholder="Required"
          error={state.fieldErrors?.stopLoss}
        />

        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Take-profit targets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {takeProfits.map((tp, i) => (
              <div key={tp.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{i + 1}.</span>
                <input
                  type="number" step="any" placeholder="Target price" value={tp.price}
                  onChange={(e) => setTakeProfits((prev) => prev.map((x) => (x.id === tp.id ? { ...x, price: e.target.value } : x)))}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'inherit' }}
                />
                <input
                  type="number" step="any" placeholder="Sell %" value={tp.percentage}
                  onChange={(e) => setTakeProfits((prev) => prev.map((x) => (x.id === tp.id ? { ...x, percentage: e.target.value } : x)))}
                  style={{ width: 90, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'inherit' }}
                />
                {takeProfits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTakeProfits((prev) => prev.filter((x) => x.id !== tp.id))}
                    style={{ background: 'transparent', border: 'none', color: 'var(--loss)', cursor: 'pointer', fontSize: 13 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
            {takeProfits.length < 3 && (
              <button
                type="button"
                onClick={() => setTakeProfits((prev) => [...prev, { id: Date.now(), price: '', percentage: '' }])}
                style={{ background: 'transparent', border: 'none', color: 'var(--signal)', cursor: 'pointer', fontSize: 13 }}
              >
                + Add target
              </button>
            )}
            <span style={{ color: totalPct > 100 ? 'var(--loss)' : 'var(--muted)', marginInlineStart: 'auto' }}>
              Total: {totalPct}%
            </span>
          </div>
          {state.fieldErrors?.takeProfit && <div style={{ fontSize: 12.5, color: 'var(--loss)', marginTop: 6 }}>{state.fieldErrors.takeProfit}</div>}
        </div>

        {/* Hidden field carrying the structured take-profit array as JSON */}
        <input type="hidden" name="takeProfit" value={JSON.stringify(takeProfits.filter((tp) => tp.price && tp.percentage).map((tp) => ({ price: parseFloat(tp.price), percentage: parseFloat(tp.percentage) })))} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          <Button type="submit" name="side" value="BUY" onClick={() => setSide('BUY')} loading={pending && side === 'BUY'} style={{ background: 'var(--gain)', color: '#fff' }}>
            Buy / Long
          </Button>
          <Button type="submit" name="side" value="SELL" onClick={() => setSide('SELL')} loading={pending && side === 'SELL'} style={{ background: 'var(--loss)', color: '#fff' }}>
            Sell / Short
          </Button>
        </div>
      </form>
    </Card>
  );
}
