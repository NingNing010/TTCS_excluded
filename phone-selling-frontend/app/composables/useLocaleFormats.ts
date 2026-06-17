import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export const useLocaleFormats = () => {
  const { locale } = useI18n()

  const localeCode = computed(() => (locale.value === 'en' ? 'en-US' : 'vi-VN'))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(localeCode.value, {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(localeCode.value, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  return {
    formatCurrency,
    formatDate
  }
}
