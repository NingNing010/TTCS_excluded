import type { ProductSearchQuery } from '~/types/search'

export type ProductType = 'PHONE' | 'CASE' | 'CHARGER' | 'CABLE'

export interface AdminProductSearchModel {
  id: number
  name: string
  type: ProductType
  brandName: string
  basePrice: number
  inStock: boolean
  stockAvailable: number
  imageUrl: string | null
}

export interface AdminProductSpecItem {
  key: string
  value: string
}

export interface AdminProductDetailModel {
  id: number
  name: string
  type: ProductType
  basePrice: number
  brandId: number | null
  brandName: string
  stockAvailable: number
  description: string
  releaseDate: string | null
  imageUrls: string[]
  specs: AdminProductSpecItem[]
}

export interface AdminProductUpdateResponse {
  id: number
  name: string
  type: ProductType
  basePrice: number
  brandId: number | null
  stockAvailable: number
  releaseDate: string | null
  updatedAt: string | null
}

export interface AdminProductInfoUpdateRequest {
  name: string
  type: ProductType
  basePrice: number
  brandId: number
  stockAvailable: number
  specs?: Record<string, string>
  description?: string
  releaseDate?: string
  imageUrls?: string[]
}

export interface AdminProductSearchCriteria extends ProductSearchQuery {}
