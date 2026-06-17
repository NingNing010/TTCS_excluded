<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { orderService } from '~/services/order.service'
import type { PurchaseHistoryResponse } from '~/types/api'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

if (!isAuthenticated.value) {
  await navigateTo('/login')
}

const pageTitle = computed(() => t('orderHistory.title'))

useSeoMeta({
  title: () => pageTitle.value
})

const currentPage = ref(0)
const pageSize = ref(10)
const isLoading = ref(false)
const error = ref('')
const orderData = ref<PurchaseHistoryResponse | null>(null)

const isRateEligibleStatus = (status: string) => status === 'SUCCESS'

const isRatedByCurrentUser = (item: PurchaseHistoryResponse['content'][number]['items'][number]) => {
  if (typeof item.rating !== 'number') {
    return false
  }

  return item.rating > 0
}

const canRateProduct = (status: string, item: PurchaseHistoryResponse['content'][number]['items'][number]) => {
  if (!isRateEligibleStatus(status)) {
    return false
  }

  return item.productId > 0 && !isRatedByCurrentUser(item)
}

const buildRateProductLink = (productId: number) => ({
  path: `/products/${productId}`,
  query: {
    rate: '1',
    source: 'order-history'
  }
})

const fetchOrders = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const response = await orderService.getPurchaseHistory(currentPage.value, pageSize.value)
    orderData.value = response
  } catch (err: any) {
    error.value = t('orderHistory.error')
  } finally {
    isLoading.value = false
  }
}

watch(currentPage, () => {
  fetchOrders()
})

await useAsyncData('user-orders', () => fetchOrders())

// Cancel logic
const cancelModalOpen = ref(false)
const selectedOrderId = ref<number | null>(null)
const cancelReason = ref('')
const cancelError = ref('')
const isCancelling = ref(false)
const cancelSuccess = ref('')

const openCancelModal = (orderId: number) => {
  selectedOrderId.value = orderId
  cancelReason.value = ''
  cancelError.value = ''
  cancelModalOpen.value = true
}

const closeCancelModal = () => {
  cancelModalOpen.value = false
  selectedOrderId.value = null
  cancelReason.value = ''
}

const submitCancel = async () => {
  if (!cancelReason.value.trim() || !selectedOrderId.value) return
  
  isCancelling.value = true
  cancelError.value = ''
  cancelSuccess.value = ''
  try {
    await orderService.cancelOrder(selectedOrderId.value, { cancelReason: cancelReason.value })
    closeCancelModal()
    cancelSuccess.value = t('orderHistory.cancelSuccess')
    await fetchOrders()
    setTimeout(() => { cancelSuccess.value = '' }, 4000)
  } catch (err: any) {
    cancelError.value = err.data?.message || t('orderHistory.cancelFailed')
  } finally {
    isCancelling.value = false
  }
}

const nextPage = () => {
  if (orderData.value?.hasNext) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (orderData.value?.hasPrevious) {
    currentPage.value--
  }
}

function isCancellableStatus(status: string) {
  return status === 'PENDING' || status === 'CONFIRMED'
}

function getStatusLabel(status: string) {
  const keys: Record<string, string> = {
    PENDING: 'warehouseHome.orderStatuses.pending',
    PENDING_PAYMENT: 'warehouseHome.orderStatuses.pendingPayment',
    CONFIRMED: 'warehouseHome.orderStatuses.confirmed',
    DELIVERYING: 'warehouseHome.orderStatuses.deliverying',
    SUCCESS: 'warehouseHome.orderStatuses.success',
    CANCELLED: 'warehouseHome.orderStatuses.cancelled'
  }
  return keys[status] ? t(keys[status]) : status
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'PENDING_PAYMENT': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'CONFIRMED': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'DELIVERYING': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'SUCCESS': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(locale.value === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: locale.value === 'vi' ? 'VND' : 'USD' }).format(amount)
}
</script>

