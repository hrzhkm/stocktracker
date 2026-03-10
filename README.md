## Bursa Top 100 Tracker

TanStack Start app for tracking the Bursa Malaysia Top 100 stocks with a direct dashboard, no login flow, and CSV exports.

### Features

- fixed seeded Bursa Top 100 universe
- daily OHLCV storage in Postgres with Prisma
- latest snapshot dashboard
- per-stock recent history
- CSV exports for latest snapshot and full history
- secured cron endpoint for scheduled EOD sync
- local shadcn-style UI components in `src/components/ui`

### Setup

```bash
pnpm install
cp .env.local.example .env.local
```

Configure:

- `DATABASE_URL`
- `EODHD_API_KEY`
- `STOCK_SYNC_CRON_SECRET`

Initialize the database:

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### Run

```bash
pnpm dev
```

Dashboard:

- `/`

CSV exports:

- `/api/exports/latest/csv`
- `/api/exports/history/csv`

Scheduled sync endpoint:

- `POST /api/cron/sync-daily-prices`
- Header: `x-cron-secret: <STOCK_SYNC_CRON_SECRET>`
- Optional query param: `?date=2026-03-10`

Manual local sync:

```bash
pnpm stocks:sync
pnpm stocks:sync 2026-03-10
```

Production cron runner with HTTP retry and direct fallback:

```bash
pnpm stocks:cron
pnpm stocks:cron 2026-03-10
```

`stocks:cron` behavior:

- tries `POST /api/cron/sync-daily-prices` first
- retries the HTTP call up to `STOCK_SYNC_MAX_RETRIES` times
- waits `STOCK_SYNC_RETRY_DELAY_MS` between attempts
- falls back to running the sync directly in-process if the HTTP endpoint keeps failing

Optional runtime env vars for the cron runner:

- `STOCK_SYNC_APP_URL` default: `http://127.0.0.1:3000`
- `STOCK_SYNC_CRON_URL` override the full cron endpoint URL
- `STOCK_SYNC_MAX_RETRIES` default: `3`
- `STOCK_SYNC_RETRY_DELAY_MS` default: `30000`
- `STOCK_SYNC_HTTP_TIMEOUT_MS` default: `120000`
- `STOCK_SYNC_SKIP_HTTP=1` to skip the HTTP call and always use the direct fallback

Example Linux crontab entry:

```cron
30 18 * * 1-5 cd /path/to/stocktracker && /usr/bin/pnpm stocks:cron >> /var/log/stocktracker-sync.log 2>&1
```

Example `systemd` service:

```ini
[Unit]
Description=Stocktracker daily sync

[Service]
Type=oneshot
WorkingDirectory=/path/to/stocktracker
Environment=DATABASE_URL=postgresql://...
Environment=EODHD_API_KEY=...
Environment=STOCK_SYNC_CRON_SECRET=...
Environment=STOCK_SYNC_APP_URL=http://127.0.0.1:3000
ExecStart=/usr/bin/pnpm stocks:cron
```

### Verify

```bash
pnpm test
pnpm build
```
