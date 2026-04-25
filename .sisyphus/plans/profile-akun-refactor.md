# Profile/Akun Clean-Code Refactor Plan

## TL;DR
> **Summary**: Refactor the full Profile/Akun feature with characterization tests first, preserving current user-visible behavior while improving module boundaries, Tamagui consistency, React Native layout reuse, and TypeScript contracts.
> **Deliverables**:
> - Missing Profile/EditProfile/Support characterization tests
> - Reference-audited cleanup of obsolete AddressForm section components
> - Shared Android keyboard inset hook
> - Extracted AddressList state/mutation hook
> - Canonical `SelectionStage` type source
> - Incremental AreaPicker decomposition without changing route/session behavior
> - Tamagui token/native-style consistency cleanup
> **Effort**: Large
> **Parallel**: YES - 3 implementation waves + final verification wave
> **Critical Path**: Task 1 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Final Verification

## Context

### Original Request
User requested a plan and best-practice refactor proposal for Scene Profile/Akun so the code becomes cleaner and more consistent, using relevant skills including clean-code, Vercel React Native skills, Tamagui best practices, and other relevant skills.

### Interview Summary
- Scope: full Profile/Akun feature, not only the main account screen.
- Test strategy: characterization-first before high-risk refactor slices.
- Cleanup strategy: audit then remove confirmed obsolete AddressForm section components/tests if unreferenced.
- Behavior must be preserved; no feature additions or visual redesign.

### Metis Review (gaps addressed)
- Added explicit behavior-preservation invariants for copy, routes, alerts, haptics, loading/empty states, sorting, default-address behavior, keyboard avoidance, and error handling.
- Added deletion gate requiring LSP/reference/test audit before removing AddressForm section components.
- Added native exception list for raw colors and inline styles required by React Native APIs.
- Added OrderHistory boundary to avoid accidental refactor of broader `scenes/orders` internals.
- Added per-slice rollback/checkpoint rule: profile-focused tests must pass before next slice.

### Oracle Review (risks addressed)
- `AreaPicker.tsx` is highest risk and must be split last using a strangler refactor.
- Preserve stale request protection, pending-session writes, route params, haptics, alerts, exact copy, and navigation destinations.
- Keep area-picker helpers feature-local unless another feature already consumes them.

## Work Objectives

### Core Objective
Make Profile/Akun code cleaner, smaller, more testable, and more consistent with project React Native/Tamagui/TypeScript conventions without changing external behavior.

### Deliverables
- Test coverage for previously untested main account surfaces.
- Refactor slices that reduce large functions/components and duplicated logic.
- A verified dead-code cleanup for obsolete AddressForm section components.
- Tamagui token cleanup with documented native API exceptions.
- Full validation evidence under `.sisyphus/evidence/`.

### Definition of Done (verifiable conditions with commands)
- `npm run lint` exits `0`.
- `npm run format:check` exits `0`.
- `npm run test` exits `0`.
- Profile-focused tests pass with one-shot Jest commands listed in each task.
- `lsp_find_references`/search evidence proves deleted files had no app references before deletion.
- No direct Supabase imports exist under `scenes/profile`.
- Content search for `from '@/utils/supabase'`, `from '../../utils/supabase'`, and `createClient` under `scenes/profile` returns zero matches.
- No `as any`, `@ts-ignore`, `@ts-expect-error`, or unguarded app-code `console.log` added.

### Must Have
- Indonesian UI copy remains unchanged unless fixing a test typo is explicitly required.
- Route names and route params remain compatible with `types/routes.types.ts` and `scenes/profile/addressRouteParams.ts`.
- Pending area/address/map selections are consumed/reset exactly as before.
- Address default sorting and mutation semantics remain unchanged.
- Android keyboard/bottom action behavior remains visually equivalent in `EditProfile` and `AddressForm`.
- AreaPicker stale async responses cannot overwrite newer selections.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No UX redesign, new profile features, dependency additions, React Query migration, or global state redesign.
- No moving real screen logic into `app/(tabs)/profile` route wrappers.
- No direct Supabase client imports in scenes/components.
- No moving area-picker helpers into generic `utils` unless an existing non-profile consumer is found.
- No deleting tests with deleted code unless replacement coverage proves the behavior is obsolete.
- No replacing raw native API colors with Tamagui tokens where concrete strings are required.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Characterization-first + Jest/React Native Testing Library.
- Framework: existing `jest-expo`, `@testing-library/react-native`, and `test-utils/renderWithTheme.tsx`.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Native exception list: raw colors may remain only for `RefreshControl`, native `SafeAreaView` style props, map/native APIs, and icon APIs that require resolved color strings.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. This refactor has fewer large slices because several tasks depend on characterization coverage.

