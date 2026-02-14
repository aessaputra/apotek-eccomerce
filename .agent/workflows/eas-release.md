---
description: Build and release the app via EAS Build and EAS Update
---
1. Ask the user for the release type: "development", "preview", or "production".
2. Verify `app.json` and `eas.json` have correct version and build profiles.
   - Use `@mobile-developer` for Expo/EAS configuration best practices.
   - Use `@context7-auto-research` to fetch latest EAS CLI docs.
3. Run lint and type checks to ensure no blocking errors.
// turbo
4. Run `npx expo export` to verify the bundle compiles successfully.
5. For OTA update: run `eas update --branch [branch-name] --message "[description]"`.
6. For native build: run `eas build --profile [profile] --platform [android|ios|all]`.
7. Verify the build status on Expo dashboard and report the result to the user.
