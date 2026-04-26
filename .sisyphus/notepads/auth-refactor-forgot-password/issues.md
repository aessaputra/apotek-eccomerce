# Auth Refactor + Forgot Password: Known Issues

## Potential Blockers

### 1. No existing Login/SignUp scene tests
- Glob `__tests__/scenes/Login.test.tsx` and `__tests__/scenes/SignUp.test.tsx` returned no files
- Characterization tests (Task 1) will need to CREATE these test files first
- Task 4 Login refactor depends on Task 1 tests existing

### 2. Recovery session + global redirect race condition
- `app/_layout.tsx` lines 162-179: if `loggedIn=true` and `inAuthGroup`, redirects to `/home`
- Supabase password recovery creates an authenticated session before password update
- Task 7 must add a guard to prevent recovery sessions from being redirected to Home
- The guard should check for recovery route params, NOT add logic to AuthProvider

### 3. Google OAuth redirect scheme extraction
- `services/auth.service.ts` line 39: `GOOGLE_AUTH_REDIRECT_SCHEME = 'apotek-ecommerce'`
- Task 3 should extract shared redirect URI helper that both Google OAuth and recovery can use
- But Task 1/2 block Task 3 for test infrastructure

### 4. AuthProvider setTimeout(0) lock avoidance pattern
- `providers/AuthProvider.tsx` lines 191-233: deferred auth event handling
- Must preserve `setTimeout(0)` pattern in any AuthProvider changes
- Critical: do NOT call `supabase.auth.getSession()` synchronously inside auth callback

## Edge Cases to Handle

### Forgot Password Privacy
- Must show generic success "Jika email terdaftar, tautan reset password telah dikirim" for BOTH:
  - Valid email that exists in Supabase
  - User-not-found error from Supabase
- Never reveal whether account exists

### Reset Password Direct Access
- Opening `/reset-password` without recovery token/session must show error state
- Error state must include CTA back to Forgot Password and Login

### Post-Reset Sign-Out Flow
- After successful password update, MUST call `signOut()` explicitly
- Then route to Login with one-time success message param
- Must NOT leave user logged in after reset

### Recovery Link Opened While Signed In
- Task 7 guard must handle case where user is logged in normally but opens recovery link
- Should route to Reset Password without triggering normal logged-in redirect to Home


## 2026-04-26 08:04 UTC - Task 1 validation notes
- `npm run test -- --runTestsByPath __tests__/services/auth.service.test.ts __tests__/scenes/Login.test.tsx __tests__/scenes/SignUp.test.tsx` passes and is recorded in `.sisyphus/evidence/task-1-auth-characterization.txt`.
- `npm run test -- --runTestsByPath __tests__/services/auth.service.test.ts` passes and is recorded in `.sisyphus/evidence/task-1-auth-characterization-service.txt`.
- `npm run lint` completes successfully.
- `npx tsc --noEmit` still fails on pre-existing unrelated files (`__tests__/components/ProductCard.test.tsx`, order hook/service tests, `app/(tabs)/_layout.tsx`, and `scenes/profile/addressFormFlow.ts`); the new auth test files have zero LSP diagnostics and no longer appear in TypeScript failures.


## 2026-04-26 08:09 UTC - Root redirect follow-up validation notes
- Appended combined root redirect + Task 1 test output to `.sisyphus/evidence/task-1-auth-characterization.txt`; command passed with 4 suites / 24 tests.
- `npm run lint` passes after the root redirect test change.
- `npx tsc --noEmit` still fails on the same unrelated pre-existing files (`__tests__/components/ProductCard.test.tsx`, order hook/service tests, `app/(tabs)/_layout.tsx`, and `scenes/profile/addressFormFlow.ts`); `__tests__/app/root-layout.notifications.test.tsx` has zero LSP diagnostics.


