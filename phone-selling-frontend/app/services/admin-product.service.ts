import { useApiClient } from '~/composables/useApiClient'
import { productService } from '~/services/product.service'
import type {
	AdminProductDetailModel,
	AdminProductInfoUpdateRequest,
	AdminProductSearchCriteria,
	AdminProductSearchModel,
	AdminProductSpecItem,
	AdminProductUpdateResponse,
	ProductType
} from '~/types/admin-product'

const PRODUCT_TYPES: ProductType[] = ['PHONE', 'CASE', 'CHARGER', 'CABLE']
const PRODUCT_API_BASE = '/api/products'

const hasStatusCode = (error: unknown, code: number) => {
	if (!error || typeof error !== 'object') {
		return false
	}

	const raw = error as {
		statusCode?: unknown
		response?: { status?: unknown } | undefined
	}

	return raw.statusCode === code || raw.response?.status === code
}

const asRecord = (value: unknown): Record<string, unknown> => {
	if (value && typeof value === 'object') {
		return value as Record<string, unknown>
	}

	return {}
}

const toStringValue = (value: unknown, fallback = ''): string => {
	if (typeof value === 'string') {
		return value
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value)
	}

	return fallback
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

const normalizeProductType = (value: unknown): ProductType => {
	const normalized = toStringValue(value).trim().toUpperCase()
	return PRODUCT_TYPES.includes(normalized as ProductType) ? (normalized as ProductType) : 'PHONE'
}

const toStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.filter((item): item is string => typeof item === 'string')
		.map((item) => item.trim())
		.filter((item) => item.length > 0)
}

const toSpecs = (value: unknown): AdminProductSpecItem[] => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return []
	}

	return Object.entries(value as Record<string, unknown>)
		.map(([key, raw]) => ({
			key: key.trim(),
			value: toStringValue(raw).trim()
		}))
		.filter((item) => item.key.length > 0)
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

const toAdminProductDetail = (value: unknown): AdminProductDetailModel | null => {
	const payload = unwrapPayload(value)
	const brandRecord = asRecord(payload.brand)
	const id = Math.trunc(toNumberValue(payload.id, 0))

	if (id <= 0) {
		return null
	}

	const brandId = Math.trunc(toNumberValue(payload.brandId ?? brandRecord.id, 0))

	return {
		id,
		name: toStringValue(payload.name, ''),
		type: normalizeProductType(payload.type),
		basePrice: Math.max(0, toNumberValue(payload.basePrice, 0)),
		brandId: brandId > 0 ? brandId : null,
		brandName: toStringValue(payload.brandName ?? brandRecord.name, ''),
		stockAvailable: Math.max(0, Math.trunc(toNumberValue(payload.stockAvailable, 0))),
		description: toStringValue(payload.description, ''),
		releaseDate: toStringValue(payload.releaseDate, '') || null,
		imageUrls: toStringArray(payload.imageUrls),
		specs: toSpecs(payload.specs)
	}
}

const toAdminProductUpdateResponse = (value: unknown): AdminProductUpdateResponse | null => {
	const payload = unwrapPayload(value)
	const id = Math.trunc(toNumberValue(payload.id, 0))

	if (id <= 0) {
		return null
	}

	const brandId = Math.trunc(toNumberValue(payload.brandId, 0))

	return {
		id,
		name: toStringValue(payload.name, ''),
		type: normalizeProductType(payload.type),
		basePrice: Math.max(0, toNumberValue(payload.basePrice, 0)),
		brandId: brandId > 0 ? brandId : null,
		stockAvailable: Math.max(0, Math.trunc(toNumberValue(payload.stockAvailable, 0))),
		releaseDate: toStringValue(payload.releaseDate, '') || null,
		updatedAt: toStringValue(payload.updatedAt, '') || null
	}
}

export const adminProductService = {
	async searchProducts(query: AdminProductSearchCriteria) {
		const products = await productService.searchProducts(query)

		return products.map((item): AdminProductSearchModel => ({
			id: item.id,
			name: item.name,
			type: normalizeProductType(item.type),
			brandName: item.brandName,
			basePrice: item.basePrice,
			inStock: item.inStock,
			stockAvailable: 0,
			imageUrl: item.imageUrl
		}))
	},

	async getProductById(productId: number) {
		const api = useApiClient()
		const response = await api<unknown>(`${PRODUCT_API_BASE}/${productId}`)
		const product = toAdminProductDetail(response)

		if (!product) {
			throw new Error('Unable to load product information.')
		}

		return product
	},

	async updateProductInfo(productId: number, request: AdminProductInfoUpdateRequest) {
		const api = useApiClient()
		const response = await api<unknown>(`${PRODUCT_API_BASE}/infoUpdate/${productId}`, {
			method: 'PATCH',
			body: request
		})

		return toAdminProductUpdateResponse(response)
	},

	async createProduct(request: AdminProductInfoUpdateRequest) {
		const api = useApiClient()

		try {
			const response = await api<unknown>(PRODUCT_API_BASE, {
				method: 'POST',
				body: request
			})

			return toAdminProductUpdateResponse(response)
		} catch (error) {
			if (!hasStatusCode(error, 404) && !hasStatusCode(error, 405)) {
				throw error
			}

			const fallbackResponse = await api<unknown>(`${PRODUCT_API_BASE}/create`, {
				method: 'POST',
				body: request
			})

			return toAdminProductUpdateResponse(fallbackResponse)
		}
	}
}
