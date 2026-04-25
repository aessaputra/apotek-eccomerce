# Profile/Akun Oracle Fixes

## TL;DR
> **Summary**: Fix the three Oracle `CHANGES_REQUESTED` findings from the completed Profile/Akun refactor without expanding scope: pending area write failure handling, stale final postal resolution protection, and native placeholder color resolution.
> **Deliverables**:
> - User-safe pending area selection failure handling in `useAreaPickerFlow`
> - Stale-request guard for final postal area resolution
> - Resolved string placeholder color in `AreaPicker`
> - Updated focused AreaPicker tests and evidence
> **Effort**: Short
> **Parallel**: YES - 2 implementation waves
> **Critical Path**: Task 1 → Task 2 → Final Verification; Task 3 can run in parallel with Task 1 if merge conflicts are coordinated.

## Context

### Original Request
User asked to review the completed Profile/Akun refactor again using Oracle and the `code-reviewer` skill, then confirmed: "Ya lanjutkan" after Oracle returned `CHANGES_REQUESTED`.

### Interview Summary
- No new product behavior was requested.
- Scope is corrective only: address Oracle findings and preserve the completed Profile/Akun refactor boundaries.
- User did not request direct implementation; this plan prepares executor work.

### Metis Review (gaps addressed)
- Added explicit failure semantics for `setPendingAreaSelection`: currently synchronous `void`, but handler must catch local write failures and not call `onComplete`.
- Added stale-request rules for success, error, and loading/finally paths.
- Added test requirements for no rejection to caller, no stale completion, and native placeholder color being a resolved string.
- Added scope guard against broader request lifecycle rewrites, service/store changes, or another Profile/Akun refactor pass.

## Work Objectives

### Core Objective
Resolve Oracle's three concrete review findings while preserving AreaPicker behavior, route/session contracts, Profile/Akun scope boundaries, and the prior full validation result.

### Deliverables
- `scenes/profile/useAreaPickerFlow.ts` handles pending area write failure gracefully.
- `scenes/profile/useAreaPickerFlow.ts` ignores stale final postal area resolutions.
- `scenes/profile/AreaPicker.tsx` uses resolved string color for native `placeholderTextColor`.
- `__tests__/scenes/AreaPicker.test.tsx` proves the previous failure modes are fixed.
- Evidence file at `.sisyphus/evidence/oracle-fixes-profile-akun.txt`.

### Definition of Done (verifiable conditions with commands)
- `npm run test -- --runInBand __tests__/scenes/AreaPicker.test.tsx` exits `0`.
- `npm run lint` exits `0`.
- `npm run format:check` exits `0`.
- Optional final confidence command `npm run test` exits `0`; if skipped for time, executor must record that targeted AreaPicker tests were run and why full test was not repeated.
- No `as any`, `@ts-ignore`, `@ts-expect-error`, unguarded `console.log`, or direct Supabase imports are introduced.
- AreaPicker route/session literal shapes remain unchanged.

### Must Have
- Pending write failure copy: `Gagal menyimpan pilihan area. Silakan coba lagi.`
- `onComplete` only runs after `setPendingAreaSelection(...)` succeeds.
- Pending write failure must not reject to `handlePostalSelect`/UI callers.
- Final postal request A cannot complete/navigate after newer request B starts.
- Stale request A cannot clear loading, set `stageError`, or overwrite selected postal state after request B becomes current.
- Native `placeholderTextColor` receives a resolved string, not a Tamagui token string.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not change `utils/areaPickerSession.ts`, `stores/areaPickerStore.ts`, regional services, Biteship/search services, route files, or unrelated Profile/Akun screens.
- Do not introduce AbortController/request cancellation infrastructure; use existing `requestIdRef` pattern.
- Do not redesign AreaPicker UI, copy, navigation, haptics, or hierarchy selection.
- Do not move area-picker helpers out of `scenes/profile`.
- Do not convert broader Tamagui tokens or touch `AddressSearch` beyond using it as a pattern reference.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after targeted bugfix, using existing Jest/React Native Testing Library tests.
- QA policy: Every task has agent-executed happy + failure/stale scenarios.
- Evidence: `.sisyphus/evidence/oracle-fixes-profile-akun.txt`.
- Native exception rule: `placeholderTextColor` is a React Native `TextInput` prop and must use a resolved string via `useTheme()` + `getThemeColor(...)`, matching `AddressSearch.tsx`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. This corrective plan intentionally has fewer tasks because Oracle findings are tightly scoped.

