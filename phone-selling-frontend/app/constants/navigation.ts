export interface NavigationItem {
  labelKey: string
  to: string
}

export const primaryNavigation: NavigationItem[] = [
  {
    labelKey: 'sections.featured',
    to: '/#featured'
  },
  {
    labelKey: 'sections.newArrivals',
    to: '/#new-arrivals'
  },
  {
    labelKey: 'sections.promotions',
    to: '/#promotions'
  },
  {
    labelKey: 'sections.tracking',
    to: '/tracking'
  }
]
