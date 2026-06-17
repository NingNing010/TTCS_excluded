<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()

const paymentType = computed(() => {
  const raw = route.query.payment
  if (Array.isArray(raw)) {
    return raw[0] || ''
  }
  return raw || ''
})

const orderId = computed(() => {
  const vnpRef = route.query.vnp_TxnRef
  const raw = Array.isArray(vnpRef) ? vnpRef[0] : vnpRef
  if (raw) {
    return String(raw)
  }

  const orderQuery = route.query.orderId
  const fallback = Array.isArray(orderQuery) ? orderQuery[0] : orderQuery
  return fallback ? String(fallback) : ''
})

const vnpResponseCode = computed(() => {
  const raw = route.query.vnp_ResponseCode
  return Array.isArray(raw) ? raw[0] : raw
})

const vnpTransactionNo = computed(() => {
  const raw = route.query.vnp_TransactionNo
  return Array.isArray(raw) ? raw[0] : raw
})

const codStatus = computed(() => {
  const raw = route.query.status
  return Array.isArray(raw) ? raw[0] : raw
})

const isVnpayResult = computed(() => !!vnpResponseCode.value)
const isVnpaySuccess = computed(() => vnpResponseCode.value === '00')

const isCodSuccess = computed(() => {
  if (String(paymentType.value).toUpperCase() !== 'COD') {
    return false
  }

  return codStatus.value ? codStatus.value !== 'CANCELLED' : true
})

const isSuccess = computed(() => {
  if (isVnpayResult.value) {
    return isVnpaySuccess.value
  }

  if (String(paymentType.value).toUpperCase() === 'COD') {
    return isCodSuccess.value
  }

  return false
})

const methodLabel = computed(() => {
  if (isVnpayResult.value) {
    return 'VNPAY'
  }

  const payment = String(paymentType.value).toUpperCase()
  return payment || 'N/A'
})

const statusLabel = computed(() => {
  if (isVnpayResult.value) {
    return isVnpaySuccess.value ? t('payment.success') : t('payment.failed')
  }

  if (String(paymentType.value).toUpperCase() === 'COD') {
    return isCodSuccess.value ? t('payment.codCreated') : t('payment.codFailed')
  }

  return t('payment.unknown')
})

const statusClass = computed(() => {
  if (isSuccess.value) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  return 'border-rose-200 bg-rose-50 text-rose-700'
})

useSeoMeta({
  title: () => t('payment.resultTitle')
})
</script>

<template>
  <section class="mx-auto grid max-w-2xl gap-4">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('payment.backHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <p class="text-xs font-extrabold uppercase tracking-wide text-blue-600">{{ t('payment.titleEyebrow') }}</p>
      <h1 class="mt-2 font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('payment.resultTitle') }}</h1>

      <p class="mt-4 rounded-xl border px-3 py-2 text-sm font-semibold" :class="statusClass">
        {{ statusLabel }}
      </p>

      <dl class="mt-5 grid gap-2 text-sm">
        <div class="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
          <dt class="text-slate-500">{{ t('payment.orderId') }}</dt>
          <dd class="font-bold text-slate-900">{{ orderId || '-' }}</dd>
        </div>
        <div class="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
          <dt class="text-slate-500">{{ t('payment.method') }}</dt>
          <dd class="font-bold text-slate-900">{{ methodLabel }}</dd>
        </div>
        <div v-if="isVnpayResult" class="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
          <dt class="text-slate-500">{{ t('payment.responseCode') }}</dt>
          <dd class="font-bold text-slate-900">{{ vnpResponseCode }}</dd>
        </div>
        <div v-if="isVnpayResult" class="flex items-center justify-between pb-1">
          <dt class="text-slate-500">{{ t('payment.transactionNo') }}</dt>
          <dd class="font-bold text-slate-900">{{ vnpTransactionNo || '-' }}</dd>
        </div>
      </dl>

      <div class="mt-5 flex flex-wrap gap-2">
        <NuxtLink to="/cart" class="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-600">
          {{ t('payment.backCart') }}
        </NuxtLink>
        <NuxtLink to="/" class="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700">
          {{ t('payment.backHome') }}
        </NuxtLink>
      </div>
    </article>
  </section>
</template>
