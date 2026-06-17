import { useApiClient } from '~/composables/useApiClient'
import type { ShippingAddressRequest, ShippingAddressResponse } from '~/types/api'

const API_BASE = '/api/users/addresses'

export const shippingAddressService = {
  async getAddresses() {
    const api = useApiClient()
    return api<ShippingAddressResponse[]>(API_BASE)
  },

  async createAddress(payload: ShippingAddressRequest) {
    const api = useApiClient()
    return api<ShippingAddressResponse[]>(API_BASE, {
      method: 'POST',
      body: payload
    })
  },

  async updateAddress(addressId: number, payload: ShippingAddressRequest) {
    const api = useApiClient()
    return api<ShippingAddressResponse[]>(`${API_BASE}/${addressId}`, {
      method: 'PUT',
      body: payload
    })
  },

  async deleteAddress(addressId: number) {
    const api = useApiClient()
    return api<ShippingAddressResponse[]>(`${API_BASE}/${addressId}`, {
      method: 'DELETE'
    })
  }
}
