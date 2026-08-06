import crypto from 'crypto';

const BINANCE_BASE = 'https://api.binance.com';

interface BinanceAccountInfo {
  canTrade: boolean;
  canWithdraw: boolean;
  balances: { asset: string; free: string; locked: string }[];
}

/**
 * Reads the account's trade permission and USDT balance. Read-only call —
 * never used to place or cancel orders (that's the worker's job, not this settings flow).
 */
export async function verifyBinanceAccount(apiKey: string, apiSecret: string): Promise<{
  canTrade: boolean;
  canWithdraw: boolean;
  usdtBalance: number;
}> {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');

  const res = await fetch(`${BINANCE_BASE}/api/v3/account?${query}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Binance rejected the API key: ${res.status} ${body}`);
  }

  const data: BinanceAccountInfo = await res.json();

  // Withdraw permission should NEVER be enabled for keys we accept — reject outright.
  if (data.canWithdraw) {
    throw new Error('This API key allows withdrawals. Create a trade-only key instead.');
  }

  const usdt = data.balances.find((b) => b.asset === 'USDT');
  const usdtBalance = usdt ? parseFloat(usdt.free) + parseFloat(usdt.locked) : 0;

  return { canTrade: data.canTrade, canWithdraw: data.canWithdraw, usdtBalance };
}
