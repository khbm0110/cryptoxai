export type UsdtNetwork = 'TRC20' | 'ERC20' | 'BEP20';

/**
 * The platform's own deposit addresses. These are public by nature — every
 * paying user needs to see them — so they're read from NEXT_PUBLIC_ env vars
 * rather than server-only secrets.
 */
export const PLATFORM_WALLETS: Record<UsdtNetwork, string | undefined> = {
  TRC20: process.env.NEXT_PUBLIC_USDT_TRC20_ADDRESS,
  ERC20: process.env.NEXT_PUBLIC_USDT_ERC20_ADDRESS,
  BEP20: process.env.NEXT_PUBLIC_USDT_BEP20_ADDRESS,
};

export const NETWORK_LABELS: Record<UsdtNetwork, string> = {
  TRC20: 'USDT (TRC20 — Tron)',
  ERC20: 'USDT (ERC20 — Ethereum)',
  BEP20: 'USDT (BEP20 — BNB Chain)',
};
