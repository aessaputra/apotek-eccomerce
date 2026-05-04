# TESTS

Centralized Jest test tree. Tests live here instead of beside source files; mirror source domains rather than creating feature-local test folders.

## STRUCTURE

```
__tests__/
├── app/          # Route/layout wrappers and redirect guards
├── components/   # Tamagui UI tests
├── constants/    # Constant validation and integration coverage
├── hooks/        # Hook contracts and async state transitions
├── scenes/       # User-visible screen states and flows
├── services/     # Service-layer behavior and integration mocks
└── utils/        # Infra helpers and shared utilities
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Route redirect tests | `appIndex.test.tsx`, `app/` | Uses mocked Expo Router redirects |
| Component rendering | `components/` | Render through `@/test-utils/renderWithTheme` |
| Hook state machines | `hooks/` | Verify loading, refresh, retry, and timer behavior |
| Scene flows | `scenes/` | Mock hooks/services at the scene boundary |
| Service behavior | `services/` | Inline mock Supabase and third-party integrations |
| Utility coverage | `utils/`, `constants/` | Keep focused on pure behavior and edge cases |

## CONVENTIONS

- Use inline `jest.mock()` inside each test file; this repo explicitly avoids `__mocks__/` directories.
- `jest.setup.js` already enables fake timers, common native mocks, and Animated/Icon warning suppression; reuse that setup instead of recreating it locally.
- Component and scene tests should render via `@/test-utils/renderWithTheme` so Tamagui and Safe Area context are present.
- Prefer observable behavior assertions over internal implementation details.
- Keep path alias imports (`@/...`) in tests to match app code.

## VALIDATION

- Main commands: `npm run test`, `npm run test:watch`.
- CI also requires `npm run format:check` and `npm run lint` before Jest.
- Pre-commit runs `lint-staged` and then the full Jest suite.

## ANTI-PATTERNS

- **NEVER** create new co-located test folders under source directories for app code.
- **NEVER** bypass `renderWithTheme` for Tamagui components unless the test intentionally avoids UI rendering.
- **NEVER** add new global mocks to `jest.setup.js` for a one-off case that can stay local to a test file.
