import { useApiClient } from '~/composables/useApiClient'
import type { OrderResponse } from '~/types/api'
import type { WarehouseOrderStatusUpdatePayload } from '~/types/warehouse-order'

const API_BASE = '/api/orders'

export const warehouseOrderService = {
  async getUnconfirmedOrders() {
    const api = useApiClient()
    return api<unknown[]>(API_BASE)
  },

  async getOrderById(orderId: number) {
    const api = useApiClient()
    return api<unknown>(`${API_BASE}/${orderId}`)
  },

  async confirmOrder(orderId: number) {
    const api = useApiClient()
    await api<void>(`${API_BASE}/${orderId}/confirm`, {
      method: 'POST'
    })
  },

  async updateOrderStatus(payload: WarehouseOrderStatusUpdatePayload) {
    const api = useApiClient()
    return api<OrderResponse>(`${API_BASE}/statusUpdate`, {
      method: 'POST',
      body: payload
    })
  }
}
