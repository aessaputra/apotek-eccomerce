# Auth Refactor + Forgot Password: Decisions

## Architectural Decisions

### 1. Thin Route Wrappers
- `app/(auth)/` files remain one-line re-exports only
- Screen logic stays in `scenes/auth/`
- Route params live in `types/routes.types.ts` as serializable strings

### 2. Service Boundary
- All Supabase auth calls in `services/auth.service.ts`
- `utils/supabase.ts` is the only Supabase client (path alias: `@/utils/supabase`)
- No ad hoc clients in scenes or hooks

### 3. Password Policy Preservation
- `validatePassword`: min 6 chars, at least one letter, at least one number
- `getPasswordStrength`: Lemah (1) / Sedang (2) / Kuat (3)
- Constants: `PASSWORD_MIN_LENGTH=6`, `PASSWORD_MEDIUM_LENGTH=8`

### 4. Privacy-Preserving Forgot Password
- Generic success message for all valid submissions
- User-not-found Supabase error converted to same generic success
- Rate-limit/network errors show actionable retry copy (not generic)

### 5. Recovery Redirect Guard Location
- Guard lives in routing logic (`app/_layout.tsx`), NOT in AuthProvider
- AuthProvider manages: session bootstrap, auth events, profile validation, push-token
- Routing logic manages: logged-in guard, recovery route passthrough

### 6. Email Validation
- `validateEmail` in `utils/validation.ts` trims input before regex
- Both Login and SignUp call `trim()` on email before validation

### 7. Auth Error Shape
- Service functions return `{ data, error }` shape
- Error is `{ message: string, name?: string }` object
- `getAuthErrorMessage(error)` from `constants/auth.errors.ts` maps codes to Indonesian

### 8. Verification Status States (VerifyEmail pattern)
- `pending` → `verifying` → `success` | `error`
- Same pattern should be reusable for ResetPassword screen states

## Route Param Contracts

### Login
- `resetSuccess?: string` — one-time success message after password reset

### Forgot Password
- None (POST only, no params needed)

### Reset Password
- `token_hash?: string` — OTP token hash
- `type?: string` — OTP type (e.g., 'recovery')
- `error?: string` — error code if passed via URL

### Verify Email (existing)
- `email?: string` — trimmed email from SignUp
- `token_hash?: string` — OTP token hash  
- `type?: string` — OTP type
- `error?: string` — error code

## File Locations Summary

| Pattern | File | Key Lines |
|---------|------|-----------|
| Login form state | `scenes/auth/Login.tsx` | 22-41 state, 47-96 submit |
| SignUp form state | `scenes/auth/SignUp.tsx` | 35-46 state, 51-107 submit |
| Email validation | `utils/validation.ts` | 53-62 trim, 83-102 password policy |
| Password strength | `utils/validation.ts` | 125-146 Lemah/Sedang/Kuat |
| Auth service pattern | `services/auth.service.ts` | 69-86 { data, error } wrappers |
| verifyEmailOtp | `services/auth.service.ts` | 102-121 recovery type already |
| Auth errors | `constants/auth.errors.ts` | 5-81 codes, 205-220 getAuthErrorMessage |
| AuthProvider lifecycle | `providers/AuthProvider.tsx` | 84-151 init, 153-248 onAuthStateChange |
| Root auth redirect | `app/_layout.tsx` | 162-179 logged-in auth guard |
| Auth route layout | `app/(auth)/_layout.tsx` | 1-13 Stack registry |
| Route types | `types/routes.types.ts` | 3-7 AuthRoutes, 132-135 AuthStackParams |
| Expo scheme | `app.config.ts` | 26 `scheme: 'apotek-ecommerce'` |
