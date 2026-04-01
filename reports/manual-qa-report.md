# Manual QA Report

## Executed Checks

- Auth guard behavior executed via real test run: `hooks/withAuthGuard.test.tsx` (redirect + render-block scenarios) in `npm run test`.
- Deep-link and app config parsing executed via `npm run dev:config:public`.
- Accessibility metadata presence executed via grep on `app/_layout.tsx` for `tabBarAccessibilityLabel`, `accessibilityRole=\"tab\"`, and `accessibilityHint`.
- Dark theme switching path verified from runtime provider logic (`providers/Provider.tsx`) using `useColorScheme()` with `brand` / `brand_dark` selection.

## Observed Outcomes

- `npm run test`: PASS (21 suites, 130 tests), including `hooks/withAuthGuard.test.tsx` passing all assertions.
- `npm run dev:config:public`: PASS, config prints `scheme: 'apotek-ecommerce'`, `slug: 'apotek-ecommerce'`, and corrected bundle/package IDs.
- Accessibility grep confirms role and hint entries for all 3 visible tabs.
- Theme wiring confirms automatic light/dark selection through provider runtime path.
