'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: 'pending' | 'executing' | 'filled' | 'failed' | 'canceled';
  created_at: string;
}

const STATUS_COLOR: Record<Order['status'], string> = {
  pending: 'var(--amber)',
  executing: 'var(--signal)',
  filled: 'var(--gain)',
  failed: 'var(--loss)',
  canceled: 'var(--muted)',
};

// Renders the user's trades and keeps them updated live (PENDING -> EXECUTING -> FILLED)
// without a page refresh, using a Supabase Realtime postgres_changes subscription.
export default function OrdersLiveList({ userId, initialOrders }: { userId: string; initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`orders-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        (payload) => {
          setOrders((prev) => {
            if (payload.eventType === 'INSERT') {
              return [payload.new as Order, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o));
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (orders.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: 14 }}>No trades copied yet — they'll appear here the moment a signal fires.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {orders.map((o) => (
        <div
          key={o.id}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '1px solid var(--hair)', borderRadius: 10, padding: '12px 16px',
          }}
        >
          <div>
            <strong>{o.symbol}</strong> · {o.side} · {o.quantity}
          </div>
          <span style={{ color: STATUS_COLOR[o.status], fontFamily: 'monospace', fontSize: 13 }}>
            {o.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
