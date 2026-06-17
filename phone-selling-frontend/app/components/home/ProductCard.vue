<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import type { ProductCardModel } from '~/types/home'

const props = defineProps<{
  product: ProductCardModel
}>()

const { t } = useI18n()
const { formatCurrency } = useLocaleFormats()

const price = computed(() => formatCurrency(props.product.basePrice))
const stockClass = computed(() => (props.product.inStock ? 'pill is-stock' : 'pill is-out'))
const stockLabel = computed(() => (props.product.inStock ? t('product.inStock') : t('product.outOfStock')))
</script>

<template>
  <NuxtLink :to="`/products/${product.id}`" class="product-card surface-card" :aria-label="product.name">
    <div class="product-image-wrap">
      <img :src="product.imageUrl || '/placeholders/product.svg'" :alt="product.name" loading="lazy" />
    </div>

    <div class="product-content">
      <p class="product-brand">{{ product.brandName }}</p>
      <h3>{{ product.name }}</h3>
      <p class="product-type">{{ product.type }}</p>

      <div class="product-bottom">
        <strong>{{ price }}</strong>
        <span :class="stockClass">{{ stockLabel }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.product-card {
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 35px rgba(15, 23, 42, 0.12);
}

.product-image-wrap {
  height: 170px;
  padding: 1rem;
  background: linear-gradient(160deg, #f8faff, #edf2fb);
}

.product-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-content {
  padding: 0.9rem 0.9rem 1rem;
}

.product-brand {
  margin: 0;
  font-size: 0.78rem;
  color: #1f5eff;
  font-weight: 700;
}

h3 {
  margin: 0.28rem 0;
  font-size: 1rem;
  line-height: 1.35;
}

.product-type {
  margin: 0;
  color: #64748b;
  font-size: 0.82rem;
}

.product-bottom {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.product-bottom strong {
  font-size: 1rem;
}
</style>