<template>
  <section class="grid gap-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-extrabold uppercase tracking-wide text-blue-600">{{ t('header.account') }}</p>
        <h1 class="mt-1 font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('orderHistory.title') }}</h1>
        <p class="mt-1 text-sm text-slate-600">{{ t('orderHistory.subtitle') }}</p>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="cancelSuccess" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 flex items-center gap-2 transition-all">
      <span>✓</span>
      <span>{{ cancelSuccess }}</span>
    </div>

    <!-- Error State -->
    <CommonSectionError v-if="error" :message="error" @retry="fetchOrders" />

    <!-- Empty State -->
    <article v-else-if="!isLoading && (!orderData || orderData.content.length === 0)" class="surface-card p-5">
      <p class="empty-state">{{ t('orderHistory.empty') }}</p>
    </article>

    <!-- Content -->
    <section v-else class="grid gap-4">
      <!-- Loading Skeleton -->
      <CommonSectionSkeleton v-if="isLoading" :lines="6" />
      
      <article
        v-else
        v-for="order in orderData?.content"
        :key="order.orderId"
        class="surface-card p-4 sm:p-5 grid gap-4"
      >
        <!-- Header -->
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
              {{ t('orderHistory.orderId') }}: #{{ order.orderId }}
              <span :class="['border px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wide font-bold', getStatusBadgeClass(order.status)]">
                {{ getStatusLabel(order.status) }}
              </span>
            </h3>
            <p class="text-sm text-slate-500 mt-1.5">{{ t('orderHistory.orderDate') }}: {{ new Date(order.orderDate).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') }}</p>
            <p v-if="order.trackingNumber" class="text-sm text-slate-500 mt-0.5">{{ t('orderHistory.trackingNumber') }}: <strong class="text-slate-700">{{ order.trackingNumber }}</strong></p>
          </div>
          <div>
            <button
              v-if="isCancellableStatus(order.status)"
              type="button"
              class="h-8 rounded-lg border border-rose-300 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
              @click="openCancelModal(order.orderId)"
            >
              {{ t('orderHistory.cancelAction') }}
            </button>
          </div>
        </div>

        <!-- Items -->
        <div class="grid gap-3 select-none">
          <div v-for="item in order.items" :key="item.productId" class="flex gap-3 items-center">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3">
                <component
                  :is="item.productId > 0 ? 'NuxtLink' : 'div'"
                  v-bind="item.productId > 0 ? { to: `/products/${item.productId}` } : {}"
                  class="h-16 w-16 shrink-0 rounded bg-slate-50 border border-slate-100 overflow-hidden relative transition hover:border-blue-300"
                >
                  <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" class="w-full h-full object-cover" />
                </component>

                <div class="min-w-0 flex-1">
                  <h4 class="text-sm font-bold text-slate-800 truncate">
                    <NuxtLink
                      v-if="item.productId > 0"
                      :to="`/products/${item.productId}`"
                      class="transition hover:text-blue-700"
                    >
                      {{ item.productName }}
                    </NuxtLink>
                    <span v-else>{{ item.productName }}</span>
                  </h4>
                  <p class="text-xs text-slate-500 mt-0.5">{{ item.brandName }}</p>
                </div>
              </div>

              <div class="mt-1 flex items-center justify-between">
                <span class="text-sm text-slate-600 font-medium">x{{ item.quantity }}</span>
                <span class="text-sm font-bold text-slate-900">{{ formatCurrency(item.purchasedAtPrice || 0) }}</span>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <NuxtLink
                v-if="canRateProduct(order.status, item)"
                :to="buildRateProductLink(item.productId)"
                class="inline-flex h-8 items-center rounded-lg border border-blue-300 bg-white px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
              >
                {{ t('orderHistory.rateProduct') }}
              </NuxtLink>
              <span
                v-else-if="isRateEligibleStatus(order.status) && isRatedByCurrentUser(item)"
                class="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700"
              >
                {{ t('orderHistory.alreadyRated') }}
                <span class="ml-2 inline-flex items-center gap-1 text-amber-500">
                  <span>★</span>
                  <span>{{ item.rating }}</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-100 pt-3 flex flex-wrap justify-between items-center bg-slate-50 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 px-4 sm:px-5 py-3 rounded-b-xl">
          <p class="text-sm text-slate-600">{{ t('orderHistory.paymentMethod') }}: <strong class="text-slate-800">{{ order.paymentMethod === 'cod' ? t('order.paymentCod') : t('order.paymentVnpay') }}</strong></p>
          <p class="text-sm text-slate-600">{{ t('orderHistory.totalAmount') }}:  <strong class="text-lg text-blue-600">{{ formatCurrency(order.totalAmount || 0) }}</strong></p>
        </div>
      </article>

      <!-- Pagination -->
      <div v-if="orderData && orderData.totalPages > 1" class="flex items-center justify-between border-t border-slate-200 mt-2 pt-4">
        <p class="text-sm text-slate-500 font-medium">
          Trang {{ orderData.currentPage + 1 }} / {{ orderData.totalPages }}
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!orderData.hasPrevious"
            @click="prevPage"
          >
            &larr;
          </button>
          <button
            type="button"
            class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!orderData.hasNext"
            @click="nextPage"
          >
            &rarr;
          </button>
        </div>
      </div>
    </section>

    <!-- Cancel Modal -->
    <div v-if="cancelModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
      <div class="w-full max-w-md surface-card p-5 grid gap-4 shadow-2xl">
        <h3 class="text-lg font-extrabold text-slate-900">{{ t('orderHistory.cancelTitle', { id: selectedOrderId }) }}</h3>
        
        <label class="grid gap-2">
          <span class="text-sm font-semibold text-slate-700">{{ t('orderHistory.cancelReason') }}</span>
          <textarea
            v-model="cancelReason"
            rows="3"
            class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            :placeholder="t('orderHistory.cancelReasonPlaceholder')"
          ></textarea>
        </label>
        
        <p v-if="cancelError" class="text-sm text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg font-medium">{{ cancelError }}</p>
        
        <div class="flex justify-end gap-2 mt-2">
          <button
            type="button"
            class="h-10 px-4 rounded-xl font-semibold text-sm border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
            @click="closeCancelModal"
            :disabled="isCancelling"
          >
            {{ t('orderHistory.cancelClose') }}
          </button>
          <button
            type="button"
            class="h-10 px-4 rounded-xl font-extrabold text-sm text-white bg-rose-600 transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submitCancel"
            :disabled="!cancelReason.trim() || isCancelling"
          >
            {{ isCancelling ? t('orderHistory.cancelling') : t('orderHistory.cancelConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
