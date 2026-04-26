# Auth Refactor + Forgot Password Flow

## TL;DR
> **Summary**: Refactor Login/Register/auth logic into cleaner, testable boundaries while preserving current UI/behavior, then add a full Supabase forgot-password recovery flow with custom-scheme deep-link handling and reset-password screen.
> **Deliverables**:
> - Characterization and regression tests for current auth behavior.
> - Cleaner auth form orchestration for Login/Register without visual redesign.
> - Supabase auth service wrappers for reset email, recovery verification, password update, and sign-out-after-reset.
> - New Forgot Password and Reset Password routes/scenes with recovery edge-case handling.
> - Recovery-aware auth redirect guard so reset flow is not hijacked by global auth redirects.
> - Agent-executed validation: lint, format check, Jest, and flow QA evidence.
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 + Task 2 + Task 3 → Task 6 → Task 7 → Task 8 → Task 9 → Task 11 → Final Verification Wave

## Context
### Original Request
Refactor Scene Login/Register agar kode bersih dan konsisten, refactor Auth Services/Auth Logic agar bersih dan robust using `/clean-code`, `/refactor`, `/supabase-auth`, `/auth-implementation-patterns`, and add fitur Lupa Password.

### Interview Summary
- Forgot password scope: full flow — request reset email, process recovery/deep link, set new password screen.
- UI scope: structural refactor only; preserve current visual design and Indonesian copy style.
- Test strategy: tests-after for implementation tasks, with characterization tests first and agent QA for every task.
- Post-reset behavior: after successful password update, explicitly sign out and route to Login with a success message.
- Password policy: preserve existing app policy (`validatePassword`: minimum 6 characters, at least one letter and one number).
- Forgot-password privacy: always show generic success for valid email submissions; never reveal whether an account exists.
- Link strategy: use existing Expo custom scheme `apotek-ecommerce` and verify expected redirect URLs for dev/staging/prod.

### Metis Review (gaps addressed)
- Add recovery mode guard so Supabase recovery sessions do not trigger normal logged-in redirects away from Reset Password.
- Keep refactor and feature work separated by wave and task dependency.
- Do not over-abstract auth forms into a generic framework; extract only repeated, proven auth-form behavior.
- Handle invalid/expired/used recovery links, direct Reset Password access without session, same/weak password, password confirmation mismatch, network/rate-limit errors, and recovery links opened while already signed in.
- Transport Login success message via route params and clear it after display.

## Work Objectives
### Core Objective
Make auth code cleaner, more consistent, and more robust without changing existing Login/Register UI behavior, then add a secure, privacy-preserving password recovery flow backed by Supabase Auth.

### Deliverables
- New/updated tests in `__tests__/services/`, `__tests__/scenes/`, `__tests__/hooks/`, and/or `__tests__/app/` as specified per task.
- Refactored auth scene logic under `scenes/auth/` and reusable auth hooks/helpers under `hooks/` or `scenes/auth/` where narrowly scoped.
- Updated `services/auth.service.ts` with typed password recovery wrappers and redirect helper.
- New thin route wrappers in `app/(auth)/` and updated auth stack registration.
- Updated route types in `types/routes.types.ts`.
- Updated localized error handling in `constants/auth.errors.ts` only for missing recovery/reset cases.

### Definition of Done (verifiable conditions with commands)
- `npm run lint` passes.
- `npm run format:check` passes.
- `npm run test` passes.
- Jest coverage includes auth service reset request/update password behavior, Login/Register retained behavior, Forgot Password request flow, Reset Password recovery/session flow, and global redirect guard behavior.
- Agent QA evidence files exist under `.sisyphus/evidence/` for each task and final verification item.

