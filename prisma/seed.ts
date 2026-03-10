import { PrismaPg } from '@prisma/adapter-pg'

import { TOP_100_STOCKS } from '../src/data/top100-stocks'
import { fetchEodhdTrackedBarsForDateRange } from '../src/lib/stocks/eodhd'
import { getKualaLumpurDateString, toIsoDate, toStartOfUtcDay } from '../src/lib/stocks/time'
import { PrismaClient } from '../src/generated/prisma/client.js'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const RECENT_BACKFILL_DAYS = 10

function subtractUtcDays(dateString: string, days: number) {
  const date = toStartOfUtcDay(dateString)
  date.setUTCDate(date.getUTCDate() - days)
  return toIsoDate(date)
}

async function seedTrackedStocks() {
  let seededCount = 0

  for (const stock of TOP_100_STOCKS) {
    await prisma.stock.upsert({
      where: { stockCode: stock.stockCode },
      create: stock,
      update: {
        rank: stock.rank,
        providerSymbol: stock.providerSymbol,
        name: stock.name,
        isActive: true,
      },
    })

    seededCount += 1
  }

  return seededCount
}

async function backfillRecentPrices() {
  if (!process.env.EODHD_API_KEY) {
    console.log('Skipping recent price backfill because EODHD_API_KEY is not configured')
    return
  }

  const today = getKualaLumpurDateString()
  const fromDate = subtractUtcDays(today, RECENT_BACKFILL_DAYS)
  const trackedStocks = await prisma.stock.findMany({
    where: { isActive: true },
    select: {
      id: true,
      providerSymbol: true,
    },
    orderBy: { rank: 'asc' },
  })

  if (trackedStocks.length === 0) {
    console.log('Skipping recent price backfill because no active tracked stocks were found')
    return
  }

  console.log(`Backfilling tracked prices from ${fromDate} to ${today}...`)

  const existingRows = await prisma.dailyPrice.findMany({
    where: {
      stockId: { in: trackedStocks.map((stock) => stock.id) },
      tradingDate: {
        gte: toStartOfUtcDay(fromDate),
        lte: toStartOfUtcDay(today),
      },
    },
    select: {
      stockId: true,
      tradingDate: true,
    },
  })

  const existingKeys = new Set(
    existingRows.map((row) => `${row.stockId}:${toIsoDate(row.tradingDate)}`),
  )
  const stockByProviderSymbol = new Map(
    trackedStocks.map((stock) => [stock.providerSymbol.toUpperCase(), stock]),
  )

  const bars = await fetchEodhdTrackedBarsForDateRange(
    trackedStocks.map((stock) => stock.providerSymbol),
    { fromDate, toDate: today },
  )

  const missingRows = bars.flatMap((bar) => {
    const stock = stockByProviderSymbol.get(bar.providerSymbol.toUpperCase())
    if (!stock) {
      return []
    }

    const dedupeKey = `${stock.id}:${bar.tradingDate}`
    if (existingKeys.has(dedupeKey)) {
      return []
    }

    existingKeys.add(dedupeKey)

    return [
      {
        stockId: stock.id,
        tradingDate: toStartOfUtcDay(bar.tradingDate),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        currency: bar.currency,
      },
    ]
  })

  if (missingRows.length === 0) {
    console.log('Skipped recent price backfill because all fetched rows already exist')
    return
  }

  const result = await prisma.dailyPrice.createMany({
    data: missingRows,
    skipDuplicates: true,
  })

  console.log(
    `Inserted ${result.count} recent daily prices (${bars.length - result.count} rows already existed)`,
  )
}

async function main() {
  console.log('Seeding Bursa Top 100 universe...')

  const seededCount = await seedTrackedStocks()
  console.log(`Upserted ${seededCount} tracked stocks`)

  await backfillRecentPrices()
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
