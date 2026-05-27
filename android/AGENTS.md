# ANDROID

Local native Android project for `expo run:android` and local Gradle validation. Remote EAS builds use Continuous Native Generation: `.easignore` excludes `/android`, so durable build identity changes belong in `app.config.ts`, env examples, EAS env, or a tracked config plugin unless the full native project is intentionally committed.

## STRUCTURE

```
android/
├── app/build.gradle     # Application ID, namespace, React/Expo bundle command
├── gradle.properties    # New Architecture, Hermes, edge-to-edge, image flags
├── build.gradle         # Android/Gradle plugin versions
└── settings.gradle      # Expo autolinking and Gradle plugin includes
```

## CURRENT CONFIG

- Local `android/app/build.gradle` keeps namespace/source package `com.apotekecommerce.dev`, but resolves `applicationId` from `EXPO_ANDROID_PACKAGE` and app label from `EXPO_NAME` with development fallbacks.
- Remote EAS archives exclude `/android` via `.easignore`; preview/prod package names are generated from `app.config.ts` and EAS environment variables.
- `app.config.ts` default Android package is `com.apotekecommerce`; env can override via `EXPO_ANDROID_PACKAGE`.
- JS bundle entry is resolved through `expo/scripts/resolveAppEntry` and Expo CLI `export:embed`.
- Google Services plugin is applied only when a `google-services.json` client matches the resolved Android `applicationId`; root `google-services.json` is conditionally referenced by `app.config.ts`.
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

- **NEVER** casually change `namespace` / `applicationId`; namespace controls native source package while applicationId controls installed app identity and Google services.
- **NEVER** rely on ignored local native files for remote EAS behavior; commit a full native project or encode changes in tracked CNG inputs.
- **NEVER** disable Hermes or New Architecture without checking Expo SDK 54 compatibility and native module behavior.
- **NEVER** rely on deprecated `expo.edgeToEdgeEnabled`; `gradle.properties` notes removal in Expo SDK 55.
- **NEVER** commit local Gradle build outputs.
