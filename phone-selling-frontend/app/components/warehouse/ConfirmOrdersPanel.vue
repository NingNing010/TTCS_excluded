<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { useWarehouseOrderStore } from '~/stores/warehouse-order'
import type { WarehouseOrderModel } from '~/types/warehouse-order'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const warehouseOrderStore = useWarehouseOrderStore()
const { orders, status } = storeToRefs(warehouseOrderStore)

const hasOrders = computed(() => orders.value.length > 0)

const orderStatusLabel = (order: WarehouseOrderModel) => {
  if (order.status === 'CONFIRMED') {
    return t('warehouseHome.confirmPanel.statusConfirmed')
  }

  return t('warehouseHome.confirmPanel.statusPending')
}

const confirmButtonLabel = (order: WarehouseOrderModel) => {
  if (status.value.confirmingId === order.id) {
    return t('warehouseHome.confirmPanel.confirming')
  }

  return t('warehouseHome.confirmPanel.confirmAction')
}

const handleConfirmOrder = async (orderId: number) => {
  await warehouseOrderStore.confirmOrder(orderId)
}

onMounted(() => {
  warehouseOrderStore.fetchOrders()
})
</script>

<template>
  <section class="surface-card confirm-orders-panel">
    <div class="confirm-orders-head">
      <div>
        <h1 class="confirm-orders-title">{{ t('warehouseHome.features.confirmOrders.title') }}</h1>
        <p class="confirm-orders-subtitle">{{ t('warehouseHome.features.confirmOrders.description') }}</p>
      </div>

      <button
        type="button"
        class="confirm-orders-refresh"
        :disabled="status.loading || status.confirmingId !== null"
        @click="warehouseOrderStore.fetchOrders()"
      >
        {{ t('warehouseHome.confirmPanel.refreshAction') }}
      </button>
    </div>

    <p v-if="status.loading && !hasOrders" class="confirm-orders-state">
      {{ t('warehouseHome.confirmPanel.loading') }}
    </p>
    <p v-else-if="status.error" class="confirm-orders-error">{{ status.error }}</p>
    <p v-else-if="!hasOrders" class="confirm-orders-state">
      {{ t('warehouseHome.confirmPanel.empty') }}
    </p>

    <div v-else class="confirm-orders-list">
      <article v-for="order in orders" :key="order.id" class="confirm-order-card">
        <div class="confirm-order-head">
          <p class="confirm-order-code">#{{ order.id }}</p>
          <span class="confirm-order-badge" :class="{ 'is-confirmed': order.status === 'CONFIRMED' }">
            {{ orderStatusLabel(order) }}
          </span>
        </div>

        <div class="confirm-order-meta">
          <p>
            <strong>{{ t('warehouseHome.confirmPanel.createdAt') }}:</strong>
            {{ order.createdAt ? formatDate(order.createdAt) : '-' }}
          </p>
          <p>
            <strong>{{ t('warehouseHome.confirmPanel.totalAmount') }}:</strong>
            {{ formatCurrency(order.totalAmount) }}
          </p>
          <p>
            <strong>{{ t('warehouseHome.confirmPanel.customerName') }}:</strong>
            {{ order.customerName || '-' }}
          </p>
          <p>
            <strong>{{ t('warehouseHome.confirmPanel.customerPhone') }}:</strong>
            {{ order.customerPhone || '-' }}
          </p>
          <p>
            <strong>{{ t('warehouseHome.confirmPanel.shippingAddress') }}:</strong>
            {{ order.shipAtStore ? t('warehouseHome.confirmPanel.pickupAtStore') : (order.shippingAddress || '-') }}
          </p>
        </div>

        <details class="confirm-order-products">
          <summary>
            {{ t('warehouseHome.confirmPanel.productsSummary', { count: order.items.length }) }}
          </summary>

          <ul class="confirm-order-products-list">
            <li v-for="item in order.items" :key="`${order.id}-${item.productId}-${item.productName}`" class="confirm-order-product-row">
              <span>{{ item.productName }}</span>
              <strong>x{{ item.quantity }}</strong>
            </li>
          </ul>
        </details>

        <button
          type="button"
          class="confirm-order-action"
          :disabled="status.confirmingId === order.id"
          @click="handleConfirmOrder(order.id)"
        >
          {{ confirmButtonLabel(order) }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.confirm-orders-panel {
  margin-top: 1.1rem;
  padding: clamp(1rem, 2.4vw, 1.8rem);
}

.confirm-orders-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.confirm-orders-title {
  margin: 0;
  font-size: clamp(1.25rem, 2.2vw, 1.8rem);
  font-weight: 800;
}

.confirm-orders-subtitle {
  margin: 0.45rem 0 0;
  color: #475569;
}

.confirm-orders-refresh {
  border: 1px solid rgba(31, 94, 255, 0.3);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.1rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.confirm-orders-refresh:disabled,
.confirm-order-action:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.confirm-orders-state,
.confirm-orders-error {
  margin: 0.95rem 0 0;
  font-size: 0.84rem;
}

.confirm-orders-state {
  color: #475569;
}

.confirm-orders-error {
  color: #b42318;
}

.confirm-orders-list {
  margin-top: 0.95rem;
  display: grid;
  gap: 0.75rem;
}

.confirm-order-card {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 0.8rem;
  background: rgba(248, 250, 252, 0.7);
}

.confirm-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.confirm-order-code {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
}

.confirm-order-badge {
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  padding: 0.15rem 0.55rem;
  font-size: 0.74rem;
  font-weight: 800;
}

.confirm-order-badge.is-confirmed {
  background: rgba(15, 159, 110, 0.12);
  color: #0f9f6e;
}

.confirm-order-meta {
  margin-top: 0.65rem;
  display: grid;
  gap: 0.35rem;
}

.confirm-order-meta p {
  margin: 0;
  color: #334155;
  font-size: 0.84rem;
}

.confirm-order-products {
  margin-top: 0.75rem;
}

.confirm-order-products summary {
  cursor: pointer;
  color: #1f5eff;
  font-size: 0.84rem;
  font-weight: 700;
}

.confirm-order-products-list {
  list-style: none;
  margin: 0.55rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.confirm-order-product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  font-size: 0.84rem;
  color: #334155;
}

.confirm-order-action {
  margin-top: 0.75rem;
  border: 1px solid rgba(31, 94, 255, 0.35);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.2rem;
  padding: 0.4rem 0.85rem;
  font-size: 0.83rem;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 720px) {
  .confirm-orders-head {
    flex-direction: column;
  }
}
</style>
