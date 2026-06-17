import type { ProductCardModel } from '~/types/home'

export interface ProductSpecItem {
  key: string
  value: string
}

export interface ProductReviewModel {
  id: number
  userName: string
  star: number
  comment: string
  createdAt: string
}

export interface ProductDetailModel {
  id: number
  name: string
  type: string
  basePrice: number
  brandName: string
  description: string
  releaseDate: string | null
  imageUrls: string[]
  inStock: boolean
  stockAvailable: number
  averageRating: number
  specs: ProductSpecItem[]
  reviews: ProductReviewModel[]
  relatedProducts: ProductCardModel[]
}
