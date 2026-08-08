"""
Processes one signal for one user, end to end. Called once per eligible
subscriber for each incoming signal.
"""
import logging
import time

from . import binance_client, circuit_breaker, db, validator
from .config import Config

logger = logging.getLogger("worker.executor")


def process_user_signal(conn, redis_client, signal: dict, subscriber: dict) -> None:
    user_id = subscriber["user_id"]
    client_order_id = f"{signal['signal_id']}:{user_id}"  # deterministic — safe to reprocess

    if circuit_breaker.is_open(redis_client, user_id):
        logger.info("circuit breaker open, skipping", extra={"user_id": user_id})
        return

    try:
        api_key, api_secret = db.decrypt_user_keys(subscriber)
    except Exception:
        logger.exception("failed to decrypt keys", extra={"user_id": user_id})
        circuit_breaker.record_failure(redis_client, user_id)
        return

    # Live account state, fetched fresh for this signal — never trust a stored snapshot for this.
    try:
        balance = binance_client.get_usdt_balance(api_key, api_secret)
        live_price = binance_client.get_current_price(api_key, api_secret, signal["symbol"])
    except Exception as e:
        logger.warning("could not fetch live account state", extra={"user_id": user_id, "error": str(e)})
        circuit_breaker.record_failure(redis_client, user_id)
        return

    # Mirror the expert's own position sizing (what fraction of THEIR capital this
    # trade used), scaled to this user's balance — then cap at the plan's exposure
    # limit. Always betting the max allowed isn't "copying a trade", it's a
    # different, riskier strategy the user never agreed to.
    expert_ratio = signal.get("expert_position_ratio", subscriber["max_exposure_ratio"])
    effective_ratio = min(expert_ratio, subscriber["max_exposure_ratio"])
    trade_notional = balance * effective_ratio
    quantity = round(trade_notional / live_price, 6)

    result = validator.validate_signal(
        conn,
        user_id=user_id,
        max_exposure_ratio=subscriber["max_exposure_ratio"],
        order_limit_per_day=subscriber["order_limit_per_day"],
        account_usdt_balance=balance,
        signal_price=signal["price"],
        live_price=live_price,
        trade_notional_usdt=trade_notional,
        max_slippage_ratio=Config.MAX_SLIPPAGE_RATIO,
    )
    if not result.passed:
        logger.info("validation rejected", extra={"user_id": user_id, "reason": result.reason})
        return

    order_row = db.insert_pending_order(
        conn, user_id, client_order_id, signal["symbol"], signal["side"], quantity, live_price
    )
    if order_row is None:
        logger.info("duplicate signal for user, already processed", extra={"user_id": user_id})
        return

    order_id = order_row["id"]
    db.update_order_status(conn, order_id, "executing")

    _execute_with_retry(conn, redis_client, order_id, user_id, api_key, api_secret, signal, quantity, client_order_id)


def _execute_with_retry(conn, redis_client, order_id, user_id, api_key, api_secret, signal, quantity, client_order_id):
    last_error = None

    for attempt in range(1, Config.RETRY_ATTEMPTS + 1):
        try:
            response = binance_client.place_order(
                api_key, api_secret, signal["symbol"], signal["side"], quantity, client_order_id
            )
            db.update_order_status(conn, order_id, "filled", binance_order_id=response.get("orderId"))
            circuit_breaker.record_success(redis_client, user_id)
            return
        except binance_client.BinanceExecutionError as e:
            last_error = str(e)
            if not e.is_retriable:
                break
            time.sleep(Config.RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1)))  # exponential backoff
        except Exception as e:
            last_error = str(e)
            break

    db.update_order_status(conn, order_id, "failed", error_message=last_error)
    circuit_breaker.record_failure(redis_client, user_id)
