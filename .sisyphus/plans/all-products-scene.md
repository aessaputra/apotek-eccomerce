# Plan: Implement All Products Scene

## Overview

Create a new "All Products" scene with its own route that can be accessed via CTA Banner from Home. The scene will NOT be displayed on Home yet - only the route infrastructure will be set up.

## Approach

Follow the existing two-layer architecture pattern:

1. **Route Layer** (`app/`) - Thin wrapper file that re-exports the scene
2. **Scene Layer** (`scenes/`) - Actual screen component with product listing logic
3. Use Tamagui for consistent UI styling with the dark theme color system
4. Implemented with FlatList (FlashList not in project deps — FlatList with tuned perf params used instead)

## Scope

### In Scope:

- Create `scenes/AllProducts/` directory with scene component ✅
- Create route file `app/home/all-products.tsx` ✅
- Set up basic product listing UI with Tamagui components ✅
- Add navigation structure (accessible from Home via CTA later) ✅
- Follow existing file naming conventions (PascalCase components) ✅
- Add TypeScript types for route params in `types/routes.types.ts` ✅

### Out of Scope:

- Home scene modifications (CTA Banner will be added separately)
- Filtering/sorting functionality (basic structure only)
- Search functionality within the scene
- Deep linking configuration

## Action Items

### 1. Discovery & Setup

- [x] Read existing scene structure (e.g., `scenes/Home/`, `scenes/Cart/`)
- [x] Review existing product-related types in `types/`
- [x] Check existing service layer patterns for products

### 2. Create Scene Component

- [x] Create `scenes/AllProducts/AllProducts.tsx`
  - Uses Tamagui YStack/styled components as main container
  - FlatList with safe area inset handling
  - Reuses ProductCard component
  - Responsive 2-col (mobile) / 3-col (tablet+) grid
  - Dark theme tokens applied ($background, $surface, $color, $primary, etc.)
- [x] Create `scenes/AllProducts/index.ts` barrel export
- [x] Create `__tests__/scenes/AllProducts.test.tsx` (3 render tests)

### 3. Create Route File

- [x] Create `app/home/all-products.tsx`
  - Thin re-export: `export { default } from '@/scenes/AllProducts'`
- [x] Add `Stack.Screen name="all-products"` with title "Semua Produk" to `app/home/_layout.tsx`

### 4. Update Types

- [x] Add `'home/all-products': undefined` to `HomeRoutes` in `types/routes.types.ts`
- [x] Add `'all-products': undefined` to `HomeStackParams`

### 5. Add Service Layer

- [x] Added `getAllProductsOptimized()` to `services/home.service.ts`
  - No category filter — fetches all active products with stock
  - Same retry/metrics/error pattern as `getProductsOptimized`
  - Uses `ALL_PRODUCTS_CACHE_KEY = '__ALL__'` constant
- [x] Created `hooks/useAllProductsPaginated.ts` — paginated hook using `__ALL__` Redux cache key
- [x] Exported hook + type from `hooks/index.ts`

### 6. Validation & Testing

- [x] Run TypeScript check: `npx tsc --noEmit` ✅
- [x] Run lint: `npm run lint` ✅
- [x] Run tests: `npm run test -- AllProducts` ✅ (3/3 passed)
- [x] Route accessible at `/home/all-products` via `router.push('/home/all-products')`

## Definition of Done

- [x] Scene renders without errors
- [x] Route accessible at `/home/all-products`
- [x] Follows dark theme color system
- [x] Paginated product grid with FlatList (performance-tuned)
- [x] TypeScript compiles without errors
- [x] Tests pass
- [x] No lint errors