Wave 1: Task 1 baseline characterization, Task 2 dead-code audit, Task 8 simple screen/Tamagui audit can start after Task 1 test harness decisions.
Wave 2: Task 3 keyboard hook, Task 4 AddressList hook, Task 5 canonical stage type.
Wave 3: Task 6 AreaPicker helper cleanup, Task 7 AreaPicker orchestration decomposition, Task 8 final token cleanup if not completed.
Wave 4: Final verification wave F1-F4.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
| --- | --- | --- |
| 1. Baseline characterization | None | 3, 4, 6, 7 |
| 2. Dead-code audit/removal | None | 8 if deleted components affect styling cleanup |
| 3. Keyboard inset hook | 1 | None |
| 4. AddressList hook | 1 | None |
| 5. Canonical `SelectionStage` | 1 | 6, 7 |
| 6. Current-location helper split | 1, 5 | 7 |
| 7. AreaPicker orchestration split | 1, 5, 6 | Final verification |
| 8. Tamagui/simple screen cleanup | 1, optional 2 | Final verification |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → deep, quick, visual-engineering.
- Wave 2 → 3 tasks → deep, quick.
- Wave 3 → 3 tasks → deep, visual-engineering.
- Final → 4 review tasks → oracle, unspecified-high, unspecified-high, deep.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Establish Profile/Akun baseline characterization tests

  **What to do**: Add missing characterization tests for `Profile.tsx`, `EditProfile.tsx`, and `Support.tsx` under `__tests__/scenes/`. Use existing inline mock style from address/profile-adjacent tests. Lock current visible copy, loading states, fallback user data behavior, navigation destinations, logout sequence, edit-profile validation/save/avatar failure-success paths, and Support static/action behavior. If automated selectors are insufficient, add minimal stable `testID`s only where visible text/accessibility labels cannot target the element; do not change layout.

  **Must NOT do**: Do not refactor source behavior in this task beyond minimal non-visual testability hooks. Do not introduce E2E tooling. Do not assert implementation details of future hooks.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: requires mapping behavior, mocks, and regression boundaries before refactor.
  - Skills: `testing-strategy`, `react-native`, `typescript-expert` - Needed for RTL tests, route mocks, and strict typing.
  - Omitted: `frontend-design` - No visual redesign allowed.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 4, 6, 7 | Blocked By: none

  **References**:
  - Pattern: `__tests__/scenes/AddressList.test.tsx:52-159` - inline service/router mocks and scene interaction tests.
  - Pattern: `__tests__/scenes/AddressFormFlow.test.tsx:67-383` - route, haptics, services, and flow mocks.
  - Pattern: `test-utils/renderWithTheme.tsx:1-57` - Tamagui-aware render helper.
  - Target: `scenes/profile/Profile.tsx:74-234` - account overview, loading, menu navigation, logout dialog.
  - Target: `scenes/profile/EditProfile.tsx:38-384` - validation, avatar upload, profile save, Redux update, keyboard handling.
  - Target: `scenes/profile/Support.tsx:5-27` - simple support UI.

  **Acceptance Criteria**:
  - [ ] New tests cover Profile loading, populated user info, missing/partial user fallback, menu navigation to edit/address/support/order history, and logout success/failure paths.
  - [ ] New tests cover EditProfile validation failure, save success, save failure, avatar upload failure/success, and Android keyboard bottom-bar state with mocked `Keyboard` events.
  - [ ] New tests cover Support screen visible copy and any primary action behavior currently present.
  - [ ] `npm run test -- --runInBand __tests__/scenes/Profile.test.tsx __tests__/scenes/EditProfile.test.tsx __tests__/scenes/Support.test.tsx` exits `0`.
  - [ ] Evidence saved to `.sisyphus/evidence/task-1-profile-baseline-tests.txt`.

  **QA Scenarios**:
  ```
  Scenario: Profile account actions are locked by characterization tests
    Tool: Bash
    Steps: Run `npm run test -- --runInBand __tests__/scenes/Profile.test.tsx` with mocked user `test@example.com` and menu presses for edit, address, support, and order history.
    Expected: Jest exits 0 and assertions confirm exact router destinations and visible Indonesian copy.
    Evidence: .sisyphus/evidence/task-1-profile-baseline-tests.txt

  Scenario: EditProfile validation and failure behavior are locked
    Tool: Bash
    Steps: Run `npm run test -- --runInBand __tests__/scenes/EditProfile.test.tsx` with invalid short name, invalid phone, and mocked save/avatar failures.
    Expected: Jest exits 0 and assertions confirm existing error text/alert behavior without source refactor.
    Evidence: .sisyphus/evidence/task-1-edit-profile-errors.txt
  ```

  **Commit**: YES | Message: `test(profile): add account characterization coverage` | Files: `__tests__/scenes/Profile.test.tsx`, `__tests__/scenes/EditProfile.test.tsx`, `__tests__/scenes/Support.test.tsx`, minimal source `testID` additions only if required

