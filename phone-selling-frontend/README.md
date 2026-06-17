# Phoneix Frontend (Nuxt)

Frontend for the phone selling system, implemented with Nuxt + Vue + Pinia and a Vietnamese-first UX.

## Current milestone

- Home page implemented with real API integration:
  - Featured products: `GET /api/products/featured`
  - New arrivals: `GET /api/products/new-arrivals`
  - Brands: `GET /api/brands`
  - Promotions: `GET /api/promotions`
- Vietnamese and English localization is enabled (`vi` default)
- Section-level loading, error, and empty states

## Project architecture

- `pages/`: route pages (`index.vue`, `search.vue`)
- `layouts/`: global layout shell (`default.vue`)
- `components/layout/`: app header/footer
- `components/home/`: home feature sections and cards
- `components/common/`: reusable state UI (skeleton, error)
- `stores/`: Pinia state (`home.ts`)
- `services/`: API integration and data normalization
- `composables/`: shared logic (API client, locale formatting)
- `types/`: raw API and UI model types
- `constants/`: static constants and nav config
- `locales/`: i18n dictionaries (`vi.json`, `en.json`)
- `assets/css/main.css`: global theme and shared styles

## Setup

```bash
npm install
```

## Environment configuration

Set API base URL in `.env`:

```bash
NUXT_PUBLIC_API_BASE=https://localhost:8443
```

## Run development server

```bash
npm run dev
```

## Build for production

```bash
npm run build
```

## Notes

- API base URL is read from runtime config (`NUXT_PUBLIC_API_BASE`).
- Promotions and brands image maps are normalized in service layer so UI stays stable.
