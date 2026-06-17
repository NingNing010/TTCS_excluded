<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import type { ProductSearchQuery } from '~/types/search'
import { normalizeSearchQuery, toRouteSearchQuery } from '~/utils/searchQuery'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const { role } = storeToRefs(authStore)

const searchQuery = computed(() => normalizeSearchQuery(route.query))

const updateRouteQuery = async (query: ProductSearchQuery) => {
  const nextQuery = toRouteSearchQuery(query)

  await navigateTo({
    path: '/admin/update-product',
    query: nextQuery
  })
}

const handleSearch = async (query: ProductSearchQuery) => {
  await updateRouteQuery(query)
}

const handleSelectProduct = async (productId: number) => {
  await navigateTo(`/admin/update-product-detail/${productId}`)
}

if (role.value !== 'ADMIN') {
  await navigateTo('/')
}

useSeoMeta({
  title: () => `${t('adminHome.actions.updateProductInfo')} | ${t('adminHome.metaTitle')}`
})
</script>

<template>
  <section class="mx-auto grid max-w-6xl gap-4">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('auth.backToHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <h1 class="font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('adminHome.actions.updateProductInfo') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('adminUpdateProduct.pageSubtitle') }}</p>
    </article>

    <AdminUpdateProductInfoSearchPanel
      :initial-query="searchQuery"
      :selected-product-id="null"
      @search="handleSearch"
      @select-product="handleSelectProduct"
    />
  </section>
</template>
