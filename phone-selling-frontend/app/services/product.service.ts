import { useApiClient } from '~/composables/useApiClient'
import type { ProductDetailResponse, RatingResponse, RelatedProductResponse } from '~/types/api'
import type { ProductDetailModel, ProductReviewModel, ProductSpecItem } from '~/types/product'
import type { ProductCardModel } from '~/types/home'
import type { ProductSearchQuery, ProductSearchResponse } from '~/types/search'

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

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).join(', ')
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${toStringValue(item)}`)
      .join(' | ')
  }

  return '-'
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

const toSpecs = (value: Record<string, unknown> | null | undefined): ProductSpecItem[] => {
  if (!value) {
    return []
  }

  return Object.entries(value).map(([key, item]) => ({
    key,
    value: toStringValue(item)
  }))
}

const toReview = (review: RatingResponse): ProductReviewModel => {
  const numericStar = Math.round(toNumber(review.star, 0))
  const normalizedStar = Math.max(1, Math.min(5, numericStar || 1))
  const normalizedId = Math.round(toNumber(review.ratingId, 0))

  return {
    id: normalizedId > 0 ? normalizedId : 0,
    userName: review.userName || 'Anonymous',
    star: normalizedStar,
    comment: review.comment?.trim() || '',
    createdAt: review.createdAt
  }
}

const toProductDetail = (response: ProductDetailResponse): ProductDetailModel => {
  const imageUrls = Array.isArray(response.imageUrls) && response.imageUrls.length > 0
    ? response.imageUrls.filter((url) => typeof url === 'string' && url.length > 0)
    : []

  const reviews = Array.isArray(response.reviews)
    ? response.reviews
        .filter((review) => !review.hidden)
        .map(toReview)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  const relatedProducts = Array.isArray(response.relatedProducts)
    ? response.relatedProducts
        .map(toProductCardFromRelated)
        .filter((item): item is ProductCardModel => item !== null)
    : []

  return {
    id: response.id,
    name: response.name,
    type: response.type,
    basePrice: response.basePrice,
    brandName: response.brandName,
    description: response.description?.trim() || '',
    releaseDate: response.releaseDate || null,
    imageUrls,
    inStock: response.inStock,
    stockAvailable: toNumber(response.stockAvailable, 0),
    averageRating: toNumber(response.averageRating, 0),
    specs: toSpecs(response.specs),
    reviews,
    relatedProducts
  }
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

const toProductCardFromSearch = (product: ProductSearchResponse): ProductCardModel | null => {
  const id = normalizeProductId(product)
  if (id <= 0) {
    return null
  }

  return {
    id,
    name: product.name?.trim() || 'Unnamed product',
    basePrice: toNumber(product.basePrice, 0),
    type: product.type?.trim() || 'UNKNOWN',
    brandName: product.brandName?.trim() || 'Unknown',
    imageUrl: typeof product.imageUrl === 'string' && product.imageUrl.length > 0 ? product.imageUrl : null,
    inStock: Boolean(product.inStock)
  }
}

const toProductCardFromRelated = (product: RelatedProductResponse): ProductCardModel | null => {
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

const toSearchParams = (query: ProductSearchQuery): Record<string, string | number | boolean> => {
  const params: Record<string, string | number | boolean> = {}

  if (query.keyword) {
    params.keyword = query.keyword
  }

  if (query.type) {
    params.type = query.type
  }

  if (query.brandName) {
    params.brandName = query.brandName
  }

  if (typeof query.minPrice === 'number' && Number.isFinite(query.minPrice)) {
    params.minPrice = query.minPrice
  }

  if (typeof query.maxPrice === 'number' && Number.isFinite(query.maxPrice)) {
    params.maxPrice = query.maxPrice
  }

  if (query.inStockOnly) {
    params.inStockOnly = true
  }

  if (query.storage) {
    params.storage = query.storage
  }

  if (query.ram) {
    params.ram = query.ram
  }

  if (query.screenType) {
    params.screenType = query.screenType
  }

  if (query.scanFrequency) {
    params.scanFrequency = query.scanFrequency
  }

  if (query.sortBy) {
    params.sortBy = query.sortBy
  }

  if (typeof query.page === 'number' && Number.isFinite(query.page)) {
    params.page = query.page
  }

  if (typeof query.size === 'number' && Number.isFinite(query.size)) {
    params.size = query.size
  }

  return params
}

export const productService = {
  async getProductDetail(productId: number) {
    const api = useApiClient()
    const response = await api<ProductDetailResponse>(`/api/products/${productId}`)
    return toProductDetail(response)
  },

  async searchProducts(query: ProductSearchQuery) {
    const api = useApiClient()
    const response = await api<ProductSearchResponse[]>('/api/products/search', {
      params: toSearchParams(query)
    })

    const records = Array.isArray(response) ? response : []
    return records.map(toProductCardFromSearch).filter((item): item is ProductCardModel => item !== null)
  }
}
