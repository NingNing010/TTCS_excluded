import { defineStore } from 'pinia'
import { warehouseOrderService } from '~/services/warehouse-order.service'
import type {
  WarehouseOrderItemModel,
  WarehouseOrderModel,
  WarehouseOrderStatusUpdatePayload,
  WarehouseOrderStatusValue
} from '~/types/warehouse-order'

interface WarehouseOrderStatus {
  loading: boolean
  confirmingId: number | null
  error: string | null
}

interface WarehouseOrderDetailStatus {
  loading: boolean
  updating: boolean
  error: string | null
  success: string | null
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return {}
}

const toStringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

const toNumberValue = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = Number(value)
    if (Number.isFinite(normalized)) {
      return normalized
    }
  }

  return fallback
}

const toBooleanValue = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true
    }

    if (value === 'false') {
      return false
    }
  }

  return fallback
}

const normalizeOrderItem = (value: unknown): WarehouseOrderItemModel | null => {
  const rawItem = asRecord(value)
  const rawProduct = asRecord(rawItem.product)

  const productId = Math.max(0, Math.trunc(toNumberValue(rawProduct.id, 0)))
  const productName = toStringValue(rawProduct.name, `#${productId || 'N/A'}`)
  const quantity = Math.max(0, Math.trunc(toNumberValue(rawItem.quantity, 0)))
  const purchasedAtPrice = Math.max(0, toNumberValue(rawItem.purchasedAtPrice, 0))

  if (productId <= 0 && quantity <= 0 && productName.length === 0) {
    return null
  }

  return {
    productId,
    productName,
    quantity,
    purchasedAtPrice
  }
}

const normalizeOrderStatus = (value: unknown): WarehouseOrderStatusValue => {
  const normalized = toStringValue(value).toUpperCase()

  if (normalized === 'PENDING_PAYMENT') {
    return 'PENDING'
  }

  if (
    normalized === 'PENDING' ||
    normalized === 'CONFIRMED' ||
    normalized === 'DELIVERYING' ||
    normalized === 'SUCCESS' ||
    normalized === 'CANCELLED'
  ) {
    return normalized
  }

  return 'PENDING'
}

const normalizeOrder = (value: unknown): WarehouseOrderModel | null => {
  const rawOrder = asRecord(value)
  const orderId = Math.max(0, Math.trunc(toNumberValue(rawOrder.id, 0)))

  if (orderId <= 0) {
    return null
  }

  const rawUser = asRecord(rawOrder.user)
  const rawShippingAddress = asRecord(rawOrder.shippingAddress)
  const rawItems = Array.isArray(rawOrder.orderItems) ? rawOrder.orderItems : []

  const items = rawItems
    .map((item) => normalizeOrderItem(item))
    .filter((item): item is WarehouseOrderItemModel => Boolean(item))

  const customerName =
    toStringValue(rawUser.name) ||
    toStringValue(rawUser.fullName) ||
    toStringValue(rawUser.username) ||
    toStringValue(rawShippingAddress.recipientName)

  const customerPhone =
    toStringValue(rawUser.phone) ||
    toStringValue(rawShippingAddress.recipientPhone)

  return {
    id: orderId,
    status: normalizeOrderStatus(rawOrder.status),
    createdAt: toStringValue(rawOrder.createdAt),
    totalAmount: Math.max(0, toNumberValue(rawOrder.totalAmount, 0)),
    shipAtStore: toBooleanValue(rawOrder.shipAtStore, false),
    paymentMethod: toStringValue(rawOrder.paymentMethod),
    customerName,
    customerPhone,
    shippingAddress: toStringValue(rawShippingAddress.address),
    items
  }
}

const sortOrders = (orders: WarehouseOrderModel[]) => {
  return [...orders].sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return right - left
  })
}

const toOrderArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value
  }

  const payload = asRecord(value)
  const arrayCandidates = [
    payload.content,
    payload.data,
    payload.results,
    payload.orders,
    payload.items
  ]

  for (const candidate of arrayCandidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

export const useWarehouseOrderStore = defineStore('warehouse-order', {
  state: () => ({
    orders: [] as WarehouseOrderModel[],
    currentOrder: null as WarehouseOrderModel | null,
    status: {
      loading: false,
      confirmingId: null,
      error: null
    } as WarehouseOrderStatus,
    detailStatus: {
      loading: false,
      updating: false,
      error: null,
      success: null
    } as WarehouseOrderDetailStatus
  }),

  actions: {
    clearCurrentOrder() {
      this.currentOrder = null
      this.detailStatus.error = null
      this.detailStatus.success = null
    },

    async fetchOrders() {
      this.status.loading = true
      this.status.error = null

      try {
        const response = await warehouseOrderService.getUnconfirmedOrders()
        const normalizedOrders = toOrderArray(response)
          .map((order) => normalizeOrder(order))
          .filter((order): order is WarehouseOrderModel => Boolean(order))

        this.orders = sortOrders(normalizedOrders)
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
      } finally {
        this.status.loading = false
      }
    },

    async fetchOrderById(orderId: number) {
      this.detailStatus.loading = true
      this.detailStatus.error = null
      this.detailStatus.success = null

      try {
        const response = await warehouseOrderService.getOrderById(orderId)
        const normalizedOrder = normalizeOrder(response)

        if (!normalizedOrder) {
          this.currentOrder = null
          this.detailStatus.error = 'Unable to read order details.'
          return null
        }

        this.currentOrder = normalizedOrder
        return normalizedOrder
      } catch (error) {
        this.currentOrder = null
        this.detailStatus.error = this.toErrorMessage(error)
        return null
      } finally {
        this.detailStatus.loading = false
      }
    },

    async confirmOrder(orderId: number) {
      if (this.status.confirmingId) {
        return false
      }

      this.status.confirmingId = orderId
      this.status.error = null

      try {
        await warehouseOrderService.confirmOrder(orderId)
        await this.fetchOrders()
        return true
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        return false
      } finally {
        this.status.confirmingId = null
      }
    },

    async updateOrderStatus(payload: WarehouseOrderStatusUpdatePayload) {
      if (this.detailStatus.updating) {
        return false
      }

      this.detailStatus.updating = true
      this.detailStatus.error = null
      this.detailStatus.success = null

      try {
        const response = await warehouseOrderService.updateOrderStatus(payload)
        const normalizedStatus = normalizeOrderStatus(response.status)

        if (this.currentOrder && this.currentOrder.id === payload.orderId) {
          this.currentOrder.status = normalizedStatus
        }

        this.detailStatus.success = 'Order status updated successfully.'
        await this.fetchOrders()
        return true
      } catch (error) {
        this.detailStatus.error = this.toErrorMessage(error)
        return false
      } finally {
        this.detailStatus.updating = false
      }
    },

    toErrorMessage(error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
          return message
        }
      }

      return 'Unable to process warehouse order request.'
    }
  }
})