- [x] 2. Audit and remove confirmed obsolete AddressForm section components

  **What to do**: Verify whether `components/AddressForm/ReceiverInfoSection.tsx` and `components/AddressForm/AddressInfoSection.tsx` are truly obsolete. Use `lsp_find_references`, import/content search, and test audit. If they have no app references and their tests only validate dead components, delete the components and obsolete tests or replace tests with coverage for the live composite `components/AddressForm/AddressForm.tsx`. Document audit evidence.

  **Must NOT do**: Do not delete `components/AddressForm/AddressForm.tsx`, `DefaultAddressToggle`, `AddressSuggestionList`, or any component with app references. Do not delete behavior coverage that still protects live flows.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused reference audit and cleanup.
  - Skills: `code-smell-detector`, `typescript-expert` - Needed for dead-code deletion gate and import safety.
  - Omitted: `frontend-design` - No UI changes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: optional 8 | Blocked By: none

  **References**:
  - Suspect: `components/AddressForm/ReceiverInfoSection.tsx` - research found only tests reference it.
  - Suspect: `components/AddressForm/AddressInfoSection.tsx` - research found only tests reference it.
  - Live component: `components/AddressForm/AddressForm.tsx:29-188` - actual composite used by address form flow.
  - Guardrail: `AGENTS.md` anti-pattern says no dead code, no unnecessary abstractions.

  **Acceptance Criteria**:
  - [ ] `lsp_find_references` output or equivalent search evidence shows zero app references before deletion.
  - [ ] Obsolete tests are deleted only if they exclusively cover deleted dead components.
  - [ ] Replacement coverage exists for the live AddressForm composite if any useful behavior was previously only covered by dead tests.
  - [ ] `npm run test -- --runInBand __tests__/components __tests__/scenes/AddressFormFlow.test.tsx` exits `0`.
  - [ ] Evidence saved to `.sisyphus/evidence/task-2-addressform-dead-code-audit.md`.

  **QA Scenarios**:
  ```
  Scenario: Dead-code deletion gate passes
    Tool: LSP + Bash
    Steps: Run `lsp_find_references` on both suspect components, search imports, and save results before deletion.
    Expected: Zero app references; only obsolete component tests reference deleted files.
    Evidence: .sisyphus/evidence/task-2-addressform-dead-code-audit.md

  Scenario: Live address form remains covered
    Tool: Bash
    Steps: Run `npm run test -- --runInBand __tests__/components __tests__/scenes/AddressFormFlow.test.tsx`.
    Expected: Jest exits 0 with no missing import failures.
    Evidence: .sisyphus/evidence/task-2-addressform-live-tests.txt
  ```

  **Commit**: YES | Message: `refactor(address-form): remove obsolete section components` | Files: confirmed obsolete `components/AddressForm/*Section.tsx` files and obsolete/replacement tests only

