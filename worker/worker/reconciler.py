"""
Runs as its own process (separate Render service from the main worker),
on a short interval (e.g. every 60s). Two jobs:
  1. Reclaim Redis Stream messages that have been pending too long — the
     worker that read them likely crashed before acking.
  2. For any order stuck in 'executing' beyond a timeout, ask Binance directly
     what actually happened and correct our record — protects against the
     case where the order succeeded on Binance but the response never arrived.
"""
import logging
import sys
import time
from datetime import datetime, timedelta, timezone

import redis

from . import binance_client, db
from .config import Config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s", stream=sys.stdout)
logger = logging.getLogger("worker.reconciler")

STUCK_EXECUTING_TIMEOUT = timedelta(minutes=2)
STREAM_CLAIM_MIN_IDLE_MS = 60_000  # reclaim messages idle > 60s
POLL_INTERVAL_SECONDS = 60


def reclaim_stuck_stream_messages(r: redis.Redis) -> None:
    cursor = "0-0"
    while True:
        cursor, claimed, _ = r.xautoclaim(
            Config.STREAM_NAME, Config.CONSUMER_GROUP, "reconciler",
            min_idle_time=STREAM_CLAIM_MIN_IDLE_MS, start=cursor, count=50,
        )
        if not claimed:
            break
        logger.warning("reclaimed %d stuck stream messages", len(claimed))
        # Re-delivering them lets the normal consumer group pick them back up
        # on its next XREADGROUP call — nothing further needed here.
        if cursor == "0-0":
            break


def reconcile_stuck_orders(conn) -> None:
    cutoff = datetime.now(timezone.utc) - STUCK_EXECUTING_TIMEOUT
    stuck = conn.execute(
        """
        select o.id, o.user_id, o.symbol, o.client_order_id,
               u.binance_api_key_enc, u.binance_secret_enc
        from orders o
        join users u on u.id = o.user_id
        where o.status = 'executing' and o.updated_at < %s
        """,
        (cutoff,),
    ).fetchall()

    for row in stuck:
        try:
            api_key, api_secret = db.decrypt_user_keys(row)
            # Ask Binance for the order by our client_order_id — this is exactly
            # why we always pass newClientOrderId on creation.
            client = binance_client.get_client(api_key, api_secret)
            result = client.get_order(symbol=row["symbol"].replace("/", ""), origClientOrderId=row["client_order_id"])
            status_map = {"FILLED": "filled", "CANCELED": "canceled", "REJECTED": "failed", "EXPIRED": "failed"}
            new_status = status_map.get(result["status"])
            if new_status:
                db.update_order_status(conn, row["id"], new_status, binance_order_id=result.get("orderId"))
                logger.info("reconciled stuck order", extra={"order_id": row["id"], "resolved_status": new_status})
            # else: still genuinely open on Binance (NEW/PARTIALLY_FILLED) — leave as executing, check again next pass
        except Exception:
            logger.exception("could not reconcile order", extra={"order_id": row["id"]})


def main() -> None:
    r = redis.Redis.from_url(Config.REDIS_URL, decode_responses=False)
    r.ping()
    logger.info("reconciler started")

    while True:
        try:
            reclaim_stuck_stream_messages(r)
            with db.get_connection() as conn:
                reconcile_stuck_orders(conn)
        except Exception:
            logger.exception("reconciler pass failed")
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
