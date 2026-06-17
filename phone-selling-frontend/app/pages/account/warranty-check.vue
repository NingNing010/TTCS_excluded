<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { warrantyService } from '~/services/warranty.service'
import type { WarrantyCheckResponse } from '~/types/api'
import { useLocaleFormats } from '~/composables/useLocaleFormats'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

if (!isAuthenticated.value) {
  await navigateTo('/login')
}

const pageTitle = computed(() => t('warrantyCheck.title'))

useSeoMeta({
  title: () => pageTitle.value
})

const orderId = ref('')
const loading = ref(false)
const error = ref('')
const results = ref<WarrantyCheckResponse | null>(null)

const isExpired = (warrantyEnd: string) => {
  const date = new Date(warrantyEnd)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  return date.getTime() < Date.now()
}

const getWarrantyLabel = (warrantyEnd: string) => {
  return isExpired(warrantyEnd) ? t('warrantyCheck.statusExpired') : t('warrantyCheck.statusActive')
}

const getWarrantyClass = (warrantyEnd: string) => {
  return isExpired(warrantyEnd) ? 'status-expired' : 'status-active'
}

const getPriceText = (value?: number) => {
  if (typeof value === 'number') {
    return formatCurrency(value)
  }

  return '-'
}

const handleCheck = async () => {
  error.value = ''
  results.value = null

  const parsedOrderId = Number(orderId.value)
  if (Number.isNaN(parsedOrderId) || !Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
    error.value = t('warrantyCheck.validation')
    return
  }

  try {
    loading.value = true
    const response = await warrantyService.checkWarranty(parsedOrderId)
    results.value = response
    if (response.length === 0) {
      error.value = t('warrantyCheck.empty')
    }
  } catch (err: any) {
    if (err.response?.status === 404 || err.response?.status === 400) {
      error.value = t('warrantyCheck.notFound')
    } else {
      error.value = t('warrantyCheck.error')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="warranty-page container">
    <div class="warranty-header">
      <p class="page-eyebrow">{{ t('header.account') }}</p>
      <h1 class="page-title">{{ t('warrantyCheck.title') }}</h1>
      <p class="page-subtitle">{{ t('warrantyCheck.subtitle') }}</p>
    </div>

    <div class="warranty-card surface-card">
      <form class="warranty-form" @submit.prevent="handleCheck">
        <div class="form-group">
          <label for="orderId">{{ t('warrantyCheck.orderId') }}</label>
          <input
            id="orderId"
            v-model="orderId"
            type="number"
            class="form-input"
            min="1"
            step="1"
            required
            :placeholder="t('warrantyCheck.placeholder')"
          />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? t('warrantyCheck.checking') : t('warrantyCheck.checkAction') }}
        </button>
      </form>

      <div v-if="error" class="error-alert">
        {{ error }}
      </div>

      <section v-if="results && results.length > 0" class="warranty-results">
        <h2 class="result-title">{{ t('warrantyCheck.resultsTitle') }}</h2>

        <div class="warranty-list">
          <article v-for="entry in results" :key="entry.item.productId" class="warranty-item">
            <div class="item-thumb">
              <img
                v-if="entry.item.thumbnailUrl"
                :src="entry.item.thumbnailUrl"
                :alt="entry.item.productName"
                loading="lazy"
              />
              <div v-else class="thumb-fallback">{{ entry.item.productName.charAt(0) }}</div>
            </div>
            <div class="item-body">
              <div class="item-title">
                <div>
                  <h3>{{ entry.item.productName }}</h3>
                  <p class="item-brand">{{ entry.item.brandName || '-' }}</p>
                </div>
                <span class="item-status" :class="getWarrantyClass(entry.warrantyEnd)">
                  {{ getWarrantyLabel(entry.warrantyEnd) }}
                </span>
              </div>
              <div class="item-meta">
                <div>
                  <span class="meta-label">{{ t('warrantyCheck.quantity') }}</span>
                  <span class="meta-value">x{{ entry.item.quantity }}</span>
                </div>
                <div>
                  <span class="meta-label">{{ t('warrantyCheck.purchasedAtPrice') }}</span>
                  <span class="meta-value">{{ getPriceText(entry.item.purchasedAtPrice) }}</span>
                </div>
                <div>
                  <span class="meta-label">{{ t('warrantyCheck.warrantyEnd') }}</span>
                  <span class="meta-value">{{ formatDate(entry.warrantyEnd) }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.warranty-page {
  max-width: 880px;
  margin: 3rem auto;
  padding: 0 1.5rem;
}

.warranty-header {
  margin-bottom: 1.75rem;
  display: grid;
  gap: 0.35rem;
}

.page-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2563eb;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
}

.page-subtitle {
  font-size: 1rem;
  color: #64748b;
}

.warranty-card {
  padding: 2rem;
  display: grid;
  gap: 1.5rem;
}

.warranty-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: end;
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
  height: 46px;
  padding: 0 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 1rem;
}

.submit-btn {
  border: 0;
  height: 46px;
  border-radius: 12px;
  padding: 0 1.4rem;
  background: #1f5eff;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-alert {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
}

.warranty-results {
  display: grid;
  gap: 1rem;
}

.result-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.warranty-list {
  display: grid;
  gap: 1rem;
}

.warranty-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding: 1rem;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.item-thumb {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  background: #e2e8f0;
  display: grid;
  place-items: center;
  color: #1e40af;
  font-weight: 700;
  font-size: 1.2rem;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-fallback {
  text-transform: uppercase;
}

.item-body {
  display: grid;
  gap: 0.75rem;
}

.item-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.item-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.item-brand {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}

.item-status {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-active {
  background: #dcfce7;
  color: #15803d;
}

.status-expired {
  background: #fee2e2;
  color: #b91c1c;
}

.item-meta {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.meta-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.meta-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0f172a;
}

@media (max-width: 720px) {
  .warranty-form {
    grid-template-columns: 1fr;
  }

  .submit-btn {
    width: 100%;
  }

  .warranty-item {
    grid-template-columns: 1fr;
  }
}
</style>