- [x] 3. Extract shared Android keyboard inset behavior

  **What to do**: Extract duplicated Android keyboard bottom-bar calculations from `EditProfile.tsx` and `AddressForm.tsx` into a small hook, preferably `hooks/useAndroidKeyboardInset.ts` if cross-feature enough or `scenes/profile/useAndroidKeyboardInset.ts` if kept profile-local. The hook should expose stable values needed by both screens: keyboard height, extra bottom offset, and scroll/action-bar padding inputs. Update existing/new tests to assert Android show/hide events preserve previous spacing behavior.

  **Must NOT do**: Do not change iOS `KeyboardAvoidingView` behavior, `keyboardVerticalOffset`, scroll content padding, or bottom save bar visual placement. Do not add platform-specific magic values without named constants.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: low-risk shared hook extraction once tests exist.
  - Skills: `clean-code`, `vercel-react-native-skills`, `typescript-expert` - Needed for small functions, RN keyboard behavior, and hook typing.
  - Omitted: `tamagui-best-practices` - Mostly RN keyboard logic, not styling.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: none | Blocked By: 1

  **References**:
  - Duplication: `scenes/profile/EditProfile.tsx:53-82` - Android keyboard listener/inset logic.
  - Duplication: `scenes/profile/AddressForm.tsx:69-88` - similar Android keyboard listener/inset logic.
  - Guardrail: `EditProfile.tsx:228-230`, `AddressForm.tsx:348-350` - preserve iOS `KeyboardAvoidingView` offsets.

  **Acceptance Criteria**:
  - [ ] Duplicate keyboard listener/calculation code is replaced by one typed hook.
  - [ ] Hook cleanup removes listeners on unmount.
  - [ ] Android keyboard show/hide tests pass for both EditProfile and AddressForm.
  - [ ] `npm run test -- --runInBand __tests__/scenes/EditProfile.test.tsx __tests__/scenes/AddressFormFlow.test.tsx` exits `0`.
  - [ ] Evidence saved to `.sisyphus/evidence/task-3-keyboard-inset-hook.txt`.

  **QA Scenarios**:
  ```
  Scenario: Android keyboard show updates bottom inset
    Tool: Bash
    Steps: Run targeted EditProfile and AddressForm tests with mocked `Platform.OS = 'android'` and Keyboard show event height 320.
    Expected: Tests confirm bottom action spacing uses the same effective values as pre-refactor characterization.
    Evidence: .sisyphus/evidence/task-3-keyboard-inset-hook.txt

  Scenario: Keyboard listener cleanup prevents stale updates
    Tool: Bash
    Steps: Run hook/screen test that unmounts after registering mocked Keyboard listeners.
    Expected: Remove methods are called and no state update warning appears.
    Evidence: .sisyphus/evidence/task-3-keyboard-cleanup.txt
  ```

  **Commit**: YES | Message: `refactor(profile): share android keyboard inset hook` | Files: `hooks/useAndroidKeyboardInset.ts` or `scenes/profile/useAndroidKeyboardInset.ts`, `scenes/profile/EditProfile.tsx`, `scenes/profile/AddressForm.tsx`, related tests

