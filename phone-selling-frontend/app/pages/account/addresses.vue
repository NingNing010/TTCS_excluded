<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { useShippingAddressStore } from '~/stores/shipping-address'
import type { ShippingAddressResponse } from '~/types/api'

const { t } = useI18n()
const authStore = useAuthStore()
const shippingAddressStore = useShippingAddressStore()
const { isAuthenticated } = storeToRefs(authStore)
const { addresses, status } = storeToRefs(shippingAddressStore)

if (!isAuthenticated.value) {
  await navigateTo('/login')
}

await useAsyncData('shipping-addresses', () => shippingAddressStore.fetchAddresses())

const editingId = ref<number | null>(null)
const localError = ref('')

const form = reactive({
  recipientName: '',
  recipientPhone: '',
  address: '',
  isDefault: false
})

const canSubmit = computed(() => {
  const phone = form.recipientPhone.trim()
  return (
    form.recipientName.trim().length > 0 &&
    form.address.trim().length > 0 &&
    /^[0-9]{10}$/.test(phone)
  )
})

const pageTitle = computed(() => t('address.title'))
const isEditing = computed(() => editingId.value !== null)

const resetForm = () => {
  form.recipientName = ''
  form.recipientPhone = ''
  form.address = ''
  form.isDefault = addresses.value.length === 0
  editingId.value = null
  localError.value = ''
}

const fillForm = (address: ShippingAddressResponse) => {
  form.recipientName = address.recipientName
  form.recipientPhone = address.recipientPhone
  form.address = address.address
  form.isDefault = address.isDefault
}

const startCreate = () => {
  resetForm()
}

const startEdit = (address: ShippingAddressResponse) => {
  editingId.value = address.id
  localError.value = ''
  fillForm(address)
}

const setDefaultAddress = (address: ShippingAddressResponse) => {
  startEdit(address)
  form.isDefault = true
}

const handleSubmit = async () => {
  localError.value = ''

  if (!canSubmit.value) {
    localError.value = t('address.validation')
    return
  }

  const payload = {
    recipientName: form.recipientName.trim(),
    recipientPhone: form.recipientPhone.trim(),
    address: form.address.trim(),
    isDefault: form.isDefault
  }

  try {
    if (editingId.value) {
      await shippingAddressStore.updateAddress(editingId.value, payload)
    } else {
      await shippingAddressStore.createAddress(payload)
    }

    resetForm()
  } catch {
    localError.value = status.value.error || t('address.saveFailed')
  }
}

const handleDelete = async (addressId: number) => {
  localError.value = ''

  try {
    await shippingAddressStore.deleteAddress(addressId)

    if (editingId.value === addressId) {
      resetForm()
    }
  } catch {
    localError.value = status.value.error || t('address.deleteFailed')
  }
}

const handleCancelEdit = () => {
  resetForm()
}

useSeoMeta({
  title: () => pageTitle.value
})
</script>

<template>
  <section class="grid gap-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-extrabold uppercase tracking-wide text-blue-600">{{ t('header.account') }}</p>
        <h1 class="mt-1 font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('address.title') }}</h1>
        <p class="mt-1 text-sm text-slate-600">{{ t('address.subtitle') }}</p>
      </div>

      <button
        type="button"
        class="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-600"
        @click="startCreate"
      >
        {{ t('address.addNew') }}
      </button>
    </div>

    <article class="surface-card p-4 sm:p-5">
      <h2 class="text-lg font-extrabold text-slate-900">
        {{ isEditing ? t('address.editTitle') : t('address.createTitle') }}
      </h2>

      <form class="mt-4 grid gap-3" @submit.prevent="handleSubmit">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('address.recipientName') }}</span>
            <input
              v-model="form.recipientName"
              type="text"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('address.recipientNamePlaceholder')"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('address.recipientPhone') }}</span>
            <input
              v-model="form.recipientPhone"
              type="tel"
              inputmode="numeric"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('address.recipientPhonePlaceholder')"
            />
          </label>
        </div>

        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('address.fullAddress') }}</span>
          <textarea
            v-model="form.address"
            rows="3"
            class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            :placeholder="t('address.fullAddressPlaceholder')"
          />
        </label>

        <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            v-model="form.isDefault"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          {{ t('address.setDefault') }}
        </label>

        <p class="text-xs text-slate-500">{{ t('address.defaultHint') }}</p>

        <p v-if="localError" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {{ localError }}
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            class="h-10 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="status.submitting"
          >
            {{ status.submitting ? t('address.saving') : t('address.save') }}
          </button>

          <button
            v-if="isEditing"
            type="button"
            class="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-600"
            @click="handleCancelEdit"
          >
            {{ t('address.cancelEdit') }}
          </button>
        </div>
      </form>
    </article>

    <CommonSectionSkeleton v-if="status.loading" :lines="2" />

    <CommonSectionError v-else-if="status.error" :message="status.error" @retry="shippingAddressStore.fetchAddresses" />

    <article v-else-if="addresses.length === 0" class="surface-card p-5">
      <p class="empty-state">{{ t('address.empty') }}</p>
    </article>

    <section v-else class="grid gap-3">
      <article
        v-for="address in addresses"
        :key="address.id"
        class="surface-card grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start"
      >
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <strong class="text-slate-900">{{ address.recipientName }}</strong>
            <span class="text-sm text-slate-500">{{ address.recipientPhone }}</span>
            <span
              v-if="address.isDefault"
              class="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"
            >
              {{ t('address.defaultTag') }}
            </span>
          </div>

          <p class="mt-2 text-sm leading-6 text-slate-700">{{ address.address }}</p>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <button
            v-if="!address.isDefault"
            type="button"
            class="h-9 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
            @click="setDefaultAddress(address)"
          >
            {{ t('address.makeDefault') }}
          </button>
          <button
            type="button"
            class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            @click="startEdit(address)"
          >
            {{ t('address.edit') }}
          </button>
          <button
            type="button"
            class="h-9 rounded-lg border border-rose-300 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="status.deletingId === address.id"
            @click="handleDelete(address.id)"
          >
            {{ status.deletingId === address.id ? t('address.deleting') : t('address.delete') }}
          </button>
        </div>
      </article>
    </section>
  </section>
</template>
