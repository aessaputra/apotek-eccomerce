# SCENES

Screen-level orchestration lives here. `app/` owns Expo Router structure; `scenes/` owns the actual screen implementation and feature composition.

## STRUCTURE

```
scenes/
├── auth/                  # Login, signup, verify-email flows
├── cart/                  # Cart screen + cart-specific helpers/components
├── home/                  # Home feed screen
├── orders/                # Order list/detail/status flows
├── profile/               # Profile and address management flows
├── notifications/         # Notification screen
├── search/                # Product search screen
├── details/               # Generic detail screen variant
├── product-details/       # Product detail experience
├── AllProducts/           # Full product listing
└── category-product-list/ # Category-specific listing
```

## CHILD AGENTS

- `orders/AGENTS.md` — order list/detail/status patterns and tracking conventions.
- `profile/AGENTS.md` — profile/address flows, area-picker helper cluster, and route-param helpers.

Read the closest child file before changing those subdirectories.

## WHERE TO LOOK

| Task                    | Location           | Notes                                                      |
| ----------------------- | ------------------ | ---------------------------------------------------------- |
| Auth screen changes     | `auth/`            | Login/signup/verification UI lives here                    |
| Cart flow changes       | `cart/`            | Scene-specific sheets, banners, and helpers are co-located |
| Order flows             | `orders/`          | Read `orders/AGENTS.md` for hook-driven list/detail rules  |
| Home feed updates       | `home/`            | Home screen layout and feed orchestration                  |
| Product detail flow     | `product-details/` | Detail fetch + add-to-cart interaction                     |
| Profile/account screens | `profile/`         | Read `profile/AGENTS.md` for address and area-picker flows |

## CONVENTIONS

- Keep route wrappers in `app/` thin; put screen logic here.
- Scenes compose hooks, components, constants, and services. They should rarely own low-level backend calls directly.
- Scene-local helpers may live beside the screen when they are tightly coupled to one feature, as in `scenes/cart/`.
- Use hooks for reusable stateful logic. If logic is screen-specific and not reusable, keep it local to the feature directory.
- Prefer typed router params from `@/types/routes.types` for navigation payloads.

## TESTING

- Scene tests live in `__tests__/scenes/`.
- Test user-visible states: loading, error, empty, authenticated/unauthenticated, and primary CTA flows.
- Mock hooks/services at the scene boundary rather than reproducing backend logic inside scene tests.

## ANTI-PATTERNS

- **NEVER** move real scene implementation back into `app/` route files.
- **NEVER** duplicate shared UI primitives here when they belong in `components/`.
- **NEVER** add direct Supabase access here when the logic belongs in `services/`.
