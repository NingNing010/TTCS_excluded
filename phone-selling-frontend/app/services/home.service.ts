import { useApiClient } from '~/composables/useApiClient'
import type { BrandResponse, HomeProductResponse, PromoResponse } from '~/types/api'
import type { BrandModel, ProductCardModel, PromotionModel } from '~/types/home'

const asArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])

const unwrapArrayPayload = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[]
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  const record = value as Record<string, unknown>
  const candidates = [record.data, record.content, record.result, record.brands, record.items]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[]
    }
  }

  return []
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

const toProductCard = (product: HomeProductResponse): ProductCardModel => ({
  id: product.id,
  name: product.name,
  basePrice: product.basePrice,
  type: product.type,
  brandName: product.brandName,
  imageUrl: product.imageUrl || null,
  inStock: product.inStock
})

const toBrand = (brand: BrandResponse): BrandModel => ({
  id: brand.id,
  name: brand.name,
  logoUrl: pickFirstImage(brand.logoImageUrls)
})

const toPromotion = (promo: PromoResponse): PromotionModel => ({
  id: promo.id,
  name: promo.name,
  description: promo.description,
  discountType: promo.discountType,
  discountValue: promo.discountValue,
  voucherCode: promo.voucherCode,
  imageUrl: pickFirstImage(promo.promoImageUrls),
  endDate: promo.endDate
})

export const homeService = {
  async getFeaturedProducts() {
    const api = useApiClient()
    const response = await api<HomeProductResponse[]>('/api/products/featured')
    return asArray(response).map(toProductCard)
  },

  async getNewArrivals() {
    const api = useApiClient()
    const response = await api<HomeProductResponse[]>('/api/products/new-arrivals')
    return asArray(response).map(toProductCard)
  },

  async getBrands() {
    const api = useApiClient()
    const response = await api<unknown>('/api/brands')
    return unwrapArrayPayload<BrandResponse>(response).map(toBrand)
  },

  async getPromotions() {
    const api = useApiClient()
    const response = await api<PromoResponse[]>('/api/promotions/ongoing')
    return asArray(response).map(toPromotion)
  }
}
