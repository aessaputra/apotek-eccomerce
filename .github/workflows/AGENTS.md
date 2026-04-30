# GITHUB WORKFLOWS

CI and preview automation. Root commands are in `package.json`; this folder owns GitHub-specific branch/env/secret behavior.

## STRUCTURE

```
.github/workflows/
├── test.yml     # Format check, lint, Jest on PR/push
└── preview.yml  # EAS Update previews for PRs and branch updates for pushes
```

## WORKFLOWS

- `test.yml` runs on all PRs and pushes to `dev`, `staging`, `main`, and `release/**`.
- Test CI uses Node `20.x`, `npm ci`, `npm run format:check`, `npm run lint`, then `npm run test`.
- `preview.yml` requires `EXPO_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_KEY` GitHub secrets.
- PR previews use `expo/expo-github-action/preview@v8` with `eas update --auto`, which comments preview/QR on the PR.
- Push updates run `eas update --branch <current_branch>` after sanitizing double quotes in the commit message.

## ENV MAPPING

| Branch               | Env example            |
| -------------------- | ---------------------- |
| `main`, `release/**` | `.env.prod.example`    |
| `staging`            | `.env.staging.example` |
| other branches / PR  | `.env.dev.example`     |

Current repo has only `.env.dev.example` and `.env.prod.example`; `staging` workflow will fail until `.env.staging.example` exists or mapping changes.

## CI QUIRKS

- `preview.yml` extracts `EXPO_PROJECT_ID` and `EXPO_SLUG` with `grep`/`cut`; keep those keys present in every mapped env example.
- `preview.yml` installs `lightningcss-linux-x64-gnu --save-optional` after `npm ci`; preserve this Linux/Tamagui workaround.
- `EXPO_TOKEN` must belong to the Expo account that owns `app.json` `owner` / the EAS project.

## ANTI-PATTERNS

- **NEVER** add secrets to env example files or workflow logs.
- **NEVER** change branch/env mapping without checking `app.config.ts` required keys.
- **NEVER** remove the Supabase secret checks unless bundle-time Supabase config is redesigned.
