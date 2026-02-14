---
description: Scaffold a new feature with screen, scene, service, types, and basic test
---
1. Ask the user for the feature name (e.g., "shopping-cart", "product-detail").
2. Plan the feature scope and acceptance criteria.
   - Use `@concise-planning` to define what "done" looks like.
   - Use **sequentialthinking** to break down the feature into components, data flow, and state needs.
3. Create the route file in `app/[feature-name]/index.tsx` — keep it minimal, delegate to a scene.
4. Create the scene component in `scenes/[FeatureName]/index.tsx` — main UI logic goes here.
   - Use `@mobile-developer` for React Native + Expo best practices.
   - Use `@context7-auto-research` to fetch latest Expo Router and Tamagui docs.
   - Style with Tamagui only (tokens, YStack/XStack, styled()). No StyleSheet.
5. Create the service file in `services/[feature-name].service.ts`.
   - Use `@api-design-principles` for clean API contracts.
6. Create the types file in `types/[FeatureName].ts`.
7. Create a Redux Toolkit slice in `slices/[feature-name].slice.ts` if global state is needed.
   - Use `useAppSlice` for state access. Use `@react-patterns` for patterns.
8. Wire the scene to the service and verify it renders without errors.
// turbo
9. Run `npm run lint` to ensure no lint warnings.
