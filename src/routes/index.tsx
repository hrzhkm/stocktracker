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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#19413f_0%,#102322_34%,#091211_100%)] text-stone-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Card className="bg-white/6">
          <CardHeader className="gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <Badge variant="default" className="w-fit text-emerald-100">
                Bursa Malaysia
              </Badge>
              <CardTitle className="max-w-3xl text-4xl md:text-5xl">
                Top 100 daily tracker with direct dashboard access
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-stone-200/75 md:text-base">
                No login wall, fixed Bursa Top 100 universe, daily EOD sync
                status, latest snapshot, and CSV exports for both snapshot and
                history.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'bg-emerald-300/15 text-emerald-50 hover:bg-emerald-300/25',
                )}
                href="/api/exports/latest/csv"
              >
                <Download className="size-4" />
                Latest CSV
              </a>
              <a
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'border-white/15 bg-white/8 text-stone-50 hover:bg-white/14',
                )}
                href="/api/exports/history/csv"
              >
                <Download className="size-4" />
                History CSV
              </a>
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

        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <Card className="bg-stone-950/45">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Latest snapshot</CardTitle>
                <CardDescription className="mt-1">
                  Browse the full tracked list and select a stock to inspect its
                  recent history.
                </CardDescription>
              </div>
              <Badge variant="default">{dashboard.stocks.length} stocks</Badge>
            </CardHeader>
            <CardContent>
              <div className="mb-4 md:hidden">
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-stone-400">
                  Stock
                </label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-100 outline-none ring-0"
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
                  <TableRow className="bg-white/5 hover:bg-white/5">
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

          <div className="flex flex-col gap-6">
            <Card className="bg-stone-950/35">
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
                  <div className="space-y-4 text-sm text-stone-200/85">
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
                      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-100">
                        {dashboard.lastSync.errorSummary}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm leading-6 text-stone-300">
                    No sync has run yet. Seed the database, then schedule a daily
                    POST to <code>/api/cron/sync-daily-prices</code> with the
                    configured secret header.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/6">
              <CardHeader className="gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="default" className="w-fit text-emerald-100">
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
                  <div className="hidden rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right md:block">
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
                      Latest close
                    </p>
                    <p className="mt-2 text-lg font-semibold text-stone-50">
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
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-stone-300">
                    <BarChart3 className="size-4" />
                    Recent history
                  </div>
                  {historyState.status === 'loading' ? (
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <RefreshCw className="size-3 animate-spin" />
                      Loading
                    </div>
                  ) : historyState.data ? (
                    <span className="text-xs text-stone-400">
                      {historyState.data.history.length} stored days
                    </span>
                  ) : null}
                </div>
                <HistoryPanel historyState={historyState} />
              </CardContent>
            </Card>
          </div>
        </div>
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
        'rounded-[1.4rem] border border-white/10 bg-black/15',
        props.compact ? 'p-4' : 'p-5',
      )}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
        {props.label}
      </p>
      <p className={cn('mt-2 font-semibold text-stone-50', props.compact ? 'text-xl' : 'text-3xl')}>
        {props.value}
      </p>
      <p className="mt-2 text-sm text-stone-300/75">{props.detail}</p>
    </div>
  )
}

function SyncInfo(props: { label: string; value: string }) {
  return (
    <div>
      <p className="text-stone-400">{props.label}</p>
      <p className="mt-1 text-base text-stone-50">{props.value}</p>
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
        'cursor-pointer hover:bg-white/5',
        props.selected && 'bg-emerald-400/10 hover:bg-emerald-400/10',
      )}
      onClick={() => props.onSelect(props.stock.stockCode)}
    >
      <TableCell className="text-stone-300">{props.stock.rank}</TableCell>
      <TableCell className="font-medium text-stone-50">
        {props.stock.stockCode}
      </TableCell>
      <TableCell>
        <div className="font-medium text-stone-50">{props.stock.name}</div>
        <div className="text-xs text-stone-400">{props.stock.providerSymbol}</div>
      </TableCell>
      <TableCell className="text-stone-300">
        {formatDateLabel(props.stock.latestPrice?.tradingDate ?? null)}
      </TableCell>
      <TableCell className="text-right text-stone-100">
        {formatPrice(props.stock.latestPrice?.close)}
      </TableCell>
      <TableCell className="text-right text-stone-300">
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
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
        {props.historyState.message}
      </div>
    )
  }

  if (props.historyState.status === 'loading' && !props.historyState.data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-stone-300">
        Loading history…
      </div>
    )
  }

  const history = props.historyState.data?.history ?? []

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-stone-300">
        No daily price history stored for this stock yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-black/15 hover:bg-black/15">
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
    <TableRow className="bg-white/[0.015] hover:bg-white/[0.03]">
      <TableCell>{formatDateLabel(props.bar.tradingDate)}</TableCell>
      <TableCell className="text-right text-stone-100">
        {formatPrice(props.bar.open)}
      </TableCell>
      <TableCell className="text-right text-stone-100">
        {formatPrice(props.bar.high)}
      </TableCell>
      <TableCell className="text-right text-stone-100">
        {formatPrice(props.bar.low)}
      </TableCell>
      <TableCell className="text-right text-stone-50">
        {formatPrice(props.bar.close)}
      </TableCell>
      <TableCell className="text-right text-stone-300">
        {formatVolume(props.bar.volume)}
      </TableCell>
    </TableRow>
  )
}
