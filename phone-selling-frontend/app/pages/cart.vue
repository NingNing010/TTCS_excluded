<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { orderService } from '~/services/order.service'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useShippingAddressStore } from '~/stores/shipping-address'

const { t } = useI18n()
const { formatCurrency } = useLocaleFormats()
const authStore = useAuthStore()
const cartStore = useCartStore()
const shippingAddressStore = useShippingAddressStore()
const { items, summary, status, hasPendingChanges, recommendations, recommendationsStatus } = storeToRefs(cartStore)
const { isAuthenticated } = storeToRefs(authStore)
const { addresses, defaultAddress, status: shippingStatus } = storeToRefs(shippingAddressStore)

const selectedPayment = ref<'VNPAY' | 'COD'>('VNPAY')
const selectedAddressId = ref<number | null>(null)
const promoCode = ref('')
const placingOrder = ref(false)
const checkoutError = ref('')
const recommendationAddingId = ref<number | null>(null)
const recommendationMessage = ref('')
const recommendationError = ref('')

await useAsyncData('cart-view', async () => {
  await cartStore.fetchCart(true)
  await cartStore.fetchRecommendations()

  if (isAuthenticated.value) {
    await shippingAddressStore.fetchAddresses()
  }
})

if (isAuthenticated.value && addresses.value.length > 0) {
  selectedAddressId.value = defaultAddress.value?.id || addresses.value[0]?.id || null
}

const isEmpty = computed(() => items.value.length === 0)
const hasShippingAddress = computed(() => addresses.value.length > 0)
const paymentMethodValue = computed<0 | 1>(() => (selectedPayment.value === 'VNPAY' ? 0 : 1))

const handleRefresh = async () => {
  await cartStore.fetchCart(true)
  await cartStore.fetchRecommendations()

  if (isAuthenticated.value) {
    await shippingAddressStore.fetchAddresses()

    if (!selectedAddressId.value && addresses.value.length > 0) {
      selectedAddressId.value = defaultAddress.value?.id || addresses.value[0]?.id || null
    }
  }
}

const handleRecommendationsRefresh = async () => {
  await cartStore.fetchRecommendations()
}

const handleIncrease = (productId: number) => {
  cartStore.increaseItem(productId)
}

const handleDecrease = (productId: number) => {
  cartStore.decreaseItem(productId)
}

const handleSave = async () => {
  await cartStore.saveChanges()
}

const handleAddRecommendation = async (productId: number) => {
  recommendationMessage.value = ''
  recommendationError.value = ''
  recommendationAddingId.value = productId

  const success = await cartStore.addItem(productId, 1)
  if (success) {
    recommendationMessage.value = t('cart.recommendationAdded')
  } else {
    recommendationError.value = status.value.error || t('cart.recommendationAddFailed')
  }

  recommendationAddingId.value = null
}

const toAddressOptionLabel = (address: { recipientName: string; recipientPhone: string; address: string }) => {
  const full = `${address.recipientName} - ${address.recipientPhone} - ${address.address}`
  return full.length > 72 ? `${full.slice(0, 69)}...` : full
}

const handlePlaceOrder = async () => {
  checkoutError.value = ''

  if (!isAuthenticated.value) {
    await navigateTo('/login')
    return
  }

  if (!hasShippingAddress.value || !selectedAddressId.value) {
    checkoutError.value = t('order.noShippingAddress')
    return
  }

  if (hasPendingChanges.value) {
    const saved = await cartStore.saveChanges()
    if (!saved) {
      checkoutError.value = status.value.error || t('order.saveCartFirst')
      return
    }
  }

  placingOrder.value = true

  try {
    const response = await orderService.placeOrder({
      shipAtStore: false,
      shippingAddressId: selectedAddressId.value,
      paymentMethod: paymentMethodValue.value,
      promoCode: promoCode.value.trim().length > 0 ? promoCode.value.trim() : undefined
    })

    if (selectedPayment.value === 'VNPAY') {
      if (!response.paymentUrl) {
        checkoutError.value = t('order.vnpayMissingUrl')
        return
      }

      if (import.meta.client) {
        window.location.href = response.paymentUrl
      }

      return
    }

    await cartStore.fetchCart(true)
    await navigateTo({
      path: '/payment/result',
      query: {
        payment: 'COD',
        orderId: String(response.orderId),
        status: response.status
      }
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === 'string' && message.length > 0) {
        checkoutError.value = message
      }
    }

    if (!checkoutError.value) {
      checkoutError.value = t('order.placeFailed')
    }
  } finally {
    placingOrder.value = false
  }
}

