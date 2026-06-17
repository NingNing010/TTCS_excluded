<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { reportService } from '~/services/report.service'
import { useAuthStore } from '~/stores/auth'
import type { StatisticsResponse } from '~/types/api'

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const authStore = useAuthStore()
const { role } = storeToRefs(authStore)
const loading = ref(false)
const exporting = ref(false)
const loadError = ref('')
const exportError = ref('')
const exportSuccess = ref('')
const stats = ref<StatisticsResponse | null>(null)
const form = reactive({
  startDate: '',
  endDate: ''
})

const toIsoStartDate = (value: string) => new Date(`${value}T00:00:00`).toISOString()
const toIsoEndDate = (value: string) => new Date(`${value}T23:59:59`).toISOString()

const totalRevenueValue = computed(() => {
  if (!stats.value || stats.value.totalRevenue.length === 0) {
    return 0
  }

  const firstItem = stats.value.totalRevenue[0]
  return firstItem?.totalRevenue || 0
})

const averageRevenueByDay = computed(() => {
  if (!stats.value || stats.value.revenueByDay.length === 0) {
    return 0
  }

  const total = stats.value.revenueByDay.reduce((sum, item) => sum + item.revenue, 0)
  return total / stats.value.revenueByDay.length
})

const highestPaidOrder = computed(() => {
  if (!stats.value || stats.value.topPaidOrders.length === 0) {
    return null
  }

  return stats.value.topPaidOrders.reduce((max, current) => {
    return current.paidAmount > max.paidAmount ? current : max
  })
})

const formatRate = (value: number) => `${(value * 100).toFixed(1)}%`

const statusLabel = (value: string) => {
  const normalized = value.trim().toLowerCase()
  const key = `warehouseHome.orderStatuses.${normalized}`
  const translated = t(key)

  if (translated === key) {
    return value
  }

  return translated
}

const exportStatisticsToExcel = async () => {
  if (!stats.value) {
    exportError.value = t('adminReports.export.noDataLoaded')
    return
  }

  if (!process.client) {
    exportError.value = t('adminReports.export.browserOnly')
    return
  }

  exportError.value = ''
  exportSuccess.value = ''
  exporting.value = true

  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()

    const summaryRows = [
      {
        [t('adminReports.export.summaryLabel')]: t('adminReports.startDateLabel'),
        [t('adminReports.export.summaryValue')]: form.startDate
      },
      {
        [t('adminReports.export.summaryLabel')]: t('adminReports.endDateLabel'),
        [t('adminReports.export.summaryValue')]: form.endDate
      },
      {
        [t('adminReports.export.summaryLabel')]: t('adminReports.cards.totalRevenue'),
        [t('adminReports.export.summaryValue')]: totalRevenueValue.value
      },
      {
        [t('adminReports.export.summaryLabel')]: t('adminReports.cards.averageRevenueByDay'),
        [t('adminReports.export.summaryValue')]: averageRevenueByDay.value
      },
      {
        [t('adminReports.export.summaryLabel')]: t('adminReports.cards.highestPaidOrder'),
        [t('adminReports.export.summaryValue')]: highestPaidOrder.value ? highestPaidOrder.value.orderId : ''
      },
      {
        [t('adminReports.export.summaryLabel')]: t('adminReports.export.exportedAtLabel'),
        [t('adminReports.export.summaryValue')]: new Date().toISOString()
      }
    ]

    const revenueByDayRows = stats.value.revenueByDay.map((item) => ({
      [t('adminReports.columns.day')]: item.day,
      [t('adminReports.columns.revenue')]: item.revenue
    }))

    const totalRevenueRows = stats.value.totalRevenue.map((item) => ({
      [t('adminReports.cards.totalRevenue')]: item.totalRevenue
    }))

    const topPurchasedRows = stats.value.topPurchasedProducts.map((item) => ({
      [t('adminReports.columns.productId')]: item.productId,
      [t('adminReports.columns.product')]: item.productName,
      [t('adminReports.columns.totalPurchased')]: item.totalPurchased
    }))

    const topPaidOrderRows = stats.value.topPaidOrders.map((item) => ({
      [t('adminReports.columns.orderId')]: item.orderId,
      [t('adminReports.columns.paidAmount')]: item.paidAmount,
      [t('adminReports.columns.status')]: item.status,
      [t('adminReports.columns.createdAt')]: item.createdAt
    }))

    const orderRateRows = stats.value.orderRates.map((item) => ({
      [t('adminReports.columns.status')]: item.status,
      [t('adminReports.columns.count')]: item.count,
      [t('adminReports.columns.rate')]: item.rate
    }))

    const lowSellingRows = stats.value.lowSellingNewProducts.map((item) => ({
      [t('adminReports.columns.productId')]: item.productId,
      [t('adminReports.columns.product')]: item.productName,
      [t('adminReports.columns.releaseDate')]: item.releaseDate,
      [t('adminReports.columns.soldQuantity')]: item.soldQuantity
    }))

    const toSheetRows = (rows: Array<Record<string, unknown>>) => {
      if (rows.length > 0) {
        return rows
      }

      return [
        {
          [t('adminReports.export.emptyColumn')]: t('adminReports.export.emptyValue')
        }
      ]
    }

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(summaryRows)), 'Summary')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(revenueByDayRows)), 'RevenueByDay')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(totalRevenueRows)), 'TotalRevenue')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(topPurchasedRows)), 'TopPurchased')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(topPaidOrderRows)), 'TopPaidOrders')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(orderRateRows)), 'OrderRates')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(toSheetRows(lowSellingRows)), 'LowSellingNew')

    const fileName = `admin-statistics-${form.startDate}-to-${form.endDate}.xlsx`
    XLSX.writeFile(workbook, fileName)
    exportSuccess.value = t('adminReports.export.success')
  } catch (error: any) {
    exportError.value = error?.message || t('adminReports.export.failed')
  } finally {
    exporting.value = false
  }
}

