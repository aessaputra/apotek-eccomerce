---
description: Write unit tests for a component, service, or utility following project conventions
---
1. Ask the user which file or feature to test.
2. Read the target file and identify testable behaviors.
   - Use `@systematic-debugging` to understand the execution flow.
   - Use **sequentialthinking** to identify test scenarios: happy path, edge cases, error states, and what to mock.
3. Create the test file next to the source: `[filename].test.ts` or `[filename].test.tsx`.
   - One test file per component/service (per AGENT.md rule).
4. Write test cases following project conventions:
   - Test behavior, not implementation.
   - Use descriptive test names: `it('should [expected behavior] when [condition]')`.
   - Mock external dependencies (Supabase, navigation, AsyncStorage).
   - Use `@react-patterns` for component testing patterns.
5. Cover these scenarios:
   - Happy path (expected input → expected output).
   - Edge cases (empty data, null, undefined).
   - Error states (network failure, invalid input).
   - Loading states if applicable.
6. Verify all tests pass.
// turbo
7. Run `npm run test -- --watchAll=false`
// turbo
8. Run `npm run lint` to ensure no warnings.
