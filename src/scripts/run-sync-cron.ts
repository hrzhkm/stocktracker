import { runDailySync } from '../lib/stocks/service'

import type { SyncResult } from '../lib/stocks/types'

class HttpSyncError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'HttpSyncError'
  }
}

function parsePositiveInt(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`)
  }

  return parsed
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createCronUrl(targetDate?: string) {
  const configuredUrl = process.env.STOCK_SYNC_CRON_URL
  const baseUrl = process.env.STOCK_SYNC_APP_URL ?? 'http://127.0.0.1:3000'
  const url = configuredUrl
    ? new URL(configuredUrl)
    : new URL('/api/cron/sync-daily-prices', baseUrl)

  if (targetDate) {
    url.searchParams.set('date', targetDate)
  }

  return url
}

async function readJson(response: Response) {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function postCronEndpoint(targetDate: string | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(createCronUrl(targetDate), {
      method: 'POST',
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    })

    const payload = await readJson(response)

    if (!response.ok) {
      const detail =
        typeof payload === 'string'
          ? payload
          : payload && typeof payload === 'object' && 'error' in payload
            ? String(payload.error)
            : `HTTP ${response.status}`

      throw new HttpSyncError(
        `Cron endpoint failed with ${response.status}: ${detail}`,
        response.status === 408 ||
          response.status === 425 ||
          response.status === 429 ||
          response.status >= 500,
      )
    }

    return payload as SyncResult
  } catch (error) {
    if (error instanceof HttpSyncError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpSyncError(
        `Cron endpoint request timed out after ${timeoutMs}ms`,
        true,
      )
    }

    throw new HttpSyncError(
      `Cron endpoint request failed: ${formatError(error)}`,
      true,
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function runWithRetry(targetDate?: string) {
  const maxRetries = parsePositiveInt('STOCK_SYNC_MAX_RETRIES', 3)
  const retryDelayMs = parsePositiveInt('STOCK_SYNC_RETRY_DELAY_MS', 30_000)
  const timeoutMs = parsePositiveInt('STOCK_SYNC_HTTP_TIMEOUT_MS', 120_000)
  const skipHttp = process.env.STOCK_SYNC_SKIP_HTTP === '1'

  if (!skipHttp) {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const result = await postCronEndpoint(targetDate, timeoutMs)
        console.log(
          JSON.stringify(
            {
              mode: 'http',
              attempt,
              result,
            },
            null,
            2,
          ),
        )
        return
      } catch (error) {
        lastError = error
        const retryable =
          error instanceof HttpSyncError ? error.retryable : true

        console.error(
          `[stocks:cron] HTTP sync attempt ${attempt}/${maxRetries} failed: ${formatError(error)}`,
        )

        if (!retryable || attempt === maxRetries) {
          break
        }

        await sleep(retryDelayMs)
      }
    }

    console.error(
      `[stocks:cron] Falling back to direct sync after HTTP failure: ${formatError(lastError)}`,
    )
  }

  const result = await runDailySync(targetDate)
  console.log(
    JSON.stringify(
      {
        mode: 'fallback-direct',
        result,
      },
      null,
      2,
    ),
  )
}

const targetDate = process.argv[2]

runWithRetry(targetDate).catch((error) => {
  console.error(`[stocks:cron] Sync failed: ${formatError(error)}`)
  process.exit(1)
})