### Must Have
- Keep `app/(auth)` files thin; no screen logic in route files.
- Keep all Supabase calls in `services/auth.service.ts` via `@/utils/supabase`.
- Preserve `AuthProvider` responsibilities: session bootstrap, auth events, profile validation, push-token lifecycle only.
- Preserve `AuthProvider` `setTimeout(0)` lock-avoidance pattern when touching auth event handling.
- Generic forgot-password success copy for valid email submissions regardless of account existence.
- Reset Password direct access without recovery session shows an error state and CTA back to Forgot Password/Login.
- Recovery success explicitly calls password update, then sign out, then routes to Login with one-time success copy.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not redesign auth screens.
- Do not change password policy.
- Do not refactor Google OAuth beyond preserving behavior and testing regressions around shared service changes.
- Do not add `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Do not create source-adjacent tests or `__mocks__/` directories.
- Do not create another Supabase client or bypass `utils/supabase.ts`.
- Do not leak account existence through forgot-password copy.
- Do not require manual dashboard verification as an acceptance criterion; record expected allowlist values in evidence and keep app-side verification executable.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + characterization-first using Jest (`jest-expo`) and React Native Testing Library.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 characterization tests, Task 2 shared auth contracts/helpers, Task 3 service recovery wrappers.
Wave 2: Task 4 Login refactor, Task 5 Register refactor, Task 6 route/types/auth stack wiring, Task 7 recovery redirect guard.
Wave 3: Task 8 Forgot Password screen/flow, Task 9 Reset Password screen/flow, Task 10 recovery error localization and edge cases.
Wave 4: Task 11 integrated regression/QA hardening.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
| --- | --- | --- |
| 1 | None | 4, 5, 11 |
| 2 | None | 4, 5, 8, 9 |
| 3 | None | 8, 9, 10 |
| 4 | 1, 2 | 11 |
| 5 | 1, 2 | 11 |
| 6 | 2 | 7, 8, 9, 11 |
| 7 | 3, 6 | 9, 11 |
| 8 | 2, 3, 6 | 9, 11 |
| 9 | 2, 3, 6, 7, 8 | 11 |
| 10 | 3 | 8, 9, 11 |
| 11 | 1-10 | Final Verification Wave |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Tasks | Categories |
| --- | ---: | --- |
| 1 | 3 | quick, unspecified-high |
| 2 | 4 | quick, deep, unspecified-high |
| 3 | 3 | visual-engineering, deep, quick |
| 4 | 1 | unspecified-high |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add characterization coverage for current auth behavior

  **What to do**: Add tests that lock down current Login, Register, auth service, and auth redirect behavior before refactoring. Cover current validation messages, Login email-not-verified redirect, Register verify-email redirect, Google OAuth cancellation handling, `verifyEmailOtp` recovery support, and existing `AuthProvider` redirect assumptions. Prefer scene-boundary mocks and service-boundary mocks; do not change production behavior in this task except tiny testability exports if unavoidable.
  **Must NOT do**: Do not refactor production auth code yet. Do not create `__mocks__/`. Do not make assertions against private implementation details.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Requires careful test characterization across scenes, services, and provider behavior.
  - Skills: [`testing-strategy`, `typescript-expert`] - Needed for Jest/TypeScript test design and safe typed mocks.
  - Omitted: [`frontend-design`] - No visual design work in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 11 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `__tests__/AGENTS.md:29-35` - Inline mocks, `renderWithTheme`, observable behavior assertions.
  - Pattern: `test-utils/renderWithTheme.tsx:37-57` - Use this render helper for scene/component tests.
  - Pattern: `__tests__/app/auth-provider.lifecycle.test.tsx:55-73` - Supabase auth mock with captured `onAuthStateChange` callback.
  - Pattern: `__tests__/hooks/withAuthGuard.test.tsx:8-12` - Expo Router mock pattern.
  - Current behavior: `scenes/auth/Login.tsx:47-96` - Login validation, service call, verify-email redirect, error mapping.
  - Current behavior: `scenes/auth/Login.tsx:98-121` - Google OAuth loading/error/cancel flow.
  - Current behavior: `scenes/auth/SignUp.tsx:51-107` - Register validation, signup service call, verify-email redirect.
  - Current behavior: `services/auth.service.ts:88-121` - `verifyEmailOtp` already accepts `recovery`.
  - Current behavior: `app/_layout.tsx:162-179` - Existing logged-in/logged-out auth redirect logic.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run test -- --runTestsByPath __tests__/services/auth.service.test.ts __tests__/scenes/Login.test.tsx __tests__/scenes/SignUp.test.tsx` passes, or equivalent existing paths if repository naming differs.
  - [ ] Login tests assert empty fields show `Email dan password wajib diisi.`, invalid email shows `Format email tidak valid.`, and email-not-verified service error routes to `/(auth)/verify-email` with the trimmed email.
  - [ ] SignUp tests assert empty/invalid email/password policy behavior and verify-email route when Supabase returns user without session.
  - [ ] Auth service tests assert `verifyEmailOtp({ type: 'recovery' })` calls `supabase.auth.verifyOtp` with `type: 'recovery'` and returns `{ data, error }` shape.
  - [ ] Evidence file `.sisyphus/evidence/task-1-auth-characterization.txt` records exact test commands and pass/fail output.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Existing login validation is preserved
    Tool: Bash
    Steps: Run targeted Login scene tests after adding characterization coverage.
    Expected: Empty email/password and invalid email assertions pass with existing Indonesian copy.
    Evidence: .sisyphus/evidence/task-1-auth-characterization.txt

  Scenario: Existing recovery-capable OTP service behavior is preserved
    Tool: Bash
    Steps: Run auth service test that calls verifyEmailOtp with type recovery and mocked Supabase success/error branches.
    Expected: Supabase verifyOtp receives token_hash and type recovery; test passes without production behavior changes.
    Evidence: .sisyphus/evidence/task-1-auth-characterization-service.txt
  ```

  **Commit**: YES | Message: `test(auth): characterize existing auth flows` | Files: [`__tests__/services/auth.service.test.ts`, `__tests__/scenes/Login.test.tsx`, `__tests__/scenes/SignUp.test.tsx`, optional auth redirect test file]

- [x] 2. Introduce narrow shared auth form contracts and helpers

  **What to do**: Extract only repeated, proven auth-form concerns into narrow helpers/types: normalized email helper, reusable password policy contract that delegates to `validatePassword`, auth form status types, and route-param contracts for auth success/error messages. Place reusable cross-screen logic in `hooks/` only if shared by multiple screens; otherwise keep helpers under `scenes/auth/`. Add focused tests for helper behavior.
  **Must NOT do**: Do not build a generic form framework. Do not change password policy or copy unless needed for consistency. Do not move Supabase calls into hooks.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Small helper/type extraction with tests.
  - Skills: [`clean-code`, `refactor`, `typescript-expert`] - Needed to avoid over-abstraction and preserve type safety.
  - Omitted: [`supabase-auth`] - No Supabase API calls in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 8, 9 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Convention: `scenes/AGENTS.md:43-47` - Scenes compose hooks/components/services; use hooks for reusable stateful logic.
  - Convention: `types/AGENTS.md:31-33` - Keep route params narrow and serializable.
  - Existing validation: `utils/validation.ts:53-62` - Email validation trims input.
  - Existing password policy: `utils/validation.ts:83-102` - Min 6, letter, number; must remain unchanged.
  - Existing strength indicator: `utils/validation.ts:125-146` - Keep SignUp strength behavior compatible.
  - Current Login duplication: `scenes/auth/Login.tsx:47-68` - Trim/validate email before auth service call.
  - Current Register duplication: `scenes/auth/SignUp.tsx:51-78` - Trim/validate email/password before auth service call.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Added helper tests prove email normalization trims whitespace and does not lowercase unless implementation explicitly chooses and tests it across Login/Register/Forgot Password.
  - [ ] Existing password policy tests still pass and no constants in `utils/validation.ts:6-8` are changed.
  - [ ] New route-param types are serializable strings only.
  - [ ] `npm run test -- --runTestsByPath` passes for new helper/type tests and existing `__tests__/utils` validation tests if present.
  - [ ] Evidence file `.sisyphus/evidence/task-2-auth-helpers.txt` records command output and the selected helper locations.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Shared password policy matches existing validation
    Tool: Bash
    Steps: Run helper/validation tests for invalid short password, missing number, missing letter, and valid password123.
    Expected: Messages match current Indonesian policy from utils/validation.ts.
    Evidence: .sisyphus/evidence/task-2-auth-helpers.txt

  Scenario: No broad generic form abstraction added
    Tool: Bash
    Steps: Run git diff and inspect changed helper/hook files for auth-specific names only.
    Expected: No generic form framework or unrelated modules introduced.
    Evidence: .sisyphus/evidence/task-2-auth-helpers-diff.txt
  ```

  **Commit**: YES | Message: `refactor(auth): add shared auth form contracts` | Files: [`hooks/*` or `scenes/auth/*` helper files, `types/routes.types.ts` if route params added, related tests]

