<script setup lang="ts">
defineProps<{
  lines?: number
}>()
</script>

<template>
  <div class="skeleton-grid">
    <div v-for="index in lines ?? 4" :key="index" class="skeleton skeleton-card" />
  </div>
</template>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.skeleton-card {
  height: 290px;
}

@media (max-width: 640px) {
  .skeleton-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .skeleton-card {
    height: 245px;
  }
}
</style>