const fetchStatistics = async () => {
  loadError.value = ''

  if (!form.startDate || !form.endDate) {
    loadError.value = t('adminReports.validation.dateRequired')
    return
  }

  const start = new Date(`${form.startDate}T00:00:00`)
  const end = new Date(`${form.endDate}T23:59:59`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    loadError.value = t('adminReports.validation.dateInvalid')
    return
  }

  if (start.getTime() > end.getTime()) {
    loadError.value = t('adminReports.validation.dateRangeInvalid')
    return
  }

  loading.value = true

  try {
    stats.value = await reportService.getStatistics({
      startDate: toIsoStartDate(form.startDate),
      endDate: toIsoEndDate(form.endDate)
    })
  } catch (error: any) {
    loadError.value = error?.data?.message || t('adminReports.loadFailed')
  } finally {
    loading.value = false
  }
}

if (role.value !== 'ADMIN') {
  await navigateTo('/')
}

const now = new Date()
const sevenDaysAgo = new Date(now)
sevenDaysAgo.setDate(now.getDate() - 7)
form.startDate = sevenDaysAgo.toISOString().slice(0, 10)
form.endDate = now.toISOString().slice(0, 10)

await fetchStatistics()

useSeoMeta({
  title: () => `${t('adminHome.actions.viewReports')} | ${t('adminHome.metaTitle')}`
})
</script>