- [x] 4. Extract AddressList state and mutation workflow into `useAddressList`

  **What to do**: Move address fetching, refresh, ordered-address derivation, delete mutation, set-default mutation, and loading/error state from `AddressList.tsx` into a focused hook. Keep screen-level layout, row rendering, navigation, and visible confirmation/alert behavior in the screen unless tests show a cleaner hook boundary. The hook should accept `userId` and service dependencies only if needed for testability; avoid over-abstraction.

  **Must NOT do**: Do not change address sorting, default address rules, alert copy, refresh behavior, or navigation to address form. Do not migrate service calls to React Query.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: async state/mutation extraction with user-visible alerts and sorting semantics.
  - Skills: `clean-code`, `refactor`, `native-data-fetching`, `testing-strategy` - Needed for focused hook, behavior preservation, async test handling.
  - Omitted: `supabase` - No direct database/schema work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: none | Blocked By: 1

  **References**:
  - Target: `scenes/profile/AddressList.tsx:43-276` - current screen.
  - Refactor seam: `AddressList.tsx:59-110` - fetch/delete/default service calls mixed with UI.
  - Service: `services/address.service.ts:169-197`, `203-241`, `269-296` - default/unset behavior to preserve.
  - Test pattern: `__tests__/scenes/AddressList.test.tsx:133-159` - saved addresses and swipe actions.

  **Acceptance Criteria**:
  - [ ] `AddressList.tsx` no longer owns low-level async mutation state beyond invoking hook callbacks.
  - [ ] Hook has targeted tests for fetch, sort, empty, refresh, delete success/failure, set-default success/failure.
  - [ ] Existing scene tests still pass and assert visible alerts/copy.
  - [ ] `npm run test -- --runInBand __tests__/scenes/AddressList.test.tsx` exits `0`.
  - [ ] Evidence saved to `.sisyphus/evidence/task-4-address-list-hook.txt`.

  **QA Scenarios**:
  ```
  Scenario: AddressList default mutation preserves ordering
    Tool: Bash
    Steps: Run `npm run test -- --runInBand __tests__/scenes/AddressList.test.tsx` with mocked addresses including `Jl. Sudirman No. 10` and a non-default address.
    Expected: Default address appears first after mutation and service calls match existing contract.
    Evidence: .sisyphus/evidence/task-4-address-list-hook.txt

  Scenario: AddressList delete failure preserves visible error
    Tool: Bash
    Steps: Mock delete service rejection and confirm delete action.
    Expected: Existing alert/error copy appears and list is not incorrectly mutated.
    Evidence: .sisyphus/evidence/task-4-address-list-delete-error.txt
  ```

  **Commit**: YES | Message: `refactor(profile): extract address list workflow hook` | Files: `scenes/profile/AddressList.tsx`, `hooks/useAddressList.ts` or `scenes/profile/useAddressList.ts`, related tests

- [x] 5. Canonicalize `SelectionStage` and route/session typing

  **What to do**: Replace duplicated `SelectionStage` definitions with one canonical exported type while preserving literal values exactly: `'province' | 'city' | 'district' | 'postal'`. Use `lsp_find_references` on both current type definitions before moving them. Prefer a profile-local type module if both `areaPickerState.ts` and `stores/areaPickerStore.ts` can import it without circular coupling; otherwise place it in `types/routes.types.ts` or another existing route/profile type file only if that matches current dependency direction. Audit route and pending-session payloads for typed consistency.

  **Must NOT do**: Do not change persisted/session literal values, route param names, or pending area selection shape. Do not make `scenes/profile` depend on store internals or store depend on scene implementation details.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: typed consolidation with reference audit.
  - Skills: `typescript-expert`, `refactor` - Needed for safe type-only imports and circular-dependency avoidance.
  - Omitted: `frontend-design` - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 7 | Blocked By: 1

  **References**:
  - Duplicate: `scenes/profile/areaPickerState.ts:4` - stage union.
  - Duplicate: `stores/areaPickerStore.ts:5` - same union.
  - Route contract: `types/routes.types.ts:47-68` - profile/address route params.
  - Parser: `scenes/profile/addressRouteParams.ts:18-63` - typed/sanitized route payloads.

  **Acceptance Criteria**:
  - [ ] Exactly one canonical `SelectionStage` type source remains.
  - [ ] `lsp_find_references` evidence for both old type definitions is saved before consolidation.
  - [ ] Literal string values remain unchanged.
  - [ ] No circular imports are introduced.
  - [ ] `npm run test -- --runInBand __tests__/scenes/areaPickerState.test.ts __tests__/scenes/AreaPicker.test.tsx __tests__/scenes/addressRouteParams.test.ts` exits `0`.
  - [ ] Evidence saved to `.sisyphus/evidence/task-5-selection-stage-type.txt`.

  **QA Scenarios**:
  ```
  Scenario: Stage values remain route/session-compatible
    Tool: Bash
    Steps: Run area picker state and route param tests after type consolidation.
    Expected: Tests pass with unchanged literals: province, city, district, postal.
    Evidence: .sisyphus/evidence/task-5-selection-stage-type.txt

  Scenario: No circular import introduced
    Tool: Bash
    Steps: Run `npm run lint` or targeted import-cycle/static checks available in the repo.
    Expected: Lint exits 0 and no module resolution/circular dependency error appears.
    Evidence: .sisyphus/evidence/task-5-selection-stage-lint.txt
  ```

  **Commit**: YES | Message: `refactor(profile): canonicalize area picker stage type` | Files: `scenes/profile/areaPickerState.ts`, `stores/areaPickerStore.ts`, chosen type module, related tests

