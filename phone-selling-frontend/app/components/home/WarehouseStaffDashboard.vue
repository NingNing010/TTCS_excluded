<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="surface-card warehouse-home">
    <p class="warehouse-eyebrow">{{ t('warehouseHome.eyebrow') }}</p>
    <h1 class="warehouse-title">{{ t('warehouseHome.title') }}</h1>
    <p class="warehouse-subtitle">{{ t('warehouseHome.subtitle') }}</p>

    <div class="warehouse-feature-grid">
      <article class="warehouse-feature-card">
        <h2 class="warehouse-feature-title">{{ t('warehouseHome.features.confirmOrders.title') }}</h2>
        <p class="warehouse-feature-desc">{{ t('warehouseHome.features.confirmOrders.description') }}</p>
        <NuxtLink to="/warehouse/confirm-orders" class="warehouse-action-link">
          {{ t('warehouseHome.confirmPanel.openFeature') }}
        </NuxtLink>
      </article>

      <article class="warehouse-feature-card">
        <h2 class="warehouse-feature-title">{{ t('warehouseHome.features.updateOrderStatus.title') }}</h2>
        <p class="warehouse-feature-desc">{{ t('warehouseHome.features.updateOrderStatus.description') }}</p>
        <NuxtLink to="/warehouse/update-order-status" class="warehouse-action-link">
          {{ t('warehouseHome.confirmPanel.openFeature') }}
        </NuxtLink>
      </article>
      <article class="warehouse-feature-card">
        <h2 class="warehouse-feature-title">{{ t('warehouseHome.features.updateProductQuantity.title') }}</h2>
        <p class="warehouse-feature-desc">{{ t('warehouseHome.features.updateProductQuantity.description') }}</p>
        <NuxtLink to="/warehouse/update-product-quantity" class="warehouse-action-link">
          {{ t('warehouseHome.confirmPanel.openFeature') }}
        </NuxtLink>
      </article>
    </div>
  </section>
</template>

<style scoped>
.warehouse-home {
  margin-top: 1.1rem;
  padding: clamp(1rem, 2.4vw, 1.8rem);
}

.warehouse-eyebrow {
  margin: 0;
  color: #1f5eff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.warehouse-title {
  margin: 0.45rem 0 0;
  font-size: clamp(1.4rem, 2.6vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.warehouse-subtitle {
  margin: 0.55rem 0 0;
  max-width: 62ch;
  color: #475569;
}

.warehouse-feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.35rem;
}

.warehouse-feature-card {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 14px;
  background: #fff;
  padding: 1rem;
}

.warehouse-feature-title {
  margin: 0;
  font-size: 1.06rem;
  font-weight: 800;
}

.warehouse-feature-desc {
  margin: 0.52rem 0 0;
  color: #475569;
  font-size: 0.93rem;
}

.warehouse-feature-state {
  margin: 0.8rem 0 0;
  color: #1f5eff;
  font-size: 0.82rem;
  font-weight: 700;
}

.warehouse-action-link {
  margin-top: 0.95rem;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(31, 94, 255, 0.3);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.1rem;
  padding: 0.4rem 0.85rem;
  font-size: 0.83rem;
  font-weight: 700;
}

@media (max-width: 720px) {
  .warehouse-feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
