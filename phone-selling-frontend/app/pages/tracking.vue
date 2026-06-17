<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { orderService } from '~/services/order.service'
import type { OrderItemResponse, OrderStatusResponse } from '~/types/api'
import { useLocaleFormats } from '~/composables/useLocaleFormats'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()

const phone = ref('')
const orderId = ref('')
const loading = ref(false)
const error = ref('')
const orderData = ref<OrderStatusResponse | null>(null)

const getPaymentMethodLabel = (paymentMethod: string) => {
  const normalized = String(paymentMethod).toUpperCase()

  if (normalized === '0' || normalized === 'VNPAY') {
    return t('order.paymentVnpay')
  }

  if (normalized === '1' || normalized === 'COD') {
    return t('order.paymentCod')
  }

  return paymentMethod
}

const getItemTotalPrice = (item: OrderItemResponse) => {
  if (typeof item.totalPrice === 'number') {
    return item.totalPrice
  }

  if (typeof item.purchasedAtPrice === 'number') {
    return item.purchasedAtPrice * item.quantity
  }

  return null
}

const getItemPriceText = (item: OrderItemResponse) => {
  const totalPrice = getItemTotalPrice(item)
  return totalPrice !== null ? formatCurrency(totalPrice) : '-'
}

const handleSearch = async () => {
  error.value = ''
  orderData.value = null

  const trimmedPhone = phone.value.trim()
  const parsedOrderId = Number(orderId.value)

  if (
    !/^\d{10}$/.test(trimmedPhone) ||
    Number.isNaN(parsedOrderId) ||
    !Number.isInteger(parsedOrderId) ||
    parsedOrderId <= 0
  ) {
    error.value = t('tracking.validation')
    return
  }

  try {
    loading.value = true
    const response = await orderService.lookupOrderStatus(trimmedPhone, parsedOrderId)
    orderData.value = response
  } catch (err: any) {
    console.error(err)
    if (err.response?.status === 404 || err.response?.status === 400) {
      error.value = t('tracking.notFound')
    } else {
      error.value = t('search.error')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="tracking-page container">
    <div class="tracking-header">
      <h1 class="page-title">{{ t('tracking.title') }}</h1>
      <p class="page-subtitle">{{ t('tracking.subtitle') }}</p>
    </div>

    <div class="tracking-card">
      <form class="tracking-form" @submit.prevent="handleSearch">
        <div class="form-group">
          <label for="phone">{{ t('tracking.phone') }}</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            class="form-input"
            maxlength="10"
            required
            :placeholder="t('auth.phonePlaceholder')"
          />
        </div>
        <div class="form-group">
          <label for="orderId">{{ t('tracking.orderId') }}</label>
          <input
            id="orderId"
            v-model="orderId"
            type="number"
            class="form-input"
            min="1"
            step="1"
            required
            placeholder="12345"
          />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? t('tracking.searching') : t('tracking.search') }}
        </button>
      </form>

      <div v-if="error" class="error-alert">
        {{ error }}
      </div>

      <div v-if="orderData" class="tracking-result">
        <h2 class="result-title">{{ t('tracking.resultTitle') }} #{{ orderData.orderId }}</h2>
        
        <div class="status-badge-wrap">
          <span :class="['status-badge', `status-${orderData.status.toLowerCase()}`]">
            {{ orderData.status }}
          </span>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ t('tracking.createdAt') }}</span>
            <span class="info-value">{{ formatDate(orderData.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('tracking.paymentMethod') }}</span>
            <span class="info-value">
              {{ getPaymentMethodLabel(orderData.paymentMethod) }}
            </span>
          </div>
          <div class="info-item" v-if="orderData.trackingNumber">
            <span class="info-label">{{ t('tracking.trackingNumber') }}</span>
            <span class="info-value data-tag">{{ orderData.trackingNumber }}</span>
          </div>
          <div class="info-item" v-if="orderData.cancelReason">
            <span class="info-label">{{ t('tracking.cancelReason') }}</span>
            <span class="info-value text-danger">{{ orderData.cancelReason }}</span>
          </div>
        </div>

        <div class="delivery-info">
          <h3>{{ orderData.shipAtStore ? t('tracking.shipAtStore') : t('tracking.shippingAddress') }}</h3>
          <p><strong>{{ orderData.recipientName }}</strong> - {{ orderData.recipientPhone }}</p>
          <p v-if="!orderData.shipAtStore">{{ orderData.address }}</p>
        </div>

        <div class="order-items">
          <h3>{{ t('tracking.details') }}</h3>
          <div class="item-list">
            <div v-for="item in orderData.items" :key="item.productId" class="order-item">
              <div class="item-info">
                <span class="item-name">{{ item.productName }}</span>
                <span class="item-qty">x{{ item.quantity }}</span>
              </div>
              <span class="item-price">{{ getItemPriceText(item) }}</span>
            </div>
          </div>
          <div class="order-total">
            <span class="total-label">{{ t('tracking.totalAmount') }}</span>
            <span class="total-value">{{ formatCurrency(orderData.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracking-page {
  max-width: 800px;
  margin: 3rem auto;
  padding: 0 1.5rem;
}

.tracking-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-size: 1.1rem;
  color: #64748b;
}

.tracking-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(15, 23, 42, 0.05);
  padding: 2.5rem;
}

.tracking-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1.5rem;
  align-items: end;
  margin-bottom: 2.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

.form-input {
  height: 48px;
  padding: 0 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s;
  background: #f8fafc;
}

.form-input:focus {
  outline: none;
  border-color: #1f5eff;
  box-shadow: 0 0 0 4px rgba(31, 94, 255, 0.1);
  background: #fff;
}

.submit-btn {
  height: 48px;
  padding: 0 2rem;
  background: #1f5eff;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #1545cc;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-alert {
  padding: 1rem 1.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 12px;
  margin-bottom: 2rem;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: center;
}

.tracking-result {
  border-top: 1px solid #e2e8f0;
  padding-top: 2rem;
}

.result-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 1rem;
}

.status-badge-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-pending, .status-pending_payment {
  background: #fffbeb;
  color: #d97706;
}

.status-confirmed, .status-deliverying {
  background: #eff6ff;
  color: #1f5eff;
}

.status-success {
  background: #f0fdf4;
  color: #15803d;
}

.status-cancelled {
  background: #fef2f2;
  color: #b91c1c;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.data-tag {
  background: #e2e8f0;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-family: monospace;
  font-size: 1.1em;
  display: inline-block;
  width: fit-content;
}

.text-danger {
  color: #b91c1c;
}

.delivery-info, .order-items {
  margin-bottom: 2rem;
}

.delivery-info h3, .order-items h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.delivery-info p {
  color: #334155;
  margin-bottom: 0.25rem;
  line-height: 1.5;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 12px;
}

.item-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.item-name {
  font-weight: 600;
  color: #334155;
}

.item-qty {
  color: #64748b;
  font-weight: 500;
  background: #e2e8f0;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.item-price {
  font-weight: 700;
  color: #0f172a;
}

.order-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed #cbd5e1;
}

.total-label {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

.total-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1f5eff;
}

@media (max-width: 640px) {
  .tracking-form {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .submit-btn {
    width: 100%;
    margin-top: 0.5rem;
  }
}
</style>
