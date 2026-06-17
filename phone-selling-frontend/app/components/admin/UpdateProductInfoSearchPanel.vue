<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { homeService } from '~/services/home.service'
import { adminProductService } from '~/services/admin-product.service'
import type { AdminProductSearchModel } from '~/types/admin-product'
import type { ProductSearchQuery } from '~/types/search'

const props = defineProps<{
	initialQuery: ProductSearchQuery
	selectedProductId: number | null
}>()

const emit = defineEmits<{
	search: [query: ProductSearchQuery]
	selectProduct: [productId: number]
}>()

const { t } = useI18n()

const brandOptions = ref<string[]>([])
const searchResults = ref<AdminProductSearchModel[]>([])
const loading = ref(false)
const error = ref('')
const initialized = ref(false)

const hasAnyCriteria = computed(() => {
	const query = props.initialQuery

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
	if (!props.initialQuery.keyword) {
		return t('search.noKeyword')
	}

	return props.initialQuery.keyword
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
	error.value = ''

	if (!hasAnyCriteria.value) {
		searchResults.value = []
		initialized.value = true
		return
	}

	loading.value = true

	try {
		searchResults.value = await adminProductService.searchProducts({
			...props.initialQuery,
			page: 0,
			size: 20
		})
	} catch (requestError) {
		searchResults.value = []
		error.value = toErrorMessage(requestError)
	} finally {
		loading.value = false
		initialized.value = true
	}
}

const submitSearch = async (query: ProductSearchQuery) => {
	emit('search', query)
}

const selectProduct = (productId: number) => {
	emit('selectProduct', productId)
}

const retrySearch = async () => {
	await runSearch()
}

const toErrorMessage = (requestError: unknown) => {
	if (requestError && typeof requestError === 'object') {
		const raw = requestError as {
			message?: unknown
			data?: unknown
			response?: { _data?: unknown } | undefined
		}

		const payload = raw.data ?? raw.response?._data
		if (payload && typeof payload === 'object') {
			const apiMessage = (payload as { message?: unknown }).message
			if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
				return apiMessage
			}
		}

		if (typeof raw.message === 'string' && raw.message.trim().length > 0) {
			return raw.message
		}
	}

	return t('adminUpdateProduct.search.error')
}

watch(
	() => props.initialQuery,
	async () => {
		await runSearch()
	},
	{ immediate: true, deep: true }
)

await loadBrandOptions()
</script>

<template>
	<section class="surface-card admin-update-search-panel">
		<h2 class="admin-update-search-title">{{ t('adminUpdateProduct.search.title') }}</h2>
		<p class="admin-update-search-subtitle">{{ t('adminUpdateProduct.search.description') }}</p>
		<p class="admin-update-search-keyword">{{ t('search.keyword') }}: <strong>{{ searchSummary }}</strong></p>

		<SearchProductSearchBar
			:initial-query="initialQuery"
			:brand-options="brandOptions"
			:loading="loading"
			compact
			@submit="submitSearch"
		/>

		<p v-if="initialized && !loading" class="admin-update-search-count">
			{{ t('adminUpdateProduct.search.resultCount', { count: resultCount }) }}
		</p>

		<p v-if="error" class="admin-update-search-error">{{ error }}</p>

		<div v-if="loading" class="admin-update-search-loading">
			<p>{{ t('adminUpdateProduct.search.loading') }}</p>
		</div>

		<div v-else-if="searchResults.length > 0" class="admin-update-result-list">
			<article
				v-for="product in searchResults"
				:key="product.id"
				class="admin-update-result-item"
				:class="{ 'is-selected': selectedProductId === product.id }"
			>
				<div>
					<p class="admin-update-result-name">{{ product.name }}</p>
					<p class="admin-update-result-meta">
						#{{ product.id }} • {{ product.brandName || '-' }} • {{ product.type || '-' }}
					</p>
					<p class="admin-update-result-price">{{ product.basePrice.toLocaleString() }}</p>
					<p class="admin-update-result-status" :class="{ 'is-out': !product.inStock }">
						{{ product.inStock ? t('product.inStock') : t('product.outOfStock') }}
					</p>
				</div>

				<button type="button" class="admin-update-result-action" @click="selectProduct(product.id)">
					{{ selectedProductId === product.id ? t('adminUpdateProduct.search.selectedAction') : t('adminUpdateProduct.search.selectAction') }}
				</button>
			</article>
		</div>

		<p v-else-if="initialized" class="admin-update-search-empty">
			{{ hasAnyCriteria ? t('adminUpdateProduct.search.empty') : t('search.emptyQuery') }}
		</p>

		<button
			v-if="error"
			type="button"
			class="admin-update-search-retry"
			:disabled="loading"
			@click="retrySearch"
		>
			{{ t('common.retry') }}
		</button>
	</section>
</template>

<style scoped>
.admin-update-search-panel {
	margin-top: 1.1rem;
	padding: clamp(1rem, 2.4vw, 1.8rem);
}

.admin-update-search-title {
	margin: 0;
	font-size: clamp(1.15rem, 2vw, 1.5rem);
	font-weight: 800;
}

.admin-update-search-subtitle {
	margin: 0.45rem 0 0;
	color: #475569;
	font-size: 0.9rem;
}

.admin-update-search-keyword {
	margin: 0.8rem 0 0;
	border-top: 1px solid rgba(15, 23, 42, 0.08);
	padding-top: 0.75rem;
	color: #475569;
	font-size: 0.88rem;
}

.admin-update-search-count {
	margin: 0.75rem 0 0;
	color: #1f5eff;
	font-size: 0.85rem;
	font-weight: 700;
}

.admin-update-search-error,
.admin-update-search-empty {
	margin: 0.9rem 0 0;
	color: #b42318;
	font-size: 0.84rem;
}

.admin-update-search-empty {
	color: #475569;
}

.admin-update-search-loading {
	margin-top: 0.95rem;
	border: 1px dashed rgba(15, 23, 42, 0.18);
	border-radius: 12px;
	padding: 0.9rem;
	color: #475569;
	font-size: 0.85rem;
}

.admin-update-result-list {
	margin-top: 0.95rem;
	display: grid;
	gap: 0.7rem;
}

.admin-update-result-item {
	border: 1px solid rgba(15, 23, 42, 0.1);
	border-radius: 12px;
	padding: 0.85rem;
	background: rgba(248, 250, 252, 0.75);
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.8rem;
}

.admin-update-result-item.is-selected {
	border-color: rgba(31, 94, 255, 0.38);
	background: rgba(31, 94, 255, 0.07);
}

.admin-update-result-name {
	margin: 0;
	color: #0f172a;
	font-size: 0.95rem;
	font-weight: 800;
}

.admin-update-result-meta,
.admin-update-result-price,
.admin-update-result-status {
	margin: 0.35rem 0 0;
	color: #475569;
	font-size: 0.84rem;
}

.admin-update-result-status.is-out {
	color: #b45309;
}

.admin-update-result-action,
.admin-update-search-retry {
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

.admin-update-search-retry {
	margin-top: 0.75rem;
}

@media (max-width: 720px) {
	.admin-update-result-item {
		flex-direction: column;
	}
}
</style>
