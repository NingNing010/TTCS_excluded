<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProductSearchQuery } from '~/types/search'

const props = withDefaults(defineProps<{
  initialQuery?: ProductSearchQuery
  brandOptions?: string[]
  loading?: boolean
  placeholder?: string
  compact?: boolean
  showHint?: boolean
  hintText?: string
}>(), {
  initialQuery: () => ({ keyword: '' }),
  brandOptions: () => [],
  loading: false,
  placeholder: '',
  compact: false,
  showHint: false,
  hintText: ''
})

const emit = defineEmits<{
  submit: [query: ProductSearchQuery]
}>()

const { t } = useI18n()

const showFilters = ref(false)
const keyword = ref('')
const filters = reactive({
  type: '',
  brandName: '',
  minPrice: '',
  maxPrice: '',
  inStockOnly: false,
  storage: '',
  ram: '',
  screenType: '',
  scanFrequency: ''
})

const normalize = (value?: string | number | boolean): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  return ''
}

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 ? value : undefined
  }

  const normalized = normalize(typeof value === 'boolean' ? String(value) : (value as string | number | undefined))
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined
  }

  return parsed
}

const hydrateFromInitialQuery = (query: ProductSearchQuery) => {
  keyword.value = normalize(query.keyword)
  filters.type = normalize(query.type)
  filters.brandName = normalize(query.brandName)
  filters.minPrice = normalize(query.minPrice)
  filters.maxPrice = normalize(query.maxPrice)
  filters.inStockOnly = Boolean(query.inStockOnly)
  filters.storage = normalize(query.storage)
  filters.ram = normalize(query.ram)
  filters.screenType = normalize(query.screenType)
  filters.scanFrequency = normalize(query.scanFrequency)
}

watch(
  () => props.initialQuery,
  (value) => {
    hydrateFromInitialQuery(value ?? { keyword: '' })
  },
  { immediate: true, deep: true }
)

const clearFilters = () => {
  filters.type = ''
  filters.brandName = ''
  filters.minPrice = ''
  filters.maxPrice = ''
  filters.inStockOnly = false
  filters.storage = ''
  filters.ram = ''
  filters.screenType = ''
  filters.scanFrequency = ''
}

const buildQuery = (): ProductSearchQuery => {
  const payload: ProductSearchQuery = {
    keyword: keyword.value.trim(),
    page: 0,
    size: 20
  }

  const type = normalize(filters.type)
  if (type) {
    payload.type = type
  }

  const brandName = normalize(filters.brandName)
  if (brandName) {
    payload.brandName = brandName
  }

  const minPrice = parseNumber(filters.minPrice)
  const maxPrice = parseNumber(filters.maxPrice)

  if (typeof minPrice === 'number' && typeof maxPrice === 'number') {
    payload.minPrice = Math.min(minPrice, maxPrice)
    payload.maxPrice = Math.max(minPrice, maxPrice)
  } else {
    if (typeof minPrice === 'number') {
      payload.minPrice = minPrice
    }

    if (typeof maxPrice === 'number') {
      payload.maxPrice = maxPrice
    }
  }

  if (filters.inStockOnly) {
    payload.inStockOnly = true
  }

  const storage = normalize(filters.storage)
  if (storage) {
    payload.storage = storage
  }

  const ram = normalize(filters.ram)
  if (ram) {
    payload.ram = ram
  }

  const screenType = normalize(filters.screenType)
  if (screenType) {
    payload.screenType = screenType
  }

  const scanFrequency = normalize(filters.scanFrequency)
  if (scanFrequency) {
    payload.scanFrequency = scanFrequency
  }

  return payload
}

const priceValidationMessage = computed(() => {
  const minPrice = parseNumber(filters.minPrice)
  const maxPrice = parseNumber(filters.maxPrice)

  if (typeof minPrice === 'number' && typeof maxPrice === 'number' && minPrice > maxPrice) {
    return t('search.validation.priceRange')
  }

  return ''
})

const hasValidationError = computed(() => priceValidationMessage.value.length > 0)

const submitSearch = () => {
  if (hasValidationError.value) {
    return
  }

  emit('submit', buildQuery())
}
</script>

