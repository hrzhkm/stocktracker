export type StockSummary = {
  id: number
  rank: number
  stockCode: string
  providerSymbol: string
  name: string
  isActive: boolean
}

export type DailyBar = {
  tradingDate: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  currency: string
}

export type StockSnapshot = StockSummary & {
  latestPrice: DailyBar | null
}

export type DashboardData = {
  stocks: StockSnapshot[]
  totals: {
    trackedStocks: number
    pricedStocks: number
    latestTradingDate: string | null
  }
  lastSync: {
    status: 'pending' | 'success' | 'failed'
    targetDate: string
    startedAt: string
    finishedAt: string | null
    rowsInserted: number
    rowsUpdated: number
    errorSummary: string | null
  } | null
}

export type StockHistoryData = {
  stock: StockSummary
  history: DailyBar[]
}

export type SyncResult = {
  status: 'success'
  targetDate: string
  rowsInserted: number
  rowsUpdated: number
  matchedStocks: number
}

export type NormalizedProviderBar = {
  providerSymbol: string
  stockCode: string
  tradingDate: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  currency: string
}
