import { defineStore } from 'pinia'
import { productService } from '~/services/product.service'
import type { ProductDetailModel } from '~/types/product'

interface ProductDetailStatus {
  loading: boolean
  error: string | null
}

export const useProductStore = defineStore('product', {
  state: () => ({
    detail: null as ProductDetailModel | null,
    currentProductId: null as number | null,
    status: {
      loading: false,
      error: null
    } as ProductDetailStatus
  }),

  actions: {
    async fetchProductDetail(productId: number, force = false) {
      if (productId <= 0 || Number.isNaN(productId)) {
        this.detail = null
        this.currentProductId = null
        this.status.error = 'Invalid product id.'
        return
      }

      if (!force && this.currentProductId === productId && this.detail) {
        return
      }

      this.status.loading = true
      this.status.error = null

      try {
        this.detail = await productService.getProductDetail(productId)
        this.currentProductId = productId
      } catch (error) {
        this.detail = null
        this.currentProductId = null
        this.status.error = this.toErrorMessage(error)
      } finally {
        this.status.loading = false
      }
    },

    toErrorMessage(error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
          return message
        }
      }

      return 'Unable to load product details from server.'
    }
  }
})