useSeoMeta({
  title: () => t('cart.title')
})
</script>

<template>
  <section class="grid gap-4">
    <div class="flex items-end justify-between gap-3">
      <div>
        <p class="text-xs font-extrabold uppercase tracking-wide text-blue-600">{{ t('header.cart') }}</p>
        <h1 class="mt-1 font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('cart.title') }}</h1>
        <p class="mt-1 text-sm text-slate-600">{{ t('cart.subtitle') }}</p>
        <p v-if="hasPendingChanges" class="mt-1 text-xs font-semibold text-amber-700">
          {{ t('cart.pendingChanges') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-600"
          :disabled="status.refreshing || status.loading || status.saving"
          @click="handleRefresh"
        >
          {{ status.refreshing ? t('cart.refreshing') : t('cart.refresh') }}
        </button>
        <button
          type="button"
          class="h-10 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="!hasPendingChanges || status.saving || status.loading || status.refreshing"
          @click="handleSave"
        >
          {{ status.saving ? t('cart.saving') : t('cart.save') }}
        </button>
      </div>
    </div>

    <CommonSectionSkeleton v-if="status.loading" :lines="2" />

    <CommonSectionError v-else-if="status.error" :message="status.error" @retry="handleRefresh" />

    <article v-else-if="isEmpty" class="surface-card p-5">
      <p class="empty-state">{{ t('cart.empty') }}</p>
      <div class="mt-4">
        <NuxtLink to="/" class="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700">
          {{ t('cart.continueShopping') }}
        </NuxtLink>
      </div>
    </article>

    <section v-else class="grid gap-4 lg:grid-cols-[1fr_310px]">
      <article class="surface-card p-4 sm:p-5">
        <ul class="grid gap-3">
          <li
            v-for="item in items"
            :key="`${item.id}-${item.productId}`"
            class="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 p-3"
          >
            <img
              :src="item.imageUrl || '/placeholders/product.svg'"
              :alt="item.name"
              class="h-16 w-full rounded-lg object-contain bg-slate-50"
            />
            <div>
              <NuxtLink :to="`/products/${item.productId}`" class="font-semibold text-slate-900 hover:text-blue-600">
                {{ item.name }}
              </NuxtLink>
              <div class="mt-1 flex items-center gap-2">
                <span class="text-xs text-slate-500">{{ t('cart.quantity') }}:</span>
                <button
                  type="button"
                  class="h-7 w-7 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="status.saving || status.loading || status.refreshing || item.quantity <= 0"
                  @click="handleDecrease(item.productId)"
                  :aria-label="t('cart.decrease')"
                >
                  -
                </button>
                <span class="min-w-6 text-center text-sm font-semibold text-slate-900">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="h-7 w-7 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="status.saving || status.loading || status.refreshing || item.quantity >= 5"
                  @click="handleIncrease(item.productId)"
                  :aria-label="t('cart.increase')"
                >
                  +
                </button>
              </div>
              <p class="mt-1 text-xs text-slate-500">
                {{ t('cart.unitPrice') }}: {{ formatCurrency(item.unitPrice) }}
              </p>
            </div>
            <strong class="text-sm text-slate-900">{{ formatCurrency(item.lineTotal) }}</strong>
          </li>
        </ul>
      </article>

      <aside class="surface-card h-fit overflow-hidden p-4 sm:p-5">
        <h2 class="text-lg font-extrabold text-slate-900">{{ t('cart.summary') }}</h2>

        <dl class="mt-3 grid gap-2 text-sm">
          <div class="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
            <dt class="text-slate-500">{{ t('cart.itemCount') }}</dt>
            <dd class="font-bold text-slate-900">{{ summary.itemCount }}</dd>
          </div>
          <div class="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
            <dt class="text-slate-500">{{ t('cart.totalQuantity') }}</dt>
            <dd class="font-bold text-slate-900">{{ summary.totalQuantity }}</dd>
          </div>
          <div class="flex items-center justify-between pb-1">
            <dt class="text-slate-500">{{ t('cart.subtotal') }}</dt>
            <dd class="text-base font-extrabold text-slate-900">{{ formatCurrency(summary.subtotal) }}</dd>
          </div>
        </dl>

        <div class="mt-4 grid gap-2">
          <label class="text-xs font-bold uppercase tracking-wide text-slate-600">{{ t('order.shippingAddress') }}</label>

          <template v-if="isAuthenticated">
            <template v-if="shippingStatus.loading">
              <p class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {{ t('order.loadingAddress') }}
              </p>
            </template>
            <template v-else-if="hasShippingAddress">
              <select
                v-model.number="selectedAddressId"
                class="h-11 w-full max-w-full overflow-hidden whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-800 outline-none transition [text-overflow:ellipsis] focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option v-for="address in addresses" :key="address.id" :value="address.id">
                  {{ toAddressOptionLabel(address) }}
                </option>
              </select>
            </template>
            <template v-else>
              <p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {{ t('order.noShippingAddress') }}
              </p>
            </template>

            <NuxtLink to="/account/addresses" class="text-xs font-semibold text-blue-600 hover:underline">
              {{ t('order.manageAddress') }}
            </NuxtLink>
          </template>
          <template v-else>
            <p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {{ t('order.loginRequired') }}
            </p>
          </template>
        </div>

        <div class="mt-4 grid gap-2">
          <label class="text-xs font-bold uppercase tracking-wide text-slate-600">{{ t('order.paymentMethod') }}</label>

          <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input v-model="selectedPayment" type="radio" value="VNPAY" class="h-4 w-4 text-blue-600" />
            {{ t('order.paymentVnpay') }}
          </label>

          <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input v-model="selectedPayment" type="radio" value="COD" class="h-4 w-4 text-blue-600" />
            {{ t('order.paymentCod') }}
          </label>
        </div>

        <div class="mt-4 grid gap-2">
          <label class="text-xs font-bold uppercase tracking-wide text-slate-600">{{ t('order.promoCode') }}</label>
          <input
            v-model="promoCode"
            type="text"
            maxlength="1000"
            class="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            :placeholder="t('order.promoCodePlaceholder')"
          />
          <p class="text-xs text-slate-500">{{ t('order.promoHint') }}</p>
        </div>

        <p v-if="checkoutError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {{ checkoutError }}
        </p>

        <button
          type="button"
          class="mt-4 h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="placingOrder || status.loading || status.refreshing || shippingStatus.loading || (isAuthenticated && !hasShippingAddress)"
          @click="handlePlaceOrder"
        >
          {{ placingOrder ? t('order.placing') : t('order.placeOrder') }}
        </button>
      </aside>
    </section>

    <section v-if="!status.loading && !status.error" class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">{{ t('cart.recommendationsTitle') }}</h2>
          <p class="section-subtitle">{{ t('cart.recommendationsSubtitle') }}</p>
        </div>
      </div>

      <div v-if="recommendationsStatus.loading" class="grid gap-3">
        <div v-for="index in 2" :key="index" class="skeleton h-[220px]" />
      </div>

      <CommonSectionError
        v-else-if="recommendationsStatus.error"
        :message="recommendationsStatus.error"
        @retry="handleRecommendationsRefresh"
      />

      <div v-else-if="recommendations.length > 0" class="grid gap-3">
        <CartRecommendationCard
          v-for="item in recommendations"
          :key="item.id"
          :product="item"
          :adding="status.adding && recommendationAddingId === item.id"
          :disabled="status.adding"
          @add="handleAddRecommendation"
        />
      </div>

      <p v-else class="empty-state">{{ t('cart.recommendationsEmpty') }}</p>

      <p
        v-if="recommendationMessage"
        class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
      >
        {{ recommendationMessage }}
      </p>
      <p
        v-if="recommendationError"
        class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
      >
        {{ recommendationError }}
      </p>
    </section>
  </section>
</template>
