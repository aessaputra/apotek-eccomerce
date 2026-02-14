---
description: Start a new feature branch synchronized with main using naming conventions
---
1. Ask the user for the feature name (e.g., "shopping-cart", "upload-prescription").
2. Ensure working directory is clean — no uncommitted changes.
   - Use `@git-pushing` for safe Git operations.
// turbo
3. Run `git checkout main`
// turbo
4. Run `git pull origin main`
// turbo
5. Run `git checkout -b feature/[feature-name]`
6. Confirm the branch is ready. Suggest next step: run `/feature-scaffold` to start building.
