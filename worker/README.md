# مرآة — Execution Worker

Python service that consumes trade signals from Redis Streams and copies them
into each subscriber's Binance account. Runs as **two separate long-running
processes** — this is not something Vercel/Supabase Edge Functions can host;
see the earlier architecture discussion for why.

## Processes

| Process | Command | What it does |
|---|---|---|
| Worker | `python3 -m worker.main` | Consumes signals, executes trades, enforces exposure/slippage/circuit-breaker checks |
| Reconciler | `python3 -m worker.reconciler` | Reclaims crashed workers' stuck messages; re-verifies orders stuck in `executing` directly against Binance |

Both can scale to multiple replicas — the Redis consumer group and the
`(user_id, client_order_id)` unique constraint make re-processing safe.

## Local setup

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt   # includes pytest
cp .env.example .env                  # fill in real values
export $(cat .env | xargs)

python3 -m scripts.verify_kms         # confirms BINANCE_KEYS_MASTER_KEY matches the Next.js app
python3 -m pytest tests/ -v           # unit tests, no infra required
python3 -m worker.main                # start the worker
```

## Deploying on Render

Two separate Render **Background Worker** services (not Web Services — this
process doesn't listen on a port), both pointing at this same repo:

1. **New Background Worker** → connect the repo → root directory: `worker/` (or wherever this folder lives in your monorepo)
2. Build command: `pip install -r requirements.txt`
3. Start command (worker): `python3 -m scripts.verify_kms && python3 -m worker.main`
4. Start command (reconciler, second service): `python3 -m worker.reconciler`
5. Environment variables: everything in `.env.example`, with real values
   - `DATABASE_URL`: Supabase → Settings → Database → Connection string (URI, port 5432 direct connection, not the pooler unless you also adjust `psycopg` connect args)
   - `BINANCE_KEYS_MASTER_KEY`: **must exactly match** the value set in the Next.js app's environment
6. Both services need the **paid tier** (Starter, ~$7/mo each) — Render's free
   tier sleeps after 15 minutes of inactivity, which is unacceptable for a
   process that must react to a trade signal within milliseconds.

Running `scripts.verify_kms` before `worker.main` in the start command means a
misconfigured key fails the deploy immediately and visibly in Render's logs,
instead of failing silently on the first real user days later.
