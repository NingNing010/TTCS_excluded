<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { productService } from '~/services/product.service'
import { promotionService } from '~/services/promotion.service'
import { useAuthStore } from '~/stores/auth'
import type { PromoDiscountType } from '~/types/api'
import type { ProductCardModel } from '~/types/home'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const authStore = useAuthStore()
const { role } = storeToRefs(authStore)
const activeStep = ref<1 | 2 | 3>(1)
const saving = ref(false)
const submitError = ref('')
const submitSuccess = ref('')
const productKeyword = ref('')
const searchingProducts = ref(false)
const productSearchError = ref('')
const productResults = ref<ProductCardModel[]>([])
const selectedProductIds = ref<number[]>([])
const selectedProductMap = ref<Record<number, ProductCardModel>>({})

const form = reactive({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  discountType: 'PERCENT' as PromoDiscountType,
  discountValue: '',
  voucherCode: '',
  usageLimit: '0',
  imageUrls: ''
})

const steps = computed(() => [
  { id: 1 as const, label: t('adminCreatePromotion.steps.details') },
  { id: 2 as const, label: t('adminCreatePromotion.steps.products') },
  { id: 3 as const, label: t('adminCreatePromotion.steps.review') }
])

const discountTypeOptions = computed(() => [
  {
    value: 'PERCENT' as PromoDiscountType,
    label: t('adminCreatePromotion.discountTypePercent')
  },
  {
    value: 'FIXED' as PromoDiscountType,
    label: t('adminCreatePromotion.discountTypeFixed')
  }
])

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const parseImageUrls = (value: string): Record<string, string> => {
  const urls = value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (urls.length === 0) {
    throw new Error(t('adminCreatePromotion.validation.imageRequired'))
  }

  if (urls.some((item) => !isHttpUrl(item))) {
    throw new Error(t('adminCreatePromotion.validation.imageUrlInvalid'))
  }

  return Object.fromEntries(urls.map((url, index) => [String(index + 1), url]))
}

