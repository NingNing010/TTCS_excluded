<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const trustItems = computed(() => [
  {
    token: '01',
    title: t('trust.fastShippingTitle'),
    description: t('trust.fastShippingDesc')
  },
  {
    token: '02',
    title: t('trust.authenticTitle'),
    description: t('trust.authenticDesc')
  },
  {
    token: '03',
    title: t('trust.supportTitle'),
    description: t('trust.supportDesc')
  }
])
</script>

<template>
  <section class="section-block">
    <div class="section-head">
      <h2 class="section-title">{{ t('sections.trust') }}</h2>
    </div>

    <div class="trust-grid">
      <article v-for="item in trustItems" :key="item.token" class="surface-card trust-card">
        <span>{{ item.token }}</span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.trust-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.trust-card {
  padding: 1rem;
}

.trust-card span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: #e8eeff;
  color: #1f5eff;
  font-weight: 800;
  font-size: 0.82rem;
}

.trust-card h3 {
  margin: 0.65rem 0 0.4rem;
  font-size: 1rem;
}

.trust-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.5;
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .trust-grid {
    grid-template-columns: 1fr;
  }
}
</style>
