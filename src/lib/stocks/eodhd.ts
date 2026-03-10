import type { NormalizedProviderBar } from './types'

type EodhdRawBar = Record<string, unknown>

type FetchTrackedBarsOptions = {
  targetDate?: string
  fromDate?: string
  toDate?: string
  concurrency?: number
}

function coerceNumber(value: unknown) {
  const parsed = Number(value)

  if (Number.isNaN(parsed)) {
    return null
  }

  return parsed
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size))
  }

  return output
}

function createApiUrl(
  symbol: string,
  options: Pick<FetchTrackedBarsOptions, 'targetDate' | 'fromDate' | 'toDate'> = {},
) {
  const apiKey = process.env.EODHD_API_KEY

  if (!apiKey) {
    throw new Error('EODHD_API_KEY is not configured')
  }

  const baseUrl = process.env.EODHD_BASE_URL ?? 'https://eodhd.com/api'
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/eod/${symbol}`)
  url.searchParams.set('api_token', apiKey)
  url.searchParams.set('fmt', 'json')

  if (options.targetDate) {
    url.searchParams.set('from', options.targetDate)
    url.searchParams.set('to', options.targetDate)
  } else {
    url.searchParams.set('from', options.fromDate ?? '2000-01-01')
    url.searchParams.set('to', options.toDate ?? new Date().toISOString().slice(0, 10))
  }

  return url
}

function normalizeEodhdRow(providerSymbol: string, row: EodhdRawBar): NormalizedProviderBar | null {
  const tradingDate = String(row.date ?? '').slice(0, 10)
  const open = coerceNumber(row.open)
  const high = coerceNumber(row.high)
  const low = coerceNumber(row.low)
  const close = coerceNumber(row.close)
  const volume = coerceNumber(row.volume)

  if (
    !tradingDate ||
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    volume === null
  ) {
    return null
  }

  return {
    providerSymbol,
    stockCode: providerSymbol.split('.')[0]!,
    tradingDate,
    open,
    high,
    low,
    close,
    volume,
    currency: String(row.currency ?? 'MYR'),
  }
}

export function normalizeEodhdSymbolHistoryResponse(
  providerSymbol: string,
  rows: EodhdRawBar[],
) {
  return rows.flatMap((row) => {
    const normalized = normalizeEodhdRow(providerSymbol, row)
    return normalized ? [normalized] : []
  })
}

export function normalizeEodhdSymbolResponse(
  providerSymbol: string,
  rows: EodhdRawBar[],
): NormalizedProviderBar | null {
  return normalizeEodhdSymbolHistoryResponse(providerSymbol, rows).at(-1) ?? null
}

async function fetchEodhdSymbolBars(
  providerSymbol: string,
  options: Pick<FetchTrackedBarsOptions, 'targetDate' | 'fromDate' | 'toDate'> = {},
) {
  const response = await fetch(createApiUrl(providerSymbol, options), {
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `EODHD request failed for ${providerSymbol} with ${response.status}`,
    )
  }

  const payload = (await response.json()) as EodhdRawBar[]
  if (!Array.isArray(payload)) {
    throw new Error(`EODHD response for ${providerSymbol} was not an array`)
  }

  return payload
}

export async function fetchEodhdTrackedBars(
  providerSymbols: string[],
  options: FetchTrackedBarsOptions = {},
) {
  const concurrency = options.concurrency ?? 5
  const output: NormalizedProviderBar[] = []

  for (const group of chunk(providerSymbols, concurrency)) {
    const settled = await Promise.allSettled(
      group.map(async (providerSymbol) => {
        const rows = await fetchEodhdSymbolBars(providerSymbol, options)
        return normalizeEodhdSymbolResponse(providerSymbol, rows)
      }),
    )

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        output.push(result.value)
      }
    }
  }

  return output
}

export async function fetchEodhdTrackedBarsForDateRange(
  providerSymbols: string[],
  options: Pick<FetchTrackedBarsOptions, 'fromDate' | 'toDate' | 'concurrency'>,
) {
  const concurrency = options.concurrency ?? 5
  const output: NormalizedProviderBar[] = []

  for (const group of chunk(providerSymbols, concurrency)) {
    const settled = await Promise.allSettled(
      group.map(async (providerSymbol) => {
        const rows = await fetchEodhdSymbolBars(providerSymbol, options)
        return normalizeEodhdSymbolHistoryResponse(providerSymbol, rows)
      }),
    )

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        output.push(...result.value)
      }
    }
  }

  return output
}