- [x] 3. Add Supabase password recovery service boundary

  **What to do**: Extend `services/auth.service.ts` with typed wrappers for password recovery: `requestPasswordReset(email)`, `updatePassword(password)`, and a recovery redirect helper using Expo `makeRedirectUri` with scheme `apotek-ecommerce` and reset-password route path. Return the same `{ data, error }` shape style as existing functions. Preserve existing OAuth functions and `_exchangePromises` behavior. Add service tests for success, Supabase error, thrown error, redirect URL generation, and sign-out-after-reset support through existing `signOut()` wrapper.
  **Must NOT do**: Do not call Supabase from scenes. Do not store tokens manually. Do not change Google OAuth redirect constants except extracting shared redirect utility if tests prove no behavior change.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Auth service boundary must be robust and preserve OAuth behavior.
  - Skills: [`supabase-auth`, `auth-implementation-patterns`, `typescript-expert`] - Needed for Supabase APIs, security, and typed service contracts.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8, 9, 10 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Service convention: `services/AGENTS.md:37-44` - One domain service, import client from `@/utils/supabase`, re-export shared APIs through barrel when broad.
  - Existing service style: `services/auth.service.ts:69-86` - Simple `{ data, error }` Supabase wrappers.
  - Existing catch style: `services/auth.service.ts:102-121` and `services/auth.service.ts:127-149` - Return `{ data: null, error: { message, name } }` on thrown errors.
  - Existing redirect scheme: `services/auth.service.ts:38-49` and `app.config.ts:22-27` - Scheme is `apotek-ecommerce`.
  - Existing Supabase client rule: `utils/AGENTS.md` - `utils/supabase.ts` is the only Supabase client.
  - External: `https://supabase.com/docs/guides/auth/passwords` - `resetPasswordForEmail` and password update flow.
  - External: `https://supabase.com/docs/reference/javascript/auth-updateuser` - `updateUser({ password })` reference.
  - External: `https://docs.expo.dev/versions/latest/sdk/auth-session/` - `makeRedirectUri` behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `requestPasswordReset(' user@example.com ')` calls `supabase.auth.resetPasswordForEmail` with normalized email and `{ redirectTo }`.
  - [ ] Redirect helper tests assert the generated native redirect includes scheme `apotek-ecommerce` and reset-password path, and native redirect does not point to localhost.
  - [ ] `updatePassword('password123')` calls `supabase.auth.updateUser({ password: 'password123' })` and returns `{ data, error }`.
  - [ ] Thrown service errors are wrapped consistently with a custom `name` and Indonesian-friendly upstream mapping remains possible through `getAuthErrorMessage`.
  - [ ] `npm run test -- --runTestsByPath __tests__/services/auth.service.test.ts` passes.
  - [ ] Evidence file `.sisyphus/evidence/task-3-auth-service-recovery.txt` records test output and expected redirect URL(s).

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Reset email service uses Supabase boundary only
    Tool: Bash
    Steps: Run auth.service tests for requestPasswordReset success/error and inspect git diff for Supabase calls outside services/auth.service.ts.
    Expected: Only auth.service.ts imports/calls resetPasswordForEmail; tests pass.
    Evidence: .sisyphus/evidence/task-3-auth-service-recovery.txt

  Scenario: Update password service handles Supabase and thrown failures
    Tool: Bash
    Steps: Run auth.service tests for updatePassword success, Supabase error, and thrown exception.
    Expected: All branches return the service's typed data/error shape without uncaught exceptions.
    Evidence: .sisyphus/evidence/task-3-auth-service-update.txt
  ```

  **Commit**: YES | Message: `feat(auth): add password recovery service wrappers` | Files: [`services/auth.service.ts`, `services/index.ts` if needed, `__tests__/services/auth.service.test.ts`]

- [x] 4. Refactor Login scene into clean form orchestration without visual redesign

  **What to do**: Move Login form state/submission orchestration into a narrow hook or auth-local helper if it reduces complexity; keep the rendered Tamagui layout visually equivalent. Add a `Lupa Password?` link inside the Login form card, and support a one-time route-param success message after password reset. Preserve Google OAuth behavior and loading separation. Add/update Login tests to cover validation, forgot-password navigation, reset-success message display/clear, email-not-verified redirect, OAuth cancellation, and generic error branch.
  **Must NOT do**: Do not change visual design beyond adding the forgot-password link and success message state. Do not refactor Google OAuth internals. Do not call Supabase directly from the scene/hook.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Refactor must preserve behavior while separating UI and form orchestration.
  - Skills: [`clean-code`, `refactor`, `react-native`, `react-ui-patterns`] - Needed for small functions, React Native form behavior, and loading/error UI states.
  - Omitted: [`supabase-auth`] - Login continues using existing service wrappers.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11 | Blocked By: 1, 2

  **References** (executor has NO interview context - be exhaustive):
  - Current Login state: `scenes/auth/Login.tsx:22-41` - Local state and scroll content style.
  - Current submit logic: `scenes/auth/Login.tsx:47-96` - Preserve validation, service call, and verify-email route.
  - Current OAuth logic: `scenes/auth/Login.tsx:98-121` - Preserve cancellation and dev logging guard.
  - Current form card and button layout: `scenes/auth/Login.tsx:181-255` - Preserve visual structure.
  - Current signup link placement: `scenes/auth/Login.tsx:257-278` - Add forgot-password link consistently near auth links.
  - Scene convention: `scenes/AGENTS.md:43-53` - Scene composition and test expectations.
  - Route typing: `types/routes.types.ts:132-135` - Add Login route params for success message if route-param transport is used.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Login component body no longer owns low-level submission branching if a hook/helper was extracted; extracted names are auth-specific and intention-revealing.
  - [ ] Login tests assert `Lupa Password?` navigates to `/(auth)/forgot-password`.
  - [ ] Login tests assert reset success route param displays a success message exactly once and does not persist after dismiss/param clear behavior.
  - [ ] Existing Login validation and email-not-verified tests from Task 1 still pass.
  - [ ] `npm run test -- --runTestsByPath __tests__/scenes/Login.test.tsx` passes.
  - [ ] Evidence file `.sisyphus/evidence/task-4-login-refactor.txt` records targeted test output and a before/after complexity note.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Login forgot-password navigation works
    Tool: Bash
    Steps: Run Login scene test that presses text/link "Lupa Password?" with mocked Expo Router.
    Expected: Router navigates/pushes to /(auth)/forgot-password exactly once.
    Evidence: .sisyphus/evidence/task-4-login-refactor.txt

  Scenario: Login reset success message is one-time
    Tool: Bash
    Steps: Run Login test with resetSuccess route param, dismiss success, and rerender/navigation clear branch.
    Expected: Success message appears initially and is absent after dismiss/clear; no auth service call occurs.
    Evidence: .sisyphus/evidence/task-4-login-success-message.txt
  ```

  **Commit**: YES | Message: `refactor(auth): clean login form flow` | Files: [`scenes/auth/Login.tsx`, optional auth hook/helper, `types/routes.types.ts`, `__tests__/scenes/Login.test.tsx`]

