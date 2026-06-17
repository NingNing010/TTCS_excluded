<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { promotionService } from '~/services/promotion.service'
import { useAuthStore } from '~/stores/auth'
import type { PromoResponse } from '~/types/api'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const authStore = useAuthStore()
const { role } = storeToRefs(authStore)
const promotions = ref<PromoResponse[]>([])
const loading = ref(false)
const loadError = ref('')
const startDateAfter = ref('')
const endDateBefore = ref('')

const resolvePromoImage = (value: unknown): string | null => {
  if (!value) {
    return null
  }

  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = resolvePromoImage(item)
      if (candidate) {
        return candidate
      }
    }

    return null
  }

  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const candidate = resolvePromoImage(item)
      if (candidate) {
        return candidate
      }
    }
  }

  return null
}

const displayDiscountValue = (promo: PromoResponse) => {
  if (promo.discountType === 'PERCENT') {
    return t('promotion.discountPercent', { value: promo.discountValue })
  }

  return t('promotion.discountFixed', { value: formatCurrency(promo.discountValue) })
}

const sortedPromotions = computed(() => {
  return [...promotions.value].sort((left, right) => {
    return new Date(right.startDate).getTime() - new Date(left.startDate).getTime()
  })
})

const filteredPromotions = computed(() => {
  const startBound = startDateAfter.value ? new Date(`${startDateAfter.value}T00:00:00`).getTime() : null
  const endBound = endDateBefore.value ? new Date(`${endDateBefore.value}T23:59:59`).getTime() : null

  return sortedPromotions.value.filter((promo) => {
    const promoStart = new Date(promo.startDate).getTime()
    const promoEnd = new Date(promo.endDate).getTime()

    if (startBound !== null && (Number.isNaN(promoStart) || promoStart < startBound)) {
      return false
    }

    if (endBound !== null && (Number.isNaN(promoEnd) || promoEnd > endBound)) {
      return false
    }

    return true
  })
})

const hasActiveFilter = computed(() => Boolean(startDateAfter.value || endDateBefore.value))

const clearFilters = () => {
  startDateAfter.value = ''
  endDateBefore.value = ''
}

const loadPromotions = async () => {
  loading.value = true
  loadError.value = ''

  try {
    promotions.value = await promotionService.getAllPromotions()
  } catch (error: any) {
    loadError.value = error?.data?.message || t('adminPromotionList.loadFailed')
  } finally {
    loading.value = false
  }
}

if (role.value !== 'ADMIN') {
  await navigateTo('/')
}

await loadPromotions()

useSeoMeta({
  title: () => `${t('adminHome.actions.viewPromotions')} | ${t('adminHome.metaTitle')}`
})
</script>

<template>
  <section class="mx-auto grid max-w-6xl gap-4">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('auth.backToHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <h1 class="font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('adminHome.actions.viewPromotions') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('adminPromotionList.pageSubtitle') }}</p>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/admin/create-promotion"
          class="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700"
        >
          {{ t('adminHome.actions.createPromotion') }}
        </NuxtLink>
        <span class="text-sm text-slate-600">
          {{ t('adminPromotionList.totalCount', { count: promotions.length }) }}
        </span>
      </div>
    </article>

    <article class="surface-card grid gap-3 p-5 sm:p-6">
      <h2 class="text-lg font-extrabold text-slate-900">{{ t('adminPromotionList.filterTitle') }}</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('adminPromotionList.startDateAfterLabel') }}</span>
          <input
            v-model="startDateAfter"
            type="date"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('adminPromotionList.endDateBeforeLabel') }}</span>
          <input
            v-model="endDateBefore"
            type="date"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <button
          type="button"
          class="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!hasActiveFilter"
          @click="clearFilters"
        >
          {{ t('adminPromotionList.clearFilterAction') }}
        </button>
      </div>

      <p class="text-sm text-slate-600">
        {{ t('adminPromotionList.filteredCount', { count: filteredPromotions.length }) }}
      </p>
    </article>

    <CommonSectionSkeleton v-if="loading" :lines="5" />

    <CommonSectionError v-else-if="loadError" :message="loadError" @retry="loadPromotions" />

    <div v-else-if="filteredPromotions.length > 0" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="promo in filteredPromotions"
        :key="promo.id"
        class="surface-card grid gap-3 p-4"
      >
        <img
          v-if="resolvePromoImage(promo.promoImageUrls)"
          :src="resolvePromoImage(promo.promoImageUrls) || undefined"
          :alt="promo.name"
          class="h-40 w-full rounded-xl border border-slate-200 object-cover"
        />

        <div class="grid gap-1">
          <h3 class="text-lg font-extrabold text-slate-900">{{ promo.name }}</h3>
          <p class="text-sm font-semibold text-blue-700">{{ promo.voucherCode }}</p>
          <p class="text-sm font-semibold text-amber-600">{{ displayDiscountValue(promo) }}</p>
        </div>

        <dl class="grid gap-1 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500">{{ t('adminPromotionList.startDateLabel') }}</dt>
            <dd class="font-semibold text-slate-900">{{ formatDate(promo.startDate) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500">{{ t('adminPromotionList.endDateLabel') }}</dt>
            <dd class="font-semibold text-slate-900">{{ formatDate(promo.endDate) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500">{{ t('adminPromotionList.usageLabel') }}</dt>
            <dd class="font-semibold text-slate-900">{{ promo.usageCount || 0 }}/{{ promo.usageLimit || 0 }}</dd>
          </div>
          <div v-if="promo.discountType === 'PERCENT' && promo.maxDiscountMoneyPerOrder" class="flex items-center justify-between gap-3">
            <dt class="text-slate-500">{{ t('adminPromotionList.maxDiscountLabel') }}</dt>
            <dd class="font-semibold text-slate-900">{{ formatCurrency(promo.maxDiscountMoneyPerOrder) }}</dd>
          </div>
        </dl>

        <p class="text-sm text-slate-700">{{ promo.description || t('adminPromotionList.emptyDescription') }}</p>
      </article>
    </div>

    <article v-else class="surface-card p-5 sm:p-6">
      <p class="text-sm text-slate-600">{{ t('adminPromotionList.empty') }}</p>
    </article>
  </section>
</template>
