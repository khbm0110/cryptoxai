"""
Every check here runs BEFORE an order reaches Binance. This mirrors the exact
gap flagged earlier in the platform's history: a risk limit that's stored but
never actually checked is not a risk limit. Nothing here is decorative.
"""
from dataclasses import dataclass
from typing import Optional

from . import db


@dataclass
class ValidationResult:
    passed: bool
    reason: Optional[str] = None


def validate_signal(
    conn,
    user_id: str,
    max_exposure_ratio: float,
    order_limit_per_day: Optional[int],
    account_usdt_balance: float,
    signal_price: float,
    live_price: float,
    trade_notional_usdt: float,
    max_slippage_ratio: float,
) -> ValidationResult:
    # 1. Exposure limit — the trade notional cannot exceed this fraction of the
    #    user's own capital, regardless of how large the signal's suggested size is.
    if account_usdt_balance <= 0:
        return ValidationResult(False, "Zero or negative account balance")

    exposure_ratio = trade_notional_usdt / account_usdt_balance
    if exposure_ratio > max_exposure_ratio:
        return ValidationResult(
            False,
            f"Trade notional {trade_notional_usdt:.2f} USDT is {exposure_ratio:.1%} of capital, "
            f"exceeding the {max_exposure_ratio:.1%} plan limit",
        )

    # 2. Slippage — if the live price has moved too far from the signal's price,
    #    the copy would execute a materially different trade than the one signaled.
    slippage = abs(live_price - signal_price) / signal_price
    if slippage > max_slippage_ratio:
        return ValidationResult(
            False, f"Price moved {slippage:.2%} since the signal fired (limit {max_slippage_ratio:.2%})"
        )

    # 3. Daily order limit
    if order_limit_per_day is not None:
        today_count = db.count_orders_today(conn, user_id)
        if today_count >= order_limit_per_day:
            return ValidationResult(False, f"Daily order limit ({order_limit_per_day}) reached")

    return ValidationResult(True)
