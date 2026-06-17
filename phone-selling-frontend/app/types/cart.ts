export interface CartItemModel {
  id: number
  productId: number
  name: string
  imageUrl: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface CartSummaryModel {
  itemCount: number
  totalQuantity: number
  subtotal: number
}
