<script setup lang="ts">
import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const { isAuthenticated, status } = storeToRefs(authStore)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmation: ''
})

const localError = ref('')
const localSuccess = ref('')

const isPhoneValid = computed(() => form.phone.trim().length === 0 || /^[0-9]{10}$/.test(form.phone.trim()))
const canSubmit = computed(() => {
  return (
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    form.confirmation.length >= 8 &&
    form.password === form.confirmation &&
    isPhoneValid.value
  )
})

if (isAuthenticated.value) {
  await navigateTo('/')
}

const handleSubmit = async () => {
  localError.value = ''
  localSuccess.value = ''

  if (!canSubmit.value) {
    localError.value = t('auth.registerValidation')
    return
  }

  try {
    await authStore.register({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      confirmation: form.confirmation
    })

    localSuccess.value = t('auth.registerSuccess')

    await navigateTo('/login', {
      query: {
        registered: '1'
      }
    })
  } catch {
    localError.value = status.value.error || t('auth.registerFailed')
  }
}

useSeoMeta({
  title: () => t('auth.registerTitle')
})
</script>

<template>
  <section class="mx-auto grid max-w-xl gap-4">
    <NuxtLink
      to="/"
      class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600"
    >
      ← {{ t('auth.backToHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <p class="text-xs font-extrabold uppercase tracking-wide text-blue-600">{{ t('auth.welcome') }}</p>
      <h1 class="mt-2 font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('auth.registerTitle') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('auth.registerSubtitle') }}</p>

      <form class="mt-5 grid gap-4" @submit.prevent="handleSubmit">
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('auth.fullName') }}</span>
          <input
            v-model="form.name"
            type="text"
            autocomplete="name"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            :placeholder="t('auth.fullNamePlaceholder')"
          />
        </label>

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
          <span class="text-sm font-semibold text-slate-700">{{ t('auth.phone') }}</span>
          <input
            v-model="form.phone"
            type="tel"
            autocomplete="tel"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            :placeholder="t('auth.phonePlaceholder')"
          />
        </label>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('auth.password') }}</span>
            <input
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('auth.passwordPlaceholder')"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-sm font-semibold text-slate-700">{{ t('auth.confirmPassword') }}</span>
            <input
              v-model="form.confirmation"
              type="password"
              autocomplete="new-password"
              class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
            />
          </label>
        </div>

        <p v-if="localError" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {{ localError }}
        </p>

        <p v-if="localSuccess" class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {{ localSuccess }}
        </p>

        <button
          type="submit"
          class="h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="status.loading"
        >
          {{ status.loading ? t('auth.registering') : t('auth.registerAction') }}
        </button>
      </form>

      <p class="mt-4 text-sm text-slate-600">
        {{ t('auth.haveAccount') }}
        <NuxtLink to="/login" class="font-semibold text-blue-600 hover:underline">
          {{ t('auth.loginAction') }}
        </NuxtLink>
      </p>
    </article>
  </section>
</template>
