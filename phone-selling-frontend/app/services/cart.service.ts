import { useApiClient } from '~/composables/useApiClient'
import type { CartDto, ProductDocumentResponse } from '~/types/api'
import type { ProductCardModel } from '~/types/home'

const toNumber = (value: unknown, fallback = 0): number => {
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

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const toProductsMap = (value: unknown): Record<number, number> => {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const mapped = entries
    .map(([productId, count]) => ({
      productId: toNumber(productId, 0),
      count: toNumber(count, 0)
    }))
    .filter((item) => item.productId > 0 && Number.isFinite(item.count))

  return mapped.reduce<Record<number, number>>((acc, item) => {
    acc[item.productId] = Math.trunc(item.count)
    return acc
  }, {})
}

const normalizeProductId = (product: { id?: number | string | null; mysqlId?: number | string | null }): number => {
  const candidates = [product.mysqlId, product.id]

  for (const candidate of candidates) {
    const parsed = toFiniteNumber(candidate)
    if (parsed !== null) {
      return parsed
    }
  }

  return 0
}

const pickFirstImage = (value: unknown): string | null => {
  if (!value) {
    return null
  }

  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = pickFirstImage(item)
      if (candidate) {
        return candidate
      }
    }

    return null
  }

  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const candidate = pickFirstImage(item)
      if (candidate) {
        return candidate
      }
    }
  }

  return null
}

const toProductCardFromDocument = (product: ProductDocumentResponse): ProductCardModel | null => {
  const id = normalizeProductId(product)
  if (id <= 0) {
    return null
  }

  const imageUrl = pickFirstImage(
    typeof product.imageUrl === 'string' && product.imageUrl.length > 0 ? product.imageUrl : product.imageUrls
  )

  return {
    id,
    name: product.name?.trim() || 'Unnamed product',
    basePrice: toNumber(product.basePrice, 0),
    type: product.type?.trim() || 'UNKNOWN',
    brandName: product.brandName?.trim() || 'Unknown',
    imageUrl,
    inStock: Boolean(product.inStock)
  }
}

export const cartService = {
  async updateCart(payload: CartDto) {
    const api = useApiClient()

    await api('/api/cart/update', {
      method: 'POST',
      body: payload
    })
  },

  async viewCart() {
    const api = useApiClient()
    const response = await api<CartDto>('/api/cart')

    return {
      products: toProductsMap(response?.products)
    }
  },

  async getRecommendations(limit = 10, guestId?: string | null) {
    const api = useApiClient()
    const response = await api<ProductDocumentResponse[]>('/api/cart/recommendations', {
      params: {
        limit
      },
      headers: guestId ? { 'X-Guest-Id': guestId } : undefined
    })

    const records = Array.isArray(response) ? response : []
    return records.map(toProductCardFromDocument).filter((item): item is ProductCardModel => item !== null)
  }
}
