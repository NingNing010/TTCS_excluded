import { defineStore } from 'pinia'
import { cartService } from '~/services/cart.service'
import { productService } from '~/services/product.service'
import { useAuthStore } from '~/stores/auth'
import type { CartItemModel, CartSummaryModel } from '~/types/cart'
import type { ProductCardModel } from '~/types/home'

interface CartStatus {
  loading: boolean
  refreshing: boolean
  adding: boolean
  saving: boolean
  error: string | null
}

interface RecommendationsStatus {
  loading: boolean
  error: string | null
}

const GUEST_ID_COOKIE = 'guest_id'
const GUEST_TTL_SECONDS = 7 * 24 * 60 * 60
const MAX_COUNT_PER_PRODUCT = 5

interface ProductMeta {
  name: string
  imageUrl: string
  unitPrice: number
  isFallback: boolean
}

const emptySummary = (): CartSummaryModel => ({
  itemCount: 0,
  totalQuantity: 0,
  subtotal: 0
})

const createGuestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const readGuestIdCookie = () => {
  const guestIdCookie = useCookie<string | null>(GUEST_ID_COOKIE, {
    default: () => null,
    maxAge: GUEST_TTL_SECONDS,
    sameSite: 'lax'
  })

  return {
    guestIdCookie,
    value: guestIdCookie.value
  }
}

