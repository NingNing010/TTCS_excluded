<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { homeService } from '~/services/home.service'
import { useWarehouseProductStore } from '~/stores/warehouse-product'
import type { ProductSearchQuery } from '~/types/search'
import { normalizeSearchQuery, toRouteSearchQuery } from '~/utils/searchQuery'

const { t } = useI18n()
const route = useRoute()
const warehouseProductStore = useWarehouseProductStore()
const { searchResults, searchStatus } = storeToRefs(warehouseProductStore)

const brandOptions = ref<string[]>([])
const initialized = ref(false)

const searchQuery = computed(() => normalizeSearchQuery(route.query))

const hasAnyCriteria = computed(() => {
  const query = searchQuery.value

  return Boolean(
    query.keyword ||
    query.type ||
    query.brandName ||
    query.storage ||
    query.ram ||
    query.screenType ||
    query.scanFrequency ||
    query.inStockOnly ||
    typeof query.minPrice === 'number' ||
    typeof query.maxPrice === 'number'
  )
})

const resultCount = computed(() => searchResults.value.length)

const searchSummary = computed(() => {
  if (!searchQuery.value.keyword) {
    return t('search.noKeyword')
  }

  return searchQuery.value.keyword
})

const loadBrandOptions = async () => {
  try {
    const brands = await homeService.getBrands()
    brandOptions.value = brands
      .map((brand) => brand.name)
      .filter((name) => typeof name === 'string' && name.trim().length > 0)
  } catch {
    brandOptions.value = []
  }
}

const runSearch = async () => {
  if (!hasAnyCriteria.value) {
    searchResults.value = []
    warehouseProductStore.clearSearchError()
    initialized.value = true
    return
  }

  const query: ProductSearchQuery = {
    ...searchQuery.value,
    page: 0,
    size: 20
  }

  await warehouseProductStore.searchProducts(query)
  initialized.value = true
}

const submitSearch = async (query: ProductSearchQuery) => {
  await navigateTo({
    path: '/warehouse/update-product-quantity',
    query: toRouteSearchQuery(query)
  })
}

const retrySearch = async () => {
  await runSearch()
}

const openStockUpdate = async (productId: number) => {
  await navigateTo(`/warehouse/update-product-stock/${productId}`)
}

watch(
  () => route.query,
  async () => {
    await runSearch()
  },
  { immediate: true }
)

await loadBrandOptions()
</script>

<template>
  <section class="surface-card warehouse-stock-search">
    <h1 class="warehouse-stock-search-title">{{ t('warehouseHome.features.updateProductQuantity.title') }}</h1>
    <p class="warehouse-stock-search-subtitle">{{ t('warehouseHome.stockSearchPanel.description') }}</p>
    <p class="warehouse-stock-search-keyword">{{ t('search.keyword') }}: <strong>{{ searchSummary }}</strong></p>

    <SearchProductSearchBar
      :initial-query="searchQuery"
      :brand-options="brandOptions"
      :loading="searchStatus.loading"
      @submit="submitSearch"
    />

    <p v-if="initialized && !searchStatus.loading" class="warehouse-stock-search-count">
      {{ t('warehouseHome.stockSearchPanel.resultCount', { count: resultCount }) }}
    </p>

    <p v-if="searchStatus.error" class="warehouse-stock-search-error">{{ searchStatus.error }}</p>

    <div v-if="searchStatus.loading" class="warehouse-stock-list warehouse-stock-list-loading">
      <p>{{ t('warehouseHome.stockSearchPanel.loading') }}</p>
    </div>

    <div v-else-if="searchResults.length > 0" class="warehouse-stock-list">
      <article
        v-for="product in searchResults"
        :key="product.id"
        class="warehouse-stock-item"
      >
        <div>
          <p class="warehouse-stock-item-name">{{ product.name }}</p>
          <p class="warehouse-stock-item-meta">
            #{{ product.id }} • {{ product.brandName || '-' }} • {{ product.type || '-' }}
          </p>
          <p class="warehouse-stock-item-price">{{ product.basePrice.toLocaleString() }}</p>
          <p class="warehouse-stock-item-status" :class="{ 'is-out': !product.inStock }">
            {{ product.inStock ? t('product.inStock') : t('product.outOfStock') }}
          </p>
        </div>

        <button type="button" class="warehouse-stock-item-action" @click="openStockUpdate(product.id)">
          {{ t('warehouseHome.stockSearchPanel.selectAction') }}
        </button>
      </article>
    </div>

    <p v-else-if="initialized" class="warehouse-stock-empty">
      {{ hasAnyCriteria ? t('warehouseHome.stockSearchPanel.empty') : t('search.emptyQuery') }}
    </p>

    <button
      v-if="searchStatus.error"
      type="button"
      class="warehouse-stock-retry"
      :disabled="searchStatus.loading"
      @click="retrySearch"
    >
      {{ t('common.retry') }}
    </button>
  </section>
</template>

<style scoped>
.warehouse-stock-search {
  margin-top: 1.1rem;
  padding: clamp(1rem, 2.4vw, 1.8rem);
}

.warehouse-stock-search-title {
  margin: 0;
  font-size: clamp(1.25rem, 2.2vw, 1.8rem);
  font-weight: 800;
}

.warehouse-stock-search-subtitle {
  margin: 0.45rem 0 0;
  color: #475569;
  font-size: 0.92rem;
}

.warehouse-stock-search-keyword {
  margin: 0.8rem 0 0;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding-top: 0.75rem;
  color: #475569;
  font-size: 0.88rem;
}

.warehouse-stock-search-count {
  margin: 0.75rem 0 0;
  color: #1f5eff;
  font-size: 0.86rem;
  font-weight: 700;
}

.warehouse-stock-search-error {
  margin: 0.75rem 0 0;
  color: #b42318;
  font-size: 0.84rem;
}

.warehouse-stock-list {
  margin-top: 0.95rem;
  display: grid;
  gap: 0.7rem;
}

.warehouse-stock-list-loading {
  border: 1px dashed rgba(15, 23, 42, 0.18);
  border-radius: 12px;
  padding: 0.9rem;
  color: #475569;
  font-size: 0.85rem;
}

.warehouse-stock-item {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 0.85rem;
  background: rgba(248, 250, 252, 0.75);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.warehouse-stock-item-name {
  margin: 0;
  color: #0f172a;
  font-size: 0.96rem;
  font-weight: 800;
}

.warehouse-stock-item-meta,
.warehouse-stock-item-price,
.warehouse-stock-item-status {
  margin: 0.4rem 0 0;
  color: #475569;
  font-size: 0.84rem;
}

.warehouse-stock-item-status.is-out {
  color: #b45309;
}

.warehouse-stock-item-action,
.warehouse-stock-retry {
  border: 1px solid rgba(31, 94, 255, 0.32);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.2rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.warehouse-stock-item-action {
  flex: none;
}

.warehouse-stock-retry {
  margin-top: 0.75rem;
}

.warehouse-stock-empty {
  margin: 0.9rem 0 0;
  color: #475569;
  font-size: 0.86rem;
}

@media (max-width: 720px) {
  .warehouse-stock-item {
    flex-direction: column;
  }
}
</style>