<template>
  <form class="search-widget" :class="{ compact }" @submit.prevent="submitSearch">
    <div class="search-main-row">
      <input
        v-model="keyword"
        type="search"
        :placeholder="placeholder || t('search.inputPlaceholder')"
        :disabled="loading"
      />
      <button type="button" class="filter-toggle" :disabled="loading" @click="showFilters = !showFilters">
        {{ t('search.filterToggle') }}
      </button>
      <button type="submit" class="search-submit" :disabled="loading || hasValidationError">
        {{ loading ? t('search.loading') : t('search.searchButton') }}
      </button>
    </div>

    <div v-if="showFilters" class="filter-panel">
      <div class="filter-grid">
        <label>
          <span>{{ t('search.filters.type') }}</span>
          <select v-model="filters.type" :disabled="loading">
            <option value="">{{ t('search.allOption') }}</option>
            <option value="PHONE">PHONE</option>
            <option value="CASE">CASE</option>
            <option value="CHARGER">CHARGER</option>
            <option value="CABLE">CABLE</option>
          </select>
        </label>

        <label>
          <span>{{ t('search.filters.brand') }}</span>
          <input
            v-model="filters.brandName"
            list="brand-search-options"
            type="text"
            :placeholder="t('search.placeholders.brand')"
            :disabled="loading"
          />
        </label>

        <label>
          <span>{{ t('search.filters.minPrice') }}</span>
          <input
            v-model="filters.minPrice"
            type="number"
            min="0"
            step="1000"
            :placeholder="t('search.placeholders.minPrice')"
            :disabled="loading"
          />
        </label>

        <label>
          <span>{{ t('search.filters.maxPrice') }}</span>
          <input
            v-model="filters.maxPrice"
            type="number"
            min="0"
            step="1000"
            :placeholder="t('search.placeholders.maxPrice')"
            :disabled="loading"
          />
        </label>

        <label>
          <span>{{ t('search.filters.storage') }}</span>
          <input v-model="filters.storage" type="text" :placeholder="t('search.placeholders.storage')" :disabled="loading" />
        </label>

        <label>
          <span>{{ t('search.filters.ram') }}</span>
          <input v-model="filters.ram" type="text" :placeholder="t('search.placeholders.ram')" :disabled="loading" />
        </label>

        <label>
          <span>{{ t('search.filters.screenType') }}</span>
          <input
            v-model="filters.screenType"
            type="text"
            :placeholder="t('search.placeholders.screenType')"
            :disabled="loading"
          />
        </label>

        <label>
          <span>{{ t('search.filters.scanFrequency') }}</span>
          <input
            v-model="filters.scanFrequency"
            type="text"
            :placeholder="t('search.placeholders.scanFrequency')"
            :disabled="loading"
          />
        </label>

      </div>

      <div class="filter-actions">
        <label class="stock-checkbox">
          <input v-model="filters.inStockOnly" type="checkbox" :disabled="loading" />
          <span>{{ t('search.filters.inStockOnly') }}</span>
        </label>

        <button type="button" class="clear-filter" :disabled="loading" @click="clearFilters">
          {{ t('search.clearFilters') }}
        </button>
      </div>
    </div>

    <datalist id="brand-search-options">
      <option v-for="brand in brandOptions" :key="brand" :value="brand" />
    </datalist>

    <p v-if="hasValidationError" class="validation-message">{{ priceValidationMessage }}</p>

    <p v-if="showHint && hintText" class="search-hint">{{ hintText }}</p>
  </form>
</template>

<style scoped>
.search-widget {
  margin-top: 1rem;
  width: 100%;
  max-width: 100%;
}

.search-main-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  border: 1px solid rgba(15, 23, 42, 0.09);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}

.search-main-row input {
  border: 0;
  outline: none;
  height: 46px;
  padding-inline: 0.9rem;
  color: #0f172a;
}

.filter-toggle,
.search-submit {
  border: 0;
  height: 46px;
  padding-inline: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.filter-toggle {
  border-left: 1px solid rgba(15, 23, 42, 0.08);
  background: #eef2ff;
  color: #1e3a8a;
}

.search-submit {
  border-left: 1px solid rgba(15, 23, 42, 0.08);
  color: #fff;
  background: #0f172a;
}

.filter-panel {
  margin-top: 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.9);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.filter-grid label {
  display: grid;
  gap: 0.35rem;
}

.filter-grid span {
  font-size: 0.78rem;
  color: #475569;
  font-weight: 700;
}

.filter-grid input,
.filter-grid select {
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  padding-inline: 0.65rem;
  outline: none;
  background: #fff;
}

.filter-actions {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.stock-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #334155;
  font-weight: 600;
}

.stock-checkbox input {
  width: 16px;
  height: 16px;
}

.clear-filter {
  border: 1px solid rgba(15, 23, 42, 0.14);
  height: 34px;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  font-weight: 700;
  padding-inline: 0.7rem;
  cursor: pointer;
}

.search-hint {
  margin: 0.55rem 0 0;
  color: #64748b;
  font-size: 0.84rem;
}

.validation-message {
  margin: 0.55rem 0 0;
  color: #b42318;
  font-size: 0.84rem;
  font-weight: 700;
}

.compact {
  margin-top: 0.85rem;
  max-width: 640px;
}

@media (max-width: 900px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .search-main-row {
    grid-template-columns: 1fr;
  }

  .filter-toggle,
  .search-submit {
    border-left: 0;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
