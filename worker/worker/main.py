import logging
import sys
import threading

import redis

from . import consumer, position_monitor
from .config import Config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)


def main() -> None:
    r = redis.Redis.from_url(Config.REDIS_URL, decode_responses=False)
    r.ping()  # fail fast and loudly if Redis is unreachable, instead of hanging in the loop

    # Separate Redis client for the monitor thread — redis-py connections aren't
    # meant to be shared across threads issuing blocking calls concurrently.
    monitor_redis = redis.Redis.from_url(Config.REDIS_URL, decode_responses=False)

    monitor_thread = threading.Thread(target=position_monitor.run, args=(monitor_redis,), daemon=True, name="position-monitor")
    monitor_thread.start()

    consumer.run(r)  # blocks on the main thread


if __name__ == "__main__":
    main()
