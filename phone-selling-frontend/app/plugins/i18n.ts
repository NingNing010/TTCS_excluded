import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '~/locales/en.json'
import vi from '~/locales/vi.json'

type LocaleCode = 'vi' | 'en'

export default defineNuxtPlugin((nuxtApp) => {
  const localeCookie = useCookie<LocaleCode>('locale', {
    default: () => 'vi',
    sameSite: 'lax'
  })

  const initialLocale: LocaleCode = localeCookie.value === 'en' ? 'en' : 'vi'

  const i18n = createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: 'vi',
    globalInjection: true,
    messages: {
      vi,
      en
    }
  })

  nuxtApp.vueApp.use(i18n)

  if (import.meta.client) {
    watch(
      i18n.global.locale,
      (nextLocale) => {
        localeCookie.value = nextLocale === 'en' ? 'en' : 'vi'
      },
      { immediate: true }
    )
  }
})
