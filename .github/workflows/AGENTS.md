# GITHUB WORKFLOWS

CI and preview automation. Root commands are in `package.json`; this folder owns GitHub-specific branch/env/secret behavior.

## STRUCTURE

```
.github/workflows/
├── test.yml     # Format check, lint, Jest on PR/push
└── preview.yml  # EAS Update previews for PRs and branch updates for pushes
```

## WORKFLOWS

- `test.yml` runs on all PRs and pushes to `dev`, `main`, and `release/**`.
- Test CI uses Node `20.x`, `npm ci`, `npm run format:check`, `npm run lint`, then `npm run test`.
- `preview.yml` is named **EAS Update CI** and has a built-in quality gate before publishing OTA updates.
- `preview.yml` requires `EXPO_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_KEY` GitHub secrets.
- `preview.yml` runs format check, lint, and Jest before any EAS Update step; do not bypass this gate.
- PR previews use `expo/expo-github-action/preview@v8` with `eas update --auto`, which comments preview/QR on the PR.
- Push updates map Git branch `dev` to EAS Update branch `preview`, and `main` / `release/**` to EAS Update branch `production`, after sanitizing double quotes in the commit message.
- Concurrency is enabled per event/ref so superseded OTA jobs are cancelled when newer commits arrive.

## ENV MAPPING

| Branch               | Env example            |
| -------------------- | ---------------------- |
| `main`, `release/**` | `.env.prod.example`    |
| `dev` / PR previews  | `.env.preview.example` |
| other branches       | `.env.preview.example` |

Current repo has `.env.dev.example`, `.env.preview.example`, and `.env.prod.example`.

## CI QUIRKS

- `preview.yml` extracts Expo app identity values with `grep`/`cut`; keep `ENV`, `EXPO_PROJECT_ID`, `EXPO_SLUG`, `EXPO_NAME`, `EXPO_IOS_BUNDLE_IDENTIFIER`, and `EXPO_ANDROID_PACKAGE` present in every mapped env example.
- `preview.yml` installs `lightningcss-linux-x64-gnu --save-optional` after `npm ci`; preserve this Linux/Tamagui workaround.
- `EXPO_TOKEN` must belong to the Expo account that owns `app.json` `owner` / the EAS project.

## ANTI-PATTERNS

- **NEVER** add secrets to env example files or workflow logs.
- **NEVER** change branch/env mapping without checking `app.config.ts` required keys.
- **NEVER** remove the Supabase secret checks unless bundle-time Supabase config is redesigned.
