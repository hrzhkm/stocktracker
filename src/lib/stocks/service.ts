import { prisma } from '@/db'
import type { SyncStatus } from '@/generated/prisma/client'

import { buildCsv } from './csv'
import { fetchEodhdExchangeBars, normalizeEodhdBulkResponse } from './eodhd'
import { getKualaLumpurDateString, toIsoDate, toStartOfUtcDay } from './time'
import type { DashboardData, DailyBar, StockHistoryData, StockSnapshot, StockSummary, SyncResult } from './types'

function toSummary(stock: {
  id: number
  rank: number
  stockCode: string
  providerSymbol: string
  name: string
  isActive: boolean
}) {
  return {
    id: stock.id,
    rank: stock.rank,
    stockCode: stock.stockCode,
    providerSymbol: stock.providerSymbol,
    name: stock.name,
    isActive: stock.isActive,
  } satisfies StockSummary
}

function toDailyBar(price: {
  tradingDate: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  currency: string
}) {
  return {
    tradingDate: toIsoDate(price.tradingDate),
    open: price.open,
    high: price.high,
    low: price.low,
    close: price.close,
    volume: price.volume,
    currency: price.currency,
  } satisfies DailyBar
}

async function getTrackedStocks() {
  return prisma.stock.findMany({
    where: { isActive: true },
    orderBy: { rank: 'asc' },
  })
}

async function getLatestPricesByStockId() {
  const maxDates = await prisma.dailyPrice.groupBy({
    by: ['stockId'],
    _max: {
      tradingDate: true,
    },
  })

  if (maxDates.length === 0) {
    return new Map<number, Awaited<ReturnType<typeof prisma.dailyPrice.findFirst>>>()
  }

  const latestRows = await prisma.dailyPrice.findMany({
    where: {
      OR: maxDates
        .filter((item) => item._max.tradingDate)
        .map((item) => ({
          stockId: item.stockId,
          tradingDate: item._max.tradingDate!,
        })),
    },
  })

  return new Map(latestRows.map((row) => [row.stockId, row]))
}

function toLastSync(syncRun: {
  status: SyncStatus
  targetDate: Date
  startedAt: Date
  finishedAt: Date | null
  rowsInserted: number
  rowsUpdated: number
  errorSummary: string | null
} | null) {
  if (!syncRun) {
    return null
  }

  return {
    status: syncRun.status,
    targetDate: toIsoDate(syncRun.targetDate),
    startedAt: syncRun.startedAt.toISOString(),
    finishedAt: syncRun.finishedAt?.toISOString() ?? null,
    rowsInserted: syncRun.rowsInserted,
    rowsUpdated: syncRun.rowsUpdated,
    errorSummary: syncRun.errorSummary,
  } satisfies DashboardData['lastSync']
}

