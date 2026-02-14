---
description: Fix and refine UI for consistency, dark/light theme, spacing, and responsiveness
---
1. Ask the user which screen or component needs UI refinement.
2. Read the target file and identify visual issues.
   - Use `@context7-auto-research` to fetch latest Tamagui component docs.
   - Use **sequentialthinking** to categorize issues by type (styling, theme, spacing, responsiveness) and prioritize fixes.
3. Check styling compliance:
   - Tamagui only (no StyleSheet)?
   - Colors from tokens (`$primary`, `$background`, `$color`)?
   - Layout uses YStack/XStack?
4. Check dark/light theme support:
   - All colors via Tamagui themes (light/dark)?
   - Test with `useColorScheme()` toggle.
   - Use `@ui-ux-pro-max` for UX best practices.
5. Check spacing, alignment, and responsiveness across screen sizes.
   - Use `@mobile-developer` for platform-specific adjustments (iOS vs Android).
6. Refactor component using Tamagui primitives: `styled()`, tokens, and built-in components (Card, Button, Input, ListItem).
7. Verify the screen renders correctly on both themes.
// turbo
8. Run `npm run lint` to ensure no new warnings.
