import { Card } from '@/components/ui';

export default function OverviewCards({
  totalSubscribers,
  activeSignals,
  closedSignals30d,
  canceledSignals30d,
}: {
  totalSubscribers: number;
  activeSignals: number;
  closedSignals30d: number;
  canceledSignals30d: number;
}) {
  const stats = [
    { label: 'Total subscribers', value: String(totalSubscribers) },
    { label: 'Active signals', value: String(activeSignals) },
    { label: 'Closed (30d)', value: String(closedSignals30d) },
    { label: 'Canceled (30d)', value: String(canceledSignals30d) },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
      {stats.map((s) => (
        <Card key={s.label}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, fontFamily: 'var(--font-mono)', color: 'var(--signal)' }}>
            {s.value}
          </div>
        </Card>
      ))}
    </div>
  );
}
