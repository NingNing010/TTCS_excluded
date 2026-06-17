<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { useWarehouseProductStore } from '~/stores/warehouse-product'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const route = useRoute()
const warehouseProductStore = useWarehouseProductStore()
const { currentProduct, detailStatus } = storeToRefs(warehouseProductStore)

const localError = ref('')
const form = reactive({
  adjustmentType: 'increase' as 'increase' | 'decrease',
  quantityInput: '' as string | number
})

const productId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const value = Number(raw)

  if (!Number.isInteger(value) || value <= 0) {
    return null
  }

  return value
})

const quantityValue = computed(() => {
  const normalized = Number(String(form.quantityInput).trim())
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null
  }

  return normalized
})

const adjustmentIncrease = computed(() => form.adjustmentType === 'increase')

const submitDisabled = computed(() => {
  return detailStatus.value.loading || detailStatus.value.updating || quantityValue.value === null || !currentProduct.value
})

const fetchProductDetail = async () => {
  localError.value = ''
  warehouseProductStore.clearDetailMessages()

  if (!productId.value) {
    warehouseProductStore.clearDetailState()
    localError.value = t('warehouseHome.stockUpdatePanel.invalidProductId')
    return
  }

  await warehouseProductStore.fetchProductById(productId.value)
}

const handleSubmitUpdate = async () => {
  localError.value = ''
  warehouseProductStore.clearDetailMessages()

  if (!currentProduct.value) {
    localError.value = t('warehouseHome.stockUpdatePanel.productUnavailable')
    return
  }

  if (quantityValue.value === null) {
    localError.value = t('warehouseHome.stockUpdatePanel.invalidQuantity')
    return
  }

  if (!adjustmentIncrease.value && quantityValue.value > currentProduct.value.stockAvailable) {
    localError.value = t('warehouseHome.stockUpdatePanel.insufficientStock')
    return
  }

  const updated = await warehouseProductStore.updateProductStock(quantityValue.value, adjustmentIncrease.value)
  if (updated) {
    form.quantityInput = ''
  }
}

watch(
  () => route.params.id,
  async () => {
    form.adjustmentType = 'increase'
    form.quantityInput = ''
    await fetchProductDetail()
  },
  { immediate: true }
)
</script>

