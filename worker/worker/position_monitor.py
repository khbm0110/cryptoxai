"""
Watches every open `positions` row and closes it — fully or partially — the
moment live price crosses its stop-loss or a take-profit target. This is the
piece that makes SL/TP real: without it, those numbers on a signal are just
text a subscriber has to act on manually.

Runs as its own loop, independent of the signal consumer, so a slow signal
batch never delays risk protection on positions that are already open.
"""
import logging
import time

from . import binance_client, circuit_breaker, db, executor
from .config import Config

logger = logging.getLogger("worker.position_monitor")


def run(redis_client) -> None:
    logger.info("position monitor started", extra={"poll_seconds": Config.POSITION_POLL_SECONDS})
    while True:
        try:
            _poll_once(redis_client)
        except Exception:
            logger.exception("position monitor tick failed, continuing")
        time.sleep(Config.POSITION_POLL_SECONDS)


def _poll_once(redis_client) -> None:
    with db.get_connection() as conn:
        positions = db.get_open_positions(conn)
        if not positions:
            return

        # One price fetch per symbol, not per position — ticker price is public
        # market data, so it's identical no matter whose API key requests it.
        price_cache: dict[str, float] = {}

        for position in positions:
            symbol = position["symbol"]
            try:
                if symbol not in price_cache:
                    api_key, api_secret = db.decrypt_user_keys(position)
                    price_cache[symbol] = binance_client.get_current_price(api_key, api_secret, symbol)
                live_price = price_cache[symbol]
            except Exception:
                logger.warning("could not fetch price, skipping position", extra={"position_id": position["id"], "symbol": symbol})
                continue

            _check_position(conn, redis_client, position, live_price)


def _check_position(conn, redis_client, position: dict, live_price: float) -> None:
    side = position["side"]
    is_long = side == "BUY"

    stop_hit = live_price <= position["stop_loss"] if is_long else live_price >= position["stop_loss"]
    if stop_hit:
        _close_full(conn, redis_client, position, live_price, reason="stop_loss")
        return

    take_profit: list[dict] = position["take_profit"] or []
    changed = False

    for target in take_profit:
        if target.get("hit"):
            continue
        target_reached = live_price >= target["price"] if is_long else live_price <= target["price"]
        if not target_reached:
            continue

        qty_to_close = round(position["entry_quantity"] * (target["percentage"] / 100), 6)
        qty_to_close = min(qty_to_close, position["remaining_quantity"])
        if qty_to_close <= 0:
            target["hit"] = True
            changed = True
            continue

        filled = _place_exit_order(conn, redis_client, position, qty_to_close, tag=f"tp{take_profit.index(target)}")
        if filled:
            target["hit"] = True
            position["remaining_quantity"] = round(position["remaining_quantity"] - qty_to_close, 6)
            changed = True

    if not changed:
        return

    # Fully filled through take-profits (rounding-safe threshold) closes the position
    # outright; otherwise persist the partial progress so nothing re-fires next poll.
    if position["remaining_quantity"] <= 0.000001:
        db.update_position(conn, position["id"], 0, take_profit, status="closed")
    else:
        db.update_position(conn, position["id"], position["remaining_quantity"], take_profit, status="open")


def _close_full(conn, redis_client, position: dict, live_price: float, reason: str) -> None:
    filled = _place_exit_order(conn, redis_client, position, position["remaining_quantity"], tag=reason)
    if filled:
        db.update_position(conn, position["id"], 0, position["take_profit"] or [], status="closed")
        logger.info("position closed", extra={"position_id": position["id"], "reason": reason, "price": live_price})


def _place_exit_order(conn, redis_client, position: dict, quantity: float, tag: str) -> bool:
    """Opposite side of the entry, reusing the same retry/circuit-breaker path
    as entry orders. client_order_id is deterministic per (signal, user, tag) —
    safe to reprocess if the monitor crashes mid-tick."""
    exit_side = "SELL" if position["side"] == "BUY" else "BUY"
    client_order_id = f"{position['signal_id']}:{position['user_id']}:{tag}"

    if circuit_breaker.is_open(redis_client, position["user_id"]):
        logger.info("circuit breaker open, skipping exit order", extra={"user_id": position["user_id"]})
        return False

    try:
        api_key, api_secret = db.decrypt_user_keys(position)
    except Exception:
        logger.exception("failed to decrypt keys for exit order", extra={"user_id": position["user_id"]})
        return False

    order_row = db.insert_pending_order(
        conn, position["user_id"], client_order_id, position["symbol"], exit_side, quantity,
        0,  # price isn't known ahead of a market exit; orders.price stores the entry reference only for entries
        signal_id=position["signal_id"],
    )
    if order_row is None:
        # Already executed this exact exit before (crash/retry) — treat as done.
        return True

    order_id = order_row["id"]
    db.update_order_status(conn, order_id, "executing")

    fake_signal = {"symbol": position["symbol"], "side": exit_side}
    return executor.execute_with_retry(
        conn, redis_client, order_id, position["user_id"], api_key, api_secret, fake_signal, quantity, client_order_id
    )
