import { Card } from '@/components/ui';
import CloseSignalButton from './CloseSignalButton';

type Signal = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  stop_loss: number;
  status: string;
  created_at: string;
};

export default function LiveSignalsTable({ signals, locale }: { signals: Signal[]; locale: 'en' | 'ar' }) {
  return (
    <Card>
      <h2 style={{ fontSize: 19, marginBottom: 16 }}>Live signals</h2>
      {signals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
          No active signals. Publish one from the form.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hair)', fontSize: 12.5, color: 'var(--muted)' }}>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Pair</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Side</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Entry</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Stop loss</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Status</th>
                <th style={{ textAlign: 'end', padding: '0 0 10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--hair)' }}>
                  <td style={{ padding: '12px 0', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.symbol}</td>
                  <td style={{ padding: '12px 0', color: s.side === 'BUY' ? 'var(--gain)' : 'var(--loss)', fontWeight: 600 }}>{s.side}</td>
                  <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{s.entry_price}</td>
                  <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{s.stop_loss}</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 100, fontWeight: 700, background: 'var(--signal-dim)', color: 'var(--signal)' }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'end' }}>
                    <CloseSignalButton signalId={s.id} locale={locale} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
