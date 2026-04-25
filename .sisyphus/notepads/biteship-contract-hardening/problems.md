
## TASK 1 Blocker (2026-04-25)

### Blocker: Cannot Retrieve Deployed Supabase Edge Function Source

**Problem**: Supabase CLI not installed in this environment, no MCP server configured. Cannot retrieve deployed source for `biteship`, `order-manager`, or shared helpers to create local `supabase/functions/` tree.

**Impact**: 
- Tasks 2, 3, 4, 6 are blocked - they require editable local source to modify
- No local baseline to diff against for verification
- Cannot run Deno tests (deno not installed either)

**Required to unblock**:
1. Install Supabase CLI: `npm install -g supabase`
2. Authenticate: `supabase login`
3. Link project: `supabase link --project-ref <project-ref>`
4. Download: `supabase functions download biteship --output-dir supabase/functions/`
5. OR configure Supabase MCP server access

**Status**: BLOCKED - waiting for Supabase access

## Task 1 Resolution (2026-04-25)

### Previous Blocker: SUPERSEDED
Earlier entry claimed MCP was unavailable - INCORRECT. Source successfully retrieved via Atlas tool-output files.

### Remaining Issue: Deno Test Harness Not Executable
Deno runtime is not installed in this environment. No `deno test` commands can run locally.

Impact: Tasks 2, 3, 4 must add their own Deno tests and document test commands for verification.

### Still Pending: Supabase Settings Boolean Verification
SQL verification query cannot be executed without Supabase SQL tool access.

Query to run when access available:
```sql
select origin_area_id is not null, origin_postal_code is not null, 
       origin_latitude is not null, origin_longitude is not null,
       enabled_couriers like '%gojek%', enabled_couriers like '%grab%',
       enabled_couriers like '%lalamove%'
from public.settings where id = 1;
```

## Task 1 Verification Fix (2026-04-25)

### Previous Issue: SQL Pending (SUPERSEDED)
Earlier entry said SQL verification was pending. Atlas executed SQL and confirmed:
all 7 boolean checks returned TRUE for origin fields and instant couriers.

### Previous Issue: types.ts Missing (RESOLVED)
Four files had unresolved `./types.ts` imports. Created local types.ts to satisfy
compile-time TypeScript checking. Not a runtime issue since `import type` is erased.

### Still Pending: Deno Test Harness Not Executable
Deno runtime not installed. Implementation tasks must document their own test commands.

### Baseline Now Import-Resolved
All `./types.ts` imports in supabase/functions/_shared/ are now resolved.
Files can be compiled against locally.

## Task 2 Problems (2026-04-25)

### Existing Project Typecheck Failures Remain Outside Task 2

`npx tsc --noEmit` still fails on unrelated app/test type errors that predate this postal parser task, including `ProductCard.test.tsx`, several order hook tests, `order.service.test.ts`, and `app/(tabs)/_layout.tsx`.

Task 2-specific Supabase parser/helper files and the new centralized Jest test have clean LSP diagnostics, and the focused Jest test passes.

## Task 3 Problems (2026-04-25)

### No Unresolved Task 3 Blockers

Task 3 required validation passed locally: focused rates/postal Jest tests, shipping/checkout service tests, lint, format check, Supabase functions typecheck, and LSP diagnostics on changed files.

The known root `npx tsc --noEmit` pre-existing failures from Task 2 were not part of Task 3's required verification path; the Supabase functions-specific typecheck passed.

## Task 1 Repo-Boundary Correction (2026-04-25)

### Previous Problem: Mistaken Repository Boundary
Supabase Edge Function source was materialized in wrong repository (frontend instead of admin-panel).

### Resolution: COMPLETE
- Frontend supabase tree: DELETED
- Frontend supabase tests: DELETED
- .prettierignore entry: REVERTED
- Admin-panel source: VERIFIED EXISTS and UNCANGED

### Verification Commands Run
```bash
# Frontend no supabase directory
ls /home/coder/dev/pharma/frontend/ | grep supabase  # NO supabase directory found

# Frontend no supabase tests
ls /home/coder/dev/pharma/frontend/__tests__/ | grep supabase  # NO supabase tests found

# Admin-panel supabase functions exists
ls /home/coder/dev/pharma/admin-panel/supabase/functions/
# biteship/ order-manager/ process-webhook-side-effects/ _shared/

# Admin-panel _shared has all Biteship helpers
ls /home/coder/dev/pharma/admin-panel/supabase/functions/_shared/
# biteship.ts biteship-rates.ts biteship-order-helpers.ts webhook-side-effects.ts types.ts ...

# Admin-panel _shared tests exists
ls /home/coder/dev/pharma/admin-panel/supabase/functions/_shared/__tests__/
# biteship-rates.test.ts biteship-order.test.ts ...
```

