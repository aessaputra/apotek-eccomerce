# Navigation Performance Metrics Report

## Scope

Tab bar optimization for Expo Router v6 navigation.

## Baseline (Before)

- `app/_layout.tsx` used 3 inline `tabBarIcon` functions (`home`, `orders`, `profile`).
- Each parent render recreated these callbacks.

## After Optimization

- `components/layouts/TabBarIconWithPill/TabBarIconWithPill.tsx` is wrapped with `React.memo`.
- `app/_layout.tsx` now uses memoized icon render callbacks (`renderHomeIcon`, `renderOrdersIcon`, `renderProfileIcon`).

## Measured Structural Delta

- Inline `tabBarIcon` callbacks: **3 → 0**.
- Memoized tab icon component instances: **0 → 1** (`TabBarIconWithPill`).

## Validation Evidence

- `npm run format:check`: pass
- `npm run lint`: pass
- `npm run test`: pass (21 suites, 130 tests)

## Practical Effect

This removes per-render recreation of three tab icon callbacks and stabilizes the icon wrapper component identity using `React.memo`, reducing avoidable bottom-tab rerender work.
