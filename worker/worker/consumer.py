"""
Uses XREADGROUP (consumer groups), not plain XREAD — this is what makes it safe
to run multiple worker replicas: each signal is delivered to exactly one
consumer in the group, and unacknowledged messages (crash mid-processing) stay
claimable by another replica instead of being silently lost.
"""
import json
import logging

import redis

from . import db, executor
from .config import Config

logger = logging.getLogger("worker.consumer")


def ensure_group(r: redis.Redis) -> None:
    try:
        r.xgroup_create(Config.STREAM_NAME, Config.CONSUMER_GROUP, id="0", mkstream=True)
    except redis.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise  # group already exists — fine, anything else is a real error


def run(r: redis.Redis) -> None:
    ensure_group(r)
    logger.info("worker started", extra={"consumer": Config.CONSUMER_NAME})

    while True:
        # blocks up to 5s waiting for new entries, then loops (lets Ctrl-C / SIGTERM land)
        response = r.xreadgroup(
            Config.CONSUMER_GROUP, Config.CONSUMER_NAME,
            {Config.STREAM_NAME: ">"}, count=10, block=5000,
        )
        if not response:
            continue

        for _stream, messages in response:
            for message_id, fields in messages:
                _handle_message(r, message_id, fields)


def _handle_message(r: redis.Redis, message_id: bytes, fields: dict) -> None:
    try:
        raw = fields.get(b"data") or fields.get("data")
        signal = json.loads(raw)
    except Exception:
        logger.exception("malformed signal, acking to drop it", extra={"message_id": message_id})
        r.xack(Config.STREAM_NAME, Config.CONSUMER_GROUP, message_id)
        return

    try:
        with db.get_connection() as conn:
            subscribers = db.get_eligible_subscribers(conn, signal["plan_ids"])
            logger.info(
                "processing signal", extra={"signal_id": signal["signal_id"], "subscriber_count": len(subscribers)}
            )
            for subscriber in subscribers:
                executor.process_user_signal(conn, r, signal, subscriber)

        # Ack only after every subscriber has been attempted. If the process
        # crashes partway through, the message stays pending and gets reprocessed —
        # safe because client_order_id is deterministic (signal_id + user_id),
        # so already-completed users are simply skipped via the DB unique constraint.
        r.xack(Config.STREAM_NAME, Config.CONSUMER_GROUP, message_id)
    except Exception:
        logger.exception("signal processing failed, leaving unacked for retry/reclaim", extra={"signal_id": signal.get("signal_id")})
