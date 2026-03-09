import { describe, expect, it } from 'vitest'

import { normalizeEodhdBulkResponse } from './eodhd'

describe('normalizeEodhdBulkResponse', () => {
  it('keeps only tracked symbols and normalizes four-digit Bursa codes', () => {
    const bars = normalizeEodhdBulkResponse(
      [
        {
          code: '97',
          date: '2026-03-10',
          open: '3.11',
          high: '3.24',
          low: '3.01',
          close: '3.18',
          volume: '456700',
          currency: 'MYR',
        },
        {
          code: '9999',
          date: '2026-03-10',
          open: '1',
          high: '1',
          low: '1',
          close: '1',
          volume: '1',
        },
      ],
      new Set(['0097.KLSE']),
    )

    expect(bars).toEqual([
      {
        providerSymbol: '0097.KLSE',
        stockCode: '0097',
        tradingDate: '2026-03-10',
        open: 3.11,
        high: 3.24,
        low: 3.01,
        close: 3.18,
        volume: 456700,
        currency: 'MYR',
      },
    ])
  })
})
