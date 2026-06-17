export type WarehouseOrderStatusValue =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'DELIVERYING'
  | 'SUCCESS'
  | 'CANCELLED'

export interface WarehouseOrderItemModel {
  productId: number
  productName: string
  quantity: number
  purchasedAtPrice: number
}

export interface WarehouseOrderModel {
  id: number
  status: WarehouseOrderStatusValue
  createdAt: string
  totalAmount: number
  shipAtStore: boolean
  paymentMethod: string
  customerName: string
  customerPhone: string
  shippingAddress: string
  items: WarehouseOrderItemModel[]
}

export interface WarehouseOrderStatusUpdatePayload {
  orderId: number
  status: 'DELIVERYING' | 'SUCCESS' | 'CANCELLED'
  cancelReason?: string
}
