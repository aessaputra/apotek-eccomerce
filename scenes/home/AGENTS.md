# HOME SCENE

Home feed orchestration: user greeting, search/cart shortcuts, promo banners, categories, latest products, refresh states, and add-to-cart success dialog.

## STRUCTURE

```
scenes/home/
├── Home.tsx          # Screen orchestration, responsive sizing, navigation handlers
├── Home.sections.tsx # Memoized category/product sections
├── Home.styles.ts    # Tamagui styled primitives
├── Home.constants.ts # Indonesian copy
└── index.ts          # Scene export
```

## WHERE TO LOOK

| Task                           | File                                              | Notes                                             |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| Change feed data behavior      | `Home.tsx`, `hooks/useHomeData`                   | Data comes through hooks/services                 |
| Change category/product layout | `Home.tsx`, `Home.sections.tsx`                   | Keep responsive width/gap calculations aligned    |
| Change banner CTA route        | `constants/homeBanner.constants.ts`               | `HOME_BANNER_CTA_ROUTE_MAP` maps typed CTA routes |
| Change copy                    | `Home.constants.ts`                               | Indonesian user-facing strings live here          |
| Change card visuals            | `components/elements/ProductCard`, `CategoryItem` | Do not fork UI inside the scene                   |

## CONVENTIONS

- `Home.tsx` uses `useHomeData()` for banners/categories/products and `useCartPaginated()` for cart snapshot.
- Add-to-cart currently calls `addProductToCart()` from services and shows an `AppAlertDialog` success state.
- Horizontal mobile lists use peek offsets; update skeleton counts and width math together.
- `Home.sections.tsx` memoizes item wrappers; preserve stable callbacks for category/product presses.

## TESTING

- Scene tests belong in `__tests__/scenes/`.
- Mock hooks/services/router at the scene boundary; assert user-visible states and Indonesian copy.

## ANTI-PATTERNS

- **NEVER** add direct Supabase access here.
- **NEVER** duplicate ProductCard/CategoryItem presentation in the scene.
- **NEVER** add banner CTA strings without updating route mapping and route types.