export const useCartStore = defineStore('cart', {
  state: () => {
    const { value } = readGuestIdCookie()

    return {
      items: [] as CartItemModel[],
      productMeta: {} as Record<number, ProductMeta>,
      serverProducts: {} as Record<number, number>,
      draftProducts: {} as Record<number, number>,
      summary: emptySummary(),
      recommendations: [] as ProductCardModel[],
      recommendationsStatus: {
        loading: false,
        error: null
      } as RecommendationsStatus,
      guestId: value,
      loaded: false,
      status: {
        loading: false,
        refreshing: false,
        adding: false,
        saving: false,
        error: null
      } as CartStatus
    }
  },

  getters: {
    hasItems: (state) => state.summary.totalQuantity > 0,
    hasPendingChanges: (state) => {
      const productIds = new Set([
        ...Object.keys(state.serverProducts),
        ...Object.keys(state.draftProducts)
      ])

      return Array.from(productIds).some((id) => {
        const numericId = Number(id)
        return (state.draftProducts[numericId] || 0) !== (state.serverProducts[numericId] || 0)
      })
    }
  },

  actions: {
    upsertItem(productId: number, quantity: number) {
      const meta = this.productMeta[productId] || {
        name: `Product #${productId}`,
        imageUrl: '/placeholders/product.svg',
        unitPrice: 0,
        isFallback: true
      }

      const existing = this.items.find((item) => item.productId === productId)
      if (existing) {
        existing.name = meta.name
        existing.imageUrl = meta.imageUrl
        existing.unitPrice = meta.unitPrice
        existing.quantity = quantity
        existing.lineTotal = meta.unitPrice * quantity
        return
      }

      this.items.push({
        id: productId,
        productId,
        name: meta.name,
        imageUrl: meta.imageUrl,
        quantity,
        unitPrice: meta.unitPrice,
        lineTotal: meta.unitPrice * quantity
      })
    },

    syncItemsWithDraft() {
      const activeProductIds = Object.entries(this.draftProducts)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId]) => Number(productId))

      for (const productId of activeProductIds) {
        const quantity = this.draftProducts[productId] || 0
        this.upsertItem(productId, quantity)
      }

      this.items = this.items
        .filter((item) => (this.draftProducts[item.productId] || 0) > 0)
        .sort((a, b) => a.productId - b.productId)
    },

    recalculateSummary() {
      const totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0)
      this.summary = {
        itemCount: this.items.length,
        totalQuantity,
        subtotal: this.items.reduce((sum, item) => sum + item.lineTotal, 0)
      }
    },

    setDraftQuantity(productId: number, quantity: number) {
      const normalized = Math.max(0, Math.min(MAX_COUNT_PER_PRODUCT, Math.trunc(quantity)))
      this.draftProducts[productId] = normalized
      this.syncItemsWithDraft()
      this.recalculateSummary()
    },

    increaseItem(productId: number) {
      const current = this.draftProducts[productId] || 0
      this.setDraftQuantity(productId, current + 1)
    },

    decreaseItem(productId: number) {
      const current = this.draftProducts[productId] || 0
      this.setDraftQuantity(productId, current - 1)
    },

    async hydrateProductMeta(productIds: number[], force = false) {
      const targetProductIds = productIds.filter((productId) => {
        const meta = this.productMeta[productId]
        if (force) {
          return true
        }

        return !meta || meta.isFallback
      })

      if (targetProductIds.length === 0) {
        return
      }

      await Promise.all(
        targetProductIds.map(async (productId) => {
          try {
            const detail = await productService.getProductDetail(productId)
            this.productMeta[productId] = {
              name: detail.name,
              imageUrl: detail.imageUrls[0] || '/placeholders/product.svg',
              unitPrice: detail.basePrice,
              isFallback: false
            }
          } catch {
            this.productMeta[productId] = {
              name: `Product #${productId}`,
              imageUrl: '/placeholders/product.svg',
              unitPrice: 0,
              isFallback: true
            }
          }
        })
      )
    },

    async hydrateCartItemsFromProductDetails() {
      const productIds = Object.entries(this.draftProducts)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId]) => Number(productId))

      if (productIds.length === 0) {
        return
      }

      const hasFallbackMeta = productIds.some((productId) => this.productMeta[productId]?.isFallback)
      if (!hasFallbackMeta) {
        return
      }

      await this.hydrateProductMeta(productIds)
      this.syncItemsWithDraft()
      this.recalculateSummary()
    },

    ensureGuestId() {
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        return null
      }

      const { guestIdCookie, value } = readGuestIdCookie()
      if (value && value.length > 0) {
        this.guestId = value
        return value
      }

      const generated = createGuestId()
      guestIdCookie.value = generated
      this.guestId = generated

      return generated
    },

    clearGuestId() {
      const { guestIdCookie } = readGuestIdCookie()
      guestIdCookie.value = null
      this.guestId = null
    },

    async fetchCart(force = false) {
      if (this.status.loading || this.status.refreshing) {
        return
      }

      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) {
        this.ensureGuestId()
      }

      if (!force && this.loaded) {
        return
      }

      this.status.error = null
      this.status.loading = !this.loaded
      this.status.refreshing = this.loaded

      try {
        const data = await cartService.viewCart()

        const normalizedServerProducts = Object.entries(data.products).reduce<Record<number, number>>(
          (acc, [productId, quantity]) => {
            const numericId = Number(productId)
            const normalized = Math.max(0, Math.min(MAX_COUNT_PER_PRODUCT, Math.trunc(quantity)))
            if (numericId > 0 && normalized > 0) {
              acc[numericId] = normalized
            }
            return acc
          },
          {}
        )

        const productIds = Object.keys(normalizedServerProducts).map((id) => Number(id))
        this.serverProducts = normalizedServerProducts
        this.draftProducts = { ...normalizedServerProducts }

        // Always refresh product information immediately after viewCart.
        await this.hydrateProductMeta(productIds, true)
        this.syncItemsWithDraft()
        this.recalculateSummary()
        this.loaded = true
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
      } finally {
        this.status.loading = false
        this.status.refreshing = false
      }
    },

    async fetchRecommendations(limit = 10) {
      if (this.recommendationsStatus.loading) {
        return
      }

      const authStore = useAuthStore()
      const guestId = authStore.isAuthenticated ? null : this.ensureGuestId()

      this.recommendationsStatus.loading = true
      this.recommendationsStatus.error = null

      try {
        this.recommendations = await cartService.getRecommendations(limit, guestId)
      } catch (error) {
        this.recommendationsStatus.error = this.toRecommendationsError(error)
      } finally {
        this.recommendationsStatus.loading = false
      }
    },

    async addItem(productId: number, quantity = 1) {
      if (productId <= 0 || Number.isNaN(productId)) {
        this.status.error = 'Invalid product id.'
        return false
      }

      const normalizedQuantity = Math.trunc(quantity)
      if (!normalizedQuantity) {
        return true
      }

      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) {
        this.ensureGuestId()
      }

      this.status.adding = true
      this.status.error = null

      try {
        await cartService.updateCart({
          products: {
            [productId]: normalizedQuantity
          }
        })

        await this.fetchCart(true)
        return true
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        return false
      } finally {
        this.status.adding = false
      }
    },

    async saveChanges() {
      if (this.status.saving || !this.hasPendingChanges) {
        return true
      }

      const productIds = new Set([
        ...Object.keys(this.serverProducts),
        ...Object.keys(this.draftProducts)
      ])

      const deltas = Array.from(productIds).reduce<Record<number, number>>((acc, id) => {
        const productId = Number(id)
        const current = this.serverProducts[productId] || 0
        const target = this.draftProducts[productId] || 0
        const delta = target - current

        if (delta !== 0) {
          acc[productId] = delta
        }

        return acc
      }, {})

      if (Object.keys(deltas).length === 0) {
        return true
      }

      this.status.saving = true
      this.status.error = null

      try {
        await cartService.updateCart({ products: deltas })
        await this.fetchCart(true)
        return true
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        return false
      } finally {
        this.status.saving = false
      }
    },

    toErrorMessage(error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
          return message
        }
      }

      return 'Unable to update cart.'
    },

    toRecommendationsError(error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
          return message
        }
      }

      return 'Unable to load cart recommendations.'
    }
  }
})
