<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'

const { t } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated, status } = storeToRefs(authStore)
const cartStore = useCartStore()
const route = useRoute()

const form = reactive({
  email: '',
  password: ''
})

const localError = ref('')
const registerSuccess = computed(() => route.query.registered === '1')
const canSubmit = computed(() => form.email.trim().length > 0 && form.password.length >= 8)

if (isAuthenticated.value) {
  await navigateTo('/')
}

const handleSubmit = async () => {
  localError.value = ''

  if (!canSubmit.value) {
    localError.value = t('auth.validation')
    return
  }

  try {
    await authStore.login({
      email: form.email.trim(),
      password: form.password,
      guestId: cartStore.guestId || undefined
    })

    await cartStore.fetchCart(true)

    await navigateTo('/')
  } catch {
    localError.value = status.value.error || t('auth.loginFailed')
  }
}

useSeoMeta({
  title: () => t('auth.loginTitle')
})
</script>

<template>
  <section class="mx-auto grid max-w-lg gap-4">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('auth.backToHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <p class="text-xs font-extrabold uppercase tracking-wide text-blue-600">{{ t('auth.welcome') }}</p>
      <h1 class="mt-2 font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('auth.loginTitle') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('auth.subtitle') }}</p>

      <p
        v-if="registerSuccess"
        class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
      >
        {{ t('auth.registerSuccess') }}
      </p>

      <form class="mt-5 grid gap-4" @submit.prevent="handleSubmit">
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('auth.email') }}</span>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            :placeholder="t('auth.emailPlaceholder')"
          />
        </label>

        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('auth.password') }}</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            :placeholder="t('auth.passwordPlaceholder')"
          />
        </label>

        <p v-if="localError" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {{ localError }}
        </p>

        <button
          type="submit"
          class="h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="status.loading"
        >
          {{ status.loading ? t('auth.loggingIn') : t('auth.loginAction') }}
        </button>
      </form>

      <p class="mt-4 text-sm text-slate-600">
        {{ t('auth.noAccount') }}
        <NuxtLink to="/register" class="font-semibold text-blue-600 hover:underline">
          {{ t('auth.registerAction') }}
        </NuxtLink>
      </p>
    </article>
  </section>
</template>
