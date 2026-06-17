<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import { ratingService } from '~/services/rating.service'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useProductStore } from '~/stores/product'
import type { ProductReviewModel } from '~/types/product'

const route = useRoute()
const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()
const productStore = useProductStore()
const cartStore = useCartStore()
const authStore = useAuthStore()

const productId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const numeric = Number(raw)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
})

const { detail, status } = storeToRefs(productStore)
const { status: cartStatus } = storeToRefs(cartStore)
const { isAuthenticated, role } = storeToRefs(authStore)
const isAdmin = computed(() => role.value === 'ADMIN')
const selectedImage = ref('')
const addToCartMessage = ref('')
const addToCartError = ref('')
const ratingStar = ref(5)
const ratingComment = ref('')
const ratingSubmitting = ref(false)
const ratingSuccess = ref('')
const ratingError = ref('')
const moderationTargetId = ref<number | null>(null)
const moderationReason = ref('')
const moderationSubmitting = ref(false)
const moderationSuccess = ref('')
const moderationError = ref('')
const initialProductId = productId.value

if (!initialProductId) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

await useAsyncData(`product-detail-${initialProductId}`, () => productStore.fetchProductDetail(initialProductId))

watch(
  detail,
  (nextDetail) => {
    if (!nextDetail) {
      selectedImage.value = ''
      return
    }

    if (selectedImage.value && nextDetail.imageUrls.includes(selectedImage.value)) {
      return
    }

    selectedImage.value = nextDetail.imageUrls[0] || '/placeholders/product.svg'
  },
  { immediate: true }
)

const averageRatingLabel = computed(() => {
  if (!detail.value) {
    return '0.0'
  }

  return detail.value.averageRating.toFixed(1)
})

const averageStars = computed(() => {
  if (!detail.value) {
    return ''
  }

  const count = Math.max(0, Math.min(5, Math.round(detail.value.averageRating || 0)))
  return '★'.repeat(count) + '☆'.repeat(5 - count)
})

const homeBackLabel = computed(() => t('detail.backToHome'))

const normalizeName = (value: string | null | undefined) => value?.trim().toLocaleLowerCase() || ''

const isCurrentUserReview = (review: ProductReviewModel) => {
  const currentUserName = normalizeName(authStore.displayName)

  if (!currentUserName) {
    return false
  }

  return normalizeName(review.userName) === currentUserName
}

const shouldShowRatingFormFromQuery = computed(() => {
  const raw = Array.isArray(route.query.rate) ? route.query.rate[0] : route.query.rate
  return raw === '1' || raw === 'true'
})