### Remaining: Task 2/3/4 Must Use Admin-Panel Source
Tasks 2 (postal parser), 3 (rates split), 4 (order payload) must now be implemented by modifying files in `/home/coder/dev/pharma/admin-panel/supabase/functions/`, NOT the deleted frontend tree.

(End of file - total additions above)

## Frontend Contract Hardening (2026-04-25T15:47:44Z)

### No New Blockers
- No new origin-setting source was introduced in the frontend.
- Focused Jest, lint, and format checks all passed for the touched frontend files.
- The only notable caveat remains pre-existing workspace-wide noise outside this task, but it did not block the requested validation path.

## Frontend Origin-Source Retry (2026-04-25T15:51:42Z)

### Resolved Verification Failure
- Previous verification failed because shipping-origin source was still present in frontend config and service payload code.
- Fixed by removing config plumbing and origin payload fields; destination coordinate forwarding remains intact.
- Source grep now shows no `EXPO_PUBLIC_ORIGIN_LATITUDE`, `EXPO_PUBLIC_ORIGIN_LONGITUDE`, `originLatitude`, or `originLongitude` in frontend source.


## Task 2 Admin-Panel Correction Problems (2026-04-25 15:24:11)

### No Runtime Verification Blockers

- Targeted admin-panel Biteship helper tests pass: 3 files, 35 tests.
- Admin-panel `pnpm build` passes.
- Frontend `supabase/` remains absent.

### LSP-Only Ambient Type Noise Remains

- `biteship.ts` and `biteship/index.ts` can report existing local LSP diagnostics because the admin-panel Supabase JS Deno declaration shim returns `unknown` for `createClient`.
- This is not introduced by the postal parser behavior and does not affect the required build/test commands; resolving the Deno Supabase client ambient typing should be handled as a separate diagnostics cleanup if needed.

## Task 3 Admin-Panel Correction Problems (2026-04-25 15:30:36 UTC)

### No Runtime Verification Blockers

- Targeted admin-panel Biteship helper tests pass: 4 files, 45 tests.
- Admin-panel `pnpm build` passes.
- Frontend `supabase/` remains absent.

### Existing LSP-Only Ambient Type Noise Remains

- `biteship/index.ts` still reports the inherited local Deno ambient diagnostics for `npm:jose@5` resolution and `adminClient` typed as `unknown`.
- The modified pure helper and rates test file have no LSP diagnostics; the inherited entrypoint diagnostics do not affect the required targeted Vitest or admin-panel build verification.

## Task 4 Admin-Panel Correction Problems (2026-04-25 15:41 UTC)

### Resolved: Vitest Could Not Resolve Deno Supabase `jsr:` Import

- Initial targeted Biteship helper test run failed because importing `_shared/biteship.ts` forced Vite to resolve `_shared/supabase.ts`, which imports `jsr:@supabase/supabase-js@2`.
- Resolution: moved the Supabase module import behind an async lazy import inside `getStoreSettings()` and replaced the persistence parameter's `ReturnType<typeof getSupabaseAdminClient>` with a small structural mutation client type.
- Result: targeted Biteship helper tests pass and all modified files have no LSP diagnostics.

### No Remaining Runtime Verification Blockers

- Targeted admin-panel Biteship helper tests pass: 3 files, 42 tests.
- Admin-panel `pnpm build` passes.
- Direct `create_order` remains disabled in the Biteship function entrypoint.


## Task 6 Deployment Blocker (2026-04-25T16:02:22Z)

### Blocker: Supabase CLI Authentication Missing

Attempted affected-function deployment from `/home/coder/dev/pharma/admin-panel` using the admin-panel AGENTS-recommended `--use-api` CLI path and preserving JWT settings with `--no-verify-jwt`.

Command failed before deployment with:

```text
Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
Try rerunning the command with --debug to troubleshoot the error.
```

Impact:
- `biteship` and `process-webhook-side-effects` were not deployed.
- Current remote versions remain `biteship=61` and `process-webhook-side-effects=11`.
- Existing `verify_jwt=false` settings remain unchanged.

What is complete despite blocker:
- Supabase settings boolean verification passed.
- Current function JWT settings were queried and recorded.
- Edge logs were inspected.
- Admin-panel focused helper tests passed.
- Admin-panel build passed.
- Frontend focused tests, lint, and format checks passed.
- Frontend `/supabase` tree remains absent.
