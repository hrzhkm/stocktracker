import { createFileRoute } from '@tanstack/react-router'

import { createCsvHeaders } from '@/lib/stocks/csv'
import { exportFullHistoryCsv } from '@/lib/stocks/service'

export const Route = createFileRoute('/api/exports/history/csv')({
  server: {
    handlers: {
      GET: async () =>
        new Response(await exportFullHistoryCsv(), {
          headers: createCsvHeaders('bursa-top100-history.csv'),
        }),
    },
  },
})
