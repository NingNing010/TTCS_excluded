import { useApiClient } from '~/composables/useApiClient'
import type { WarrantyCheckResponse } from '~/types/api'

export const warrantyService = {
  async checkWarranty(orderId: number) {
    const api = useApiClient()

    return api<WarrantyCheckResponse>(`/api/orders/${orderId}/warrantyCheck`, {
      method: 'GET'
    })
  }
}
