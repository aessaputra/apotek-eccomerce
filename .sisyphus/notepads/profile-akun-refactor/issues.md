# Issues

## 2026-04-25 Task: session-start
- Missing Profile/EditProfile/Support characterization coverage is the blocker.

## 2026-04-25 Task: profile-baseline-tests
- `npx tsc --noEmit` has pre-existing out-of-scope failures in ProductCard, order hook/service tests, and `app/(tabs)/_layout.tsx`.

## 2026-04-25 Task: address-list-hook
- React-useEffect-backed `useFocusEffect` mock was the required fix.
- Existing Reanimated `Layout` deprecation hints only.
- Prettier formatting drift was fixed by `npx prettier --write`.

## 2026-04-25 Task: selection-stage-type
- Unrelated worktree changes were left untouched.
- Keep `areaPickerTypes.ts` import-free and use type-only imports.

## 2026-04-25 Task: current-location-helper-phases
- No new blockers. Focused Jest coverage, LSP diagnostics, lint, and format checks passed after the extraction.
- The focused Jest run still emits the existing Node `[DEP0040] punycode` deprecation warning; behavior unaffected and out of scope.

## 2026-04-25 Task: area-picker-flow-hook
- No new blockers. LSP diagnostics, targeted AreaPicker Jest coverage, lint, and format checks passed.
- The focused Jest run still emits the existing Node `[DEP0040] punycode` deprecation warning; behavior unaffected and out of scope.
- Follow-up verification needed behavior tests for the extracted hook because helper-only tests left `useAreaPickerFlow.ts` effectively unproven; added stale-request and pending-write-failure coverage.

## 2026-04-25 Task: tamagui-token-cleanup
- No new blockers. LSP diagnostics had no errors; only existing deprecation hints for `accessibilityLiveRegion`, Reanimated `Layout`, and `accessibilityState` appeared.
- Focused Jest runs still emit the existing Node `[DEP0040] punycode` deprecation warning; behavior unaffected and out of scope.
