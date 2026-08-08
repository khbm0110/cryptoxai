import logging
import sys

import redis

from . import consumer
from .config import Config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)


def main() -> None:
    r = redis.Redis.from_url(Config.REDIS_URL, decode_responses=False)
    r.ping()  # fail fast and loudly if Redis is unreachable, instead of hanging in the loop
    consumer.run(r)


if __name__ == "__main__":
    main()