- [x] 6. Split current-location and postal resolution helpers into named phases

  **What to do**: Refactor dense helper logic in `areaPickerCurrentLocation.ts` into smaller named functions for province matching, city disambiguation, district/postal resolution, final area resolution, and fallback/error shaping. Keep exported API stable unless tests and callers are updated together. Preserve existing tests and add cases for stale/missing service data if gaps are found.

  **Must NOT do**: Do not simplify away manual fallback paths, permission-denied handling, postal disambiguation, or existing error copy. Do not move these helpers out of `scenes/profile`.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: high-risk helper refactor with complex fallback behavior.
  - Skills: `clean-code`, `refactor`, `testing-strategy`, `typescript-expert` - Needed for small functions and behavior locks.
  - Omitted: `frontend-design` - No UI changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 7 | Blocked By: 1, 5

  **References**:
  - Target: `scenes/profile/areaPickerCurrentLocation.ts:169-423` - dense resolution state machine.
  - Existing tests: `__tests__/scenes/areaPickerCurrentLocation.test.ts:6-238` and research indicates broader current-location branch coverage.
  - Helper: `scenes/profile/areaPickerHelpers.ts:24-100` - postal options/pending selection shaping.

  **Acceptance Criteria**:
  - [ ] `resolveCurrentLocationSelection` reads as orchestration over named helper phases.
  - [ ] Existing exported behavior and error messages remain unchanged.
  - [ ] Current-location tests pass before and after refactor with identical assertions.
  - [ ] `npm run test -- --runInBand __tests__/scenes/areaPickerCurrentLocation.test.ts` exits `0`.
  - [ ] Evidence saved to `.sisyphus/evidence/task-6-current-location-helpers.txt`.

  **QA Scenarios**:
  ```
  Scenario: Current-location happy path resolves full area
    Tool: Bash
    Steps: Run current-location tests with mocked location resolving to DKI Jakarta, Kecamatan Menteng, postal code 10310.
    Expected: Jest exits 0 and pending selection shape matches pre-refactor behavior.
    Evidence: .sisyphus/evidence/task-6-current-location-helpers.txt

  Scenario: Permission denied and postal failure remain graceful
    Tool: Bash
    Steps: Run tests with denied permission and unresolved postal response.
    Expected: Existing error/fallback behavior is asserted exactly and no unhandled promise rejection occurs.
    Evidence: .sisyphus/evidence/task-6-current-location-errors.txt
  ```

  **Commit**: YES | Message: `refactor(profile): split area current location resolution` | Files: `scenes/profile/areaPickerCurrentLocation.ts`, related tests if needed

