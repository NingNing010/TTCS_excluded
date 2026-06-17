<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const { role } = storeToRefs(authStore)
const createdProductId = ref<number | null>(null)

const handleCreated = (productId: number | null) => {
  createdProductId.value = productId
}

if (role.value !== 'ADMIN') {
  await navigateTo('/')
}

useSeoMeta({
  title: () => `${t('adminHome.actions.createProduct')} | ${t('adminHome.metaTitle')}`
})
</script>

<template>
  <section class="mx-auto grid max-w-6xl gap-4">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('auth.backToHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <h1 class="font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('adminHome.actions.createProduct') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('adminCreateProduct.pageSubtitle') }}</p>

      <p v-if="createdProductId" class="mt-3 text-sm text-emerald-700">
        {{ t('adminCreateProduct.form.createdProductId', { id: createdProductId }) }}
        <NuxtLink :to="`/admin/update-product-detail/${createdProductId}`" class="font-semibold underline">
          {{ t('adminCreateProduct.form.openEditAction') }}
        </NuxtLink>
      </p>
    </article>

    <AdminUpdateProductInfoPanel
      mode="create"
      :product="null"
      @created="handleCreated"
    />
  </section>
</template>
