import { describe, expect, it } from 'vitest'

import { TOP_100_STOCKS } from './top100-stocks'

describe('TOP_100_STOCKS', () => {
  it('contains 100 unique Bursa symbols with padded stock codes', () => {
    expect(TOP_100_STOCKS).toHaveLength(100)
    expect(new Set(TOP_100_STOCKS.map((stock) => stock.stockCode)).size).toBe(100)
    expect(new Set(TOP_100_STOCKS.map((stock) => stock.providerSymbol)).size).toBe(100)
    expect(TOP_100_STOCKS.every((stock) => /^\d{4}$/.test(stock.stockCode))).toBe(true)
    expect(TOP_100_STOCKS.every((stock) => stock.providerSymbol === `${stock.stockCode}.KLSE`)).toBe(true)
  })
})
