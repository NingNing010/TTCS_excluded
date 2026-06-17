<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useHomeStore } from '~/stores/home'

const { t } = useI18n()
const homeStore = useHomeStore()

const { featured, newArrivals, brands, promotions, status } = storeToRefs(homeStore)
await useAsyncData('home-page-data', () => homeStore.fetchHomeData())

const homeTitle = computed(() => t('meta.homeTitle'))
const homeDescription = computed(() => t('meta.homeDescription'))

useSeoMeta({
  title: () => homeTitle.value,
  description: () => homeDescription.value,
  ogTitle: () => homeTitle.value,
  ogDescription: () => homeDescription.value
})
</script>

<template>
  <div>
    <HomeHeroBanner />

    <section id="featured" class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">{{ t('sections.featured') }}</h2>
          <p class="section-subtitle">{{ t('home.featuredSubtitle') }}</p>
        </div>
      </div>

      <CommonSectionSkeleton v-if="status.featured.loading" :lines="4" />
      <CommonSectionError
        v-else-if="status.featured.error"
        :message="status.featured.error"
        @retry="homeStore.reloadSection('featured')"
      />
      <div v-else-if="featured.length > 0" class="product-grid">
        <HomeProductCard v-for="item in featured" :key="item.id" :product="item" />
      </div>
      <p v-else class="empty-state">{{ t('home.emptyProducts') }}</p>
    </section>

    <section id="new-arrivals" class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">{{ t('sections.newArrivals') }}</h2>
          <p class="section-subtitle">{{ t('home.newArrivalsSubtitle') }}</p>
        </div>
      </div>

      <CommonSectionSkeleton v-if="status.newArrivals.loading" :lines="4" />
      <CommonSectionError
        v-else-if="status.newArrivals.error"
        :message="status.newArrivals.error"
        @retry="homeStore.reloadSection('newArrivals')"
      />
      <div v-else-if="newArrivals.length > 0" class="product-grid">
        <HomeProductCard v-for="item in newArrivals" :key="item.id" :product="item" />
      </div>
      <p v-else class="empty-state">{{ t('home.emptyProducts') }}</p>
    </section>

    <section class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">{{ t('sections.brands') }}</h2>
          <p class="section-subtitle">{{ t('home.brandsSubtitle') }}</p>
        </div>
      </div>

      <CommonSectionSkeleton v-if="status.brands.loading" :lines="5" />
      <CommonSectionError
        v-else-if="status.brands.error"
        :message="status.brands.error"
        @retry="homeStore.reloadSection('brands')"
      />
      <div v-else-if="brands.length > 0" class="brand-grid">
        <HomeBrandCard v-for="item in brands" :key="item.id" :brand="item" />
      </div>
      <p v-else class="empty-state">{{ t('home.emptyBrands') }}</p>
    </section>

    <section id="promotions" class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">{{ t('sections.promotions') }}</h2>
          <p class="section-subtitle">{{ t('home.promotionsSubtitle') }}</p>
        </div>
      </div>

      <CommonSectionSkeleton v-if="status.promotions.loading" :lines="3" />
      <CommonSectionError
        v-else-if="status.promotions.error"
        :message="status.promotions.error"
        @retry="homeStore.reloadSection('promotions')"
      />
      <div v-else-if="promotions.length > 0" class="promo-grid">
        <HomePromotionCard v-for="item in promotions" :key="item.id" :promotion="item" />
      </div>
      <p v-else class="empty-state">{{ t('home.emptyPromotions') }}</p>
    </section>

    <HomeTrustHighlights />
  </div>
</template>
