"""
Uses the official `binance-connector` library (not ccxt) — this platform is
Binance-only, so the unified multi-exchange abstraction ccxt provides isn't
worth the extra translation layer. See the earlier architecture comparison.
"""
from binance.spot import Spot
from binance.error import ClientError


def get_client(api_key: str, api_secret: str) -> Spot:
    return Spot(api_key=api_key, api_secret=api_secret)


def get_usdt_balance(api_key: str, api_secret: str) -> float:
    account = get_client(api_key, api_secret).account()
    for b in account["balances"]:
        if b["asset"] == "USDT":
            return float(b["free"]) + float(b["locked"])
    return 0.0


def get_current_price(api_key: str, api_secret: str, symbol: str) -> float:
    ticker = get_client(api_key, api_secret).ticker_price(symbol=symbol.replace("/", ""))
    return float(ticker["price"])


def place_order(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    quantity: float,
    client_order_id: str,
) -> dict:
    """Market order. client_order_id is Binance's own idempotency key (newClientOrderId) —
    if this exact ID was already submitted successfully, Binance returns the original
    order instead of creating a duplicate. This is the second layer of idempotency,
    below our own DB unique constraint."""
    client = get_client(api_key, api_secret)
    try:
        return client.new_order(
            symbol=symbol.replace("/", ""),
            side=side,  # 'BUY' | 'SELL'
            type="MARKET",
            quantity=quantity,
            newClientOrderId=client_order_id,
        )
    except ClientError as e:
        raise BinanceExecutionError(e) from e


class BinanceExecutionError(Exception):
    """Wraps ClientError with a distinction the worker cares about: retriable or not."""

    def __init__(self, original: ClientError):
        self.original = original
        self.status_code = original.status_code
        self.error_code = getattr(original, "error_code", None)
        super().__init__(str(original))

    @property
    def is_retriable(self) -> bool:
        # 429 = rate limited, 5xx = Binance-side issue — both worth retrying.
        # 4xx other than 429 (bad request, invalid key, insufficient balance) is not.
        return self.status_code == 429 or self.status_code >= 500