- [x] 7. Decompose `AreaPicker.tsx` orchestration using a strangler refactor

  **What to do**: Incrementally extract `AreaPicker.tsx` orchestration into focused local hooks/helpers, such as `useAreaPickerFlow`, `useAreaPickerStageData`, or local helper functions. Preserve UI components `AreaPickerStageList.tsx` and `AreaPickerSelectionSummary.tsx`. Keep stale request protection (`requestIdRef` semantics), pending-session writes, route return behavior, search behavior, hierarchy selection, postal resolution, current-location action, and all copy unchanged. Do this in small commits internally if needed, running tests after each slice.

  **Must NOT do**: Do not rewrite AreaPicker from scratch. Do not move feature-local helpers into generic utilities. Do not change navigation destinations, route params, pending session semantics, or service call ordering unless existing tests prove equivalent behavior.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: highest-risk screen decomposition with async state and navigation side effects.
  - Skills: `clean-code`, `refactor`, `vercel-react-native-skills`, `tamagui-best-practices`, `typescript-expert` - Needed for screen split, render stability, Tamagui-safe props, and route types.
  - Omitted: `supabase` - Services remain existing boundaries; no DB work.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final verification | Blocked By: 1, 5, 6

  **References**:
  - Target: `scenes/profile/AreaPicker.tsx:42-573` - large orchestration screen.
  - Local guidance: `scenes/profile/AGENTS.md:16-23` - area picker subsystem ownership.
  - Local guidance: `scenes/profile/AGENTS.md:27-36` - keep helpers local and route parsing centralized.
  - Presentation helpers: `scenes/profile/AreaPickerStageList.tsx:50-124`, `scenes/profile/AreaPickerSelectionSummary.tsx:16-155`.
  - Existing tests: `__tests__/scenes/AreaPicker.test.tsx`, `__tests__/scenes/areaPickerState.test.ts`, `__tests__/scenes/areaPickerCurrentLocation.test.ts`.

  **Acceptance Criteria**:
  - [ ] `AreaPicker.tsx` delegates non-UI orchestration to focused local hook/helper modules.
  - [ ] Stale request protection remains tested.
  - [ ] Pending selection write failures remain handled gracefully.
  - [ ] Hierarchy, search, current-location, postal selection, and back navigation tests pass.
  - [ ] `npm run test -- --runInBand __tests__/scenes/AreaPicker.test.tsx __tests__/scenes/areaPickerState.test.ts __tests__/scenes/areaPickerCurrentLocation.test.ts` exits `0`.
  - [ ] Evidence saved to `.sisyphus/evidence/task-7-area-picker-decomposition.txt`.

  **QA Scenarios**:
  ```
  Scenario: Stale AreaPicker response cannot overwrite latest stage
    Tool: Bash
    Steps: Run AreaPicker tests with two mocked regional service responses resolving out of order.
    Expected: UI/state reflects latest request only and tests exit 0.
    Evidence: .sisyphus/evidence/task-7-area-picker-stale-response.txt

  Scenario: Pending session write failure remains user-safe
    Tool: Bash
    Steps: Mock pending selection write failure while selecting Kecamatan Menteng / 10310.
    Expected: Existing error handling appears, no navigation occurs incorrectly, and Jest exits 0.
    Evidence: .sisyphus/evidence/task-7-area-picker-session-error.txt
  ```

  **Commit**: YES | Message: `refactor(profile): decompose area picker orchestration` | Files: `scenes/profile/AreaPicker.tsx`, local `useAreaPicker*`/helper files, related tests

