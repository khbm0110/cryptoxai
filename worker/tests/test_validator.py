"""Run with: python3 -m pytest tests/ -v"""
from worker.validator import validate_signal


class FakeConn:
    """Stands in for a psycopg connection so count_orders_today never actually hits a DB."""
    def execute(self, *args, **kwargs):
        class Result:
            def fetchone(self_inner):
                return {"n": 0}
        return Result()


def test_rejects_when_exposure_exceeds_plan_limit():
    result = validate_signal(
        FakeConn(), user_id="u1", max_exposure_ratio=0.05, order_limit_per_day=None,
        account_usdt_balance=1000, signal_price=100, live_price=100,
        trade_notional_usdt=200,  # 20% of capital, way over the 5% limit
        max_slippage_ratio=0.005,
    )
    assert result.passed is False
    assert "exceeding" in result.reason


def test_passes_when_exposure_within_plan_limit():
    result = validate_signal(
        FakeConn(), user_id="u1", max_exposure_ratio=0.05, order_limit_per_day=None,
        account_usdt_balance=1000, signal_price=100, live_price=100,
        trade_notional_usdt=40,  # 4% of capital, under the 5% limit
        max_slippage_ratio=0.005,
    )
    assert result.passed is True


def test_rejects_on_excessive_slippage():
    result = validate_signal(
        FakeConn(), user_id="u1", max_exposure_ratio=0.5, order_limit_per_day=None,
        account_usdt_balance=1000, signal_price=100, live_price=110,  # price moved 10%
        trade_notional_usdt=40,
        max_slippage_ratio=0.005,  # limit is 0.5%
    )
    assert result.passed is False
    assert "Price moved" in result.reason


def test_rejects_zero_balance():
    result = validate_signal(
        FakeConn(), user_id="u1", max_exposure_ratio=0.5, order_limit_per_day=None,
        account_usdt_balance=0, signal_price=100, live_price=100,
        trade_notional_usdt=10,
        max_slippage_ratio=0.005,
    )
    assert result.passed is False
    assert "balance" in result.reason


def test_exposure_exactly_at_limit_passes():
    # boundary case: exactly at the limit should pass, not fail off-by-one
    result = validate_signal(
        FakeConn(), user_id="u1", max_exposure_ratio=0.05, order_limit_per_day=None,
        account_usdt_balance=1000, signal_price=100, live_price=100,
        trade_notional_usdt=50,  # exactly 5%
        max_slippage_ratio=0.005,
    )
    assert result.passed is True
