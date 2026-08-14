"""Run with: python3 -m pytest tests/ -v

These test the *decision* logic in position_monitor (`_check_position`) with a
fake DB and a stubbed exit-order executor — no real Postgres, Redis, or
Binance call happens. What's NOT covered here: db.get_open_positions' SQL,
and the actual retry/backoff path in executor.execute_with_retry (that's
exercised indirectly, but its own behavior is executor's responsibility).
"""
from unittest.mock import patch

from worker import position_monitor


class FakeConn:
    def __init__(self):
        self.updates = []  # records every db.update_position call for assertions

    def execute(self, *args, **kwargs):
        raise AssertionError("_check_position should only touch the DB via db.update_position, not raw SQL")


def _position(**overrides):
    base = {
        "id": "pos-1",
        "order_id": "order-1",
        "signal_id": "sig-1",
        "user_id": "user-1",
        "symbol": "BTC/USDT",
        "side": "BUY",
        "entry_quantity": 1.0,
        "remaining_quantity": 1.0,
        "stop_loss": 90.0,
        "take_profit": [{"price": 110.0, "percentage": 50, "hit": False}, {"price": 120.0, "percentage": 50, "hit": False}],
        "binance_api_key_enc": b"enc-key",
        "binance_secret_enc": b"enc-secret",
    }
    base.update(overrides)
    return base


def _capture_updates(conn, monkeypatch_target):
    calls = []

    def fake_update_position(conn_, position_id, remaining_quantity, take_profit, status="open"):
        calls.append({"position_id": position_id, "remaining_quantity": remaining_quantity, "take_profit": take_profit, "status": status})

    return calls, fake_update_position


def test_long_stop_loss_closes_full_position():
    position = _position(side="BUY", stop_loss=90.0, remaining_quantity=1.0)
    conn = FakeConn()

    with patch("worker.position_monitor._place_exit_order", return_value=True) as mock_exit, \
         patch("worker.position_monitor.db.update_position") as mock_update:
        position_monitor._check_position(conn, redis_client=None, position=position, live_price=89.0)

    mock_exit.assert_called_once()
    assert mock_exit.call_args.kwargs.get("tag", mock_exit.call_args[0][-1] if mock_exit.call_args[0] else None) == "stop_loss"
    mock_update.assert_called_once_with(conn, "pos-1", 0, position["take_profit"], status="closed")


def test_short_stop_loss_triggers_when_price_rises():
    position = _position(side="SELL", stop_loss=110.0, remaining_quantity=1.0)
    conn = FakeConn()

    with patch("worker.position_monitor._place_exit_order", return_value=True) as mock_exit, \
         patch("worker.position_monitor.db.update_position") as mock_update:
        position_monitor._check_position(conn, redis_client=None, position=position, live_price=111.0)

    mock_exit.assert_called_once()
    mock_update.assert_called_once()
    assert mock_update.call_args.kwargs["status"] == "closed"


def test_stop_loss_not_triggered_when_price_is_safe():
    position = _position(side="BUY", stop_loss=90.0, remaining_quantity=1.0)
    conn = FakeConn()

    with patch("worker.position_monitor._place_exit_order") as mock_exit, \
         patch("worker.position_monitor.db.update_position") as mock_update:
        position_monitor._check_position(conn, redis_client=None, position=position, live_price=100.0)

    mock_exit.assert_not_called()
    mock_update.assert_not_called()


def test_take_profit_partial_fill_marks_target_hit_and_stays_open():
    position = _position(side="BUY", remaining_quantity=1.0, entry_quantity=1.0)
    conn = FakeConn()

    with patch("worker.position_monitor._place_exit_order", return_value=True) as mock_exit, \
         patch("worker.position_monitor.db.update_position") as mock_update:
        # price crosses the first TP target (110) but not the second (120)
        position_monitor._check_position(conn, redis_client=None, position=position, live_price=112.0)

    mock_exit.assert_called_once()
    args, kwargs = mock_update.call_args
    _, position_id, remaining_qty, take_profit = args[:4]
    assert position_id == "pos-1"
    assert remaining_qty == 0.5  # 50% of entry_quantity closed
    assert take_profit[0]["hit"] is True
    assert take_profit[1]["hit"] is False
    assert kwargs["status"] == "open"


def test_take_profit_already_hit_target_is_never_retriggered():
    position = _position(
        side="BUY", remaining_quantity=0.5, entry_quantity=1.0,
        take_profit=[{"price": 110.0, "percentage": 50, "hit": True}, {"price": 120.0, "percentage": 50, "hit": False}],
    )
    conn = FakeConn()

    with patch("worker.position_monitor._place_exit_order", return_value=True) as mock_exit, \
         patch("worker.position_monitor.db.update_position") as mock_update:
        # price is back above the already-hit target but below the remaining one
        position_monitor._check_position(conn, redis_client=None, position=position, live_price=115.0)

    mock_exit.assert_not_called()
    mock_update.assert_not_called()


def test_final_take_profit_target_closes_position_fully():
    position = _position(
        side="BUY", remaining_quantity=0.5, entry_quantity=1.0,
        take_profit=[{"price": 110.0, "percentage": 50, "hit": True}, {"price": 120.0, "percentage": 50, "hit": False}],
    )
    conn = FakeConn()

    with patch("worker.position_monitor._place_exit_order", return_value=True) as mock_exit, \
         patch("worker.position_monitor.db.update_position") as mock_update:
        position_monitor._check_position(conn, redis_client=None, position=position, live_price=121.0)

    mock_exit.assert_called_once()
    args, kwargs = mock_update.call_args
    assert args[2] == 0  # remaining_quantity rounds down to fully closed
    assert kwargs["status"] == "closed"


def test_failed_exit_order_does_not_mark_target_hit():
    """If the exchange call fails, the target must stay eligible for the next poll —
    otherwise a failed take-profit silently vanishes forever."""
    position = _position(side="BUY", remaining_quantity=1.0, entry_quantity=1.0)
    conn = FakeConn()

    with patch("worker.position_monitor._place_exit_order", return_value=False), \
         patch("worker.position_monitor.db.update_position") as mock_update:
        position_monitor._check_position(conn, redis_client=None, position=position, live_price=112.0)

    mock_update.assert_not_called()
    assert position["take_profit"][0]["hit"] is False
