<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="surface-card admin-home">
    <p class="admin-eyebrow">{{ t('adminHome.eyebrow') }}</p>
    <h1 class="admin-title">{{ t('adminHome.title') }}</h1>
    <p class="admin-subtitle">{{ t('adminHome.subtitle') }}</p>

    <div class="admin-action-grid">
      <NuxtLink id="admin-create-product" to="/admin/create-product" class="admin-action-btn">
        {{ t('adminHome.actions.createProduct') }}
      </NuxtLink>
      <NuxtLink id="admin-update-product" to="/admin/update-product" class="admin-action-btn">
        {{ t('adminHome.actions.updateProductInfo') }}
      </NuxtLink>
      <NuxtLink id="admin-view-promotions" to="/admin/promotions" class="admin-action-btn">
        {{ t('adminHome.actions.viewPromotions') }}
      </NuxtLink>
      <NuxtLink id="admin-create-promotion" to="/admin/create-promotion" class="admin-action-btn">
        {{ t('adminHome.actions.createPromotion') }}
      </NuxtLink>
      <NuxtLink id="admin-view-reports" to="/admin/reports" class="admin-action-btn">
        {{ t('adminHome.actions.viewReports') }}
      </NuxtLink>
    </div>

    <p class="admin-hint">{{ t('common.comingSoon') }}</p>
  </section>
</template>

<style scoped>
.admin-home {
  margin-top: 1.1rem;
  padding: clamp(1rem, 2.4vw, 1.8rem);
}

.admin-eyebrow {
  margin: 0;
  color: #1f5eff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-title {
  margin: 0.45rem 0 0;
  font-size: clamp(1.4rem, 2.6vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.admin-subtitle {
  margin: 0.55rem 0 0;
  max-width: 62ch;
  color: #475569;
}

.admin-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.85rem;
  margin-top: 1.35rem;
}

.admin-action-btn {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid rgba(31, 94, 255, 0.2);
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  min-height: 2.7rem;
  padding: 0.55rem 0.85rem;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.admin-action-btn:hover {
  border-color: rgba(31, 94, 255, 0.45);
  color: #1f5eff;
}

.admin-hint {
  margin: 1rem 0 0;
  color: #475569;
  font-size: 0.82rem;
}
</style>
