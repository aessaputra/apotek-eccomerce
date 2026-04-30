# ANDROID

Checked-in native Android project for local `expo run:android` and EAS development builds. Treat it as generated-but-owned: small config changes are allowed, broad regeneration must be reviewed.

## STRUCTURE

```
android/
├── app/build.gradle     # Application ID, namespace, React/Expo bundle command
├── gradle.properties    # New Architecture, Hermes, edge-to-edge, image flags
├── build.gradle         # Android/Gradle plugin versions
└── settings.gradle      # Expo autolinking and Gradle plugin includes
```

## CURRENT CONFIG

- `android/app/build.gradle` uses namespace/applicationId `com.apotekecommerce.dev`.
- `app.config.ts` default Android package is `com.apotekecommerce`; env can override via `EXPO_ANDROID_PACKAGE`.
- JS bundle entry is resolved through `expo/scripts/resolveAppEntry` and Expo CLI `export:embed`.
- Google Services plugin is applied; root `google-services.json` is conditionally referenced by `app.config.ts`.
- `gradle.properties`: `newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=true`.
- React Native architectures: `armeabi-v7a, arm64-v8a, x86, x86_64`.

## WHERE TO LOOK

| Task                 | File                                              | Notes                                                       |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| Change Android ID    | `app/build.gradle`, `app.config.ts`, env examples | Keep native, Expo config, and EAS project aligned           |
| Tune runtime flags   | `gradle.properties`                               | New Architecture, Hermes, edge-to-edge, image support       |
| Change build profile | `../eas.json`                                     | EAS controls debug/release Gradle commands                  |
| Keyboard behavior    | `../app.config.ts`                                | `softwareKeyboardLayoutMode: 'resize'` lives in Expo config |

## ANTI-PATTERNS

- **NEVER** casually change `namespace` / `applicationId`; it affects installed app identity and Google services.
- **NEVER** disable Hermes or New Architecture without checking Expo SDK 54 compatibility and native module behavior.
- **NEVER** rely on deprecated `expo.edgeToEdgeEnabled`; `gradle.properties` notes removal in Expo SDK 55.
- **NEVER** commit local Gradle build outputs.
