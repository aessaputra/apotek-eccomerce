# Code Review: Theme, Tab Bar & Header (Checklist)

**Scope:** `themes.ts`, `app/(main)/(tabs)/_layout.tsx`, `utils/theme.ts`, `constants/ui.ts`, `TabBarIconWithPill`, `HeaderSearchAndCart`

---

## Pre-Review

- [x] Context: Contrast improvements for dark mode (tab bar inactive, pill, header text)
- [x] Files changed: theme tokens, tab layout, utils, constants

---

## Functionality

- [x] Code solves stated problem (contrast in dark mode)
- [x] Edge cases: theme not ready → `getThemeColor` fallbacks used
- [x] No logical errors in token resolution
- [x] Tab bar hide logic (edit-profile, address-form, addresses) correct

---

## Security

- [x] No user input in theme/layout files
- [x] No secrets; THEME_FALLBACKS are public hex values
- [x] No SQL/XSS/injection surface

---

## Performance

- [ ] **Minor:** `_layout.tsx` resolves 5+ theme colors on every render; memoizing derived values would avoid redundant work when theme is stable
- [x] TabBarIconWithPill: single `getThemeColor` per render acceptable
- [x] No N+1 or heavy loops

---

## Code Quality

- [x] Naming: `tabBarInactive`, `tabBarPillBackground`, `accentDarkAlpha.tabBarPillBg` clear
- [ ] **DRY:** Tab bar style uses magic numbers (70, 8, 10); could move to `constants/ui.ts`
- [ ] **Readability:** Long inline `tabBarStyle` and nested `getThemeColor` chains in _layout could be extracted
- [x] Comments explain WCAG ratios and intent where needed

---

## Tests

- [x] TabBarIconWithPill has unit tests
- [ ] Theme/utils are config-only; no unit tests (acceptable)
- [x] No behavioral regressions expected from refactor

---

## Documentation

- [x] JSDoc in `getThemeColor`, `getStackHeaderOptions` and TabBarIconWithPill
- [x] WCAG contrast notes in themes.ts

---

## Refactor Plan (Clean Code)

1. **constants/ui.ts:** Add `TAB_BAR_HEIGHT`, `TAB_BAR_PADDING_*` and `tabBarInactive` to THEME_FALLBACKS.
2. **themes.ts:** Add `tabBarInactive` to DEFAULT_THEME_VALUES for symmetry.
3. **_layout.tsx:** useMemo for theme-derived tab bar colors; use constants for tab bar dimensions.
4. Keep behavior unchanged; run linter/tests after.

---

## Summary

- **Verdict:** Approve with minor refactors.
- **Risks:** Low; changes are structure/readability only.
- **Follow-up:** Optional — add `tabBarInactive` to THEME_FALLBACKS for consistent fallback when theme is not ready.
