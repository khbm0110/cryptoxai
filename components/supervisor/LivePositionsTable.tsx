import { Card } from '@/components/ui';

type Position = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_quantity: number;
  remaining_quantity: number;
  stop_loss: number;
  take_profit: { price: number; percentage: number; hit: boolean }[];
  entry_price: number | null;
  subscriber_email: string;
  subscriber_name: string | null;
};

export default function LivePositionsTable({ positions, livePrices }: { positions: Position[]; livePrices: Record<string, number> }) {
  return (
    <Card>
      <h2 style={{ fontSize: 19, marginBottom: 16 }}>Live positions</h2>
      {positions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
          No open positions across your subscribers right now.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hair)', fontSize: 12.5, color: 'var(--muted)' }}>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Subscriber</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Pair</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Entry</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Live price</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Unrealized PnL</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>TP progress</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Stop loss</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const livePrice = livePrices[p.symbol];
                const hasPricing = livePrice != null && p.entry_price != null;
                const isLong = p.side === 'BUY';

                let pnlUsd: number | null = null;
                let pnlPct: number | null = null;
                if (hasPricing) {
                  const diff = isLong ? livePrice - p.entry_price! : p.entry_price! - livePrice;
                  pnlUsd = diff * p.remaining_quantity;
                  pnlPct = (diff / p.entry_price!) * 100;
                }

                const tpHit = p.take_profit.filter((t) => t.hit).length;
                const tpTotal = p.take_profit.length;

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--hair)' }}>
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.subscriber_name ?? p.subscriber_email}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.subscriber_email}</div>
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.symbol}</span>{' '}
                      <span style={{ fontSize: 11.5, color: isLong ? 'var(--gain)' : 'var(--loss)', fontWeight: 600 }}>{p.side}</span>
                    </td>
                    <td style={{ padding: '12px 0', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.entry_price ?? '—'}</td>
                    <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)' }}>{livePrice ?? '—'}</td>
                    <td style={{ padding: '12px 0', fontFamily: 'var(--font-mono)', color: pnlUsd == null ? 'var(--muted)' : pnlUsd >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                      {pnlUsd == null ? '—' : `${pnlUsd >= 0 ? '+' : ''}${pnlUsd.toFixed(2)} (${pnlPct!.toFixed(2)}%)`}
                    </td>
                    <td style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 12.5 }}>{tpHit}/{tpTotal} hit</td>
                    <td style={{ padding: '12px 0', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.stop_loss}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12 }}>
            PnL is unrealized, on remaining open quantity only, priced from Binance's public ticker (up to 5s delayed).
          </div>
        </div>
      )}
    </Card>
  );
}