## 2026-04-26 Task 3 auth service recovery validation notes
- `npm run test -- --runTestsByPath __tests__/services/auth.service.test.ts` passes with 14 tests; output recorded in `.sisyphus/evidence/task-3-auth-service-recovery.txt` and `.sisyphus/evidence/task-3-auth-service-update.txt`.
- `npm run lint` passes after adding password recovery service wrappers and tests.
- `npx tsc --noEmit` still fails only on unrelated pre-existing ProductCard/order/profile/tabs files; the modified auth service and auth service test have zero LSP errors.


## 2026-04-26 08:16 UTC - Task 2 shared helper extraction notes
- No pre-existing validation test file exists under `__tests__/utils/`, so helper coverage had to be added as a new centralized scene test.
- The auth helper remains intentionally narrow; no generic form abstraction was introduced, and the shared route contract only covers the existing verify-email redirect payload.


## 2026-04-26 Task 3 evidence overwrite gotcha
- The Task 3 evidence file was accidentally reduced to the later format-fix note during the retry step.
- Restoring evidence should keep the full `npm run test -- --runTestsByPath __tests__/services/auth.service.test.ts` output in the file, not just the retry summary.


## 2026-04-26 Task 4 Login refactor validation notes
- `npm run test -- --runTestsByPath __tests__/scenes/Login.test.tsx` passes with 8 Login tests after the refactor.
- `npm run format:check` passes after formatting `scenes/auth/Login.tsx`, `scenes/auth/useLoginForm.ts`, and `__tests__/scenes/Login.test.tsx`.
- `npx tsc --noEmit` still fails only on unrelated pre-existing ProductCard/order/profile/tabs files; modified Login files do not appear in the failure output.
- Tamagui `AnimatePresence` keeps dismissed success content mounted briefly during exit animation, so success-message tests should use `waitFor` when asserting absence after dismiss.
- Review flagged arbitrary route-param text as a trusted-message injection risk; fixed by whitelisting the reset-success copy and adding a test that unapproved text is ignored.


## 2026-04-26 Task 5 register refactor validation notes
- `npm run test -- --runTestsByPath __tests__/scenes/SignUp.test.tsx` passes with 1 suite / 9 tests after extracting `useSignUpForm`.
- `npm run format:check` passes after formatting `__tests__/scenes/SignUp.test.tsx` with Prettier.
- LSP diagnostics are clean for `scenes/auth/useSignUpForm.ts` and `__tests__/scenes/SignUp.test.tsx`; `scenes/auth/SignUp.tsx` still has only the pre-existing `resizeMode` deprecation hint.
- `npx tsc --noEmit --pretty false` still fails only in unrelated known areas (`ProductCard`, order tests/hooks, tabs layout, profile address flow); no Task 5 changed file appears in the TypeScript failure list.


## 2026-04-26 Task 6 route wiring notes
- No new route/type tests were needed for this wiring-only change; validation was covered by LSP diagnostics plus repo formatting/lint/typecheck commands.
- TypeScript still reports the same unrelated pre-existing failures outside the auth area, so those errors are not caused by the new recovery route files.


## 2026-04-26 Task 7 recovery redirect guard validation notes
- `npm run test -- --runTestsByPath __tests__/app/root-layout.notifications.test.tsx __tests__/app/auth-provider.lifecycle.test.tsx __tests__/hooks/withAuthGuard.test.tsx` passes with 3 suites / 16 tests; output recorded in both Task 7 evidence files.
- `npm run format:check` and `npm run lint` pass; output recorded in `.sisyphus/evidence/task-7-recovery-redirect-guard.txt` and `.sisyphus/evidence/task-7-protected-route-regression.txt`.
- LSP diagnostics are clean of errors for `app/_layout.tsx` and `__tests__/app/root-layout.notifications.test.tsx`; `app/_layout.tsx` still has only the existing Expo Notifications deprecation hint.
- Boundary searches found no `supabase.auth.getSession()` call in app/test route guard code and no `supabase.auth.*` calls added under `app/` or `scenes/`.


