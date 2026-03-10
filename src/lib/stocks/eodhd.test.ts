import { describe, expect, it } from 'vitest'

import { normalizeEodhdSymbolHistoryResponse, normalizeEodhdSymbolResponse } from './eodhd'

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

  it('maps a full symbol history and drops malformed rows', () => {
    const bars = normalizeEodhdSymbolHistoryResponse('0097.KLSE', [
      {
        date: '2026-03-04',
        open: 2.99,
        high: 3.05,
        low: 2.95,
        close: 3.01,
        volume: 120000,
      },
      {
        date: '2026-03-05',
        open: 'bad',
        high: 3.12,
        low: 2.97,
        close: 3.08,
        volume: 280000,
      },
      {
        date: '2026-03-06',
        open: 3.02,
        high: 3.11,
        low: 2.98,
        close: 3.07,
        volume: 320000,
        currency: 'MYR',
      },
    ])

    expect(bars).toEqual([
      {
        providerSymbol: '0097.KLSE',
        stockCode: '0097',
        tradingDate: '2026-03-04',
        open: 2.99,
        high: 3.05,
        low: 2.95,
        close: 3.01,
        volume: 120000,
        currency: 'MYR',
      },
      {
        providerSymbol: '0097.KLSE',
        stockCode: '0097',
        tradingDate: '2026-03-06',
        open: 3.02,
        high: 3.11,
        low: 2.98,
        close: 3.07,
        volume: 320000,
        currency: 'MYR',
      },
    ])
  })
})