export async function getDashboardData(): Promise<DashboardData> {
  const [stocks, latestPrices, lastSync] = await Promise.all([
    getTrackedStocks(),
    getLatestPricesByStockId(),
    prisma.syncRun.findFirst({
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const snapshot: StockSnapshot[] = stocks.map((stock) => ({
    ...toSummary(stock),
    latestPrice: latestPrices.get(stock.id) ? toDailyBar(latestPrices.get(stock.id)!) : null,
  }))

  const latestTradingDate =
    snapshot.reduce<string | null>((latest, stock) => {
      const value = stock.latestPrice?.tradingDate ?? null
      if (!value) {
        return latest
      }

      return !latest || value > latest ? value : latest
    }, null) ?? null

  return {
    stocks: snapshot,
    totals: {
      trackedStocks: snapshot.length,
      pricedStocks: snapshot.filter((stock) => stock.latestPrice !== null).length,
      latestTradingDate,
    },
    lastSync: toLastSync(lastSync),
  }
}

export async function getStockHistory(stockCode: string): Promise<StockHistoryData> {
  const stock = await prisma.stock.findUnique({
    where: { stockCode },
  })

  if (!stock) {
    throw new Error(`Unknown stock code: ${stockCode}`)
  }

  const history = await prisma.dailyPrice.findMany({
    where: { stockId: stock.id },
    orderBy: { tradingDate: 'desc' },
    take: 90,
  })

  return {
    stock: toSummary(stock),
    history: history.map(toDailyBar),
  }
}

export async function getFullHistoryForStock(stockCode: string) {
  const stock = await prisma.stock.findUnique({
    where: { stockCode },
  })

  if (!stock) {
    throw new Error(`Unknown stock code: ${stockCode}`)
  }

  const history = await prisma.dailyPrice.findMany({
    where: { stockId: stock.id },
    orderBy: { tradingDate: 'desc' },
  })

  return {
    stock: toSummary(stock),
    history: history.map(toDailyBar),
  }
}

export async function exportLatestSnapshotCsv() {
  const dashboard = await getDashboardData()

  return buildCsv(
    dashboard.stocks.map((stock) => ({
      rank: stock.rank,
      stockCode: stock.stockCode,
      providerSymbol: stock.providerSymbol,
      name: stock.name,
      tradingDate: stock.latestPrice?.tradingDate ?? null,
      open: stock.latestPrice?.open ?? null,
      high: stock.latestPrice?.high ?? null,
      low: stock.latestPrice?.low ?? null,
      close: stock.latestPrice?.close ?? null,
      volume: stock.latestPrice?.volume ?? null,
      currency: stock.latestPrice?.currency ?? null,
    })),
    ['rank', 'stockCode', 'providerSymbol', 'name', 'tradingDate', 'open', 'high', 'low', 'close', 'volume', 'currency'],
  )
}

export async function exportFullHistoryCsv() {
  const rows = await prisma.dailyPrice.findMany({
    orderBy: [{ tradingDate: 'desc' }, { stock: { rank: 'asc' } }],
    include: { stock: true },
  })

  return buildCsv(
    rows.map((row) => ({
      rank: row.stock.rank,
      stockCode: row.stock.stockCode,
      providerSymbol: row.stock.providerSymbol,
      name: row.stock.name,
      tradingDate: toIsoDate(row.tradingDate),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      currency: row.currency,
    })),
    ['rank', 'stockCode', 'providerSymbol', 'name', 'tradingDate', 'open', 'high', 'low', 'close', 'volume', 'currency'],
  )
}

export async function runDailySync(targetDate = getKualaLumpurDateString()): Promise<SyncResult> {
  const stocks = await getTrackedStocks()
  if (stocks.length === 0) {
    throw new Error('No tracked stocks found. Run the seed step first.')
  }

  const trackedSymbols = new Set(stocks.map((stock) => stock.providerSymbol.toUpperCase()))
  const syncRun = await prisma.syncRun.create({
    data: {
      provider: 'EODHD',
      targetDate: toStartOfUtcDay(targetDate),
      status: 'pending',
    },
  })

  try {
    const providerRows = await fetchEodhdExchangeBars(targetDate)
    const normalizedBars = normalizeEodhdBulkResponse(providerRows, trackedSymbols)
    const stockBySymbol = new Map(stocks.map((stock) => [stock.providerSymbol.toUpperCase(), stock]))

    let rowsInserted = 0
    let rowsUpdated = 0

    for (const bar of normalizedBars) {
      const stock = stockBySymbol.get(bar.providerSymbol)
      if (!stock) {
        continue
      }

      const existing = await prisma.dailyPrice.findUnique({
        where: {
          stockId_tradingDate: {
            stockId: stock.id,
            tradingDate: toStartOfUtcDay(bar.tradingDate),
          },
        },
      })

      await prisma.dailyPrice.upsert({
        where: {
          stockId_tradingDate: {
            stockId: stock.id,
            tradingDate: toStartOfUtcDay(bar.tradingDate),
          },
        },
        create: {
          stockId: stock.id,
          tradingDate: toStartOfUtcDay(bar.tradingDate),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          currency: bar.currency,
        },
        update: {
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          currency: bar.currency,
          fetchedAt: new Date(),
        },
      })

      if (existing) {
        rowsUpdated += 1
      } else {
        rowsInserted += 1
      }
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'success',
        finishedAt: new Date(),
        rowsInserted,
        rowsUpdated,
      },
    })

    return {
      status: 'success',
      targetDate,
      rowsInserted,
      rowsUpdated,
      matchedStocks: normalizedBars.length,
    }
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorSummary: error instanceof Error ? error.message : 'Unknown sync failure',
      },
    })

    throw error
  }
}
