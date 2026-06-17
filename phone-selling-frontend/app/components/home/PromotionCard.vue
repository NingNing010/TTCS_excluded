<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import type { PromotionModel } from '~/types/home'

const props = defineProps<{
  promotion: PromotionModel
}>()

const { t } = useI18n()
const { formatCurrency, formatDate } = useLocaleFormats()

const discountLabel = computed(() => {
  if (props.promotion.discountType === 'PERCENT') {
    return t('promotion.discountPercent', { value: props.promotion.discountValue })
  }

  return t('promotion.discountFixed', { value: formatCurrency(props.promotion.discountValue) })
})

const validUntil = computed(() => t('promotion.validUntil', { date: formatDate(props.promotion.endDate) }))
</script>

<template>
  <article class="promotion-card surface-card">
    <div class="promo-image-wrap">
      <img
        :src="promotion.imageUrl || '/placeholders/promo.svg'"
        :alt="promotion.name"
        loading="lazy"
      />
    </div>

    <div class="promo-content">
      <p class="promo-code">{{ t('promotion.code') }}: {{ promotion.voucherCode }}</p>
      <h3>{{ promotion.name }}</h3>
      <p class="promo-description">{{ promotion.description }}</p>
      <p class="promo-value">{{ discountLabel }}</p>
      <p class="promo-date">{{ validUntil }}</p>
    </div>
  </article>
</template>

<style scoped>
.promotion-card {
  overflow: hidden;
}

.promo-image-wrap {
  height: 145px;
  background: linear-gradient(150deg, #e8edff, #f5f8ff);
}

.promo-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.promo-content {
  padding: 0.95rem;
}

.promo-code {
  margin: 0;
  color: #1f5eff;
  font-size: 0.78rem;
  font-weight: 800;
}

h3 {
  margin: 0.4rem 0;
  font-size: 1.02rem;
}

.promo-description {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.45;
  min-height: 2.5rem;
}

.promo-value {
  margin: 0.65rem 0 0;
  font-size: 0.93rem;
  font-weight: 800;
}

.promo-date {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}
</style>
