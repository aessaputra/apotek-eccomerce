# HOOKS

Reusable stateful orchestration belongs here. Hooks connect scenes/components to services, local state, app state, and side effects without pushing that logic into route files or presentational components.

## WHERE TO LOOK

| Task                       | Location                                                     | Notes                                                      |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Address workflow logic     | `useAddress*` files                                          | Address forms, suggestions, and region selection           |
| Cart workflow logic        | `useCart*` files                                             | Cart data, address, shipping, checkout, quantity, realtime |
| Order workflow logic       | `useOrder*` / `useOrders*` files                             | Detail/history/paginated order state                       |
| Product listing logic      | `useProductsPaginated.ts` / `useAllProductsPaginated.ts`     | Paged product fetching                                     |
| Home feed orchestration    | `useHomeData.ts`                                             | Categories, banners, latest products                       |
| Cross-cutting guard/helper | `withAuthGuard.tsx`, `useDebounce.ts`, `useNetworkStatus.ts` | Generic orchestration helpers                              |

## CONVENTIONS

- Use `useName.ts` for hooks and export them through `hooks/index.ts` when they are shared.
- Keep return types explicit for shared hooks; this repo already exports many `UseXReturn` types from the barrel.
- Hooks may call services, Redux selectors, Zustand stores, and navigation utilities when needed.
- Prefer hooks for reusable async state machines such as paginated fetching, refresh flows, and realtime subscriptions.
- Keep hook responsibilities focused: screens orchestrate multiple hooks; hooks orchestrate multiple low-level calls.

## TESTING

- Hook tests live in `__tests__/hooks/`.
- Validate observable contract: returned state, loading transitions, refresh behavior, retries, and error surfaces.
- When timers, subscriptions, or focus effects are involved, use the existing Jest fake-timer setup rather than ad hoc timing assumptions.

## ANTI-PATTERNS

- **NEVER** turn a one-off screen helper into a shared hook unless another feature needs it.
- **NEVER** hide major backend behavior in components when it should move into a hook or service.
- **NEVER** bypass exported return types for shared hooks when those types already describe the public contract.
