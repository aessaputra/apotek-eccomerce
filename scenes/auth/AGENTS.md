# AUTH SCENES

Login, signup, forgot-password, reset-password, and verify-email screen orchestration. Root OAuth callback routing lives in `app/google-auth.tsx`; reusable auth/network behavior lives in services/providers.

## STRUCTURE

```
scenes/auth/
├── Login.tsx / SignUp.tsx       # Public auth forms
├── ForgotPassword.tsx           # Reset request flow
├── ResetPassword.tsx            # Password update flow
├── VerifyEmail/                 # Verify-email screen cluster
├── useLoginForm.ts              # Login form state machine
├── useSignUpForm.ts             # Signup form state machine
└── authForm.helpers.ts          # Route params, status unions, validation helpers
```

## WHERE TO LOOK

| Task                       | File                                              | Notes                                                  |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| Change login behavior      | `useLoginForm.ts`, `Login.tsx`                    | Keep service calls out of route wrappers               |
| Change signup behavior     | `useSignUpForm.ts`, `SignUp.tsx`                  | Reuse `authForm.helpers.ts` for email/password helpers |
| Change verify-email params | `authForm.helpers.ts`, `VerifyEmail/`             | Keep route param builders typed                        |
| Change OAuth callback      | `app/google-auth.tsx`, `services/auth.service.ts` | Callback is a route-level exception, not a scene file  |

## CONVENTIONS

- `AUTH_FORM_STATUSES` defines the shared form status union: `idle`, `submitting`, `success`, `error`.
- `normalizeAuthEmail()` currently trims only; do not silently change casing rules without checking Supabase auth expectations.
- Password validation delegates to `utils/validation` through `validateAuthPassword()`.
- Login reset-success and error route params go through `buildLoginMessageRouteParams()`.

## ANTI-PATTERNS

- **NEVER** duplicate route-param object construction inside screen files when `authForm.helpers.ts` owns it.
- **NEVER** call `supabase.auth.getSession()` synchronously inside auth state listeners; `AuthProvider` defers listener work to avoid GoTrue locks.
- **NEVER** move OAuth callback handling into `(auth)`; `google-auth.tsx` is intentionally root-level.