- [x] 5. Refactor Register scene into clean form orchestration without behavior changes

  **What to do**: Refactor SignUp form state/submission into the same narrow auth-form pattern used by Login where appropriate. Preserve password strength indicator, existing validation policy, verify-email redirect, and visual design. Remove empty/no-op branches if tests prove safe. Add/update SignUp tests for validation, password strength, user-exists email error, verify-email redirect, and successful session branch behavior.
  **Must NOT do**: Do not rename the user-facing route unless all wrappers/types/tests are updated. Do not change password policy or strength labels. Do not add extra signup fields.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Existing SignUp is longer and includes password strength UI plus verification branching.
  - Skills: [`clean-code`, `refactor`, `react-native`, `typescript-expert`] - Needed for safe behavior-preserving extraction and typed route params.
  - Omitted: [`supabase-auth`] - Signup continues using existing service wrapper.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11 | Blocked By: 1, 2

  **References** (executor has NO interview context - be exhaustive):
  - Current SignUp state: `scenes/auth/SignUp.tsx:35-46` - Email/password/loading/error/focused field state.
  - Current submit logic: `scenes/auth/SignUp.tsx:51-107` - Preserve validation and verify-email route.
  - Current password strength UI: `scenes/auth/SignUp.tsx:241-275` - Preserve `PasswordStrength` colors/text.
  - Current password input/helper: `scenes/auth/SignUp.tsx:277-296` - Preserve placeholder/helper copy.
  - Current login link: `scenes/auth/SignUp.tsx:324-345` - Keep route to Login.
  - Existing validation policy: `utils/validation.ts:83-102` and `utils/validation.ts:125-146`.
  - Scene convention: `scenes/AGENTS.md:49-53` - Scene tests cover user-visible states and mock services.

  **Acceptance Criteria** (agent-executable only):
  - [ ] SignUp tests assert invalid email, invalid password, user-already-exists, verify-email redirect, and password strength indicator behavior.
  - [ ] Current password strength labels (`Lemah`, `Sedang`, `Kuat`) remain unchanged.
  - [ ] If no-op branch `if (data?.session) {}` is removed or replaced, tests assert the session-success branch does not route to verify-email.
  - [ ] `npm run test -- --runTestsByPath __tests__/scenes/SignUp.test.tsx` passes.
  - [ ] Evidence file `.sisyphus/evidence/task-5-register-refactor.txt` records targeted test output and files changed.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Register validation remains compatible
    Tool: Bash
    Steps: Run SignUp tests for empty fields, invalid email, short password, and password without number.
    Expected: Existing Indonesian validation messages are shown and signUp service is not called.
    Evidence: .sisyphus/evidence/task-5-register-refactor.txt

  Scenario: Register email verification branch is preserved
    Tool: Bash
    Steps: Run SignUp test with signUp returning user and no session.
    Expected: Router pushes /(auth)/verify-email with the trimmed email param.
    Evidence: .sisyphus/evidence/task-5-register-verify-email.txt
  ```

  **Commit**: YES | Message: `refactor(auth): clean register form flow` | Files: [`scenes/auth/SignUp.tsx`, optional auth hook/helper, `__tests__/scenes/SignUp.test.tsx`]

- [x] 6. Wire auth routes, stack registration, and typed params for recovery flow

  **What to do**: Add thin route wrappers for `forgot-password` and `reset-password` under `app/(auth)/`, register them in `app/(auth)/_layout.tsx`, export new scenes from `scenes/auth/index.ts`, and update `types/routes.types.ts` `AuthRoutes`/`AuthStackParams` with serializable params. Route params must include Login reset-success transport and Reset Password recovery params (`token_hash`, `type`, optional `error`) as strings. Add route wrapper tests if the repo has route tests; otherwise add type/scene tests that exercise typed navigation.
  **Must NOT do**: Do not put UI or service calls in `app/(auth)` files. Do not add auth routes to `PROTECTED_ROUTE_GROUPS`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Route/type wiring with strict thin-wrapper constraints.
  - Skills: [`typescript-expert`, `react-native`] - Needed for Expo Router route params and typed hrefs.
  - Omitted: [`clean-code`] - Minimal code changes, no refactor logic.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 8, 9, 11 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - App route convention: `app/AGENTS.md:23-31` - Auth routes are public stack thin re-exports.
  - Existing auth stack: `app/(auth)/_layout.tsx:5-11` - Register new Stack screens here.
  - Existing route wrappers: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/(auth)/verify-email.tsx` - One-line re-export pattern.
  - Existing root stack: `app/_layout.tsx:190-197` - `(auth)` already registered; do not add new root group.
  - Current protected routes: `app/_layout.tsx:29` - Do not add forgot/reset routes here.
  - Current auth route types: `types/routes.types.ts:3-7` and `types/routes.types.ts:132-135` - Extend with forgot/reset/login params.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `app/(auth)/forgot-password.tsx` and `app/(auth)/reset-password.tsx` are one-line/thin re-exports only.
  - [ ] `app/(auth)/_layout.tsx` includes `forgot-password` and `reset-password` screens.
  - [ ] `types/routes.types.ts` includes serializable route params for Login success, Forgot Password, Reset Password, and Verify Email if needed.
  - [ ] `PROTECTED_ROUTE_GROUPS` in `app/_layout.tsx:29` is unchanged.
  - [ ] `npm run test -- --runTestsByPath` passes for route/type related tests added or updated.
  - [ ] Evidence file `.sisyphus/evidence/task-6-auth-route-wiring.txt` records changed route/type files and targeted test output.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Auth route wrappers stay thin
    Tool: Bash
    Steps: Inspect git diff for app/(auth)/forgot-password.tsx and app/(auth)/reset-password.tsx.
    Expected: Files only re-export scenes and contain no hooks, state, service calls, or UI.
    Evidence: .sisyphus/evidence/task-6-auth-route-wiring.txt

  Scenario: Recovery routes remain public
    Tool: Bash
    Steps: Run route/type tests or inspect app/_layout.tsx diff.
    Expected: PROTECTED_ROUTE_GROUPS remains ['(tabs)', 'cart', 'product-details']; forgot/reset routes are inside (auth) stack.
    Evidence: .sisyphus/evidence/task-6-public-recovery-routes.txt
  ```

  **Commit**: YES | Message: `feat(auth): wire password recovery routes` | Files: [`app/(auth)/forgot-password.tsx`, `app/(auth)/reset-password.tsx`, `app/(auth)/_layout.tsx`, `scenes/auth/index.ts`, `types/routes.types.ts`, related tests]

- [x] 7. Add recovery-aware auth redirect guard without turning AuthProvider into a workflow engine

  **What to do**: Update root auth redirect logic so a valid recovery/reset route is not redirected to Home merely because Supabase emits an authenticated recovery session. Keep the guard in routing state (`app/_layout.tsx`) or a small hook/helper, not inside AuthProvider workflow logic. AuthProvider may need a minimal event check only if tests prove `PASSWORD_RECOVERY`/recovery state must be ignored for profile/push-token side effects; preserve the deferred `setTimeout(0)` pattern. Add tests simulating logged-in recovery route, logged-out protected route, recovery link cold start, and normal logged-in auth screen redirect.
  **Must NOT do**: Do not bypass `validateAndDispatch` for normal auth. Do not remove push token sync for normal sign-in. Do not call `supabase.auth.getSession()` synchronously inside auth event callback.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Redirect races and auth lifecycle changes are high-risk.
  - Skills: [`auth-implementation-patterns`, `react-native`, `typescript-expert`] - Needed for session lifecycle, routing, and typed tests.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 9, 11 | Blocked By: 3, 6

  **References** (executor has NO interview context - be exhaustive):
  - Current root redirect: `app/_layout.tsx:162-179` - Logged-in users in `(auth)` currently navigate to `/home`.
  - Current auth event handling: `providers/AuthProvider.tsx:153-248` - Preserve auth event generation and deferred profile lookup pattern.
  - Provider anti-pattern: `providers/AGENTS.md:33-38` - Do not call `getSession()` synchronously inside auth state callback.
  - Existing AuthProvider tests: `__tests__/app/auth-provider.lifecycle.test.tsx:139-160` - Auth event simulation with fake timers.
  - Existing route guard tests: `__tests__/hooks/withAuthGuard.test.tsx:53-66` - Redirect assertion pattern.
  - Supabase docs: `https://supabase.com/docs/guides/auth/passwords` - Recovery can create an authenticated session before password update.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Tests prove `/(auth)/reset-password` is not redirected to `/home` while `loggedIn=true` and reset route/recovery params are present.
  - [ ] Tests prove normal `/(auth)/login` still redirects to `/home` when `loggedIn=true` and not in recovery/reset flow.
  - [ ] Tests prove logged-out protected route still redirects to `/(auth)/login`.
  - [ ] AuthProvider tests still pass and push-token sync behavior for normal sign-in remains unchanged.
  - [ ] `npm run test -- --runTestsByPath __tests__/app/auth-provider.lifecycle.test.tsx __tests__/hooks/withAuthGuard.test.tsx` plus any new root layout route test passes.
  - [ ] Evidence file `.sisyphus/evidence/task-7-recovery-redirect-guard.txt` records targeted test output.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Recovery route is not hijacked by logged-in redirect
    Tool: Bash
    Steps: Run root layout/router test with currentGroup=(auth), current route reset-password, loggedIn=true, checked=true, and recovery params.
    Expected: router.navigate('/home') is not called.
    Evidence: .sisyphus/evidence/task-7-recovery-redirect-guard.txt

  Scenario: Existing protected-route redirect still works
    Tool: Bash
    Steps: Run withAuthGuard/root redirect tests for loggedOut protected cart/tabs route.
    Expected: router.replace('/(auth)/login') still occurs after timers run.
    Evidence: .sisyphus/evidence/task-7-protected-route-regression.txt
  ```

  **Commit**: YES | Message: `fix(auth): preserve password recovery routing` | Files: [`app/_layout.tsx`, optional route helper/hook, `providers/AuthProvider.tsx` only if necessary, related tests]

- [x] 8. Build Forgot Password request scene with privacy-preserving UX

  **What to do**: Add `scenes/auth/ForgotPassword.tsx` (or folder with `index.ts`) using existing Login/Register visual language, `EmailInput`, `ErrorMessage`, and `Button`. Validate email client-side, call `requestPasswordReset`, show generic success copy for valid submissions regardless of Supabase account existence, handle network/rate-limit errors via `getAuthErrorMessage`, and include links back to Login. Add scene tests for invalid email, submit loading, success generic copy, Supabase error/rate-limit copy, and navigation back to Login.
  **Must NOT do**: Do not display “email not found”. Do not add password fields here. Do not direct-call Supabase.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: New screen must reuse existing auth visual language without redesigning it.
  - Skills: [`react-native`, `react-ui-patterns`, `clean-code`] - Needed for mobile form states and maintainable UI composition.
  - Omitted: [`supabase-auth`] - Supabase interaction is through Task 3 service wrapper.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9, 11 | Blocked By: 2, 3, 6

  **References** (executor has NO interview context - be exhaustive):
  - Visual pattern: `scenes/auth/Login.tsx:123-197` - Safe area, scroll, logo/header/form card/error message structure.
  - Existing inputs/buttons: `scenes/auth/Login.tsx:199-255` - EmailInput and primary Button usage.
  - Auth link pattern: `scenes/auth/Login.tsx:257-278` and `scenes/auth/SignUp.tsx:324-345` - Link/Pressable style.
  - Existing service wrapper from Task 3: `services/auth.service.ts` - Use `requestPasswordReset` only.
  - Error mapping: `constants/auth.errors.ts:150-160` and `constants/auth.errors.ts:205-220` - Rate limit/validation/password messages.
  - Test render pattern: `test-utils/renderWithTheme.tsx:37-57`.
  - Privacy decision: generic success for valid email submissions; do not reveal account existence.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Forgot Password scene renders title/copy in Indonesian, one email input, primary submit, and link back to Login.
  - [ ] Invalid/empty email blocks service call and shows client-side validation error.
  - [ ] Successful service response shows generic copy equivalent to “Jika email terdaftar, tautan reset password telah dikirim.”
  - [ ] Supabase user-not-found style errors, if returned, are converted to the same generic success copy; network/rate-limit errors show actionable retry copy.
  - [ ] `npm run test -- --runTestsByPath __tests__/scenes/ForgotPassword.test.tsx` passes.
  - [ ] Evidence file `.sisyphus/evidence/task-8-forgot-password.txt` records targeted test output and privacy assertion.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Forgot Password never leaks account existence
    Tool: Bash
    Steps: Run ForgotPassword tests with requestPasswordReset resolving success and with a mocked user_not_found-like error.
    Expected: Both branches show the same generic success message and do not render "akun tidak ditemukan".
    Evidence: .sisyphus/evidence/task-8-forgot-password-privacy.txt

  Scenario: Invalid email stays client-side
    Tool: Bash
    Steps: Run ForgotPassword test entering "not-email" and pressing submit.
    Expected: Format email error appears and requestPasswordReset is not called.
    Evidence: .sisyphus/evidence/task-8-forgot-password-invalid-email.txt
  ```

  **Commit**: YES | Message: `feat(auth): add forgot password request screen` | Files: [`scenes/auth/ForgotPassword.tsx` or folder, `scenes/auth/index.ts`, `__tests__/scenes/ForgotPassword.test.tsx`]

