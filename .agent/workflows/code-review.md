---
description: Run a structured code review checklist on recent changes
---
1. Ask the user which files or feature area to review.
2. Use **sequentialthinking** to scope the review:
   - Identify which review areas are most relevant for the changed files.
   - Prioritize by risk: security > types > structure > styling > state.
3. Check for unused imports, variables, and dead code.
   - Use `@lint-and-validate` for automated linting.
4. Review component structure: route files minimal? Logic in `scenes/`? Reusable parts in `components/elements/`?
   - Use `@react-patterns` for best practices.
5. Review styling: Tamagui only? No StyleSheet? Colors from tokens (`$primary`, `$background`)?
6. Review security: no hardcoded secrets, no sensitive data in logs, no `console.log` in production.
   - Use `@frontend-mobile-security-coder` for mobile-specific checks.
7. Review types: no `any` types, proper interfaces for all props.
8. Review state: Redux Toolkit for global state? `useAppSlice` used correctly?
9. Summarize findings and recommend fixes.
