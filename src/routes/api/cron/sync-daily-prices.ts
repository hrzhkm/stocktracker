import { createFileRoute } from '@tanstack/react-router'

import { runDailySync } from '@/lib/stocks/service'

export const Route = createFileRoute('/api/cron/sync-daily-prices')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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
