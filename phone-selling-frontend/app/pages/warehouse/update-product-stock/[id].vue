<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const { role } = storeToRefs(authStore)

if (role.value !== 'WAREHOUSE_STAFF') {
  await navigateTo('/')
}

useSeoMeta({
  title: () => `${t('warehouseHome.actions.updateProductQuantity')} | ${t('warehouseHome.metaTitle')}`
})
</script>

<template>
  <section>
    <NuxtLink to="/warehouse/update-product-quantity" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('warehouseHome.stockUpdatePanel.backToSearch') }}
    </NuxtLink>

    <WarehouseUpdateProductStockPanel />
  </section>
</template>
