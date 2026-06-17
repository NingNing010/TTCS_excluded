import { useApiClient } from '~/composables/useApiClient'
import type { OrderRequest, OrderResponse, OrderStatusResponse, PurchaseHistoryResponse, CancelOrderRequest } from '~/types/api'

export const orderService = {
  async placeOrder(payload: OrderRequest) {
    const api = useApiClient()

    return api<OrderResponse>('/api/orders/place', {
      method: 'POST',
      body: payload
    })
  },

  async lookupOrderStatus(phone: string, orderId: number) {
    const api = useApiClient()

    return api<OrderStatusResponse>('/api/orders/status', {
      method: 'GET',
      query: { phone, orderId }
    })
  },

  async getPurchaseHistory(page: number, size: number) {
    const api = useApiClient()

    return api<PurchaseHistoryResponse>('/api/orders/history', {
      method: 'GET',
      query: { page, size }
    })
  },

  async cancelOrder(orderId: number, payload: CancelOrderRequest) {
    const api = useApiClient()

    return api<OrderResponse>(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      body: payload
    })
  }
}
