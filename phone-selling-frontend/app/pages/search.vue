<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { homeService } from '~/services/home.service'
import { productService } from '~/services/product.service'
import type { ProductCardModel } from '~/types/home'
import type { ProductSearchQuery } from '~/types/search'
import { normalizeSearchQuery, toRouteSearchQuery } from '~/utils/searchQuery'

const { t } = useI18n()
const route = useRoute()

const products = ref<ProductCardModel[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const initialized = ref(false)
const brandOptions = ref<string[]>([])

const searchQuery = computed(() => normalizeSearchQuery(route.query))
const resultCount = computed(() => products.value.length)

const currentSearchLabel = computed(() => {
  const keyword = searchQuery.value.keyword
  if (!keyword) {
    return t('search.noKeyword')
  }

  return keyword
})

const loadBrandOptions = async () => {
  try {
    const brands = await homeService.getBrands()
    brandOptions.value = brands
      .map((brand) => brand.name)
      .filter((name) => typeof name === 'string' && name.length > 0)
  } catch {
    brandOptions.value = []
  }
}

const runSearch = async (query: ProductSearchQuery) => {
  loading.value = true
  error.value = null

  try {
    products.value = await productService.searchProducts(query)
  } catch (searchError) {
    products.value = []
    if (searchError && typeof searchError === 'object' && 'message' in searchError) {
      const message = (searchError as { message?: unknown }).message
      error.value = typeof message === 'string' && message.length > 0
        ? message
        : t('search.error')
    } else {
      error.value = t('search.error')
    }
  } finally {
    loading.value = false
  }
}

const submitSearch = async (query: ProductSearchQuery) => {
  await navigateTo({
    path: '/search',
    query: toRouteSearchQuery(query)
  })
}

const retrySearch = async () => {
  await runSearch(searchQuery.value)
}

watch(
  () => route.query,
  async () => {
    await runSearch(searchQuery.value)
    initialized.value = true
  },
  { immediate: true }
)

await loadBrandOptions()

useSeoMeta({
  title: () => searchQuery.value.keyword
    ? t('search.seoTitleWithKeyword', { keyword: currentSearchLabel.value })
    : t('search.title')
})
</script>

<template>
  <section class="section-block search-shell">
    <div class="surface-card search-header">
      <h1>{{ t('search.title') }}</h1>
      <p>{{ t('search.description') }}</p>
      <p class="search-keyword">{{ t('search.keyword') }}: <strong>{{ currentSearchLabel }}</strong></p>

      <SearchProductSearchBar
        :initial-query="searchQuery"
        :brand-options="brandOptions"
        :loading="loading"
        @submit="submitSearch"
      />

      <p v-if="initialized && !loading" class="result-label">
        {{ t('search.resultCount', { count: resultCount }) }}
      </p>
    </div>

    <CommonSectionSkeleton v-if="loading" :lines="4" />
    <CommonSectionError v-else-if="error" :message="error" @retry="retrySearch" />
    <div v-else-if="products.length > 0" class="product-grid">
      <HomeProductCard v-for="item in products" :key="item.id" :product="item" />
    </div>
    <p v-else-if="initialized" class="empty-state">{{ t('search.noResults') }}</p>
  </section>
</template>

<style scoped>
.search-shell {
  margin-top: 0;
}

.search-header {
  padding: 1.4rem;
  margin-bottom: 1rem;
}

.search-header h1 {
  margin: 0;
  font-family: 'Fraunces', serif;
  font-size: 1.8rem;
}

.search-header p {
  margin: 0.8rem 0 0;
  color: #475569;
}

.search-keyword {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding-top: 0.8rem;
}

.result-label {
  margin-top: 0.75rem;
  color: #1e3a8a;
  font-weight: 700;
}
</style>
