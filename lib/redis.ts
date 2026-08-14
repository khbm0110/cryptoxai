import { createClient, type RedisClientType } from 'redis';

// Same stream name the worker reads via XREADGROUP (worker/worker/config.py: SIGNAL_STREAM,
// default "trade_signals"). Must match SIGNAL_STREAM in the worker's environment.
const STREAM_NAME = process.env.SIGNAL_STREAM ?? 'trade_signals';

let client: RedisClientType | null = null;

async function getClient(): Promise<RedisClientType> {
  if (client && client.isOpen) return client;
  client = createClient({ url: process.env.REDIS_URL! });
  client.on('error', (err) => console.error('Redis client error', err));
  await client.connect();
  return client;
}

/**
 * Publishes a signal to the execution worker's Redis Stream. This is the only
 * way a row in the `signals` table actually reaches Binance — inserting into
 * Postgres alone does nothing; the worker never polls that table.
 *
 * Field names must match what worker/worker/consumer.py reads from the
 * message: signal_id, plan_ids (array), symbol, side, price.
 */
export async function publishSignal(signal: {
  signalId: string;
  planId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number; // required — the worker's validator uses this for slippage checks
}) {
  const redis = await getClient();
  await redis.xAdd(STREAM_NAME, '*', {
    data: JSON.stringify({
      signal_id: signal.signalId,
      plan_ids: [signal.planId],
      symbol: signal.symbol,
      side: signal.side,
      price: signal.price,
    }),
  });
}
