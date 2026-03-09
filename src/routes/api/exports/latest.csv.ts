import { createFileRoute } from '@tanstack/react-router'

import { createCsvHeaders } from '@/lib/stocks/csv'
import { exportLatestSnapshotCsv } from '@/lib/stocks/service'

export const Route = createFileRoute('/api/exports/latest/csv')({
  server: {
    handlers: {
      GET: async () =>
        new Response(await exportLatestSnapshotCsv(), {
          headers: createCsvHeaders('bursa-top100-latest.csv'),
        }),
    },
  },
})
