import { defineStore } from 'pinia'
import { homeService } from '~/services/home.service'
import type { BrandModel, ProductCardModel, PromotionModel } from '~/types/home'

type HomeSectionKey = 'featured' | 'newArrivals' | 'brands' | 'promotions'

interface SectionState {
  loading: boolean
  error: string | null
}

const createSectionState = (): SectionState => ({
  loading: false,
  error: null
})

export const useHomeStore = defineStore('home', {
  state: () => ({
    featured: [] as ProductCardModel[],
    newArrivals: [] as ProductCardModel[],
    brands: [] as BrandModel[],
    promotions: [] as PromotionModel[],
    status: {
      featured: createSectionState(),
      newArrivals: createSectionState(),
      brands: createSectionState(),
      promotions: createSectionState()
    } as Record<HomeSectionKey, SectionState>,
    initialized: false
  }),

  getters: {
    hasAnyData: (state) => {
      return (
        state.featured.length > 0 ||
        state.newArrivals.length > 0 ||
        state.brands.length > 0 ||
        state.promotions.length > 0
      )
    }
  },

  actions: {
    async fetchHomeData(force = false) {
      if (this.initialized && !force) {
        return
      }

      await Promise.all([
        this.loadSection('featured', async () => {
          this.featured = await homeService.getFeaturedProducts()
        }),
        this.loadSection('newArrivals', async () => {
          this.newArrivals = await homeService.getNewArrivals()
        }),
        this.loadSection('brands', async () => {
          this.brands = await homeService.getBrands()
        }),
        this.loadSection('promotions', async () => {
          this.promotions = await homeService.getPromotions()
        })
      ])

      this.initialized = true
    },

    async reloadSection(section: HomeSectionKey) {
      const sectionLoaders: Record<HomeSectionKey, () => Promise<void>> = {
        featured: async () => {
          this.featured = await homeService.getFeaturedProducts()
        },
        newArrivals: async () => {
          this.newArrivals = await homeService.getNewArrivals()
        },
        brands: async () => {
          this.brands = await homeService.getBrands()
        },
        promotions: async () => {
          this.promotions = await homeService.getPromotions()
        }
      }

      await this.loadSection(section, sectionLoaders[section])
    },

    async loadSection(section: HomeSectionKey, loader: () => Promise<void>) {
      this.status[section].loading = true
      this.status[section].error = null

      try {
        await loader()
      } catch (error) {
        this.status[section].error = this.toErrorMessage(error)
      } finally {
        this.status[section].loading = false
      }
    },

    toErrorMessage(error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
          return message
        }
      }

      return 'Unable to load data from server.'
    }
  }
})
