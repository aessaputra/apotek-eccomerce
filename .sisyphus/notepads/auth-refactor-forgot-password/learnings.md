# Auth Refactor + Forgot Password: Pattern Map

## Wave 1 Implementation Gotchas (from context gathering)

### Task 1: Characterization Tests
- No existing auth.service tests, no Login/SignUp scene tests exist
- Mock pattern: `jest.mock('@/utils/supabase')` inline with captured callback
- AuthProvider uses fake timers and `authStateChangeCallback` capture
- Tests live in `__tests__/services/`, `__tests__/scenes/`, `__tests__/app/`

### Task 2: Shared Auth Helpers
- Email trim is duplicated across Login (line 50) and SignUp (line 55)
- Password policy: `PASSWORD_MIN_LENGTH=6`, requires letter + number
- Password strength: `Lemah/Sedang/Kuat` labels from `utils/validation.ts`
- Route params are serializable strings only per `types/routes.types.ts`
- No generic form framework — keep helpers narrow/auth-specific

### Task 3: Service Recovery Wrappers
- Scheme is `apotek-ecommerce` (app.config.ts line 26)
- `resetPasswordForEmail` and `updateUser` are Supabase auth methods
- `makeRedirectUri({ scheme, path })` from `expo-auth-session` for redirect URL
- Auth service returns `{ data, error }` shape (lines 69-86 pattern)
- `verifyEmailOtp` already accepts `type: 'recovery'` (lines 88-121)
- Error wrapper uses `{ message, name }` object (lines 115-119, 144-148)

### Key Files for Wave 1
- `services/auth.service.ts` — existing pattern is `{ data, error }` wrappers
- `constants/auth.errors.ts` — already has `OTP_EXPIRED`, `INVALID_GRANT`, `SAME_PASSWORD`, `WEAK_PASSWORD`, `OVER_EMAIL_SEND_RATE_LIMIT`
- `utils/validation.ts` — `validateEmail` (trims), `validatePassword` (6+ len, letter, number), `getPasswordStrength` (Lemah/Sedang/Kuat)

### Test Infrastructure
- `test-utils/renderWithTheme.tsx` — TamaguiProvider + SafeAreaProvider wrapper
- Mock pattern: inline `jest.mock()` with no `__mocks__/` directories
- Fake timers enabled in `jest.setup.js`
- `authStateChangeCallback` capture for AuthProvider tests

### Anti-Patterns to Avoid
- No `@ts-ignore`, `@ts-expect-error`, `as any`
- No direct Supabase calls from scenes
- No `console.log` without `if (__DEV__)` guard
- No `StyleSheet.create()` or NativeWind for core UI
- No Tamagui babel plugin in babel.config.js (uses `@tamagui/metro-plugin`)
- No `getSession()` synchronous call inside auth state callback (deadlock risk)
- No reordering AuthProvider in provider stack


## 2026-04-26 08:04 UTC - Task 1 auth characterization tests
- Added auth characterization tests under centralized `__tests__/services/` and `__tests__/scenes/` only; no production auth files were changed.
- Scene auth tests can use `render` from `@/test-utils/renderWithTheme`, inline `expo-router` mocks with `push`/`replace`/`navigate`, and a passthrough `Link` mock returning children.
- Login/SignUp inputs are stable through `testID="email-input"` and `testID="password-input"`; primary buttons are accessible via their title labels.
- `auth.service` tests mock `@/utils/supabase` inline and verify `verifyOtp` receives `{ token_hash, type: 'recovery' }` for recovery OTP characterization.


## 2026-04-26 08:09 UTC - Root auth redirect characterization follow-up
- Extended `__tests__/app/root-layout.notifications.test.tsx` rather than creating a separate heavy root-layout mock file; it already mocks providers, SplashScreen, assets, notifications, config, WelcomeSheet, and Expo Router.
- Root redirect tests can control route state by backing `useSegments()` with `mockUseSegments`, then flushing root async asset loading with `await act(async () => { await Promise.resolve(); })` before `jest.runAllTimers()`.
- `cleanup()` in `afterEach` is important for root layout tests because scheduled redirects from a previous mounted layout can leak into the next case.
- Current behavior is now characterized: logged-in `(auth)` segment schedules `router.navigate('/home')`; logged-out protected `cart` segment schedules `router.replace('/(auth)/login')`.


