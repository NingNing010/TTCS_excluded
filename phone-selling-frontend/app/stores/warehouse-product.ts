import { defineStore } from 'pinia'
import { warehouseProductService } from '~/services/warehouse-product.service'
import type { WarehouseProductDetailModel, WarehouseProductSearchCriteria, WarehouseProductSearchModel } from '~/types/warehouse-product'

interface WarehouseProductSearchStatus {
  loading: boolean
  error: string | null
}

interface WarehouseProductDetailStatus {
  loading: boolean
  updating: boolean
  error: string | null
  success: string | null
}

export const useWarehouseProductStore = defineStore('warehouse-product', {
  state: () => ({
    searchResults: [] as WarehouseProductSearchModel[],
    searchStatus: {
      loading: false,
      error: null
    } as WarehouseProductSearchStatus,
    currentProduct: null as WarehouseProductDetailModel | null,
    currentProductId: null as number | null,
    detailStatus: {
      loading: false,
      updating: false,
      error: null,
      success: null
    } as WarehouseProductDetailStatus
  }),

  actions: {
    clearSearchError() {
      this.searchStatus.error = null
    },

    clearDetailMessages() {
      this.detailStatus.error = null
      this.detailStatus.success = null
    },

    clearDetailState() {
      this.currentProduct = null
      this.currentProductId = null
      this.clearDetailMessages()
    },

    async searchProducts(query: WarehouseProductSearchCriteria) {
      this.searchStatus.loading = true
      this.searchStatus.error = null

      try {
        this.searchResults = await warehouseProductService.searchProducts(query)
      } catch (error) {
        this.searchResults = []
        this.searchStatus.error = this.toErrorMessage(error)
      } finally {
        this.searchStatus.loading = false
      }
    },

    async fetchProductById(productId: number) {
      if (productId <= 0 || Number.isNaN(productId)) {
        this.clearDetailState()
        this.detailStatus.error = 'Invalid product id.'
        return null
      }

      this.detailStatus.loading = true
      this.clearDetailMessages()

      try {
        const product = await warehouseProductService.getProductById(productId)
        this.currentProduct = product
        this.currentProductId = productId
        return product
      } catch (error) {
        this.currentProduct = null
        this.currentProductId = null
        this.detailStatus.error = this.toErrorMessage(error)
        return null
      } finally {
        this.detailStatus.loading = false
      }
    },

    async updateProductStock(quantity: number, increase: boolean) {
      if (this.detailStatus.updating) {
        return false
      }

      if (!this.currentProduct || this.currentProduct.id <= 0) {
        this.detailStatus.error = 'Product detail is not available.'
        return false
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        this.detailStatus.error = 'Invalid quantity.'
        return false
      }

      this.detailStatus.updating = true
      this.clearDetailMessages()

      try {
        const productId = this.currentProduct.id
        await warehouseProductService.updateProductStock(this.currentProduct, quantity, increase)
        const refreshedProduct = await this.fetchProductById(productId)
        if (!refreshedProduct) {
          if (!this.detailStatus.error) {
            this.detailStatus.error = 'Product stock was updated, but product details could not be refreshed.'
          }

          return false
        }

        this.detailStatus.success = 'Product stock updated successfully.'
        return true
      } catch (error) {
        this.detailStatus.error = this.toErrorMessage(error)
        return false
      } finally {
        this.detailStatus.updating = false
      }
    },

    toErrorMessage(error: unknown) {
      if (error && typeof error === 'object') {
        const raw = error as {
          message?: unknown
          statusCode?: unknown
          response?: { status?: unknown; _data?: unknown } | undefined
          data?: unknown
        }

        const statusCode =
          (typeof raw.statusCode === 'number' ? raw.statusCode : null) ??
          (typeof raw.response?.status === 'number' ? raw.response.status : null)

        if (statusCode === 401 || statusCode === 403) {
          return 'Your session has expired or you are not authorized. Please sign in as warehouse staff again.'
        }

        const payload = raw.data ?? raw.response?._data
        if (payload && typeof payload === 'object') {
          const apiMessage = (payload as { message?: unknown }).message
          if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
            return apiMessage
          }
        }

        if (typeof raw.message === 'string' && raw.message.length > 0) {
          return raw.message
        }
      }

      return 'Unable to process warehouse product request.'
    }
  }
})
