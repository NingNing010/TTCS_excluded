import { useApiClient } from '~/composables/useApiClient'
import type {
  LowSellingNewProductItem,
  OrderRateItem,
  RevenueByDayItem,
  StatisticsRequest,
  StatisticsResponse,
  TopPaidOrderItem,
  TopPurchasedProductItem,
  TotalRevenueItem
} from '~/types/api'

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const toRevenueByDayItem = (value: unknown): RevenueByDayItem => {
  const payload = asRecord(value)

  return {
    day: toStringValue(payload.day),
    revenue: toNumber(payload.revenue)
  }
}

const toTotalRevenueItem = (value: unknown): TotalRevenueItem => {
  const payload = asRecord(value)

  return {
    totalRevenue: toNumber(payload.totalRevenue)
  }
}

const toTopPurchasedProductItem = (value: unknown): TopPurchasedProductItem => {
  const payload = asRecord(value)

  return {
    productId: Math.trunc(toNumber(payload.productId)),
    productName: toStringValue(payload.productName),
    totalPurchased: Math.trunc(toNumber(payload.totalPurchased))
  }
}

const toTopPaidOrderItem = (value: unknown): TopPaidOrderItem => {
  const payload = asRecord(value)

  return {
    orderId: Math.trunc(toNumber(payload.orderId)),
    paidAmount: toNumber(payload.paidAmount),
    status: toStringValue(payload.status),
    createdAt: toStringValue(payload.createdAt)
  }
}

const toOrderRateItem = (value: unknown): OrderRateItem => {
  const payload = asRecord(value)

  return {
    status: toStringValue(payload.status),
    count: Math.trunc(toNumber(payload.count)),
    rate: toNumber(payload.rate)
  }
}

const toLowSellingNewProductItem = (value: unknown): LowSellingNewProductItem => {
  const payload = asRecord(value)

  return {
    productId: Math.trunc(toNumber(payload.productId)),
    productName: toStringValue(payload.productName),
    releaseDate: toStringValue(payload.releaseDate),
    soldQuantity: Math.trunc(toNumber(payload.soldQuantity))
  }
}

const toStatisticsResponse = (value: unknown): StatisticsResponse => {
  const payload = asRecord(value)

  return {
    revenueByDay: asArray(payload.revenueByDay).map(toRevenueByDayItem),
    totalRevenue: asArray(payload.totalRevenue).map(toTotalRevenueItem),
    topPurchasedProducts: asArray(payload.topPurchasedProducts).map(toTopPurchasedProductItem),
    topPaidOrders: asArray(payload.topPaidOrders).map(toTopPaidOrderItem),
    orderRates: asArray(payload.orderRates).map(toOrderRateItem),
    lowSellingNewProducts: asArray(payload.lowSellingNewProducts).map(toLowSellingNewProductItem)
  }
}

export const reportService = {
  async getStatistics(payload: StatisticsRequest) {
    const api = useApiClient()

    const response = await api<unknown>('/api/reports/statistics', {
      method: 'POST',
      body: payload
    })

    return toStatisticsResponse(response)
  }
}
