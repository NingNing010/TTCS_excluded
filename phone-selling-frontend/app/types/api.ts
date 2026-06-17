export type PromoDiscountType = 'PERCENT' | 'FIXED'

export interface HomeProductResponse {
  id: number
  name: string
  basePrice: number
  type: string
  brandName: string
  imageUrl: string
  inStock: boolean
}

export interface BrandResponse {
  id: number
  name: string
  logoImageUrls?: Record<string, unknown> | null
}

export interface PromoResponse {
  id: number
  name: string
  description: string
  startDate: string
  endDate: string
  discountType: PromoDiscountType
  discountValue: number
  voucherCode: string
  usageLimit?: number
  usageCount?: number
  maxDiscountMoneyPerOrder?: number | null
  promoImageUrls?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface PromoCreationRequest {
  name: string
  description: string
  startDate: string
  endDate: string
  discountType: PromoDiscountType
  discountValue: number
  voucherCode: string
  usageLimit: number
  promoImageUrls: Record<string, unknown>
  productIds: number[]
}

export interface StatisticsRequest {
  startDate: string
  endDate: string
}

export interface RevenueByDayItem {
  day: string
  revenue: number
}

export interface TotalRevenueItem {
  totalRevenue: number
}

export interface TopPurchasedProductItem {
  productId: number
  productName: string
  totalPurchased: number
}

export interface TopPaidOrderItem {
  orderId: number
  paidAmount: number
  status: string
  createdAt: string
}

export interface OrderRateItem {
  status: string
  count: number
  rate: number
}

export interface LowSellingNewProductItem {
  productId: number
  productName: string
  releaseDate: string
  soldQuantity: number
}

export interface StatisticsResponse {
  revenueByDay: RevenueByDayItem[]
  totalRevenue: TotalRevenueItem[]
  topPurchasedProducts: TopPurchasedProductItem[]
  topPaidOrders: TopPaidOrderItem[]
  orderRates: OrderRateItem[]
  lowSellingNewProducts: LowSellingNewProductItem[]
}

export interface RatingResponse {
  ratingId: number
  productId: number
  productName: string
  userId: number
  userName: string
  star: string
  comment?: string | null
  hidden?: boolean
  hideReason?: string | null
  createdAt: string
  updatedAt: string
}

export interface RatingRequest {
  productId: number
  star: string
  comment?: string
}

export interface RatingModerationRequest {
  hidden: boolean
  hideReason?: string
}

export interface ProductDetailResponse {
  id: number
  name: string
  type: string
  basePrice: number
  brandName: string
  specs?: Record<string, unknown> | null
  description?: string | null
  releaseDate?: string | null
  imageUrls?: string[] | null
  inStock: boolean
  stockAvailable?: number | null
  averageRating?: number | null
  reviews?: RatingResponse[] | null
  relatedProducts?: RelatedProductResponse[] | null
}

export interface RelatedProductResponse {
  id?: number | string | null
  mysqlId?: number | string | null
  name?: string | null
  type?: string | null
  basePrice?: number | null
  brandName?: string | null
  inStock?: boolean | null
  imageUrl?: string | null
  imageUrls?: unknown
}

export type ProductDocumentResponse = RelatedProductResponse

export type AuthRole = 'USER' | 'ADMIN' | 'WAREHOUSE_STAFF'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  jwtToken: string
  role: AuthRole
  name: string
}

export interface RegisterRequest {
  email: string
  name: string
  phone?: string
  password: string
  confirmation: string
}

export interface CartDto {
  products: Record<number, number>
}

export interface ShippingAddressRequest {
  recipientName: string
  recipientPhone: string
  address: string
  isDefault: boolean
}

export interface ShippingAddressResponse {
  id: number
  recipientName: string
  recipientPhone: string
  address: string
  isDefault: boolean
  createdAt: string
}

export type OrderStatus =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'DELIVERYING'
  | 'SUCCESS'
  | 'CONFIRMED'
  | 'CANCELLED'

export interface OrderRequest {
  shipAtStore: boolean
  shippingAddressId: number
  paymentMethod: 0 | 1
  promoCode?: string
}

export interface OrderResponse {
  orderId: number
  paymentUrl?: string | null
  status: OrderStatus
}

export interface OrderItemResponse {
  productId: number
  productName: string
  quantity: number
  brandName?: string
  thumbnailUrl?: string
  rating?: number
  unitPrice?: number
  totalPrice?: number
  purchasedAtPrice?: number
}

export interface WarrantyCheckItem {
  item: OrderItemResponse
  warrantyEnd: string
}

export type WarrantyCheckResponse = WarrantyCheckItem[]

export interface OrderStatusResponse {
  orderId: number
  phone: string
  status: OrderStatus
  paymentMethod: string
  shipAtStore: boolean
  trackingNumber: string | null
  cancelReason: string | null
  totalAmount: number
  discountAmount: number
  createdAt: string
  updatedAt: string
  recipientName: string
  recipientPhone: string
  address: string
  items: OrderItemResponse[]
}

export interface CancelOrderRequest {
  cancelReason: string
}

export interface PurchaseHistoryItemResponse {
  orderId: number
  orderDate: string
  status: OrderStatus
  totalAmount: number
  discountAmount: number
  paymentMethod: string
  trackingNumber: string | null
  items: OrderItemResponse[]
}

export interface PurchaseHistoryResponse {
  content: PurchaseHistoryItemResponse[]
  currentPage: number
  totalPages: number
  totalElements: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}
