---
description: Systematically debug a reported issue using structured analysis
---
1. Ask the user to describe the issue: what happened, what was expected, and steps to reproduce.
2. Use **sequentialthinking** to analyze the problem:
   - Form hypotheses about possible root causes.
   - Rank hypotheses by likelihood.
   - Plan which files and execution paths to trace first.
3. Reproduce the issue locally if possible.
   - Use `@systematic-debugging` — DO NOT guess. Trace the actual execution path.
4. Identify the root cause by reading relevant source files and logs.
5. Propose a fix and explain the reasoning before implementing.
6. Implement the fix in the relevant file(s).
7. Verify the fix resolves the issue without introducing regressions.
// turbo
8. Run `npm run lint` to ensure no new warnings.