<template>
  <section class="surface-card warehouse-stock-update">
    <h1 class="warehouse-stock-update-title">{{ t('warehouseHome.features.updateProductQuantity.title') }}</h1>
    <p class="warehouse-stock-update-subtitle">{{ t('warehouseHome.stockUpdatePanel.description') }}</p>

    <p v-if="localError" class="warehouse-stock-update-error">{{ localError }}</p>
    <p v-if="detailStatus.error" class="warehouse-stock-update-error">{{ detailStatus.error }}</p>
    <p v-if="detailStatus.success" class="warehouse-stock-update-success">{{ t('warehouseHome.stockUpdatePanel.success') }}</p>

    <div v-if="detailStatus.loading" class="warehouse-stock-update-loading">
      {{ t('warehouseHome.stockUpdatePanel.loading') }}
    </div>

    <article v-else-if="currentProduct" class="warehouse-stock-update-card">
      <div class="warehouse-stock-update-head">
        <p class="warehouse-stock-update-name">{{ currentProduct.name || '#' + currentProduct.id }}</p>
        <p class="warehouse-stock-update-code">#{{ currentProduct.id }}</p>
      </div>

      <div class="warehouse-stock-update-meta">
        <p><strong>{{ t('search.filters.type') }}:</strong> {{ currentProduct.type || '-' }}</p>
        <p><strong>{{ t('search.filters.brand') }}:</strong> {{ currentProduct.brandName || '-' }}</p>
        <p><strong>{{ t('warehouseHome.stockUpdatePanel.basePrice') }}:</strong> {{ formatCurrency(currentProduct.basePrice) }}</p>
        <p><strong>{{ t('warehouseHome.stockUpdatePanel.currentStock') }}:</strong> {{ currentProduct.stockAvailable }}</p>
        <p>
          <strong>{{ t('detail.releaseDate') }}:</strong>
          {{ currentProduct.releaseDate ? formatDate(currentProduct.releaseDate) : '-' }}
        </p>
      </div>

      <form class="warehouse-stock-update-form" novalidate @submit.prevent="handleSubmitUpdate">
        <label class="warehouse-stock-update-label">{{ t('warehouseHome.stockUpdatePanel.adjustmentLabel') }}</label>
        <div class="warehouse-stock-update-toggle">
          <label>
            <input v-model="form.adjustmentType" type="radio" value="increase" :disabled="detailStatus.updating" />
            <span>{{ t('warehouseHome.stockUpdatePanel.increase') }}</span>
          </label>
          <label>
            <input v-model="form.adjustmentType" type="radio" value="decrease" :disabled="detailStatus.updating" />
            <span>{{ t('warehouseHome.stockUpdatePanel.decrease') }}</span>
          </label>
        </div>

        <label class="warehouse-stock-update-label" for="warehouse-stock-quantity-input">
          {{ t('warehouseHome.stockUpdatePanel.quantityLabel') }}
        </label>
        <input
          id="warehouse-stock-quantity-input"
          v-model="form.quantityInput"
          type="number"
          min="1"
          step="1"
          class="warehouse-stock-update-input"
          :placeholder="t('warehouseHome.stockUpdatePanel.quantityPlaceholder')"
          :disabled="detailStatus.updating"
        />

        <button type="submit" class="warehouse-stock-update-submit" :disabled="submitDisabled">
          {{ detailStatus.updating ? t('warehouseHome.stockUpdatePanel.saving') : t('warehouseHome.stockUpdatePanel.saveAction') }}
        </button>
      </form>
    </article>

    <p v-else class="warehouse-stock-update-empty">{{ t('warehouseHome.stockUpdatePanel.productUnavailable') }}</p>
  </section>
</template>

<style scoped>
.warehouse-stock-update {
  margin-top: 1.1rem;
  padding: clamp(1rem, 2.4vw, 1.8rem);
}

.warehouse-stock-update-title {
  margin: 0;
  font-size: clamp(1.25rem, 2.2vw, 1.8rem);
  font-weight: 800;
}

.warehouse-stock-update-subtitle {
  margin: 0.45rem 0 0;
  color: #475569;
  font-size: 0.92rem;
}

.warehouse-stock-update-error,
.warehouse-stock-update-success,
.warehouse-stock-update-loading,
.warehouse-stock-update-empty {
  margin: 0.85rem 0 0;
  font-size: 0.84rem;
}

.warehouse-stock-update-error {
  color: #b42318;
}

.warehouse-stock-update-success {
  color: #0f9f6e;
}

.warehouse-stock-update-loading,
.warehouse-stock-update-empty {
  color: #475569;
}

.warehouse-stock-update-card {
  margin-top: 0.95rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 0.95rem;
  background: rgba(248, 250, 252, 0.75);
}

.warehouse-stock-update-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.warehouse-stock-update-name,
.warehouse-stock-update-code {
  margin: 0;
  color: #0f172a;
  font-weight: 800;
}

.warehouse-stock-update-code {
  color: #475569;
  font-size: 0.84rem;
}

.warehouse-stock-update-meta {
  margin-top: 0.7rem;
  display: grid;
  gap: 0.4rem;
}

.warehouse-stock-update-meta p {
  margin: 0;
  color: #334155;
  font-size: 0.84rem;
}

.warehouse-stock-update-form {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.55rem;
}

.warehouse-stock-update-label {
  margin: 0;
  color: #334155;
  font-size: 0.84rem;
  font-weight: 700;
}

.warehouse-stock-update-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.warehouse-stock-update-toggle label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #334155;
  font-size: 0.84rem;
}

.warehouse-stock-update-input {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 0.9rem;
  padding: 0.55rem 0.7rem;
}

.warehouse-stock-update-submit {
  border: 1px solid rgba(31, 94, 255, 0.32);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.2rem;
  padding: 0.42rem 0.86rem;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}

.warehouse-stock-update-submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