- [x] 8. Normalize Tamagui token usage and simple Profile/Akun presentation boundaries

  **What to do**: Replace `getThemeColor()` and inline style usage inside Tamagui-rendered UI with token props or styled variants where safe. Keep concrete color strings for native exception list only. Apply to simple screens/components first: `Profile.tsx`, `Support.tsx`, `OrderHistory.tsx`, `AddressSearch.tsx`, `AddressList.tsx`, `AreaPickerSelectionSummary.tsx`, and `DefaultAddressToggle.tsx`. Make `OrderHistory` boundary explicit: only profile-owned entry/presentation may change; do not refactor shared `scenes/orders` internals.

  **Must NOT do**: Do not alter spacing/layout visually beyond token-equivalent replacements. Do not use `getThemeColor()` inside Tamagui components except for native API bridges. Do not introduce `StyleSheet.create()` or NativeWind for core UI.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI styling consistency with behavior-preserving visual parity.
  - Skills: `tamagui-best-practices`, `vercel-react-native-skills`, `react-best-practices` - Needed for token props, RN raw style exceptions, and render stability.
  - Omitted: `checkout-payments` - Not relevant to profile refactor.

  **Parallelization**: Can Parallel: YES | Wave 1 or 3 | Blocks: Final verification | Blocked By: 1; optional 2 for deleted component scope

  **References**:
  - Theme anti-patterns: `Profile.tsx:42-44`, `AddressSearch.tsx:57-63`, `AddressList.tsx:210`, `247`, `Support.tsx:6-10`, `OrderHistory.tsx:96-109`.
  - Inline styles: `Profile.tsx:131-137`, `AddressSearch.tsx:185-187`, `229-231`, `Support.tsx:10`.
  - Variant candidates: `AreaPickerSelectionSummary.tsx:51`, `74-76`, `100-106`, `122-128`; `DefaultAddressToggle.tsx:59-61`.
  - Project rule: root `AGENTS.md` says do not use `getThemeColor()` inside Tamagui components; use token props.

  **Acceptance Criteria**:
  - [ ] Tamagui-rendered UI uses token props/variants instead of resolved colors where supported.
  - [ ] Native exception list is documented in code comments only where necessary and not as noisy comments elsewhere.
  - [ ] Profile, Support, OrderHistory entry, AddressSearch, AddressList, and AreaPicker presentation tests pass.
  - [ ] No layout/copy/navigation assertions from Task 1 regress.
  - [ ] Evidence saved to `.sisyphus/evidence/task-8-tamagui-token-cleanup.txt`.

  **QA Scenarios**:
  ```
  Scenario: Token cleanup preserves profile visible behavior
    Tool: Bash
    Steps: Run `npm run test -- --runInBand __tests__/scenes/Profile.test.tsx __tests__/scenes/Support.test.tsx __tests__/scenes/OrderHistory.test.tsx`.
    Expected: Tests exit 0 and exact visible copy/navigation assertions still pass.
    Evidence: .sisyphus/evidence/task-8-profile-token-cleanup.txt

  Scenario: Address/profile presentation tests remain stable
    Tool: Bash
    Steps: Run `npm run test -- --runInBand __tests__/scenes/AddressSearch.test.tsx __tests__/scenes/AddressList.test.tsx __tests__/scenes/AreaPicker.test.tsx`.
    Expected: Tests exit 0 with no token/native color runtime warnings.
    Evidence: .sisyphus/evidence/task-8-address-token-cleanup.txt
  ```

  **Commit**: YES | Message: `refactor(profile): align tamagui token usage` | Files: profile scene/component styling files and related tests only

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify every completed change maps to a task above.
  - Verify no scope creep into UX redesign, new features, global state redesign, Supabase schema/client changes, or `scenes/orders` internals beyond profile-owned entry behavior.
- [x] F2. Code Quality Review — unspecified-high
  - Check clean-code outcomes: smaller functions, meaningful names, no dead code, no over-abstraction, no new `any`/ts-ignore/console.log.
  - Check route wrappers remain thin and area-picker helpers remain profile-local.
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Agent-executed only. Run app/test harness or RTL flows for Profile → Edit Profile, Profile → Addresses, Address add/edit/search/map/area-picker, Support, OrderHistory entry.
  - Save screenshots/test logs to `.sisyphus/evidence/f3-profile-akun-qa.*`.
- [x] F4. Scope Fidelity Check — deep
  - Compare final diff to original request, interview decisions, Oracle/Metis guardrails, and this plan.
  - Confirm all behavior preservation invariants and native exception list are respected.

## Commit Strategy
- Commit after each task if tests for that task pass.
- Use conventional messages listed per task.
- Never combine unrelated refactor slices in one commit.
- Do not push unless explicitly requested by the user.

## Success Criteria
- Full Profile/Akun feature remains behavior-compatible and better covered.
- `AreaPicker.tsx`, `AddressList.tsx`, `EditProfile.tsx`, and `AddressForm.tsx` have clearer boundaries and less duplicated logic.
- Tamagui usage is more consistent without breaking native API color requirements.
- Dead code is removed only after audit evidence proves it is unused.
- Content search confirms no direct Supabase client imports were introduced under `scenes/profile`.
- Final commands pass: `npm run lint && npm run format:check && npm run test`.
