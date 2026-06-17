<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { homeService } from '~/services/home.service'
import type { ProductSearchQuery } from '~/types/search'
import { toRouteSearchQuery } from '~/utils/searchQuery'

const { t } = useI18n()
const brandOptions = ref<string[]>([])

const loadBrandOptions = async () => {
  try {
    const brands = await homeService.getBrands()
    brandOptions.value = brands
      .map((brand) => brand.name)
      .filter((name) => typeof name === 'string' && name.length > 0)
  } catch {
    brandOptions.value = []
  }
}

onMounted(loadBrandOptions)

const handleSearch = async (query: ProductSearchQuery) => {
  await navigateTo({
    path: '/search',
    query: toRouteSearchQuery(query)
  })
}
</script>

<template>
  <section class="hero surface-card">
    <div class="hero-copy">
      <p class="hero-eyebrow">{{ t('hero.eyebrow') }}</p>
      <h1>{{ t('hero.title') }}</h1>
      <p class="hero-description">{{ t('hero.description') }}</p>

      <div class="hero-cta">
        <a href="#featured" class="primary-btn">{{ t('hero.primaryCta') }}</a>
        <a href="#promotions" class="secondary-btn">{{ t('hero.secondaryCta') }}</a>
      </div>

      <SearchProductSearchBar
        compact
        :brand-options="brandOptions"
        :placeholder="t('hero.searchPlaceholder')"
        :show-hint="true"
        :hint-text="t('hero.searchHint')"
        @submit="handleSearch"
      />
    </div>

    <div class="hero-visual" aria-hidden="true">
      <div class="device-card top" />
      <div class="device-card mid" />
      <div class="device-card base" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1rem;
  min-height: 360px;
  padding: 1.8rem;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(circle at 15% 10%, rgba(31, 94, 255, 0.08), transparent 48%),
    radial-gradient(circle at 85% 40%, rgba(15, 23, 42, 0.1), transparent 45%),
    #ffffff;
}

.hero::after {
  content: '';
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: rgba(31, 94, 255, 0.09);
  right: -90px;
  top: -120px;
}

.hero-copy {
  position: relative;
  z-index: 1;
}

.hero-eyebrow {
  margin: 0;
  font-size: 0.82rem;
  color: #1f5eff;
  letter-spacing: 0.08em;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  margin: 0.65rem 0;
  max-width: 22ch;
  font-family: 'Fraunces', serif;
  font-size: clamp(1.8rem, 4vw, 2.9rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.hero-description {
  margin: 0;
  color: #475569;
  max-width: 48ch;
  line-height: 1.6;
}

.hero-cta {
  margin-top: 1.15rem;
  display: flex;
  gap: 0.7rem;
}

.primary-btn,
.secondary-btn {
  height: 40px;
  border-radius: 12px;
  font-weight: 700;
  padding-inline: 1rem;
  display: inline-flex;
  align-items: center;
}

.primary-btn {
  background: #1f5eff;
  color: #fff;
}

.secondary-btn {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
}

.hero-visual {
  position: relative;
  min-height: 250px;
}

.device-card {
  position: absolute;
  right: 0;
  width: min(230px, 70%);
  aspect-ratio: 3 / 6;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.18);
}

.device-card.top {
  top: 0;
  background: linear-gradient(180deg, #d2deff 0%, #f4f7ff 100%);
  transform: rotate(12deg) translateX(-15px);
}

.device-card.mid {
  top: 40px;
  background: linear-gradient(180deg, #d5ffe8 0%, #f2fff8 100%);
  transform: rotate(-8deg) translateX(-65px);
}

.device-card.base {
  top: 86px;
  background: linear-gradient(180deg, #0f172a 0%, #2c3342 100%);
  transform: rotate(4deg) translateX(-25px);
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .hero-visual {
    min-height: 180px;
  }

  .device-card {
    left: 35%;
    right: auto;
  }
}
</style>
