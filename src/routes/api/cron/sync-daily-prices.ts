import { createFileRoute } from '@tanstack/react-router'

import { runDailySync } from '@/lib/stocks/service'

function isAuthorized(request: Request) {
  const secret = process.env.STOCK_SYNC_CRON_SECRET
  if (!secret) {
    throw new Error('STOCK_SYNC_CRON_SECRET is not configured')
  }

  const headerSecret =
    request.headers.get('x-cron-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  return headerSecret === secret
}

export const Route = createFileRoute('/api/cron/sync-daily-prices')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!isAuthorized(request)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const url = new URL(request.url)
          const targetDate = url.searchParams.get('date') ?? undefined
          const result = await runDailySync(targetDate)

          return Response.json(result)
        } catch (error) {
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Unknown sync failure',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
