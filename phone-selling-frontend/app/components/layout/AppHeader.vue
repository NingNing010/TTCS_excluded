<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { primaryNavigation, type NavigationItem } from '~/constants/navigation'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const cartStore = useCartStore()
const { isAuthenticated, displayName, status, role } = storeToRefs(authStore)
const { summary } = storeToRefs(cartStore)

const localeToggleLabel = computed(() => (locale.value === 'vi' ? 'EN' : 'VI'))
const accountLabel = computed(() => (displayName.value ? displayName.value : t('header.account')))
const isAdmin = computed(() => role.value === 'ADMIN')
const isWarehouseStaff = computed(() => role.value === 'WAREHOUSE_STAFF')
const isBackofficeRole = computed(() => isWarehouseStaff.value || isAdmin.value)
const warehouseNavigation: NavigationItem[] = [
  {
    labelKey: 'warehouseHome.features.confirmOrders.title',
    to: '/warehouse/confirm-orders'
  },
  {
    labelKey: 'warehouseHome.features.updateOrderStatus.title',
    to: '/warehouse/update-order-status'
  },
  {
    labelKey: 'warehouseHome.actions.updateProductQuantity',
    to: '/warehouse/update-product-quantity'
  }
]
const adminNavigation: NavigationItem[] = [
  {
    labelKey: 'adminHome.actions.createProduct',
    to: '/admin/create-product'
  },
  {
    labelKey: 'adminHome.actions.updateProductInfo',
    to: '/admin/update-product'
  },
  {
    labelKey: 'adminHome.actions.viewPromotions',
    to: '/admin/promotions'
  },
  {
    labelKey: 'adminHome.actions.createPromotion',
    to: '/admin/create-promotion'
  },
  {
    labelKey: 'adminHome.actions.viewReports',
    to: '/admin/reports'
  }
]
const navigation = computed(() => {
  if (isWarehouseStaff.value) {
    return warehouseNavigation
  }

  if (isAdmin.value) {
    return adminNavigation
  }

  return primaryNavigation
})
const cartCount = computed(() => summary.value.totalQuantity)
const menuRef = ref<HTMLElement | null>(null)
const isMenuOpen = ref(false)

const switchLocale = () => {
  locale.value = locale.value === 'vi' ? 'en' : 'vi'
}

const handleLogout = async () => {
  isMenuOpen.value = false
  await authStore.logout()
  await cartStore.fetchCart(true)
  await navigateTo('/')
}

const handleAccountMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (!menuRef.value) {
    return
  }

  if (!menuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  if (!isBackofficeRole.value) {
    cartStore.fetchCart()
  }
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header class="site-header">
    <div class="container header-row">
      <NuxtLink to="/" class="brand-block" aria-label="Phoneix home">
        <span class="brand-mark">N</span>
        <span>
          <strong>{{ t('header.brand') }}</strong>
          <small>{{ t('header.tagline') }}</small>
        </span>
      </NuxtLink>

      <nav class="header-nav">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="nav-link"
        >
          {{ t(item.labelKey) }}
        </NuxtLink>
      </nav>

      <div class="header-actions">
        <button type="button" class="locale-btn" @click="switchLocale">
          {{ localeToggleLabel }}
        </button>
        <NuxtLink v-if="!isBackofficeRole" to="/cart" class="ghost-btn nav-btn-link" :aria-label="t('header.cart')">
          {{ t('header.cart') }}
          <span v-if="cartCount > 0" class="cart-count">{{ cartCount }}</span>
        </NuxtLink>
        <template v-if="!isAuthenticated">
          <NuxtLink to="/login" class="ghost-btn auth-btn nav-btn-link">
            {{ t('auth.loginAction') }}
          </NuxtLink>
          <NuxtLink to="/register" class="ghost-btn auth-btn nav-btn-link">
            {{ t('auth.registerAction') }}
          </NuxtLink>
        </template>
        <template v-else>
          <div ref="menuRef" class="account-menu-wrap">
            <button type="button" class="ghost-btn auth-btn user-badge" :title="accountLabel" @click.stop="handleAccountMenu">
              {{ accountLabel }}
            </button>

            <div v-if="isMenuOpen" class="account-menu-dropdown">
              <NuxtLink
                v-if="!isBackofficeRole"
                to="/account/addresses"
                class="account-menu-item"
                @click="closeMenu"
              >
                {{ t('header.manageShippingAddress') }}
              </NuxtLink>
              <NuxtLink
                v-if="!isBackofficeRole"
                to="/account/orders"
                class="account-menu-item"
                @click="closeMenu"
              >
                {{ t('header.orderHistory') }}
              </NuxtLink>
              <NuxtLink
                v-if="!isBackofficeRole"
                to="/account/warranty-check"
                class="account-menu-item"
                @click="closeMenu"
              >
                {{ t('header.warrantyCheck') }}
              </NuxtLink>
              <button type="button" class="account-menu-item is-danger" :disabled="status.loading" @click="handleLogout">
                {{ status.loading ? t('auth.loggingOut') : t('auth.logoutAction') }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(8px);
  background: rgba(243, 246, 251, 0.82);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.header-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding-block: 0.9rem;
}

.brand-block {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(145deg, #1f5eff, #3458c7);
}

.brand-block strong {
  display: block;
  font-size: 0.98rem;
}

.brand-block small {
  display: block;
  color: #64748b;
  font-size: 0.72rem;
}

.header-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.nav-link {
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
}

.nav-link:hover {
  color: #1f5eff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.locale-btn,
.ghost-btn {
  border: 1px solid rgba(15, 23, 42, 0.11);
  background: #fff;
  border-radius: 12px;
  height: 36px;
  padding-inline: 0.7rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
}

.ghost-btn {
  font-weight: 600;
}

.nav-btn-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.cart-count {
  min-width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  padding-inline: 0.2rem;
  background: #1f5eff;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
}

.user-badge {
  max-width: 148px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-menu-wrap {
  position: relative;
}

.account-menu-dropdown {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  min-width: 230px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.14);
  padding: 0.35rem;
  display: grid;
  z-index: 25;
}

.account-menu-item {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  color: #0f172a;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.account-menu-item:hover {
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
}

.account-menu-item.is-danger {
  color: #b42318;
}

.account-menu-item.is-danger:hover {
  background: rgba(180, 35, 24, 0.08);
  color: #b42318;
}

.locale-btn:hover,
.ghost-btn:hover {
  border-color: rgba(31, 94, 255, 0.35);
  color: #1f5eff;
}

@media (max-width: 900px) {
  .header-row {
    grid-template-columns: auto auto;
    grid-template-areas:
      'brand actions'
      'nav nav';
  }

  .brand-block {
    grid-area: brand;
  }

  .header-actions {
    grid-area: actions;
    justify-content: flex-end;
  }

  .header-nav {
    grid-area: nav;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 0.2rem;
  }
}

@media (max-width: 640px) {
  .ghost-btn {
    display: none;
  }

  .auth-btn {
    display: inline-flex;
  }
}
</style>