Wave 1: Task 1 pending write failure handling, Task 3 placeholder color fix.
Wave 2: Task 2 stale final postal resolution guard, then run combined targeted tests.
Wave 3: Final verification wave F1-F4.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
| --- | --- | --- |
| 1. Pending write failure handling | None | 2, Final verification |
| 2. Stale final postal resolution guard | 1 recommended, none hard | Final verification |
| 3. AreaPicker native placeholder color | None | Final verification |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → quick, visual-engineering.
- Wave 2 → 1 task → deep.
- Final → 4 review tasks → oracle, unspecified-high, unspecified-high, deep.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Make pending area selection write failure user-safe

  **What to do**: Update `scenes/profile/useAreaPickerFlow.ts` so `handleAreaSelection` catches failures from `setPendingAreaSelection(...)`, sets `stageError` to exactly `Gagal menyimpan pilihan area. Silakan coba lagi.`, does not call `onComplete`, and does not rethrow. Preserve the successful path exactly: build the same pending selection payload, call `setPendingAreaSelection(...)`, then call `onComplete()`. Keep `setPendingAreaSelection` itself unchanged because `utils/areaPickerSession.ts:13-21` is a simple synchronous store write and Oracle requested a local fix.

  **Must NOT do**: Do not change pending selection payload shape, `buildPendingAreaSelection`, Zustand store state keys, `onComplete` route behavior, or current-location manual fallback behavior. Do not swallow unrelated errors outside this local persistence write boundary.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused local error-handling patch plus test update.
  - Skills: `systematic-debugging`, `typescript-expert`, `testing-strategy` - Needed for regression reproduction, strict callback typing, and updating the failing test.
  - Omitted: `frontend-design` - No visual design changes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, Final verification | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Finding: Oracle review `P1` - pending write failure currently leaks/rejects.
  - Target: `scenes/profile/useAreaPickerFlow.ts:180-194` - unguarded `setPendingAreaSelection(...)` and `onComplete()` sequence.
  - Caller: `scenes/profile/useAreaPickerFlow.ts:289-314` - postal selection calls `handleAreaSelection(resolvedArea)`.
  - Caller: `scenes/profile/useAreaPickerFlow.ts:394-402` - current-location success path calls `handleAreaSelection(result.area, result.hierarchy)`.
  - Utility contract: `utils/areaPickerSession.ts:13-21` - synchronous store write, do not edit.
  - Current wrong test: `__tests__/scenes/AreaPicker.test.tsx:343-385` - currently expects rejection and must be changed.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `handleAreaSelection` catches `setPendingAreaSelection` throw and sets exact `stageError` copy.
  - [ ] `onComplete` is not called when pending write fails.
  - [ ] `handlePostalSelect({ label: '42183' })` resolves without throwing when pending write fails.
  - [ ] Existing successful pending write path still calls `onComplete` exactly once.
  - [ ] `npm run test -- --runInBand __tests__/scenes/AreaPicker.test.tsx` exits `0` after this test update.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Pending write failure is visible and non-throwing
    Tool: Bash
    Steps: Update the existing test at `__tests__/scenes/AreaPicker.test.tsx:343-385` so mocked `setPendingAreaSelection` throws `pending write failed`, then call `await act(async () => { await result.current.handlePostalSelect({ label: '42183' }); })` without `rejects.toThrow`.
    Expected: Jest exits 0; `result.current.stageError` equals `Gagal menyimpan pilihan area. Silakan coba lagi.`; `onComplete` is not called; the handler does not reject.
    Evidence: .sisyphus/evidence/oracle-fixes-profile-akun.txt

  Scenario: Successful postal selection still completes once
    Tool: Bash
    Steps: Add or keep a success test with one resolved `BiteshipArea`, successful `setPendingAreaSelection`, and postal option `42183`.
    Expected: Jest exits 0; `mockSetPendingAreaSelection` receives the same area/hierarchy data as before; `onComplete` is called exactly once.
    Evidence: .sisyphus/evidence/oracle-fixes-profile-akun.txt
  ```

  **Commit**: YES | Message: `fix(profile): handle area selection write failures` | Files: `scenes/profile/useAreaPickerFlow.ts`, `__tests__/scenes/AreaPicker.test.tsx`, `.sisyphus/evidence/oracle-fixes-profile-akun.txt`

- [x] 2. Guard final postal area resolution against stale requests

  **What to do**: Update `handlePostalSelect` in `scenes/profile/useAreaPickerFlow.ts` to follow the existing `requestIdRef` stale guard pattern used by `loadCities`, `loadDistricts`, `loadPostalCodes`, and `handleUseCurrentLocation`. At the start of every postal selection, increment/capture `const requestId = ++requestIdRef.current`, set loading/error/selected postal label for the latest option, and after `resolveAreaByPostal(...)` returns, do nothing if `requestId !== requestIdRef.current`. Guard `catch` and `finally` paths as well: stale requests must not set `stageError`, must not clear loading, and must not call `handleAreaSelection`. If the latest request resolves with no area, keep the existing no-area error copy unchanged: `Area pengiriman untuk kode pos ini tidak ditemukan. Silakan pilih kode pos lain.`

  **Must NOT do**: Do not change `resolveAreaByPostal` matching logic, Biteship search input order, postal option formatting, selected hierarchy state, route navigation, or current-location request flow beyond benefiting from Task 1's safer `handleAreaSelection`.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: async ordering bug with stale request semantics and user-visible completion/navigation risk.
  - Skills: `systematic-debugging`, `typescript-expert`, `testing-strategy`, `react-native` - Needed for deterministic deferred promise tests and hook state assertions.
  - Omitted: `tamagui-best-practices` - No styling involved.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Final verification | Blocked By: 1 recommended

  **References** (executor has NO interview context - be exhaustive):
  - Finding: Oracle review `P2` - final postal area resolution lacks stale-request protection.
  - Target: `scenes/profile/useAreaPickerFlow.ts:289-314` - async `resolveAreaByPostal(...)` completion currently calls `handleAreaSelection` unguarded.
  - Pattern: `scenes/profile/useAreaPickerFlow.ts:205-216` - `loadCities` request id guard.
  - Pattern: `scenes/profile/useAreaPickerFlow.ts:218-229` - `loadDistricts` request id guard.
  - Pattern: `scenes/profile/useAreaPickerFlow.ts:231-248` - `loadPostalCodes` request id guard.
  - Pattern: `scenes/profile/useAreaPickerFlow.ts:318-411` - `handleUseCurrentLocation` guards stale result and only clears loading in `finally` for current request.
  - Existing stale tests: `__tests__/scenes/AreaPicker.test.tsx:320-341` - stale postal-code list response test; add a separate final postal area resolution stale test.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `handlePostalSelect` increments/captures `requestIdRef` for final postal area resolution.
  - [ ] Stale final postal request success does not call `setPendingAreaSelection` or `onComplete`.
  - [ ] Stale final postal request failure/no-area result does not overwrite the latest request's `stageError` or loading state.
  - [ ] Latest failed/no-area request still shows the existing no-area copy.
  - [ ] `npm run test -- --runInBand __tests__/scenes/AreaPicker.test.tsx` exits `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Newer postal resolution wins over older resolution
    Tool: Bash
    Steps: In `AreaPicker.test.tsx`, create two deferred `searchBiteshipArea` responses for postal selections A then B. Start A, start B, resolve B with `area-42183`, then resolve A with `area-42111`.
    Expected: Jest exits 0; `setPendingAreaSelection` receives only B/latest area; `onComplete` is called exactly once for B; stale A does not overwrite selected state or completion.
    Evidence: .sisyphus/evidence/oracle-fixes-profile-akun.txt

  Scenario: Stale no-area response does not overwrite latest success
    Tool: Bash
    Steps: Start A, start B, resolve B with a valid area, then resolve A with empty `data: []`.
    Expected: Jest exits 0; no stale `Area pengiriman...` error appears after B succeeds; loading state is false only after latest request completes.
    Evidence: .sisyphus/evidence/oracle-fixes-profile-akun.txt
  ```

  **Commit**: YES | Message: `fix(profile): ignore stale postal area resolutions` | Files: `scenes/profile/useAreaPickerFlow.ts`, `__tests__/scenes/AreaPicker.test.tsx`, `.sisyphus/evidence/oracle-fixes-profile-akun.txt`

- [x] 3. Resolve AreaPicker placeholder color for native TextInput prop

  **What to do**: Update `scenes/profile/AreaPicker.tsx` so the search `Input` receives a resolved string for `placeholderTextColor`, matching the existing `AddressSearch.tsx` native-prop pattern. Import/use `useTheme` from `tamagui`, `getThemeColor` from `@/utils/theme`, and `THEME_FALLBACKS` from `@/constants/ui`. In `AreaPickerScreen`, define `const theme = useTheme();` and `const placeholderColor = getThemeColor(theme, 'searchPlaceholderColor', THEME_FALLBACKS.searchPlaceholderColor ?? THEME_FALLBACKS.placeholderColor);` with the same brief comment: `placeholderTextColor is a native TextInput prop and requires a resolved color string.` Pass `placeholderTextColor={placeholderColor}`.

  **Must NOT do**: Do not convert other Tamagui token props to resolved colors. Do not change placeholder copy, input layout, search state, filtering behavior, or `AddressSearch.tsx`.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: React Native/Tamagui native-prop styling correctness with visual parity.
  - Skills: `tamagui-best-practices`, `react-native`, `typescript-expert` - Needed for token/native exception and import typing.
  - Omitted: `native-data-fetching` - No network/data change.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Final verification | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Finding: Oracle review `P2` - `placeholderTextColor="$placeholderColor"` is wrong for native TextInput.
  - Target: `scenes/profile/AreaPicker.tsx:95-104` - current `Input` prop.
  - Pattern: `scenes/profile/AddressSearch.tsx:10-16` - imports `useTheme`, `getThemeColor`, `THEME_FALLBACKS`.
  - Pattern: `scenes/profile/AddressSearch.tsx:35` - initializes `const theme = useTheme()`.
  - Pattern: `scenes/profile/AddressSearch.tsx:57-62` - resolved placeholder color comment and fallback.
  - Guardrail: root `AGENTS.md` forbids `getThemeColor()` inside Tamagui components except native API bridges; this task is exactly that exception.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `AreaPicker.tsx` passes a resolved `placeholderColor` string to `placeholderTextColor`.
  - [ ] The native exception comment exists near the resolved color computation.
  - [ ] No other AreaPicker token props are unnecessarily converted.
  - [ ] AreaPicker test asserts the rendered search input does not receive `'$placeholderColor'` for `placeholderTextColor`.
  - [ ] `npm run lint` and `npm run format:check` exit `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Search input receives resolved native placeholder color
    Tool: Bash
    Steps: Add/update an AreaPicker render test that finds the input with placeholder `Cari kota, kecamatan, atau kode pos...` and checks `placeholderTextColor` is a string and not `'$placeholderColor'`.
    Expected: Jest exits 0; assertion proves native prop receives resolved color.
    Evidence: .sisyphus/evidence/oracle-fixes-profile-akun.txt

  Scenario: AreaPicker search UI behavior remains unchanged
    Tool: Bash
    Steps: Run `npm run test -- --runInBand __tests__/scenes/AreaPicker.test.tsx` after color change.
    Expected: Existing query/filter/stage tests still pass with unchanged placeholder copy.
    Evidence: .sisyphus/evidence/oracle-fixes-profile-akun.txt
  ```

  **Commit**: YES | Message: `fix(profile): resolve area picker placeholder color` | Files: `scenes/profile/AreaPicker.tsx`, `__tests__/scenes/AreaPicker.test.tsx`, `.sisyphus/evidence/oracle-fixes-profile-akun.txt`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Oracle Findings Compliance Audit — oracle
  - Verify all three Oracle findings are fixed and no new behavior changes were introduced.
  - Confirm pending write failure is non-throwing/user-safe, stale final postal resolution is guarded, and placeholder color is resolved.
- [x] F2. Code Quality Review — unspecified-high
  - Check clean, minimal patch; no broad lifecycle rewrite; no `any`/ts-ignore/unguarded logs/direct Supabase imports.
  - Check `requestIdRef` logic guards success, error, and finally paths without deadlocks/loading leaks.
- [x] F3. Real Manual QA — unspecified-high (+ Jest/RTL)
  - Agent-executed only. Run focused AreaPicker RTL/Jest flows for postal success, pending write failure, stale postal resolution, current-location success/failure, back navigation, and search placeholder.
  - Save logs to `.sisyphus/evidence/oracle-fixes-profile-akun-qa.txt`.
- [x] F4. Scope Fidelity Check — deep
  - Compare final diff to this corrective plan and original Profile/Akun refactor guardrails.
  - Confirm no broader Profile/Akun, service, store, route, or UI redesign work slipped in.

## Commit Strategy
- Commit after all three corrective tasks pass targeted tests, because the changes share `AreaPicker.test.tsx` and `useAreaPickerFlow.ts` context.
- Suggested message: `fix(profile): address area picker review findings`.
- Do not push unless explicitly requested by the user.

## Success Criteria
- Oracle review findings are closed with evidence.
- `npm run test -- --runInBand __tests__/scenes/AreaPicker.test.tsx` passes.
- `npm run lint` passes.
- `npm run format:check` passes.
- Full `npm run test` passes if executor runs final confidence validation.
- User-facing AreaPicker flow remains behavior-compatible except errors are now handled more safely.
