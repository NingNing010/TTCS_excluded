import type { ProductSearchQuery } from '~/types/search'

export interface WarehouseProductSearchModel {
  id: number
  name: string
  type: string
  brandName: string
  basePrice: number
  inStock: boolean
  imageUrl: string | null
}

export interface WarehouseProductDetailModel {
  id: number
  name: string
  type: string
  basePrice: number
  brandName: string
  brandId: number | null
  stockAvailable: number
  inStock: boolean
  releaseDate: string | null
}

export interface WarehouseProductStockUpdateRequest {
  name?: string
  type?: string
  basePrice?: number
  brandId?: number
  stockAvailable: number
}

export interface WarehouseProductSearchCriteria extends ProductSearchQuery {}
