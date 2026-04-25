# Learnings

## 2026-04-25 Task: session-start
- Plan scope is full `scenes/profile`.
- Characterization tests precede high-risk refactors.
- AreaPicker is highest-risk and last.

## 2026-04-25 Task: profile-baseline-tests
- Profile/EditProfile labels needed no source testID additions.
- Heavy children were mocked inline.
- Android keyboard can be tested with `Keyboard.addListener` and temporary `Platform.OS = 'android'`.
- Legacy AddressForm sections were safe to delete after reference proof and live receiver behavior belongs in `__tests__/components/AddressForm.test.tsx`.

## 2026-04-25 Task: keyboard-inset-hook
- Android keyboard listener/inset logic is in `scenes/profile/useAndroidKeyboardInset.ts`.
- Listeners register only on Android and remove on unmount.
- Coverage remains in EditProfile and AddressFormFlow tests.

## 2026-04-25 Task: address-list-hook
- Local hook location `scenes/profile/useAddressList.ts`.
- Hook owns service-backed fetch/refresh/delete/default state and ordering.
- Scene tests cover behavior through inline `address.service` mocks and `SectionList` controls.

## 2026-04-25 Task: selection-stage-type
- Canonical `SelectionStage` belongs in a tiny feature-local type module (`scenes/profile/areaPickerTypes.ts`) so both scene helpers and the zustand store can use type-only imports without creating a runtime cycle.
- `areaPickerCurrentLocation.ts` can stay aligned by reusing the canonical union with `Exclude<SelectionStage, 'province'>` for manual states.
- The area-picker helper cluster stays easier to reason about when stage/title logic remains in `areaPickerState.ts` and the type definition is split out.

## 2026-04-25 Task: current-location-helper-phases
- `resolveCurrentLocationSelection` now stays as the profile-local orchestration entry point and delegates to named phases for location permission/address lookup, province matching, city disambiguation, district/postal resolution, and final area resolution.
- Fallback/error shaping is centralized in small local helpers so Indonesian copy and manual `city`/`district`/`postal` stages remain behavior-compatible while the phase flow is easier to read.
- Postal disambiguation still lives on top of `findDistrictCandidateByPostalCode`; normalized detected postal codes can move selection to the owning district, while missing or ambiguous postal matches fall back to manual selection.

## 2026-04-25 Task: area-picker-flow-hook
- `AreaPicker.tsx` can stay presentation-focused by delegating stage state, stale request guards, service loading, postal resolution, current-location integration, pending selection writes, and back navigation to `scenes/profile/useAreaPickerFlow.ts`.
- The strangler extraction preserved the existing `requestIdRef` semantics by moving the same ref and request checks into the hook instead of changing service behavior.
- Hook-level `renderHook` tests with deferred service promises are the right behavior lock for AreaPicker orchestration: they can prove stale city/district/postal responses do not overwrite newer selections without depending on UI internals.
- AreaPicker back navigation is best locked through public hook handlers: select province/city/district/postal first, then assert `handleBack` clears only descendants while deferring completion until the province-level back action.

## 2026-04-25 Task: tamagui-token-cleanup
- Profile menu icons from `@/components/icons` can accept Tamagui token strings directly, so `getThemeColor()` is unnecessary for icon color inside Tamagui-rendered cards.
- `react-native-safe-area-context` wrappers can be styled with Tamagui via `styled(RNSafeAreaView, { backgroundColor: '$background' })`, matching existing profile screen patterns without native style color resolution.
- Keep resolved strings for native escape hatches: `placeholderTextColor`, `RefreshControl` tint/colors, and `getBottomBarShadow()` native shadow objects.
- Simple styled variants are clearer when common tokens like `backgroundColor: '$surface'` live on the base styled component and variants only express the changed token.

## 2026-04-25 Task: final-verification-wave
- Final reviewers F1-F4 all approved, then the plan checkboxes were closed after the continuation directive.
- Final validation command `npm run lint && npm run format:check && npm run test` passed with 122 Jest suites and 759 tests.

## 2026-04-25 Task: oracle-follow-up-review
- Follow-up Oracle/code-reviewer review requested changes for AreaPicker despite prior final validation: pending area selection write failures must be user-safe, final postal area resolution needs its own stale-request guard, and AreaPicker search placeholder color must use a resolved native color string.
- The corrective plan is intentionally narrow and saved at `.sisyphus/plans/profile-akun-oracle-fixes.md`.