## 2026-04-26 Task 3 auth service recovery boundary
- Added `createPasswordRecoveryRedirectUri()` in `services/auth.service.ts` using `makeRedirectUri({ scheme: 'apotek-ecommerce', path: 'reset-password' })`; tests assert the helper returns `apotek-ecommerce://reset-password` and does not include localhost.
- `requestPasswordReset(email)` trims the email before calling `supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo })` and preserves the service `{ data, error }` shape for success, Supabase error, and thrown exception branches.
- `updatePassword(password)` wraps `supabase.auth.updateUser({ password })` with the same `{ data, error }` service shape; post-reset sign-out remains available through the existing `signOut()` wrapper.
- Boundary verification found direct `supabase.auth.resetPasswordForEmail` and `supabase.auth.updateUser({ password })` calls only in `services/auth.service.ts`; tests use inline service-boundary mocks only.


## 2026-04-26 08:16 UTC - Task 2 shared auth helper extraction
- Auth-specific shared helpers live cleanly beside the screens in `scenes/auth/authForm.helpers.ts`, which matches the scene-local helper rule for tightly coupled auth logic.
- Email normalization stays intentionally narrow: trim whitespace only, no lowercasing, so Login/SignUp semantics remain unchanged.
- Password policy now delegates through `validateAuthPassword(...)` → `validatePassword(...)`; the existing min-length, letter/number rules, and copy still come from `utils/validation.ts`.
- `types/routes.types.ts` now models `'(auth)/verify-email'` and `AuthStackParams['verify-email']` as serializable `{ email: string }` payloads.
- Centralized Jest coverage was added under `__tests__/scenes/authForm.helpers.test.ts`; there was no existing validation test file under `__tests__/utils/` to extend.

- Login message route params should preserve the exact provided string values and omit undefined keys so the payload stays serializable and one-time reset-success messaging does not mutate copy.


## 2026-04-26 Task 4 Login form orchestration
- Login-specific state and service branching now fit cleanly in `scenes/auth/useLoginForm.ts`; this keeps auth orchestration local to `scenes/auth/` rather than promoting one-screen logic into global `hooks/`.
- `buildLoginMessageRouteParams()` can be used on read as well as write: normalize `useLocalSearchParams()` values to first string values, then preserve exact reset-success copy for display.
- One-time Login success messages can be consumed by storing the message in local state and calling `router.replace('/(auth)/login')` after route-param consumption; this clears navigation state without requiring the future forgot/reset routes to exist yet.
- The forgot-password link can be a `Pressable` that calls `router.push('/(auth)/forgot-password')`; Task 6 can add the real route wrapper later while Task 4 remains testable with mocked navigation.
- For auth screens, route-param success text should be treated as a whitelisted signal before rendering in the trusted UI. Task 4 now displays only `LOGIN_RESET_SUCCESS_MESSAGE` and ignores other `resetSuccess` strings.


## 2026-04-26 Task 5 register refactor
- SignUp form orchestration is cleanly extractable into auth-local `scenes/auth/useSignUpForm.ts`; keeping the hook beside the scene matches the scene-local helper rule and avoids a premature global `hooks/` abstraction.
- Session-success behavior is best expressed as the positive verify-email case: route only when `data?.user && !data.session`; this removes the no-op `data?.session` branch while preserving the characterized non-redirect path.
- SignUp tests can exercise password strength labels directly through `password-input` changes; `abc` -> `Lemah`, `abc123` -> `Sedang`, and `password1` -> `Kuat` cover the existing `utils/validation.ts` strength policy without inspecting internals.
- User-already-exists handling is covered by returning `{ code: 'user_already_exists', message: 'User already registered' }` from the mocked `signUp` service and asserting the Indonesian mapped copy.


## 2026-04-26 Task 6 auth route wiring findings
- `app/(auth)/forgot-password.tsx` and `app/(auth)/reset-password.tsx` follow the existing one-line re-export pattern, which keeps route files thin and avoids putting any screen logic in `app/`.
- `app/(auth)/_layout.tsx` now registers `forgot-password` and `reset-password` alongside the existing auth routes, still under `headerShown: false`.
- `types/routes.types.ts` now includes public auth route contracts for `'(auth)/forgot-password'` and `'(auth)/reset-password'`, plus matching `AuthStackParams` entries; `login` and `verify-email` kept their existing shapes.
- To keep the routes compile-safe without taking on the later UX task, temporary `scenes/auth/ForgotPassword.tsx` and `scenes/auth/ResetPassword.tsx` placeholders were added as null-returning components and exported through `scenes/auth/index.ts`.


## 2026-04-26 Task 7 recovery redirect guard
- The root redirect guard can distinguish recovery from normal auth screens using `useSegments()` route state: `['(auth)', 'reset-password']` is allowed to stay on the auth stack while `['(auth)', 'login']` still redirects logged-in users to `/home`.
- Keeping the exception in `app/_layout.tsx` avoids turning `AuthProvider` into recovery workflow logic; AuthProvider lifecycle tests still prove normal sign-in token sync remains unchanged.
- Expo Router segment typing may be tuple-narrowed in this project, so converting to `Array.from(segments)` before reading `routeSegments[1]` keeps changed-file TypeScript diagnostics clean.


