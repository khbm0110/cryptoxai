import { Card } from '@/components/ui';

type Subscriber = {
  id: string;
  email: string;
  full_name: string | null;
  plan_name: string;
  usdt_amount_due: number;
  current_period_end: string | null;
};

export default function SubscribersTable({ subscribers }: { subscribers: Subscriber[] }) {
  return (
    <Card>
      <h2 style={{ fontSize: 19, marginBottom: 16 }}>Subscribers</h2>
      {subscribers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
          No active subscribers on your plans yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hair)', fontSize: 12.5, color: 'var(--muted)' }}>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Subscriber</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Plan</th>
                <th style={{ textAlign: 'start', padding: '0 0 10px' }}>Renews</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--hair)' }}>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ fontWeight: 600 }}>{s.full_name ?? s.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.email}</div>
                  </td>
                  <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{s.plan_name}</td>
                  <td style={{ padding: '12px 0', color: 'var(--muted)' }}>
                    {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
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
