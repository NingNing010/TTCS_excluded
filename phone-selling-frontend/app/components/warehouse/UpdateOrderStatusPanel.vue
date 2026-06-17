<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { useWarehouseOrderStore } from '~/stores/warehouse-order'
import type { WarehouseOrderStatusUpdatePayload, WarehouseOrderStatusValue } from '~/types/warehouse-order'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const warehouseOrderStore = useWarehouseOrderStore()
const { currentOrder, detailStatus } = storeToRefs(warehouseOrderStore)

const form = reactive({
  orderIdInput: '',
  nextStatus: '' as '' | WarehouseOrderStatusUpdatePayload['status'],
  cancelReason: ''
})

const localError = ref('')

const orderStatusLabel = (status: WarehouseOrderStatusValue) => {
  if (status === 'PENDING' || status === 'PENDING_PAYMENT') {
    return t('warehouseHome.orderStatuses.pending')
  }

  if (status === 'CONFIRMED') {
    return t('warehouseHome.orderStatuses.confirmed')
  }

  if (status === 'DELIVERYING') {
    return t('warehouseHome.orderStatuses.deliverying')
  }

  if (status === 'SUCCESS') {
    return t('warehouseHome.orderStatuses.success')
  }

  return t('warehouseHome.orderStatuses.cancelled')
}

const lookupDisabled = computed(() => detailStatus.value.loading || detailStatus.value.updating)

const allowedTransitions = computed<Array<{ value: WarehouseOrderStatusUpdatePayload['status']; label: string }>>(() => {
  const status = currentOrder.value?.status

  if (status === 'PENDING' || status === 'PENDING_PAYMENT') {
    return [
      {
        value: 'DELIVERYING',
        label: t('warehouseHome.orderStatuses.deliverying')
      }
    ]
  }

  if (status === 'DELIVERYING') {
    return [
      {
        value: 'SUCCESS',
        label: t('warehouseHome.orderStatuses.success')
      },
      {
        value: 'CANCELLED',
        label: t('warehouseHome.orderStatuses.cancelled')
      }
    ]
  }

  return []
})

const selectedOrderStatusLabel = computed(() => {
  if (!currentOrder.value) {
    return ''
  }

  return orderStatusLabel(currentOrder.value.status)
})

watch(
  allowedTransitions,
  (options) => {
    if (options.length === 0) {
      form.nextStatus = ''
      return
    }

    if (!options.some((option) => option.value === form.nextStatus)) {
      form.nextStatus = options[0].value
    }
  },
  { immediate: true }
)

const parseOrderId = () => {
  const orderId = Number(form.orderIdInput.trim())
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return null
  }

  return orderId
}

const handleLookupOrder = async () => {
  localError.value = ''
  detailStatus.value.success = null

  const orderId = parseOrderId()
  if (!orderId) {
    localError.value = t('warehouseHome.statusUpdatePanel.invalidOrderId')
    return
  }

  await warehouseOrderStore.fetchOrderById(orderId)
}

const handleUpdateStatus = async () => {
  localError.value = ''
  detailStatus.value.success = null

  if (!currentOrder.value) {
    localError.value = t('warehouseHome.statusUpdatePanel.lookupHint')
    return
  }

  if (!form.nextStatus) {
    localError.value = t('warehouseHome.statusUpdatePanel.statusRequired')
    return
  }

  if (form.nextStatus === 'CANCELLED' && form.cancelReason.trim().length === 0) {
    localError.value = t('warehouseHome.statusUpdatePanel.cancelReasonRequired')
    return
  }

  const payload: WarehouseOrderStatusUpdatePayload = {
    orderId: currentOrder.value.id,
    status: form.nextStatus,
    cancelReason: form.nextStatus === 'CANCELLED' ? form.cancelReason.trim() : undefined
  }

  const updated = await warehouseOrderStore.updateOrderStatus(payload)
  if (updated) {
    form.cancelReason = ''
  }
}
</script>

