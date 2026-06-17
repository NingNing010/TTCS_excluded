<script setup lang="ts">
import type { BrandModel } from '~/types/home'

defineProps<{
  brand: BrandModel
}>()
</script>

<template>
  <article class="brand-card surface-card">
    <img :src="brand.logoUrl || '/placeholders/brand.svg'" :alt="brand.name" loading="lazy" />
    <p>{{ brand.name }}</p>
  </article>
</template>

<style scoped>
.brand-card {
  min-height: 110px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 0.5rem;
  padding: 0.8rem;
}

.brand-card img {
  width: 72px;
  height: 42px;
  object-fit: contain;
}

.brand-card p {
  margin: 0;
  font-size: 0.86rem;
  color: #334155;
  font-weight: 700;
}
</style>
