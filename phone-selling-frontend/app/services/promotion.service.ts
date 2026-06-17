import { useApiClient } from '~/composables/useApiClient'
import type { PromoCreationRequest, PromoResponse } from '~/types/api'

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
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

const toNumberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return toNumberValue(value, 0)
}

const toPromo = (value: unknown): PromoResponse | null => {
  const payload = asRecord(value)
  const id = Math.trunc(toNumberValue(payload.id, 0))

  if (id <= 0) {
    return null
  }

  return {
    id,
    name: toStringValue(payload.name),
    description: toStringValue(payload.description),
    startDate: toStringValue(payload.startDate),
    endDate: toStringValue(payload.endDate),
    discountType: toStringValue(payload.discountType) === 'FIXED' ? 'FIXED' : 'PERCENT',
    discountValue: toNumberValue(payload.discountValue, 0),
    voucherCode: toStringValue(payload.voucherCode),
    usageLimit: Math.max(0, Math.trunc(toNumberValue(payload.usageLimit, 0))),
    usageCount: Math.max(0, Math.trunc(toNumberValue(payload.usageCount, 0))),
    maxDiscountMoneyPerOrder: toNullableNumber(payload.maxDiscountMoneyPerOrder),
    promoImageUrls: payload.promoImageUrls && typeof payload.promoImageUrls === 'object'
      ? (payload.promoImageUrls as Record<string, unknown>)
      : null,
    createdAt: toStringValue(payload.createdAt),
    updatedAt: toStringValue(payload.updatedAt)
  }
}

const toPromoArray = (value: unknown): PromoResponse[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(toPromo).filter((item): item is PromoResponse => item !== null)
}

export const promotionService = {
  async getAllPromotions() {
    const api = useApiClient()
    const response = await api<unknown>('/api/promotions')
    return toPromoArray(response)
  },

  async createPromotion(payload: PromoCreationRequest) {
    const api = useApiClient()

    await api<void>('/api/promotions/create', {
      method: 'POST',
      body: payload
    })
  }
}
