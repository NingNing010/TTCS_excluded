import { useApiClient } from '~/composables/useApiClient'
import { productService } from '~/services/product.service'
import type {
  WarehouseProductSearchModel,
  WarehouseProductDetailModel,
  WarehouseProductSearchCriteria,
  WarehouseProductStockUpdateRequest
} from '~/types/warehouse-product'

const PRODUCT_API_BASE = '/api/products'

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return {}
}

const toStringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

const toNumberValue = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = Number(value)
    if (Number.isFinite(normalized)) {
      return normalized
    }
  }

  return fallback
}

const toBooleanValue = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true
    }

    if (value === 'false') {
      return false
    }
  }

  return fallback
}

const unwrapPayload = (value: unknown): Record<string, unknown> => {
  const payload = asRecord(value)
  const nestedCandidates = [payload.data, payload.content, payload.result, payload.product]

  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return asRecord(candidate)
    }
  }

  return payload
}

const toWarehouseProductDetail = (value: unknown): WarehouseProductDetailModel | null => {
  const payload = unwrapPayload(value)
  const brandRecord = asRecord(payload.brand)

  const id = Math.max(0, Math.trunc(toNumberValue(payload.id, 0)))
  if (id <= 0) {
    return null
  }

  const brandId = Math.max(0, Math.trunc(toNumberValue(payload.brandId ?? brandRecord.id, 0)))
  const stockAvailable = Math.max(0, Math.trunc(toNumberValue(payload.stockAvailable, 0)))
  const inStock = toBooleanValue(payload.inStock, stockAvailable > 0)

  return {
    id,
    name: toStringValue(payload.name, ''),
    type: toStringValue(payload.type, ''),
    basePrice: Math.max(0, toNumberValue(payload.basePrice, 0)),
    brandName: toStringValue(payload.brandName ?? brandRecord.name, ''),
    brandId: brandId > 0 ? brandId : null,
    stockAvailable,
    inStock,
    releaseDate: toStringValue(payload.releaseDate, '') || null
  }
}

export const warehouseProductService = {
  async searchProducts(query: WarehouseProductSearchCriteria) {
    const products = await productService.searchProducts(query)

    return products.map((product): WarehouseProductSearchModel => ({
      id: product.id,
      name: product.name,
      type: product.type,
      brandName: product.brandName,
      basePrice: product.basePrice,
      inStock: product.inStock,
      imageUrl: product.imageUrl
    }))
  },

  async getProductById(productId: number) {
    const api = useApiClient()
    const response = await api<unknown>(`${PRODUCT_API_BASE}/${productId}`)
    const normalized = toWarehouseProductDetail(response)

    if (!normalized) {
      throw new Error('Unable to read product details.')
    }

    return normalized
  },

  async updateProductStock(product: WarehouseProductDetailModel, quantity: number, increase: boolean) {
    const api = useApiClient()
    const normalizedName = product.name.trim().length > 0 ? product.name.trim() : `Warehouse stock update #${product.id}`
    const normalizedType = product.type.trim().length > 0 ? product.type.trim() : 'PHONE'
    const normalizedBasePrice = Number.isFinite(product.basePrice) && product.basePrice > 0 ? product.basePrice : 1
    const normalizedBrandId = product.brandId && product.brandId > 0 ? product.brandId : 1

    const requestBody: WarehouseProductStockUpdateRequest = {
      name: normalizedName,
      type: normalizedType,
      basePrice: normalizedBasePrice,
      brandId: normalizedBrandId,
      stockAvailable: quantity
    }

    return api<unknown>(`${PRODUCT_API_BASE}/stockUpdate`, {
      method: 'POST',
      params: {
        productId: product.id,
        increase
      },
      body: requestBody
    })
  }
}
