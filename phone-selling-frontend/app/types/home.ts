import type { PromoDiscountType } from '~/types/api'

export interface ProductCardModel {
  id: number
  name: string
  basePrice: number
  type: string
  brandName: string
  imageUrl: string | null
  inStock: boolean
}

export interface BrandModel {
  id: number
  name: string
  logoUrl: string | null
}

export interface PromotionModel {
  id: number
  name: string
  description: string
  discountType: PromoDiscountType
  discountValue: number
  voucherCode: string
  imageUrl: string | null
  endDate: string
}