const splitImageUrls = (value: string) => {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const toIsoStartDate = (value: string) => {
  return new Date(`${value}T00:00:00`).toISOString()
}

const toIsoEndDate = (value: string) => {
  return new Date(`${value}T23:59:59`).toISOString()
}

const moveToStep = (step: 1 | 2 | 3) => {
  activeStep.value = step
}

const moveToNextStep = () => {
  if (activeStep.value < 3) {
    activeStep.value = (activeStep.value + 1) as 1 | 2 | 3
  }
}

const moveToPreviousStep = () => {
  if (activeStep.value > 1) {
    activeStep.value = (activeStep.value - 1) as 1 | 2 | 3
  }
}

const isProductSelected = (productId: number) => {
  return selectedProductIds.value.includes(productId)
}

const toggleProductSelection = (product: ProductCardModel) => {
  if (isProductSelected(product.id)) {
    selectedProductIds.value = selectedProductIds.value.filter((id) => id !== product.id)
    const nextMap = { ...selectedProductMap.value }
    delete nextMap[product.id]
    selectedProductMap.value = nextMap
    return
  }

  selectedProductIds.value = [...selectedProductIds.value, product.id]
  selectedProductMap.value = {
    ...selectedProductMap.value,
    [product.id]: product
  }
}

const removeSelectedProduct = (productId: number) => {
  selectedProductIds.value = selectedProductIds.value.filter((id) => id !== productId)
  const nextMap = { ...selectedProductMap.value }
  delete nextMap[productId]
  selectedProductMap.value = nextMap
}

const searchProducts = async () => {
  productSearchError.value = ''
  const keyword = productKeyword.value.trim()

  if (!keyword) {
    productSearchError.value = t('adminCreatePromotion.validation.productKeywordRequired')
    return
  }

  searchingProducts.value = true

  try {
    const records = await productService.searchProducts({
      keyword,
      page: 0,
      size: 30
    })

    productResults.value = records

    if (records.length > 0 && selectedProductIds.value.length > 0) {
      const nextMap = { ...selectedProductMap.value }

      for (const product of records) {
        if (selectedProductIds.value.includes(product.id)) {
          nextMap[product.id] = product
        }
      }

      selectedProductMap.value = nextMap
    }
  } catch (error: any) {
    productSearchError.value = error?.data?.message || t('adminCreatePromotion.searchFailed')
  } finally {
    searchingProducts.value = false
  }
}

const selectedProducts = computed(() => {
  return selectedProductIds.value.map((id) => {
    const product = selectedProductMap.value[id]

    if (product) {
      return product
    }

    return {
      id,
      name: t('adminCreatePromotion.unknownProductName', { id }),
      brandName: '-',
      type: '-',
      basePrice: 0,
      imageUrl: null,
      inStock: false
    } as ProductCardModel
  })
})

const reviewImageUrls = computed(() => splitImageUrls(form.imageUrls))

const validateAndBuildPayload = () => {
  const name = form.name.trim()
  if (!name) {
    throw new Error(t('adminCreatePromotion.validation.nameRequired'))
  }

  const description = form.description.trim()
  if (!description) {
    throw new Error(t('adminCreatePromotion.validation.descriptionRequired'))
  }

  const voucherCode = form.voucherCode.trim()
  if (!voucherCode || voucherCode.length < 5 || voucherCode.length > 50) {
    throw new Error(t('adminCreatePromotion.validation.voucherCodeRequired'))
  }

  if (!form.startDate || !form.endDate) {
    throw new Error(t('adminCreatePromotion.validation.dateRequired'))
  }

  const start = new Date(`${form.startDate}T00:00:00`)
  const end = new Date(`${form.endDate}T23:59:59`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(t('adminCreatePromotion.validation.dateInvalid'))
  }

  if (start.getTime() > end.getTime()) {
    throw new Error(t('adminCreatePromotion.validation.dateRangeInvalid'))
  }

  const discountValue = Number(form.discountValue)
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error(t('adminCreatePromotion.validation.discountValueInvalid'))
  }

  const usageLimit = Number(form.usageLimit)
  if (!Number.isInteger(usageLimit) || usageLimit < 1) {
    throw new Error(t('adminCreatePromotion.validation.usageLimitInvalid'))
  }

  const uniqueProductIds = [...new Set(selectedProductIds.value)]
  if (uniqueProductIds.length === 0) {
    throw new Error(t('adminCreatePromotion.validation.productRequired'))
  }

  const promoImageUrls = parseImageUrls(form.imageUrls)

  return {
    name,
    description,
    startDate: toIsoStartDate(form.startDate),
    endDate: toIsoEndDate(form.endDate),
    discountType: form.discountType,
    discountValue,
    voucherCode,
    usageLimit,
    promoImageUrls,
    productIds: uniqueProductIds
  }
}

const resetDraft = () => {
  form.name = ''
  form.description = ''
  form.startDate = ''
  form.endDate = ''
  form.discountType = 'PERCENT'
  form.discountValue = ''
  form.voucherCode = ''
  form.usageLimit = '0'
  form.imageUrls = ''
  productKeyword.value = ''
  searchingProducts.value = false
  productSearchError.value = ''
  productResults.value = []
  selectedProductIds.value = []
  selectedProductMap.value = {}
  activeStep.value = 1
}

const handleSubmit = async () => {
  submitError.value = ''
  submitSuccess.value = ''

  try {
    const payload = validateAndBuildPayload()
    saving.value = true
    await promotionService.createPromotion(payload)
    submitSuccess.value = t('adminCreatePromotion.submitSuccess')
    resetDraft()
  } catch (error: any) {
    submitError.value = error?.data?.message || error?.message || t('adminCreatePromotion.submitFailed')
  } finally {
    saving.value = false
  }
}

if (role.value !== 'ADMIN') {
  await navigateTo('/')
}

useSeoMeta({
  title: () => `${t('adminHome.actions.createPromotion')} | ${t('adminHome.metaTitle')}`
})
</script>