## 2026-04-26 Task 10 validation notes
- `npm run test -- --runTestsByPath __tests__/constants/auth.errors.test.ts` passes with 7 tests and confirms the privacy-safe forgot-password classifier, recovery-token classifier, and password-message stability.
- `npm run format:check` passes after formatting the touched constants and test files.
- `npm run lint` passes for the repo after the auth-error additions.
- LSP diagnostics are clean for `constants/auth.errors.ts` and `__tests__/constants/auth.errors.test.ts`.

## 2026-04-26 Task 10 privacy fix note
- Tightened the forgot-password privacy helper from generic `not found` matching to explicit account/email variants only, so provider/identity/challenge errors and plain `not found` stay actionable instead of privacy-safe.


## 2026-04-26 Task 8 forgot-password request scene validation notes
- `npm run test -- --runTestsByPath __tests__/scenes/ForgotPassword.test.tsx` passes with 1 suite / 8 tests covering empty email, invalid email, loading/duplicate-submit prevention, success, privacy-safe missing-account handling, rate-limit errors, and Login navigation.
- `npm run format:check` and `npm run lint` pass after formatting the new/changed ForgotPassword files.
- LSP diagnostics are clean of errors for `scenes/auth/ForgotPassword.tsx` and `__tests__/scenes/ForgotPassword.test.tsx`; the scene only reports the existing `Image resizeMode` deprecation hint consistent with Login/Register.
- Scope searches found no direct Supabase usage in `scenes/auth/ForgotPassword.tsx` and no account-existence leak strings in `ForgotPassword.*` files.


## 2026-04-26 Task 9 reset-password validation notes
- `npm run test -- --runTestsByPath __tests__/scenes/ResetPassword.test.tsx __tests__/services/auth.service.test.ts` passes with 2 suites / 25 tests; output recorded in `.sisyphus/evidence/task-9-reset-password.txt`.
- `npm run format:check` and `npm run lint` pass; output recorded in `.sisyphus/evidence/task-9-reset-password.txt`.
- Focused success and expired-token evidence files were created with passing ResetPassword subset runs: `.sisyphus/evidence/task-9-reset-password-success.txt` and `.sisyphus/evidence/task-9-reset-password-expired.txt`.
- LSP diagnostics are clean of errors for `scenes/auth/ResetPassword.tsx` and `__tests__/scenes/ResetPassword.test.tsx`; the scene reports only the existing `Image resizeMode` deprecation hint consistent with Login/SignUp.
- Boundary grep found no direct `supabase.auth` usage under `scenes/auth`; reset-password scene calls only auth service wrappers.


## 2026-04-26 Task 11 validation notes
- Focused integrated auth regression passed with 7 suites / 66 tests, covering Login/Register/ForgotPassword/ResetPassword/auth.service/root guard/AuthProvider lifecycle together.
- `npm run lint`, `npm run format:check`, and full `npm run test` passed; the full suite reported 129 suites / 835 tests.
- No Task 11 auth source or test edits were needed. Existing `scenes/auth/useLoginForm.ts` console output is guarded with `if (__DEV__)`; inherited unguarded `VerifyEmail` logs remain pre-existing and outside this final regression scope.
- `git diff --name-only` shows tracked source/test changes from prior auth-refactor tasks plus existing workflow files; Task 11 itself is bounded to evidence/notepad updates.


## 2026-04-26 Task 9 post-review fix validation notes
- Security review initially flagged raw auth error fallback rendering as a blocker; ResetPassword now allowlists recovery/update/sign-out messages and no longer renders arbitrary route or service text.
- Post-fix targeted command `npm run test -- --runTestsByPath __tests__/scenes/ResetPassword.test.tsx __tests__/services/auth.service.test.ts` passes with 2 suites / 28 tests.
- Post-fix `npm run format:check` and `npm run lint` pass; output appended to `.sisyphus/evidence/task-9-reset-password.txt`.
- Security re-review passed with severity None and no blocking issues.
