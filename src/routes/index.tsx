import { createFileRoute } from '@tanstack/react-router'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import { startTransition, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getDashboard, getHistory } from '@/lib/stocks/server'
import { formatDateLabel } from '@/lib/stocks/time'
import { cn } from '@/lib/utils'

import type { DailyBar, StockHistoryData, StockSnapshot } from '@/lib/stocks/types'

export const Route = createFileRoute('/')({
  loader: async () => getDashboard(),
  component: DashboardPage,
})

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '—'
  }

  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatVolume(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '—'
  }

  return new Intl.NumberFormat('en-MY', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Not run yet'
  }

  return new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(value))
}

function syncBadgeVariant(status: 'pending' | 'success' | 'failed') {
  if (status === 'success') {
    return 'success'
  }

  if (status === 'failed') {
    return 'destructive'
  }

  return 'warning'
}

function DashboardPage() {
  const dashboard = Route.useLoaderData()
  const [selectedCode, setSelectedCode] = useState<string | null>(
    dashboard.stocks[0]?.stockCode ?? null,
  )
  const [historyState, setHistoryState] = useState<
    | { status: 'idle'; data: StockHistoryData | null }
    | { status: 'loading'; data: StockHistoryData | null }
    | { status: 'error'; data: StockHistoryData | null; message: string }
  >({
    status: 'idle',
    data: null,
  })

  useEffect(() => {
    if (!selectedCode) {
      return
    }

    let cancelled = false
    setHistoryState((current) => ({
      status: 'loading',
      data: current.data?.stock.stockCode === selectedCode ? current.data : null,
    }))

    getHistory({
      data: {
        stockCode: selectedCode,
      },
    })
      .then((data) => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setHistoryState({
            status: 'idle',
            data,
          })
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setHistoryState({
          status: 'error',
          data: null,
          message: error instanceof Error ? error.message : 'Unable to load stock history.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [selectedCode])

  const selectedSnapshot = selectedCode
    ? dashboard.stocks.find((stock) => stock.stockCode === selectedCode) ?? null
    : null

  return (
    <main className="min-h-screen text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-sky-100/80 bg-white/85">
          <CardHeader className="gap-5">
            <div className="space-y-3">
              <Badge variant="default" className="w-fit">
                Bursa Malaysia
              </Badge>
              <CardTitle className="max-w-3xl text-4xl md:text-5xl">
                Top 100 daily tracker with direct dashboard access
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                No login wall, fixed Bursa Top 100 universe, daily EOD sync
                status, latest snapshot, and CSV exports for both snapshot and
                history.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Tracked stocks"
              value={String(dashboard.totals.trackedStocks)}
              detail="Seeded Bursa Top 100 universe"
            />
            <MetricCard
              label="Priced stocks"
              value={String(dashboard.totals.pricedStocks)}
              detail="Have at least one stored daily bar"
            />
            <MetricCard
              label="Latest trading date"
              value={formatDateLabel(dashboard.totals.latestTradingDate)}
              detail="Most recent EOD data in storage"
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="bg-white/82">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Last sync run</CardTitle>
                <CardDescription>Scheduled EOD sync status and result</CardDescription>
              </div>
              {dashboard.lastSync ? (
                <Badge variant={syncBadgeVariant(dashboard.lastSync.status)}>
                  {dashboard.lastSync.status}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              {dashboard.lastSync ? (
                <div className="space-y-4 text-sm text-slate-600">
                  <SyncInfo label="Target date" value={formatDateLabel(dashboard.lastSync.targetDate)} />
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      compact
                      label="Inserted"
                      value={String(dashboard.lastSync.rowsInserted)}
                      detail="New rows"
                    />
                    <MetricCard
                      compact
                      label="Updated"
                      value={String(dashboard.lastSync.rowsUpdated)}
                      detail="Existing rows"
                    />
                  </div>
                  <SyncInfo label="Started" value={formatTimestamp(dashboard.lastSync.startedAt)} />
                  <SyncInfo label="Finished" value={formatTimestamp(dashboard.lastSync.finishedAt)} />
                  {dashboard.lastSync.errorSummary ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                      {dashboard.lastSync.errorSummary}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  No sync has run yet. Seed the database, then schedule a daily
                  POST to <code>/api/cron/sync-daily-prices</code> with the
                  configured secret header.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/82">
            <CardHeader className="gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="default" className="w-fit">
                    {selectedSnapshot?.stockCode ?? '----'} ·{' '}
                    {selectedSnapshot?.providerSymbol ?? '----'}
                  </Badge>
                  <CardTitle className="mt-3 text-3xl">
                    {selectedSnapshot?.name ?? 'Select a stock'}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Latest close and recent stored daily history.
                  </CardDescription>
                </div>
                <div className="hidden rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-right md:block">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Latest close
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatPrice(selectedSnapshot?.latestPrice?.close)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  compact
                  label="Open"
                  value={formatPrice(selectedSnapshot?.latestPrice?.open)}
                  detail="Latest stored bar"
                />
                <MetricCard
                  compact
                  label="High"
                  value={formatPrice(selectedSnapshot?.latestPrice?.high)}
                  detail="Latest stored bar"
                />
                <MetricCard
                  compact
                  label="Low"
                  value={formatPrice(selectedSnapshot?.latestPrice?.low)}
                  detail="Latest stored bar"
                />
                <MetricCard
                  compact
                  label="Volume"
                  value={formatVolume(selectedSnapshot?.latestPrice?.volume)}
                  detail="Latest stored bar"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-slate-500">
                  <BarChart3 className="size-4" />
                  Recent history
                </div>
                {historyState.status === 'loading' ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <RefreshCw className="size-3 animate-spin" />
                    Loading
                  </div>
                ) : historyState.data ? (
                  <span className="text-xs text-slate-500">
                    {historyState.data.history.length} stored days
                  </span>
                ) : null}
              </div>
              <HistoryPanel historyState={historyState} />
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/82">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Latest Stock Prices</CardTitle>
              <CardDescription className="mt-1">
                Browse the full tracked list and select a stock to inspect its
                recent history.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Badge variant="default">{dashboard.stocks.length} stocks</Badge>
              <a
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'shadow-[0_10px_24px_-14px_rgba(14,116,144,0.55)]',
                )}
                href="/api/exports/latest/csv"
              >
                <Download className="size-4" />
                Download CSV
              </a>
              <a
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'sm' }),
                  'bg-white text-slate-700',
                )}
                href="/api/exports/history/csv"
              >
                <Download className="size-4" />
                History CSV
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 md:hidden">
              <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-500">
                Stock
              </label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-0"
                onChange={(event) => setSelectedCode(event.target.value)}
                value={selectedCode ?? ''}
              >
                {dashboard.stocks.map((stock) => (
                  <option key={stock.stockCode} value={stock.stockCode}>
                    {stock.stockCode} · {stock.name}
                  </option>
                ))}
              </select>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Rank</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Trading date</TableHead>
                  <TableHead className="text-right">Close</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.stocks.map((stock) => (
                  <SnapshotRow
                    key={stock.stockCode}
                    stock={stock}
                    selected={stock.stockCode === selectedCode}
                    onSelect={setSelectedCode}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function MetricCard(props: {
  label: string
  value: string
  detail: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[1.4rem] border border-slate-200 bg-slate-50/90',
        props.compact ? 'p-4' : 'p-5',
      )}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {props.label}
      </p>
      <p className={cn('mt-2 font-semibold text-slate-900', props.compact ? 'text-xl' : 'text-3xl')}>
        {props.value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{props.detail}</p>
    </div>
  )
}

function SyncInfo(props: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{props.label}</p>
      <p className="mt-1 text-base text-slate-800">{props.value}</p>
    </div>
  )
}

function SnapshotRow(props: {
  stock: StockSnapshot
  selected: boolean
  onSelect: (stockCode: string) => void
}) {
  return (
    <TableRow
      className={cn(
        'cursor-pointer hover:bg-sky-50/70',
        props.selected && 'bg-sky-100/70 hover:bg-sky-100/70',
      )}
      onClick={() => props.onSelect(props.stock.stockCode)}
    >
      <TableCell className="text-slate-500">{props.stock.rank}</TableCell>
      <TableCell className="font-medium text-slate-900">
        {props.stock.stockCode}
      </TableCell>
      <TableCell>
        <div className="font-medium text-slate-900">{props.stock.name}</div>
        <div className="text-xs text-slate-500">{props.stock.providerSymbol}</div>
      </TableCell>
      <TableCell className="text-slate-600">
        {formatDateLabel(props.stock.latestPrice?.tradingDate ?? null)}
      </TableCell>
      <TableCell className="text-right text-slate-800">
        {formatPrice(props.stock.latestPrice?.close)}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {formatVolume(props.stock.latestPrice?.volume)}
      </TableCell>
    </TableRow>
  )
}

function HistoryPanel(props: {
  historyState:
    | { status: 'idle'; data: StockHistoryData | null }
    | { status: 'loading'; data: StockHistoryData | null }
    | { status: 'error'; data: StockHistoryData | null; message: string }
}) {
  if (props.historyState.status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {props.historyState.message}
      </div>
    )
  }

  if (props.historyState.status === 'loading' && !props.historyState.data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Loading history…
      </div>
    )
  }

  const history = props.historyState.data?.history ?? []

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No daily price history stored for this stock yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Open</TableHead>
          <TableHead className="text-right">High</TableHead>
          <TableHead className="text-right">Low</TableHead>
          <TableHead className="text-right">Close</TableHead>
          <TableHead className="text-right">Volume</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((bar) => (
          <HistoryRow key={bar.tradingDate} bar={bar} />
        ))}
      </TableBody>
    </Table>
  )
}

function HistoryRow(props: { bar: DailyBar }) {
  return (
    <TableRow className="bg-white/60 hover:bg-sky-50/50">
      <TableCell>{formatDateLabel(props.bar.tradingDate)}</TableCell>
      <TableCell className="text-right text-slate-800">
        {formatPrice(props.bar.open)}
      </TableCell>
      <TableCell className="text-right text-slate-800">
        {formatPrice(props.bar.high)}
      </TableCell>
      <TableCell className="text-right text-slate-800">
        {formatPrice(props.bar.low)}
      </TableCell>
      <TableCell className="text-right text-slate-900">
        {formatPrice(props.bar.close)}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {formatVolume(props.bar.volume)}
      </TableCell>
    </TableRow>
  )
}
