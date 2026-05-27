# EAS WORKFLOWS

EAS platform workflows for native APK builds and web deploys. GitHub Actions owns quality gates and OTA updates in `.github/workflows/`; this directory owns EAS dashboard-triggered build/deploy jobs.

## STRUCTURE

```
.eas/workflows/
├── preview.yml  # dev branch: Android preview APK + web preview deploy
└── release.yml  # main/release branches: Android production APK + web production deploy
```

## WORKFLOWS

- `preview.yml` runs on pushes to `dev` and `workflow_dispatch`; it builds Android with profile `preview` and deploys web preview.
- `release.yml` runs on pushes to `main` / `release/**` and `workflow_dispatch`; it builds Android with profile `production` and deploys web with `prod: true`.
- iOS build/submit and Play Store submit jobs should stay commented out until paid developer accounts exist; `release.yml` currently has a malformed uncommented `params:` line in that block, so fix it before schema validation.
- Android release output is an APK for direct distribution, not an AAB, because Play Store distribution is currently out of scope.
- Build profile details live in `eas.json`; app identity and Firebase file selection live in `app.config.ts` plus env files/secrets.
- Validate workflow YAML against the current Expo workflow schema after edits. `release.yml` still carries legacy `buildType: apk`; either verify it against the current schema or move APK selection into `eas.json`.

## WHERE TO LOOK

| Task | File | Notes |
| --- | --- | --- |
| Change preview build/deploy | `preview.yml`, `../../eas.json` | Keep branch `dev` mapped to profile/channel `preview` |
| Change production release | `release.yml`, `../../eas.json` | Keep direct APK distribution assumptions explicit |
| Re-enable store submit | `release.yml` | Requires Apple Developer / Google Play accounts and matching submit profiles |
| Change app IDs/secrets | `../../app.config.ts`, env examples, EAS env | Do not hardcode secrets in workflow YAML |
| Validate workflow schema | `.eas/workflows/*.yml` | Fetch current Expo schema; do not rely on memorized job params |

## ANTI-PATTERNS

- **NEVER** commit secrets or real env values in these workflows; use EAS environment/secrets.
- **NEVER** switch production Android output from APK to AAB without confirming Play Store access and distribution plan.
- **NEVER** add unsupported build-job params to workflow YAML; check the current schema before preserving or changing `buildType`.
- **NEVER** re-enable iOS or store-submit jobs without adding the required accounts, credentials, and submit profiles.
- **NEVER** duplicate GitHub quality gates here unless EAS workflows become the authoritative CI path.