<template>
  <section class="mx-auto grid max-w-6xl gap-4">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('auth.backToHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <h1 class="font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('adminHome.actions.createPromotion') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('adminCreatePromotion.pageSubtitle') }}</p>

      <p v-if="submitSuccess" class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        {{ submitSuccess }}
      </p>
      <p v-if="submitError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
        {{ submitError }}
      </p>

      <div class="mt-5 grid gap-2 sm:grid-cols-3">
        <button
          v-for="step in steps"
          :key="step.id"
          type="button"
          class="h-11 rounded-xl border px-3 text-sm font-semibold transition"
          :class="
            step.id === activeStep
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
          "
          @click="moveToStep(step.id)"
        >
          {{ step.id }}. {{ step.label }}
        </button>
      </div>

      <div v-if="activeStep === 1" class="mt-5 grid gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1.5 sm:col-span-2">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.name') }}</span>
            <input
              v-model="form.name"
              type="text"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('adminCreatePromotion.placeholders.name')"
            />
          </label>

          <label class="grid gap-1.5 sm:col-span-2">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.description') }}</span>
            <textarea
              v-model="form.description"
              rows="4"
              class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('adminCreatePromotion.placeholders.description')"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.startDate') }}</span>
            <input
              v-model="form.startDate"
              type="date"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.endDate') }}</span>
            <input
              v-model="form.endDate"
              type="date"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.discountType') }}</span>
            <select
              v-model="form.discountType"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option v-for="option in discountTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.discountValue') }}</span>
            <input
              v-model="form.discountValue"
              type="number"
              min="0"
              step="0.01"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('adminCreatePromotion.placeholders.discountValue')"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.voucherCode') }}</span>
            <input
              v-model="form.voucherCode"
              type="text"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('adminCreatePromotion.placeholders.voucherCode')"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.usageLimit') }}</span>
            <input
              v-model="form.usageLimit"
              type="number"
              min="1"
              step="1"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('adminCreatePromotion.placeholders.usageLimit')"
            />
          </label>

          <label class="grid gap-1.5 sm:col-span-2">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.imageUrls') }}</span>
            <textarea
              v-model="form.imageUrls"
              rows="3"
              class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('adminCreatePromotion.placeholders.imageUrls')"
            />
          </label>
        </div>
      </div>

      <div v-else-if="activeStep === 2" class="mt-5 grid gap-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('adminCreatePromotion.fields.productKeyword') }}</span>
            <input
              v-model="productKeyword"
              type="text"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('adminCreatePromotion.placeholders.productKeyword')"
              @keydown.enter.prevent="searchProducts"
            />
          </label>

          <button
            type="button"
            class="h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:self-end"
            :disabled="searchingProducts"
            @click="searchProducts"
          >
            {{ searchingProducts ? t('adminCreatePromotion.searching') : t('adminCreatePromotion.searchAction') }}
          </button>
        </div>

        <p v-if="productSearchError" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {{ productSearchError }}
        </p>

        <p class="text-sm text-slate-600">
          {{ t('adminCreatePromotion.selectedCount', { count: selectedProductIds.length }) }}
        </p>

        <div v-if="productResults.length > 0" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="product in productResults"
            :key="product.id"
            class="surface-card grid gap-2 border p-3"
            :class="isProductSelected(product.id) ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200'"
          >
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.name"
              class="h-32 w-full rounded-lg border border-slate-200 object-cover"
            />

            <div>
              <p class="text-sm font-extrabold text-slate-900">{{ product.name }}</p>
              <p class="text-xs text-slate-500">{{ product.brandName }} • {{ product.type }}</p>
              <p class="text-sm font-semibold text-slate-700">{{ formatCurrency(product.basePrice) }}</p>
            </div>

            <button
              type="button"
              class="h-9 rounded-lg border px-3 text-xs font-semibold transition"
              :class="
                isProductSelected(product.id)
                  ? 'border-blue-500 bg-blue-100 text-blue-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              "
              @click="toggleProductSelection(product)"
            >
              {{ isProductSelected(product.id) ? t('adminCreatePromotion.unselectProductAction') : t('adminCreatePromotion.selectProductAction') }}
            </button>
          </article>
        </div>

        <p v-else class="text-sm text-slate-600">{{ t('adminCreatePromotion.searchEmpty') }}</p>

        <div v-if="selectedProducts.length > 0" class="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 class="text-sm font-extrabold text-slate-900">{{ t('adminCreatePromotion.selectedProductsTitle') }}</h3>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="product in selectedProducts"
              :key="product.id"
              type="button"
              class="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              @click="removeSelectedProduct(product.id)"
            >
              #{{ product.id }} - {{ product.name }}
              <span>×</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="mt-5 grid gap-4">
        <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-base font-extrabold text-slate-900">{{ t('adminCreatePromotion.reviewInfoTitle') }}</h3>
          <dl class="mt-3 grid gap-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500">{{ t('adminCreatePromotion.fields.name') }}</dt>
              <dd class="font-semibold text-slate-900">{{ form.name || '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500">{{ t('adminCreatePromotion.fields.voucherCode') }}</dt>
              <dd class="font-semibold text-slate-900">{{ form.voucherCode || '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500">{{ t('adminCreatePromotion.fields.discountType') }}</dt>
              <dd class="font-semibold text-slate-900">{{ form.discountType }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500">{{ t('adminCreatePromotion.fields.discountValue') }}</dt>
              <dd class="font-semibold text-slate-900">{{ form.discountValue || '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500">{{ t('adminCreatePromotion.fields.startDate') }}</dt>
              <dd class="font-semibold text-slate-900">{{ form.startDate ? formatDate(form.startDate) : '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500">{{ t('adminCreatePromotion.fields.endDate') }}</dt>
              <dd class="font-semibold text-slate-900">{{ form.endDate ? formatDate(form.endDate) : '-' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-slate-500">{{ t('adminCreatePromotion.fields.usageLimit') }}</dt>
              <dd class="font-semibold text-slate-900">{{ form.usageLimit || '-' }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-sm text-slate-700">{{ form.description || '-' }}</p>
        </article>

        <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-base font-extrabold text-slate-900">{{ t('adminCreatePromotion.selectedProductsTitle') }}</h3>
          <ul v-if="selectedProducts.length > 0" class="mt-3 grid gap-1 text-sm text-slate-700">
            <li v-for="product in selectedProducts" :key="product.id">
              #{{ product.id }} - {{ product.name }}
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-slate-600">{{ t('adminCreatePromotion.noSelectedProducts') }}</p>
        </article>

        <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-base font-extrabold text-slate-900">{{ t('adminCreatePromotion.reviewImagesTitle') }}</h3>
          <ul v-if="reviewImageUrls.length > 0" class="mt-3 grid gap-1 text-sm text-slate-700">
            <li v-for="url in reviewImageUrls" :key="url">{{ url }}</li>
          </ul>
          <p v-else class="mt-3 text-sm text-slate-600">{{ t('adminCreatePromotion.noImageUrls') }}</p>
        </article>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="activeStep === 1"
          @click="moveToPreviousStep"
        >
          {{ t('adminCreatePromotion.previousStepAction') }}
        </button>

        <button
          type="button"
          class="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="activeStep === 3"
          @click="moveToNextStep"
        >
          {{ t('adminCreatePromotion.nextStepAction') }}
        </button>

        <button
          v-if="activeStep === 3"
          type="button"
          class="h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="saving"
          @click="handleSubmit"
        >
          {{ saving ? t('adminCreatePromotion.saving') : t('adminCreatePromotion.submitAction') }}
        </button>

        <NuxtLink to="/admin/promotions" class="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400">
          {{ t('adminCreatePromotion.goToListAction') }}
        </NuxtLink>
      </div>
    </article>
  </section>
</template>
