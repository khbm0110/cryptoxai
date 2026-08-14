"""Environment configuration for the execution worker.

Required vars are read lazily (on first access, cached after) rather than at
import time — otherwise importing any worker module for a unit test, or even
just `python -c "import worker"`, would crash unless the full production
environment (DB, Redis, KMS key) were already configured.
"""
import os


def _required(name: str) -> str:
    value = os.environ.get(name)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


class _LazyConfig:
    @property
    def DATABASE_URL(self) -> str:
        return _required("DATABASE_URL")  # Supabase direct Postgres connection, not PostgREST

    @property
    def REDIS_URL(self) -> str:
        return _required("REDIS_URL")

    @property
    def BINANCE_KEYS_MASTER_KEY(self) -> str:
        return _required("BINANCE_KEYS_MASTER_KEY")  # same 64-char hex key used by the Next.js app

    @property
    def STREAM_NAME(self) -> str:
        return os.environ.get("SIGNAL_STREAM", "trade_signals")

    @property
    def CONSUMER_GROUP(self) -> str:
        return os.environ.get("CONSUMER_GROUP", "execution-workers")

    @property
    def CONSUMER_NAME(self) -> str:
        return os.environ.get("CONSUMER_NAME", f"worker-{os.getpid()}")

    # circuit breaker: N failures within WINDOW_SECONDS opens the breaker for COOLDOWN_SECONDS
    @property
    def CB_FAILURE_THRESHOLD(self) -> int:
        return int(os.environ.get("CB_FAILURE_THRESHOLD", "3"))

    @property
    def CB_WINDOW_SECONDS(self) -> int:
        return int(os.environ.get("CB_WINDOW_SECONDS", "300"))

    @property
    def CB_COOLDOWN_SECONDS(self) -> int:
        return int(os.environ.get("CB_COOLDOWN_SECONDS", "900"))

    @property
    def MAX_SLIPPAGE_RATIO(self) -> float:
        return float(os.environ.get("MAX_SLIPPAGE_RATIO", "0.005"))  # 0.5%

    @property
    def RETRY_ATTEMPTS(self) -> int:
        return int(os.environ.get("RETRY_ATTEMPTS", "3"))

    @property
    def RETRY_BASE_DELAY_SECONDS(self) -> float:
        return float(os.environ.get("RETRY_BASE_DELAY_SECONDS", "0.5"))

    @property
    def POSITION_POLL_SECONDS(self) -> int:
        """How often the stop-loss / take-profit monitor checks live prices
        against open positions. Lower = tighter risk control, more API calls."""
        return int(os.environ.get("POSITION_POLL_SECONDS", "10"))


Config = _LazyConfig()