## 2026-04-26 Task 10 auth error contract hardening
- `constants/auth.errors.ts` can stay stable while adding narrow exported contracts: a privacy-safe forgot-password success constant, a reset-link invalid/expired constant, and two classifiers (`isPrivacySafeForgotPasswordError`, `isRecoveryTokenFailureError`).
- `AuthErrorCode.USER_NOT_FOUND` must remain mapped for other flows, but forgot-password request handling should rely on the new privacy-safe classifier instead of the raw mapped message.
- Recovery-token failures are best treated as a small explicit set (`otp_expired`, `invalid_grant`) so reset-password can show invalid/expired link copy without broadening unrelated auth errors.
- Focused constants tests can cover both message stability (`SAME_PASSWORD`, `WEAK_PASSWORD`) and the privacy boundary in one file without touching service or scene code.


## 2026-04-26 Task 8 forgot-password request scene
- The forgot-password screen can stay self-contained in `scenes/auth/ForgotPassword.tsx`: local state is enough for one email field, validation, loading, error, and success messaging without adding a new hook file.
- Matching Login/Register visual language means reusing the same SafeArea + KeyboardAvoiding + ScrollView + logo/header/form-card skeleton, `getCardShadow(...)`, `PRIMARY_BUTTON_TITLE_STYLE`, `EmailInput`, and `ErrorMessage`.
- Tests can avoid embedding account-existence leak literals by mocking the privacy branch with `AuthErrorCode.USER_NOT_FOUND`; the screen/test grep then remains clean while still exercising the classifier behavior.
- The Login CTA is testable by mocking Expo Router `Link` to clone the child and call the captured `href`, preserving the screen's Link-style route pattern.


## 2026-04-26 Task 9 reset-password scene
- ResetPassword can stay self-contained in `scenes/auth/ResetPassword.tsx`: route params are normalized locally, `verifyEmailOtp({ type: 'recovery' })` gates the form, and `updatePassword`/`signOut` stay behind `services/auth.service.ts`.
- Direct opens without `token_hash` plus `type=recovery` should remain invalid rather than allowing a normal logged-in session to update password without a recovery link.
- The post-reset Login contract is `router.replace({ pathname: '/(auth)/login', params: { resetSuccess: LOGIN_RESET_SUCCESS_MESSAGE } })`, preserving Login's whitelist and one-time route-param consumption.
- ResetPassword tests can use two `password-input` elements from the shared `PasswordInput`; fill by index and assert behavior through visible Indonesian copy and mocked service order.


## 2026-04-26 Task 11 integrated auth regression
- Existing Tasks 1-10 coverage already satisfied the final integrated checklist: Login forgot-password navigation, forgot-password privacy success, reset-password recovery OTP verification, updatePassword-before-signOut success flow, root reset-password guard, Google OAuth cancellation, normal Login/Register behavior, and AuthProvider push-token lifecycle.
- The focused integrated auth regression command can safely combine `Login`, `SignUp`, `ForgotPassword`, `ResetPassword`, `auth.service`, `root-layout.notifications`, and `auth-provider.lifecycle` tests; it passed with 7 suites / 66 tests.
- `npm run dev:config:public` confirms the app scheme is `apotek-ecommerce`; paired with `createPasswordRecoveryRedirectUri()` service coverage, the expected Supabase redirect allowlist value is `apotek-ecommerce://reset-password`.
- When recording config evidence, keep it sanitized: the Expo config command prints public env values, so evidence should capture only the scheme and redirect value needed for the allowlist decision.


## 2026-04-26 Task 9 security review fix
- Reset-password screens should not render raw `getAuthErrorMessage()` fallback text for route or backend errors because auth/deep-link errors can be user-controlled or service-specific.
- Use narrow allowlists per flow: recovery verification maps to invalid-link/network copy only; password update maps only known password-policy codes, otherwise generic reset copy; sign-out cleanup maps to a generic cleanup message.
- Regression tests should explicitly assert arbitrary route, update service, and sign-out service messages are not rendered.


## 2026-04-26 ResetPassword invalid-link UI cleanup
- Keep invalid reset-link UX to one card title and one safe body message; do not stack a dismissible `ErrorMessage` alert under the invalid-state copy because it repeats the same failure and creates too many labels on mobile.
- Network verification failures can reuse the same invalid-state body slot with the allowlisted Indonesian network copy, preserving safe messaging without adding a second alert affordance.