<template>
  <section class="mx-auto grid max-w-7xl gap-4">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
      ← {{ t('auth.backToHome') }}
    </NuxtLink>

    <article class="surface-card p-5 sm:p-7">
      <h1 class="font-['Fraunces'] text-3xl leading-tight text-slate-900">{{ t('adminHome.actions.viewReports') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('adminReports.pageSubtitle') }}</p>

      <form class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end" @submit.prevent="fetchStatistics">
        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('adminReports.startDateLabel') }}</span>
          <input
            v-model="form.startDate"
            type="date"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label class="grid gap-1.5">
          <span class="text-sm font-semibold text-slate-700">{{ t('adminReports.endDateLabel') }}</span>
          <input
            v-model="form.endDate"
            type="date"
            class="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <button
          type="submit"
          class="h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="loading"
        >
          {{ loading ? t('adminReports.loadingAction') : t('adminReports.fetchAction') }}
        </button>

        <button
          type="button"
          class="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading || exporting || !stats"
          @click="exportStatisticsToExcel"
        >
          {{ exporting ? t('adminReports.export.exportingAction') : t('adminReports.export.action') }}
        </button>
      </form>

      <p class="mt-3 text-xs text-slate-500">{{ t('adminReports.backendNote') }}</p>
      <p v-if="loadError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
        {{ loadError }}
      </p>
      <p v-if="exportError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
        {{ exportError }}
      </p>
      <p v-if="exportSuccess" class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        {{ exportSuccess }}
      </p>
    </article>

    <CommonSectionSkeleton v-if="loading" :lines="6" />

    <template v-else-if="stats">
      <section class="grid gap-4 md:grid-cols-3">
        <article class="surface-card p-4">
          <p class="text-xs font-extrabold uppercase tracking-wide text-slate-500">{{ t('adminReports.cards.totalRevenue') }}</p>
          <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ formatCurrency(totalRevenueValue) }}</p>
        </article>

        <article class="surface-card p-4">
          <p class="text-xs font-extrabold uppercase tracking-wide text-slate-500">{{ t('adminReports.cards.averageRevenueByDay') }}</p>
          <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ formatCurrency(averageRevenueByDay) }}</p>
        </article>

        <article class="surface-card p-4">
          <p class="text-xs font-extrabold uppercase tracking-wide text-slate-500">{{ t('adminReports.cards.highestPaidOrder') }}</p>
          <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ highestPaidOrder ? `#${highestPaidOrder.orderId}` : '-' }}</p>
          <p v-if="highestPaidOrder" class="mt-1 text-sm text-slate-600">{{ formatCurrency(highestPaidOrder.paidAmount) }}</p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="surface-card p-4">
          <h2 class="text-lg font-extrabold text-slate-900">{{ t('adminReports.sections.revenueByDay') }}</h2>
          <div v-if="stats.revenueByDay.length > 0" class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[360px] text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="px-2 py-2">{{ t('adminReports.columns.day') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.revenue') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.revenueByDay" :key="`${item.day}-${item.revenue}`" class="border-b border-slate-100">
                  <td class="px-2 py-2 font-semibold text-slate-800">{{ formatDate(item.day) }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ formatCurrency(item.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-3 text-sm text-slate-600">{{ t('adminReports.empty.revenueByDay') }}</p>
        </article>

        <article class="surface-card p-4">
          <h2 class="text-lg font-extrabold text-slate-900">{{ t('adminReports.sections.orderRates') }}</h2>
          <div v-if="stats.orderRates.length > 0" class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[360px] text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="px-2 py-2">{{ t('adminReports.columns.status') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.count') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.rate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.orderRates" :key="item.status" class="border-b border-slate-100">
                  <td class="px-2 py-2 font-semibold text-slate-800">{{ statusLabel(item.status) }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ item.count }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ formatRate(item.rate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-3 text-sm text-slate-600">{{ t('adminReports.empty.orderRates') }}</p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="surface-card p-4">
          <h2 class="text-lg font-extrabold text-slate-900">{{ t('adminReports.sections.topPurchasedProducts') }}</h2>
          <div v-if="stats.topPurchasedProducts.length > 0" class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[420px] text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="px-2 py-2">{{ t('adminReports.columns.product') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.productId') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.totalPurchased') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.topPurchasedProducts" :key="item.productId" class="border-b border-slate-100">
                  <td class="px-2 py-2 font-semibold text-slate-800">{{ item.productName }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ item.productId }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ item.totalPurchased }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-3 text-sm text-slate-600">{{ t('adminReports.empty.topPurchasedProducts') }}</p>
        </article>

        <article class="surface-card p-4">
          <h2 class="text-lg font-extrabold text-slate-900">{{ t('adminReports.sections.lowSellingNewProducts') }}</h2>
          <div v-if="stats.lowSellingNewProducts.length > 0" class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[420px] text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="px-2 py-2">{{ t('adminReports.columns.product') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.productId') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.releaseDate') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.soldQuantity') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.lowSellingNewProducts" :key="item.productId" class="border-b border-slate-100">
                  <td class="px-2 py-2 font-semibold text-slate-800">{{ item.productName }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ item.productId }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ formatDate(item.releaseDate) }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ item.soldQuantity }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-3 text-sm text-slate-600">{{ t('adminReports.empty.lowSellingNewProducts') }}</p>
        </article>
      </section>

      <section>
        <article class="surface-card p-4">
          <h2 class="text-lg font-extrabold text-slate-900">{{ t('adminReports.sections.topPaidOrders') }}</h2>
          <div v-if="stats.topPaidOrders.length > 0" class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[560px] text-sm">
              <thead>
                <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th class="px-2 py-2">{{ t('adminReports.columns.orderId') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.paidAmount') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.status') }}</th>
                  <th class="px-2 py-2">{{ t('adminReports.columns.createdAt') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.topPaidOrders" :key="item.orderId" class="border-b border-slate-100">
                  <td class="px-2 py-2 font-semibold text-slate-800">#{{ item.orderId }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ formatCurrency(item.paidAmount) }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ statusLabel(item.status) }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ formatDate(item.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-3 text-sm text-slate-600">{{ t('adminReports.empty.topPaidOrders') }}</p>
        </article>
      </section>
    </template>
  </section>
</template>
