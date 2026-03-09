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

### Verify

```bash
pnpm test
pnpm build
```