const displayedReviews = computed(() => {
  if (!detail.value) {
    return []
  }

  return [...detail.value.reviews].sort((left, right) => {
    const leftIsCurrentUser = isCurrentUserReview(left)
    const rightIsCurrentUser = isCurrentUserReview(right)

    if (leftIsCurrentUser && !rightIsCurrentUser) {
      return -1
    }

    if (!leftIsCurrentUser && rightIsCurrentUser) {
      return 1
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
})

const currentUserReview = computed(() => displayedReviews.value.find((review) => isCurrentUserReview(review)) || null)

const canSubmitRating = computed(() => {
  return Boolean(detail.value) && isAuthenticated.value && shouldShowRatingFormFromQuery.value && !currentUserReview.value
})

const setRatingStar = (value: number) => {
  ratingStar.value = Math.max(1, Math.min(5, Math.round(value)))
}

const seoTitle = computed(() => {
  if (!detail.value) {
    return t('detail.fallbackTitle')
  }

  return `${detail.value.name} | ${t('detail.seoSuffix')}`
})

const seoDescription = computed(() => {
  if (!detail.value) {
    return t('detail.fallbackDescription')
  }

  return detail.value.description || t('detail.fallbackDescription')
})

const descriptionHtml = computed(() => detail.value?.description?.trim() || '')

const retryFetch = async () => {
  if (!productId.value) {
    return
  }

  await productStore.fetchProductDetail(productId.value, true)
}

const submitRating = async () => {
  if (!detail.value || !canSubmitRating.value) {
    return
  }

  ratingError.value = ''
  ratingSuccess.value = ''
  ratingSubmitting.value = true

  try {
    await ratingService.createOrUpdateRating({
      productId: detail.value.id,
      star: String(ratingStar.value),
      comment: ratingComment.value.trim() || undefined
    })

    await productStore.fetchProductDetail(detail.value.id, true)
    ratingSuccess.value = t('detail.ratingSuccess')
    ratingComment.value = ''
  } catch (error: any) {
    ratingError.value = error?.data?.message || t('detail.ratingFailed')
  } finally {
    ratingSubmitting.value = false
  }
}

const openModerationPanel = (reviewId: number) => {
  if (!isAdmin.value) {
    return
  }

  moderationTargetId.value = reviewId
  moderationReason.value = ''
  moderationError.value = ''
  moderationSuccess.value = ''
}

const closeModerationPanel = () => {
  moderationTargetId.value = null
  moderationReason.value = ''
  moderationError.value = ''
}

const canModerateReview = (review: ProductReviewModel) => {
  return isAdmin.value && Number.isInteger(review.id) && review.id > 0
}

const hideReview = async (review: ProductReviewModel) => {
  if (!detail.value || !isAdmin.value) {
    return
  }

  if (!Number.isInteger(review.id) || review.id <= 0) {
    moderationError.value = t('detail.adminHideInvalidId')
    return
  }

  const hideReason = moderationReason.value.trim()
  if (!hideReason) {
    moderationError.value = t('detail.adminHideReasonRequired')
    return
  }

  moderationSubmitting.value = true
  moderationError.value = ''
  moderationSuccess.value = ''

  try {
    await ratingService.moderateRating(review.id, {
      hidden: true,
      hideReason
    })

    await productStore.fetchProductDetail(detail.value.id, true)
    moderationSuccess.value = t('detail.adminHideSuccess')
    closeModerationPanel()
  } catch (error: any) {
    moderationError.value = error?.data?.message || t('detail.adminHideFailed')
  } finally {
    moderationSubmitting.value = false
  }
}

const handleAddToCart = async () => {
  if (!detail.value) {
    return
  }

  addToCartMessage.value = ''
  addToCartError.value = ''

  const success = await cartStore.addItem(detail.value.id, 1)
  if (success) {
    addToCartMessage.value = t('detail.addedToCart')
    return
  }

  addToCartError.value = cartStatus.value.error || t('detail.addToCartFailed')
}

watch(productId, async (nextId, prevId) => {
  if (!nextId || nextId === prevId) {
    return
  }

  ratingStar.value = 5
  ratingComment.value = ''
  ratingError.value = ''
  ratingSuccess.value = ''
  closeModerationPanel()
  moderationSuccess.value = ''
  await productStore.fetchProductDetail(nextId, true)
})

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value
})
</script>

<template>
  <div class="grid gap-4">
    <NuxtLink
      class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-700 transition hover:text-blue-600"
      to="/"
    >
      ← {{ homeBackLabel }}
    </NuxtLink>

    <CommonSectionSkeleton v-if="status.loading" :lines="2" />

    <CommonSectionError
      v-else-if="status.error"
      :message="status.error"
      @retry="retryFetch"
    />

    <template v-else-if="detail">
      <section class="surface-card grid gap-5 p-4 lg:grid-cols-2">
        <div class="grid gap-3">
          <div
            class="grid h-[320px] place-items-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:h-[380px]"
          >
            <img :src="selectedImage || '/placeholders/product.svg'" :alt="detail.name" />
          </div>

          <div class="grid grid-cols-[repeat(auto-fill,minmax(74px,1fr))] gap-2">
            <button
              v-for="imageUrl in detail.imageUrls"
              :key="imageUrl"
              type="button"
              class="h-[74px] rounded-xl border bg-white p-1 transition"
              :class="
                imageUrl === selectedImage
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-blue-300'
              "
              @click="selectedImage = imageUrl"
            >
              <img :src="imageUrl" :alt="detail.name" />
            </button>

            <button
              v-if="detail.imageUrls.length === 0"
              type="button"
              class="h-[74px] rounded-xl border border-blue-500 bg-white p-1 ring-2 ring-blue-100"
            >
              <img src="/placeholders/product.svg" :alt="detail.name" />
            </button>
          </div>
        </div>

        <div class="px-1 py-1">
          <p class="text-xs font-extrabold uppercase tracking-wide text-blue-600">{{ detail.brandName }}</p>
          <h1 class="mt-1 font-['Fraunces'] text-3xl leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {{ detail.name }}
          </h1>
          <p class="mt-1 text-sm text-slate-500">{{ detail.type }}</p>

          <div class="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <span class="tracking-wide text-amber-500">{{ averageStars }}</span>
            <strong class="text-slate-900">{{ averageRatingLabel }}</strong>
            <span>({{ displayedReviews.length }} {{ t('detail.reviewCount') }})</span>
          </div>

          <div class="mt-4 flex items-center gap-3">
            <strong class="text-2xl font-extrabold text-slate-900">{{ formatCurrency(detail.basePrice) }}</strong>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
              :class="
                detail.inStock
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              "
            >
              {{ detail.inStock ? t('product.inStock') : t('product.outOfStock') }}
            </span>
          </div>

          <dl class="mt-4 grid gap-2 text-sm">
            <div class="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
              <dt class="text-slate-500">{{ t('detail.stock') }}</dt>
              <dd class="font-bold text-slate-900">{{ detail.stockAvailable }}</dd>
            </div>
            <div class="flex items-center justify-between border-b border-dashed border-slate-200 pb-2">
              <dt class="text-slate-500">{{ t('detail.releaseDate') }}</dt>
              <dd class="font-bold text-slate-900">{{ detail.releaseDate ? formatDate(detail.releaseDate) : '-' }}</dd>
            </div>
          </dl>

          <div class="mt-4 flex flex-wrap gap-2">
            <!-- <button
              type="button"
              class="h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700"
            >
              {{ t('detail.buyNow') }}
            </button> -->
            <button
              type="button"
              class="h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700"
              :disabled="cartStatus.adding || !detail.inStock"
              @click="handleAddToCart"
            >
              {{ cartStatus.adding ? t('detail.addingToCart') : t('detail.addToCart') }}
            </button>
          </div>
          <p
            v-if="addToCartMessage"
            class="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
          >
            {{ addToCartMessage }}
          </p>
          <p
            v-if="addToCartError"
            class="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
          >
            {{ addToCartError }}
          </p>
          <!-- <p class="mt-2 text-xs text-slate-500">{{ t('detail.actionHint') }}</p> -->
        </div>
      </section>

      <section class="section-block grid gap-4 lg:grid-cols-2">
        <article class="surface-card p-4">
          <div class="section-head">
            <h2 class="section-title">{{ t('detail.description') }}</h2>
          </div>

          <div
            v-if="descriptionHtml"
            class="text-sm leading-7 text-slate-700 [&_a]:text-blue-600 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
            v-html="descriptionHtml"
          />
          <p v-else class="empty-state">{{ t('detail.emptyDescription') }}</p>
        </article>

        <article class="surface-card p-4">
          <div class="section-head">
            <h2 class="section-title">{{ t('detail.specifications') }}</h2>
          </div>

          <div v-if="detail.specs.length > 0" class="grid gap-2 text-sm">
            <div
              v-for="spec in detail.specs"
              :key="spec.key"
              class="grid grid-cols-[minmax(120px,0.8fr)_1.2fr] gap-2 border-b border-dashed border-slate-200 pb-2"
            >
              <dt class="text-slate-500">{{ spec.key }}</dt>
              <dd class="m-0 font-semibold text-slate-800">{{ spec.value }}</dd>
            </div>
          </div>
          <p v-else class="empty-state">{{ t('detail.emptySpecs') }}</p>
        </article>
      </section>

      <section class="section-block">
        <div class="section-head">
          <div>
            <h2 class="section-title">{{ t('detail.reviews') }}</h2>
            <p class="section-subtitle">{{ t('detail.reviewSubtitle') }}</p>
          </div>
        </div>

        <article
          v-if="shouldShowRatingFormFromQuery"
          class="surface-card mb-4 grid gap-4 border border-blue-100 bg-blue-50/40 p-4"
        >
          <div>
            <h3 class="text-base font-extrabold text-slate-900">{{ t('detail.ratingFormTitle') }}</h3>
            <p class="mt-1 text-sm text-slate-600">{{ t('detail.ratingFormSubtitle') }}</p>
          </div>

          <p v-if="!isAuthenticated" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            {{ t('detail.loginToRate') }}
          </p>

          <p v-else-if="currentUserReview" class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {{ t('detail.alreadyRated') }}
          </p>

          <form v-else class="grid gap-3" @submit.prevent="submitRating">
            <div class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">{{ t('detail.starLabel') }}</span>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="starValue in 5"
                  :key="starValue"
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-lg border text-lg transition"
                  :class="starValue <= ratingStar ? 'border-amber-300 bg-amber-50 text-amber-500' : 'border-slate-200 bg-white text-slate-400 hover:border-amber-300'"
                  @click="setRatingStar(starValue)"
                >
                  ★
                </button>
              </div>
            </div>

            <label class="grid gap-2">
              <span class="text-sm font-semibold text-slate-700">{{ t('detail.commentLabel') }}</span>
              <textarea
                v-model="ratingComment"
                rows="4"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                :placeholder="t('detail.commentPlaceholder')"
              />
            </label>

            <p v-if="ratingError" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {{ ratingError }}
            </p>
            <p v-if="ratingSuccess" class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              {{ ratingSuccess }}
            </p>

            <div>
              <button
                type="submit"
                class="h-10 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="ratingSubmitting || !canSubmitRating"
              >
                {{ ratingSubmitting ? t('detail.submittingRating') : t('detail.submitRating') }}
              </button>
            </div>
          </form>
        </article>

        <p v-if="moderationSuccess" class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {{ moderationSuccess }}
        </p>

        <div v-if="displayedReviews.length > 0" class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          <article
            v-for="review in displayedReviews"
            :key="review.id"
            class="surface-card p-4"
            :class="isCurrentUserReview(review) ? 'border border-blue-200 bg-blue-50/40' : ''"
          >
            <header class="flex items-center justify-between gap-2">
              <strong>
                {{ review.userName }}
                <span v-if="isCurrentUserReview(review)" class="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  {{ t('detail.yourReviewBadge') }}
                </span>
              </strong>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500">{{ formatDate(review.createdAt) }}</span>
                <button
                  v-if="canModerateReview(review)"
                  type="button"
                  class="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50"
                  @click="openModerationPanel(review.id)"
                >
                  {{ t('detail.adminHideAction') }}
                </button>
              </div>
            </header>
            <p class="mt-2 tracking-wide text-amber-500">
              {{ '★'.repeat(review.star) }}{{ '☆'.repeat(5 - review.star) }}
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-700">{{ review.comment || t('detail.emptyComment') }}</p>

            <div v-if="canModerateReview(review) && moderationTargetId === review.id" class="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label class="grid gap-1">
                <span class="text-xs font-semibold text-slate-700">{{ t('detail.adminHideReasonLabel') }}</span>
                <textarea
                  v-model="moderationReason"
                  rows="3"
                  class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  :placeholder="t('detail.adminHideReasonPlaceholder')"
                />
              </label>

              <p v-if="moderationError" class="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700">
                {{ moderationError }}
              </p>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-extrabold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  :disabled="moderationSubmitting"
                  @click="hideReview(review)"
                >
                  {{ moderationSubmitting ? t('detail.adminHidingRating') : t('detail.adminHideConfirm') }}
                </button>
                <button
                  type="button"
                  class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                  :disabled="moderationSubmitting"
                  @click="closeModerationPanel"
                >
                  {{ t('detail.adminHideCancel') }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <p v-else class="empty-state">{{ t('detail.emptyReviews') }}</p>
      </section>

      <section class="section-block">
        <div class="section-head">
          <div>
            <h2 class="section-title">{{ t('detail.relatedProducts') }}</h2>
            <p class="section-subtitle">{{ t('detail.relatedSubtitle') }}</p>
          </div>
        </div>

        <div v-if="detail.relatedProducts.length > 0" class="product-grid">
          <HomeProductCard v-for="item in detail.relatedProducts" :key="item.id" :product="item" />
        </div>
        <p v-else class="empty-state">{{ t('detail.emptyRelatedProducts') }}</p>
      </section>
    </template>
  </div>
</template>
