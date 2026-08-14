"""
Direct Postgres access (not through PostgREST/Supabase client — the worker
talks to the database directly for speed and to run inside a transaction
where it matters, e.g. the idempotent order insert).
"""
from datetime import date, datetime, timezone
from typing import Optional
import json

import psycopg
from psycopg.rows import dict_row

from .config import Config
from .kms import decrypt_secret, pg_bytea_to_bytes


def get_connection() -> psycopg.Connection:
    return psycopg.connect(Config.DATABASE_URL, row_factory=dict_row, autocommit=True)


def get_eligible_subscribers(conn: psycopg.Connection, plan_ids: list[str]) -> list[dict]:
    """Users with an ACTIVE subscription to one of the signal's plans, a connected
    Binance account, and no open circuit-breaker record in the DB (the live check
    is Redis-backed — this is just a fast pre-filter)."""
    return conn.execute(
        """
        select u.id as user_id, u.binance_api_key_enc, u.binance_secret_enc,
               p.id as plan_id, p.max_exposure_ratio, p.order_limit_per_day
        from subscriptions s
        join users u on u.id = s.user_id
        join plans p on p.id = s.plan_id
        where s.plan_id = any(%s)
          and s.status = 'active'
          and u.binance_api_key_enc is not null
        """,
        (plan_ids,),
    ).fetchall()


def decrypt_user_keys(row: dict) -> tuple[str, str]:
    api_key = decrypt_secret(pg_bytea_to_bytes(row["binance_api_key_enc"]))
    api_secret = decrypt_secret(pg_bytea_to_bytes(row["binance_secret_enc"]))
    return api_key, api_secret


def count_orders_today(conn: psycopg.Connection, user_id: str) -> int:
    row = conn.execute(
        """
        select count(*) as n from orders
        where user_id = %s and created_at >= %s
        """,
        (user_id, datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)),
    ).fetchone()
    return row["n"]


def insert_pending_order(
    conn: psycopg.Connection,
    user_id: str,
    client_order_id: str,
    symbol: str,
    side: str,
    quantity: float,
    price: float,
    signal_id: Optional[str] = None,
) -> Optional[dict]:
    """Inserts a PENDING order row. Returns None (not an error) if this exact
    (user_id, client_order_id) already exists — that's the idempotency guarantee
    enforced by the DB's unique constraint, not just application logic."""
    try:
        return conn.execute(
            """
            insert into orders (user_id, client_order_id, symbol, side, quantity, price, status, signal_id)
            values (%s, %s, %s, %s, %s, %s, 'pending', %s)
            returning id
            """,
            (user_id, client_order_id, symbol, side, quantity, price, signal_id),
        ).fetchone()
    except psycopg.errors.UniqueViolation:
        conn.rollback()
        return None


def get_signal_risk(conn: psycopg.Connection, signal_id: str) -> Optional[dict]:
    """Stop-loss / take-profit live only in Postgres, never in the Redis message —
    fetched once per signal (not per subscriber) and reused across the batch."""
    return conn.execute(
        "select stop_loss, take_profit from signals where id = %s",
        (signal_id,),
    ).fetchone()


def open_position(
    conn: psycopg.Connection,
    order_id: str,
    signal_id: str,
    user_id: str,
    symbol: str,
    side: str,
    quantity: float,
    stop_loss: float,
    take_profit: list[dict],
) -> None:
    """Called right after an entry order fills. `take_profit` targets are copied
    from the signal with a `hit: false` flag added — the monitor updates this
    array in place as targets are reached, so none fires twice."""
    targets_with_flags = [{**t, "hit": False} for t in take_profit]
    conn.execute(
        """
        insert into positions
            (order_id, signal_id, user_id, symbol, side, entry_quantity, remaining_quantity, stop_loss, take_profit)
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        """,
        (order_id, signal_id, user_id, symbol, side, quantity, quantity, stop_loss, json.dumps(targets_with_flags)),
    )


def get_open_positions(conn: psycopg.Connection) -> list[dict]:
    """Joins in the owning user's encrypted keys — the monitor needs them to both
    price the position and, if triggered, place the exit order."""
    return conn.execute(
        """
        select po.id, po.order_id, po.signal_id, po.user_id, po.symbol, po.side,
               po.entry_quantity, po.remaining_quantity, po.stop_loss, po.take_profit,
               u.binance_api_key_enc, u.binance_secret_enc
        from positions po
        join users u on u.id = po.user_id
        where po.status = 'open'
        """
    ).fetchall()


def update_position(
    conn: psycopg.Connection,
    position_id: str,
    remaining_quantity: float,
    take_profit: list[dict],
    status: str = "open",
) -> None:
    closed_at_clause = "now()" if status == "closed" else "null"
    conn.execute(
        f"""
        update positions
        set remaining_quantity = %s, take_profit = %s::jsonb, status = %s,
            closed_at = {closed_at_clause}, updated_at = now()
        where id = %s
        """,
        (remaining_quantity, json.dumps(take_profit), status, position_id),
    )


def update_order_status(
    conn: psycopg.Connection,
    order_id: str,
    status: str,
    binance_order_id: Optional[int] = None,
    error_message: Optional[str] = None,
):
    conn.execute(
        """
        update orders
        set status = %s, binance_order_id = %s, error_message = %s, updated_at = now()
        where id = %s
        """,
        (status, binance_order_id, error_message, order_id),
    )
