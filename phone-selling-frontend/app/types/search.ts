export interface ProductSearchQuery {
  keyword: string
  type?: string
  brandName?: string
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
  storage?: string
  ram?: string
  screenType?: string
  scanFrequency?: string
  sortBy?: string
  page?: number
  size?: number
}

export interface ProductSearchResponse {
  id?: number | string | null
  mysqlId?: number | string | null
  name?: string | null
  type?: string | null
  basePrice?: number | null
  brandName?: string | null
  inStock?: boolean | null
  imageUrl?: string | null
}