- [x] 9. Build Reset Password recovery scene and complete password update flow

  **What to do**: Add `scenes/auth/ResetPassword.tsx` (or folder) that accepts recovery params, verifies/establishes recovery session using `verifyEmailOtp` or a dedicated recovery helper from `auth.service.ts`, validates new password + confirmation with existing policy, calls `updatePassword`, then explicitly calls `signOut` and routes to `/(auth)/login` with reset-success param. Include status states: checking recovery, ready, updating, success, error. Error state must include CTA to Forgot Password and Login. Handle direct-open without token/session, invalid/expired/reused token, same password/weak password, password mismatch, and network failure. Add tests for every branch.
  **Must NOT do**: Do not ask for current password. Do not leave user silently logged in after successful update. Do not redirect to Home after reset.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: New recovery flow crosses routes, Supabase session state, validation, and redirect behavior.
  - Skills: [`supabase-auth`, `auth-implementation-patterns`, `react-native`, `typescript-expert`] - Needed for recovery session, password update, and typed UI states.
  - Omitted: [`frontend-design`] - Reuse existing visual language; no redesign.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11 | Blocked By: 2, 3, 6, 7, 8

  **References** (executor has NO interview context - be exhaustive):
  - Existing status-state pattern: `scenes/auth/VerifyEmail/VerifyEmail.tsx:14-32` - Status fields and loading/error states.
  - Existing OTP verification: `scenes/auth/VerifyEmail/VerifyEmail.tsx:34-68` - Token hash/type verification flow.
  - Existing error rendering and CTA pattern: `scenes/auth/VerifyEmail/VerifyEmail.tsx:148-220` - Error state with CTA.
  - Existing password input/strength pattern: `scenes/auth/SignUp.tsx:241-289` - Reuse password policy and strength indicator if useful.
  - Existing service wrappers: `services/auth.service.ts:102-121` - `verifyEmailOtp` return shape; Task 3 `updatePassword`/`signOut` wrappers.
  - Current redirect risk: `app/_layout.tsx:168-171` - Logged-in auth routes normally navigate to `/home`; Task 7 must protect reset route.
  - Supabase docs: `https://supabase.com/docs/guides/auth/passwords` - Recovery session then update password.
  - Supabase docs: `https://supabase.com/docs/guides/auth/debugging/error-codes` - `otp_expired`, `invalid_grant`, rate-limit cases.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Reset Password tests assert token_hash+type=recovery triggers recovery verification and enters ready state on success.
  - [ ] Direct-open without recovery token/session renders error and CTAs back to Forgot Password/Login.
  - [ ] Password mismatch blocks `updatePassword` and shows Indonesian mismatch copy.
  - [ ] Existing policy blocks weak password before service call.
  - [ ] Successful reset calls `updatePassword({ password })` through service wrapper, then `signOut`, then `router.replace`/`router.push` Login with success param.
  - [ ] Invalid/expired/reused recovery token shows error state with CTA to Forgot Password.
  - [ ] `npm run test -- --runTestsByPath __tests__/scenes/ResetPassword.test.tsx __tests__/services/auth.service.test.ts` passes.
  - [ ] Evidence file `.sisyphus/evidence/task-9-reset-password.txt` records targeted test output and successful flow assertions.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Successful recovery updates password then logs out
    Tool: Bash
    Steps: Run ResetPassword test with valid recovery token, valid matching passwords, mocked updatePassword success, and mocked signOut success.
    Expected: updatePassword is called before signOut; navigation goes to /(auth)/login with reset-success param; /home navigation is not called.
    Evidence: .sisyphus/evidence/task-9-reset-password-success.txt

  Scenario: Expired recovery link offers restart path
    Tool: Bash
    Steps: Run ResetPassword test with verifyEmailOtp returning otp_expired.
    Expected: Error copy says link expired/invalid and CTA routes to /(auth)/forgot-password.
    Evidence: .sisyphus/evidence/task-9-reset-password-expired.txt
  ```

  **Commit**: YES | Message: `feat(auth): add reset password recovery screen` | Files: [`scenes/auth/ResetPassword.tsx` or folder, `__tests__/scenes/ResetPassword.test.tsx`, possible route helper tests]

- [x] 10. Complete localized error handling and recovery edge-case contracts

  **What to do**: Update `constants/auth.errors.ts` only for missing reset/recovery codes or flow names needed by Tasks 8-9. Add helpers for classifying privacy-safe forgot-password outcomes and recovery-token failures if needed. Tests must prove user-facing Indonesian copy for rate limits, invalid/expired token, same password, weak password, session missing, and generic forgot-password success. Keep existing messages stable unless tests require a more accurate recovery-specific message.
  **Must NOT do**: Do not replace the entire error mapping. Do not show account existence errors in Forgot Password.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Focused constants/helpers/test update.
  - Skills: [`clean-code`, `auth-implementation-patterns`, `typescript-expert`] - Needed for explicit error classification without broad rewrites.
  - Omitted: [`react-native`] - No UI implementation except tests consuming messages.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8, 9, 11 | Blocked By: 3

  **References** (executor has NO interview context - be exhaustive):
  - Existing error codes: `constants/auth.errors.ts:5-81` - Already includes OTP, invalid grant, rate limit, same/weak password, session errors.
  - Existing messages: `constants/auth.errors.ts:87-170` - Preserve Indonesian message style.
  - Existing `getAuthErrorMessage`: `constants/auth.errors.ts:205-220` - Extend carefully if needed.
  - Current OTP expired use: `scenes/auth/VerifyEmail/VerifyEmail.tsx:173-207` - Existing expired-link handling pattern.
  - Supabase error reference: `https://supabase.com/docs/guides/auth/debugging/error-codes`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Tests assert `otp_expired` and `invalid_grant` map to recovery-safe invalid/expired link copy where consumed by Reset Password.
  - [ ] Tests assert rate-limit errors map to “try again later” copy and are not converted to generic success.
  - [ ] Tests assert account-not-found/user-not-found in Forgot Password request flow is classified as privacy-safe generic success.
  - [ ] Tests assert same-password and weak-password messages remain available for Reset Password.
  - [ ] `npm run test -- --runTestsByPath` passes for constants/error tests and affected scene tests.
  - [ ] Evidence file `.sisyphus/evidence/task-10-auth-errors.txt` records targeted test output.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Recovery token errors are actionable
    Tool: Bash
    Steps: Run constants/ResetPassword tests for otp_expired and invalid_grant.
    Expected: UI receives invalid/expired link copy and CTA to request a new link.
    Evidence: .sisyphus/evidence/task-10-recovery-errors.txt

  Scenario: Forgot-password privacy classification wins over user-not-found
    Tool: Bash
    Steps: Run ForgotPassword test with mocked user_not_found response.
    Expected: Generic success message is rendered; user-not-found copy is not rendered.
    Evidence: .sisyphus/evidence/task-10-privacy-classification.txt
  ```

  **Commit**: YES | Message: `fix(auth): harden recovery error handling` | Files: [`constants/auth.errors.ts`, related constants/helper tests, affected scene tests]

- [x] 11. Run integrated auth regression and recovery flow hardening

  **What to do**: Run full validation and close integration gaps after Tasks 1-10. Add missing tests only where integrated behavior is not covered: Login → Forgot Password navigation, Forgot Password → check-email success, recovery link cold start to Reset Password, Reset Password success to Login, normal Login/Register still passing, normal Google OAuth untouched, AuthProvider push-token flow untouched. Record app-side expected Supabase redirect allowlist values in evidence using the recovery redirect helper and `npm run dev:config:public` where possible.
  **Must NOT do**: Do not introduce new features. Do not skip failing tests. Do not require manual Supabase dashboard changes as pass criteria.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Broad integration hardening across auth flows and validation commands.
  - Skills: [`testing-strategy`, `lint-and-validate`, `auth-implementation-patterns`] - Needed for comprehensive regression and quality gates.
  - Omitted: [`frontend-design`] - No new UI design work.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: 1-10

  **References** (executor has NO interview context - be exhaustive):
  - Commands: `package.json:22-27` - `npm run lint`, `npm run format:check`, `npm run test`.
  - CI expectations: `__tests__/AGENTS.md:37-41` - CI requires format check, lint, Jest.
  - App scheme: `app.json:3-6` and `app.config.ts:22-27` - Scheme is `apotek-ecommerce`.
  - Root provider stack: `app/_layout.tsx:210-219` - AuthProvider wraps Router; route tests must account for provider lifecycle.
  - AuthProvider normal behavior: `providers/AuthProvider.tsx:190-234` - Preserve normal sign-in token sync path.
  - Existing component primitives: `components/elements/EmailInput`, `components/elements/PasswordInput`, `components/elements/ErrorMessage`, `components/elements/OAuthButton` - Already tested; do not duplicate internals.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run lint` passes.
  - [ ] `npm run format:check` passes.
  - [ ] `npm run test` passes.
  - [ ] Evidence records expected Supabase redirect allowlist entries for recovery, including `apotek-ecommerce://reset-password` or the exact helper output generated by tests.
  - [ ] No changed source files contain `@ts-ignore`, `@ts-expect-error`, `as any`, bare unguarded `console.log`, or direct Supabase calls from scenes/components.
  - [ ] Git diff shows no unrelated feature changes outside auth routes/scenes/services/provider/types/constants/tests.
  - [ ] Evidence file `.sisyphus/evidence/task-11-integrated-auth-regression.txt` records full validation output.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full automated validation passes
    Tool: Bash
    Steps: Run npm run lint && npm run format:check && npm run test.
    Expected: All commands exit 0.
    Evidence: .sisyphus/evidence/task-11-integrated-auth-regression.txt

  Scenario: Auth scope stayed bounded
    Tool: Bash
    Steps: Run git diff --name-only and inspect changed paths.
    Expected: Changes are limited to auth scenes/routes/services/provider/types/constants/tests and no unrelated checkout/cart/order/profile behavior changed.
    Evidence: .sisyphus/evidence/task-11-scope-diff.txt
  ```

  **Commit**: YES | Message: `test(auth): harden recovery flow regression coverage` | Files: [`__tests__/**`, `.sisyphus/evidence/**` excluded from commit, any small fixes required by validation]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each wave if validation passes.
- Use conventional messages:
  - `test(auth): characterize existing auth flows`
  - `refactor(auth): clean login and register form logic`
  - `feat(auth): add forgot password recovery flow`
  - `test(auth): harden password recovery coverage`
- Do not commit `.env*`, secrets, generated evidence, or unrelated changes.

## Success Criteria
- Login/Register visual behavior remains consistent while implementation is cleaner and tested.
- Forgot Password sends reset email through Supabase with generic privacy-preserving copy.
- Reset Password handles valid, invalid, expired, reused, and direct-open recovery states.
- Recovery session cannot be redirected away by global auth guard before password update.
- Successful reset signs out and returns to Login with one-time success message.
- `npm run lint && npm run format:check && npm run test` all pass.
