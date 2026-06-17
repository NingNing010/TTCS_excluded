import { defineStore } from 'pinia'
import { shippingAddressService } from '~/services/shipping-address.service'
import type { ShippingAddressRequest, ShippingAddressResponse } from '~/types/api'

interface ShippingAddressStatus {
  loading: boolean
  submitting: boolean
  deletingId: number | null
  error: string | null
}

const sortAddresses = (addresses: ShippingAddressResponse[]) => {
  return [...addresses].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export const useShippingAddressStore = defineStore('shipping-address', {
  state: () => ({
    addresses: [] as ShippingAddressResponse[],
    status: {
      loading: false,
      submitting: false,
      deletingId: null,
      error: null
    } as ShippingAddressStatus
  }),

  getters: {
    defaultAddress: (state) => state.addresses.find((address) => address.isDefault) || null
  },

  actions: {
    setAddresses(addresses: ShippingAddressResponse[]) {
      this.addresses = sortAddresses(addresses)
    },

    async fetchAddresses() {
      this.status.loading = true
      this.status.error = null

      try {
        const response = await shippingAddressService.getAddresses()
        this.setAddresses(response)
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
      } finally {
        this.status.loading = false
      }
    },

    async createAddress(payload: ShippingAddressRequest) {
      this.status.submitting = true
      this.status.error = null

      try {
        const response = await shippingAddressService.createAddress(payload)
        this.setAddresses(response)
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        throw error
      } finally {
        this.status.submitting = false
      }
    },

    async updateAddress(addressId: number, payload: ShippingAddressRequest) {
      this.status.submitting = true
      this.status.error = null

      try {
        const response = await shippingAddressService.updateAddress(addressId, payload)
        this.setAddresses(response)
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        throw error
      } finally {
        this.status.submitting = false
      }
    },

    async deleteAddress(addressId: number) {
      this.status.deletingId = addressId
      this.status.error = null

      try {
        const response = await shippingAddressService.deleteAddress(addressId)
        this.setAddresses(response)
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        throw error
      } finally {
        this.status.deletingId = null
      }
    },

    toErrorMessage(error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
          return message
        }
      }

      return 'Unable to process shipping address request.'
    }
  }
})
