import { describe, expect, it } from 'vitest'

import { normalizeEodhdSymbolResponse } from './eodhd'

describe('normalizeEodhdSymbolResponse', () => {
  it('maps the latest per-symbol EOD row into a normalized bar', () => {
    const bar = normalizeEodhdSymbolResponse('0097.KLSE', [
      {
        date: '2026-03-06',
        open: 3.02,
        high: 3.11,
        low: 2.98,
        close: 3.07,
        volume: 320000,
      },
      {
        date: '2026-03-09',
        open: 3.11,
        high: 3.24,
        low: 3.01,
        close: 3.18,
        volume: 456700,
        currency: 'MYR',
      },
    ])

    expect(bar).toEqual({
      providerSymbol: '0097.KLSE',
      stockCode: '0097',
      tradingDate: '2026-03-09',
      open: 3.11,
      high: 3.24,
      low: 3.01,
      close: 3.18,
      volume: 456700,
      currency: 'MYR',
    })
  })
})