<template>
  <section class="surface-card update-order-panel">
    <h1 class="update-order-title">{{ t('warehouseHome.features.updateOrderStatus.title') }}</h1>
    <p class="update-order-subtitle">{{ t('warehouseHome.statusUpdatePanel.lookupHint') }}</p>

    <form class="update-order-search" @submit.prevent="handleLookupOrder">
      <label class="update-order-label" for="order-id-input">
        {{ t('warehouseHome.statusUpdatePanel.lookupLabel') }}
      </label>
      <div class="update-order-search-row">
        <input
          id="order-id-input"
          v-model="form.orderIdInput"
          type="text"
          inputmode="numeric"
          class="update-order-input"
          :placeholder="t('warehouseHome.statusUpdatePanel.lookupPlaceholder')"
        />
        <button type="submit" class="update-order-search-btn" :disabled="lookupDisabled">
          {{ detailStatus.loading ? t('warehouseHome.statusUpdatePanel.lookuping') : t('warehouseHome.statusUpdatePanel.lookupAction') }}
        </button>
      </div>
    </form>

    <p v-if="localError" class="update-order-error">{{ localError }}</p>
    <p v-if="detailStatus.error" class="update-order-error">{{ detailStatus.error }}</p>
    <p v-if="detailStatus.success" class="update-order-success">{{ t('warehouseHome.statusUpdatePanel.success') }}</p>

    <article v-if="currentOrder" class="update-order-card">
      <div class="update-order-card-head">
        <p class="update-order-code">#{{ currentOrder.id }}</p>
        <span class="update-order-status">{{ selectedOrderStatusLabel }}</span>
      </div>

      <div class="update-order-meta">
        <p>
          <strong>{{ t('warehouseHome.confirmPanel.createdAt') }}:</strong>
          {{ currentOrder.createdAt ? formatDate(currentOrder.createdAt) : '-' }}
        </p>
        <p>
          <strong>{{ t('warehouseHome.confirmPanel.totalAmount') }}:</strong>
          {{ formatCurrency(currentOrder.totalAmount) }}
        </p>
        <p>
          <strong>{{ t('warehouseHome.confirmPanel.customerName') }}:</strong>
          {{ currentOrder.customerName || '-' }}
        </p>
        <p>
          <strong>{{ t('warehouseHome.confirmPanel.customerPhone') }}:</strong>
          {{ currentOrder.customerPhone || '-' }}
        </p>
      </div>

      <details class="update-order-products">
        <summary>
          {{ t('warehouseHome.confirmPanel.productsSummary', { count: currentOrder.items.length }) }}
        </summary>
        <ul class="update-order-products-list">
          <li
            v-for="item in currentOrder.items"
            :key="`${currentOrder.id}-${item.productId}-${item.productName}`"
            class="update-order-product-row"
          >
            <span>{{ item.productName }}</span>
            <strong>x{{ item.quantity }}</strong>
          </li>
        </ul>
      </details>

      <div class="update-order-form">
        <label class="update-order-label" for="next-status-select">
          {{ t('warehouseHome.statusUpdatePanel.nextStatusLabel') }}
        </label>
        <select id="next-status-select" v-model="form.nextStatus" class="update-order-select" :disabled="detailStatus.updating || allowedTransitions.length === 0">
          <option value="" disabled>{{ t('warehouseHome.statusUpdatePanel.nextStatusPlaceholder') }}</option>
          <option v-for="option in allowedTransitions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <label v-if="form.nextStatus === 'CANCELLED'" class="update-order-label" for="cancel-reason-input">
          {{ t('warehouseHome.statusUpdatePanel.cancelReasonLabel') }}
        </label>
        <textarea
          v-if="form.nextStatus === 'CANCELLED'"
          id="cancel-reason-input"
          v-model="form.cancelReason"
          rows="3"
          class="update-order-textarea"
          :placeholder="t('warehouseHome.statusUpdatePanel.cancelReasonPlaceholder')"
        />

        <p v-if="allowedTransitions.length === 0" class="update-order-info">
          {{ t('warehouseHome.statusUpdatePanel.noTransition') }}
        </p>

        <button
          type="button"
          class="update-order-submit"
          :disabled="detailStatus.updating || allowedTransitions.length === 0"
          @click="handleUpdateStatus"
        >
          {{ detailStatus.updating ? t('warehouseHome.statusUpdatePanel.updating') : t('warehouseHome.statusUpdatePanel.updateAction') }}
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.update-order-panel {
  margin-top: 1.1rem;
  padding: clamp(1rem, 2.4vw, 1.8rem);
}

.update-order-title {
  margin: 0;
  font-size: clamp(1.3rem, 2.3vw, 1.95rem);
  font-weight: 800;
}

.update-order-subtitle {
  margin: 0.45rem 0 0;
  color: #475569;
  font-size: 0.92rem;
}

.update-order-search {
  margin-top: 0.95rem;
}

.update-order-label {
  display: block;
  margin: 0 0 0.35rem;
  color: #334155;
  font-size: 0.84rem;
  font-weight: 700;
}

.update-order-search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.55rem;
}

.update-order-input,
.update-order-select,
.update-order-textarea {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 0.9rem;
  padding: 0.55rem 0.7rem;
}

.update-order-textarea {
  resize: vertical;
}

.update-order-search-btn,
.update-order-submit {
  border: 1px solid rgba(31, 94, 255, 0.3);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.2rem;
  padding: 0.4rem 0.85rem;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}

.update-order-search-btn:disabled,
.update-order-submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.update-order-error,
.update-order-success,
.update-order-info {
  margin: 0.75rem 0 0;
  font-size: 0.84rem;
}

.update-order-error {
  color: #b42318;
}

.update-order-success {
  color: #0f9f6e;
}

.update-order-info {
  color: #475569;
}

.update-order-card {
  margin-top: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 0.9rem;
  background: rgba(248, 250, 252, 0.75);
}

.update-order-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.update-order-code {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
}

.update-order-status {
  border-radius: 999px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  padding: 0.15rem 0.55rem;
  font-size: 0.74rem;
  font-weight: 800;
}

.update-order-meta {
  margin-top: 0.65rem;
  display: grid;
  gap: 0.35rem;
}

.update-order-meta p {
  margin: 0;
  color: #334155;
  font-size: 0.84rem;
}

.update-order-products {
  margin-top: 0.75rem;
}

.update-order-products summary {
  cursor: pointer;
  color: #1f5eff;
  font-size: 0.84rem;
  font-weight: 700;
}

.update-order-products-list {
  list-style: none;
  margin: 0.55rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.update-order-product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  color: #334155;
  font-size: 0.84rem;
}

.update-order-form {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.55rem;
}

@media (max-width: 640px) {
  .update-order-search-row {
    grid-template-columns: 1fr;
  }
}
</style>
