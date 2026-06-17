<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleFormats } from '~/composables/useLocaleFormats'
import type { ProductCardModel } from '~/types/home'

const props = defineProps<{
  product: ProductCardModel
  adding?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  add: [productId: number]
}>()

const { t } = useI18n()
const { formatCurrency } = useLocaleFormats()

const price = computed(() => formatCurrency(props.product.basePrice))
const stockClass = computed(() => (props.product.inStock ? 'pill is-stock' : 'pill is-out'))
const stockLabel = computed(() => (props.product.inStock ? t('product.inStock') : t('product.outOfStock')))

const handleAdd = () => {
  emit('add', props.product.id)
}
</script>

<template>
  <article class="surface-card recommendation-card">
    <NuxtLink :to="`/products/${product.id}`" class="recommendation-link" :aria-label="product.name">
      <div class="recommendation-image">
        <img :src="product.imageUrl || '/placeholders/product.svg'" :alt="product.name" loading="lazy" />
      </div>

      <div class="recommendation-content">
        <p class="recommendation-brand">{{ product.brandName }}</p>
        <h3 class="recommendation-title">{{ product.name }}</h3>
        <p class="recommendation-type">{{ product.type }}</p>

        <div class="recommendation-bottom">
          <strong>{{ price }}</strong>
          <span :class="stockClass">{{ stockLabel }}</span>
        </div>
      </div>
    </NuxtLink>

    <button
      type="button"
      class="recommendation-action"
      :disabled="disabled || adding || !product.inStock"
      @click="handleAdd"
    >
      {{ adding ? t('cart.addingToCart') : t('cart.addToCart') }}
    </button>
  </article>
</template>

<style scoped>
.recommendation-card {
  display: grid;
  gap: 0.85rem;
  padding: 0.9rem;
}

.recommendation-link {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 0.85rem;
  color: inherit;
  text-decoration: none;
}

.recommendation-image {
  height: 96px;
  border-radius: 16px;
  background: linear-gradient(160deg, #f8faff, #edf2fb);
  padding: 0.65rem;
  display: grid;
  place-items: center;
}

.recommendation-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.recommendation-content {
  display: grid;
  gap: 0.25rem;
}

.recommendation-brand {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1f5eff;
}

.recommendation-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
  color: #0f172a;
}

.recommendation-type {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
}

.recommendation-bottom {
  margin-top: 0.35rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.recommendation-bottom strong {
  font-size: 1rem;
}

.recommendation-action {
  height: 40px;
  border-radius: 12px;
  border: none;
  background: #1d4ed8;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease;
}

.recommendation-action:hover {
  background: #1e40af;
}

.recommendation-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .recommendation-link {
    grid-template-columns: 78px 1fr;
  }

  .recommendation-image {
    height: 78px;
  }
}
</style>
