import type { NormalizedProviderBar } from './types'

type EodhdRawBar = Record<string, unknown>

function coerceNumber(value: unknown) {
  const parsed = Number(value)

  if (Number.isNaN(parsed)) {
    return null
  }

  return parsed
}

function normalizeSymbol(value: unknown) {
  const text = String(value ?? '').trim().toUpperCase()

  if (!text) {
    return null
  }

  if (text.endsWith('.KLSE')) {
    return text
  }

  if (/^\d{1,4}$/.test(text)) {
    return `${text.padStart(4, '0')}.KLSE`
  }

  return text
}

export function normalizeEodhdBulkResponse(
  rows: EodhdRawBar[],
  trackedSymbols: Set<string>,
): NormalizedProviderBar[] {
  const output: NormalizedProviderBar[] = []

  for (const row of rows) {
    const providerSymbol = normalizeSymbol(row.code ?? row.symbol ?? row.ticker)
    if (!providerSymbol || !trackedSymbols.has(providerSymbol)) {
      continue
    }

    const tradingDate = String(row.date ?? '').slice(0, 10)
    const open = coerceNumber(row.open)
    const high = coerceNumber(row.high)
    const low = coerceNumber(row.low)
    const close = coerceNumber(row.close)
    const volume = coerceNumber(row.volume)

    if (!tradingDate || open === null || high === null || low === null || close === null || volume === null) {
      continue
    }

    output.push({
      providerSymbol,
      stockCode: providerSymbol.split('.')[0]!,
      tradingDate,
      open,
      high,
      low,
      close,
      volume,
      currency: String(row.currency ?? 'MYR'),
    })
  }

  return output
}

export async function fetchEodhdExchangeBars(targetDate?: string) {
  const apiKey = process.env.EODHD_API_KEY

  if (!apiKey) {
    throw new Error('EODHD_API_KEY is not configured')
  }

  const baseUrl = process.env.EODHD_BASE_URL ?? 'https://eodhd.com/api'
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/eod-bulk-last-day/KLSE`)
  url.searchParams.set('api_token', apiKey)
  url.searchParams.set('fmt', 'json')

  if (targetDate) {
    url.searchParams.set('date', targetDate)
  }

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`EODHD request failed with ${response.status}`)
  }

  const payload = (await response.json()) as EodhdRawBar[]
  if (!Array.isArray(payload)) {
    throw new Error('EODHD response was not an array')
  }

  return payload
}
