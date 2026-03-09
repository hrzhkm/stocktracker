import { createServerFn } from '@tanstack/react-start'

import { getDashboardData, getStockHistory } from './service'

export const getDashboard = createServerFn({
  method: 'GET',
}).handler(async () => getDashboardData())

export const getHistory = createServerFn({
  method: 'GET',
})
  .inputValidator((input: { stockCode: string }) => input)
  .handler(async ({ data }) => getStockHistory(data.stockCode))
