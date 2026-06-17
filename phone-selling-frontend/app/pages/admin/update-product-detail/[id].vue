<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { adminProductService } from '~/services/admin-product.service'
import type { AdminProductDetailModel } from '~/types/admin-product'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const { role } = storeToRefs(authStore)
const product = ref<AdminProductDetailModel | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)

const productId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const normalized = Number(raw)
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null
})

const backToSearch = async () => {
  await navigateTo('/admin/update-product')
}

const toErrorMessage = (requestError: unknown) => {
  if (requestError && typeof requestError === 'object') {
    const raw = requestError as {
      message?: unknown
      statusCode?: unknown
      response?: { status?: unknown; _data?: unknown } | undefined
      data?: unknown
    }

    const statusCode =
      (typeof raw.statusCode === 'number' ? raw.statusCode : null) ??
      (typeof raw.response?.status === 'number' ? raw.response.status : null)

    if (statusCode === 401 || statusCode === 403) {
      return t('adminUpdateProduct.errors.unauthorized')
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

  return t('adminUpdateProduct.errors.loadFailed')
}

const fetchProductDetail = async () => {
  if (!productId.value) {
    product.value = null
    detailError.value = t('adminUpdateProduct.validation.productRequired')
    return
  }

  detailLoading.value = true
  detailError.value = null

  try {
    product.value = await adminProductService.getProductById(productId.value)
  } catch (requestError) {
    product.value = null
    detailError.value = toErrorMessage(requestError)
  } finally {
    detailLoading.value = false
  }
}

if (role.value && role.value !== 'ADMIN') {
  detailError.value = t('adminUpdateProduct.errors.unauthorized')
}

watch(
  () => route.params.id,
  async () => {
    if (!productId.value) {
      product.value = null
      detailLoading.value = false
      detailError.value = t('adminUpdateProduct.validation.productRequired')
      return
    }

    await fetchProductDetail()
  },
  { immediate: true }
)

useSeoMeta({
  title: () => `${t('adminUpdateProduct.form.title')} | ${t('adminHome.metaTitle')}`
})
</script>

<template>
  <section class="mx-auto grid max-w-6xl gap-4">
    <button
      type="button"
      class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600"
      @click="backToSearch"
    >
      ← {{ t('adminUpdateProduct.form.backToSearch') }}
    </button>

    <AdminUpdateProductInfoPanel
      :product="product"
      :loading="detailLoading"
      :load-error="detailError"
      @refresh="fetchProductDetail"
    />
  </section>
</template>
