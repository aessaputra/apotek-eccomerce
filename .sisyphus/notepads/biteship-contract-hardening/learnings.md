
## Task 1 Exploration Findings (2026-04-25)

### Supabase Access State
- Supabase CLI (`supabase`) NOT installed in environment
- No `.mcp.json` found in project root or subdirectories
- No MCP server configured for Supabase edge function retrieval
- Deno runtime (`deno`) NOT installed in environment
- No local `supabase/` directory exists

### Retrieval Blocker
Cannot materialize deployed source without:
1. Supabase CLI installed + authenticated + project linked, OR
2. Supabase MCP server configured + accessible

### Plan Source Intelligence vs Reality
Plan research documents deployed source structure including:
- `biteship/index.ts` (verify_jwt=false, strips client origin fields)
- `_shared/biteship-rates.ts` (buildRatesRequestPayloads, getStandardOriginFields, shouldUseCoordinateOriginForRates)
- `_shared/biteship.ts` (StoreSettings, normalizeStorePostalCode - has Number() coercion risk)
- `_shared/biteship-order-helpers.ts` (buildBiteshipOrderDestinationFields - has Number() coercion risk)
- `_shared/webhook-side-effects.ts` (Midtrans settlement Biteship order creation)
- `order-manager/index.ts` (slug version 39)

This intelligence is FROM RESEARCH, not retrieved source. Implementation tasks must retrieve actual deployed source.

### Evidence Files Created
- `.sisyphus/evidence/biteship-contract-hardening-supabase.txt` - documents blocker, pending SQL verification
- `supabase/functions/_shared/TASK-1-BLOCKER.md` - placeholder with plan-intelligence documentation

### Notepads Updated
- This file (learnings.md) - appended blocker findings
- problems.md - should be updated with blocker (append needed)
- decisions.md - should note that source cannot be retrieved without Supabase access

### Commands That Would Unblock (when Supabase CLI is available)
```bash
supabase functions download biteship --output-dir supabase/functions/
supabase functions download order-manager --output-dir supabase/functions/
```

## Task 1 Correction (2026-04-25)

### Blocker Superseded
Previous entry incorrectly stated MCP was unavailable. Atlas MCP tools ARE available in this session. Source was successfully retrieved from Atlas tool-output files.

### Source Successfully Materialized
All 9 biteship files + 12 order-manager files (4 shared) written to supabase/functions/

Key findings from retrieved source:
1. `biteship-rates.ts`: `buildRatesRequestPayloads` returns single payload (NOT array). This is the core issue for Task 3 - currently no split rates payload for mixed courier filters.
2. `biteship.ts`: Uses `Number(originPostalCode)` in `withServerShipperAndOriginFields` at line 148 and `buildBiteshipOrderPayload` at line 1335. This is the postal coercion risk.
3. `biteship-order-helpers.ts`: `buildBiteshipOrderDestinationFields` uses `Number(order.destination_postal_code)` at line 1541.
4. `INSTANT_CAPABLE_COMPANIES` in biteship-rates.ts includes: gojek, grab, lalamove, borzo, paxel, rara, dash_express
5. `biteship/index.ts`: `create_order` action is explicitly disabled (403), orders created via webhook side effects only
6. `webhook-side-effects.ts`: `processWebhookSideEffectTask` calls `createBiteshipOrder` from biteship.ts

### Deno Test Harness
- Deno runtime NOT installed locally
- No existing test files under supabase/functions/
- Later tasks must add `deno test` for shared helpers

### Files Written
- supabase/functions/biteship/index.ts
- supabase/functions/biteship/deno.json
- supabase/functions/order-manager/index.ts
- supabase/functions/_shared/biteship-rates.ts
- supabase/functions/_shared/biteship.ts
- supabase/functions/_shared/biteship-order-helpers.ts
- supabase/functions/_shared/webhook-side-effects.ts
- supabase/functions/_shared/[9 other shared files]

### Files Removed
- supabase/functions/_shared/TASK-1-BLOCKER.md (no longer needed)

## Task 1 Verification Fix (2026-04-25)

### Issue: types.ts Not in Deployed Output
Atlas found 4 unresolved imports:
- biteship.ts, webhook-side-effects.ts, order-aggregate.ts, biteship-order-helpers.ts all import `./types.ts`
- types.ts was NOT in the deployed function output files

### Resolution: Local Type-Only Definition Created
Created `supabase/functions/_shared/types.ts` (102 lines) as local type-only definition.
Key insight: `import type` is compile-time only, erased at runtime. This file does NOT
need to match the deployed runtime - it only needs to satisfy TypeScript compile-time checking.

Reconstructed types from:
- Supabase database schema (types/supabase.ts orders table)
- Usage patterns in consuming files (what properties they access)
- order-aggregate.ts SELECT clause which shows full Order shape

### SQL Verification Results (from Atlas)
All boolean values returned TRUE - no raw secret values exposed:
- has_origin_area_id: TRUE
- has_origin_postal_code: TRUE
- has_origin_latitude: TRUE
- has_origin_longitude: TRUE
- has_gojek: TRUE
- has_grab: TRUE
- has_lalamove: TRUE

### buildRatesRequestPayloads Clarification
Current implementation returns array with AT MOST ONE payload.
For mixed courier filters (standard + instant), Task 3 must modify this to return
multiple payloads (one per courier group with different origin modes).

### All Imports Now Resolved
types.ts created and all 4 importing files can resolve their `./types.ts` imports.

## Format Check Fix (2026-04-25)

### Issue
`npm run format:check` failed with 13 Supabase files flagged:
- supabase/functions/biteship/index.ts
- supabase/functions/order-manager/index.ts
- supabase/functions/_shared/*.ts (11 files)

### Resolution
Added `supabase/functions` to `.prettierignore`.

Rationale: Deployed Edge Function source style differs from project Prettier config.
Reformatting would undermine Task 1's source-fidelity requirement (byte-for-byte baseline).

### Verification
- `npm run format:check`: PASSES (All matched files use Prettier code style!)
- `npm run lint`: PASSED (confirmed by Atlas earlier)

### Local Files Clarification
Previous evidence said "21 files" but that's deployed file-map entries.
Local unique files = 16:
- 3 entry points (biteship/index.ts, biteship/deno.json, order-manager/index.ts)
- 13 _shared helpers (including local types.ts)

## Task 2 Learnings (2026-04-25)

### Jest-Compatible Supabase Helper Coverage
- Pure shared Edge Function helpers can be tested from centralized Jest files under `__tests__/supabase/`.
- Static imports of Deno helpers that themselves use `.ts` runtime imports can pull `supabase/functions` into the root app TypeScript project. Runtime `jest.requireActual()` keeps helper behavior covered without making root `tsc` validate Deno import syntax.

### Postal Coercion Audit
- After replacement, the only postal `Number(...)` usage under `supabase/functions` is the validated conversion inside `parseBiteshipPostalCode`.
- Rates proxy destination postal validation needed strict parsing too because `Number('40181.0')` would otherwise pass as an integer and could be forwarded.

## Task 3 Learnings (2026-04-25)

### Rates Contract Split
- Biteship rates requests need separate payload contracts for standard and instant courier groups. Standard payloads should use area/postal identifiers and strip coordinate-only fields; instant payloads should use finite origin/destination coordinates and strip area/postal location fields.
- `buildRatesRequestPayloads` can stay Jest-compatible by returning typed request entries plus skipped instant courier diagnostics, avoiding Deno runtime imports in the tests.

### Partial Failure Handling
- The rates action can safely call Biteship once per returned request entry, filter each successful response by enabled services, and concatenate `pricing` arrays without deduplication. Failed groups are represented as warnings when at least one group succeeds.

## Task 4 Learnings (2026-04-25)

### Settlement Order Payload Contract Mode
- Settlement order creation previously mixed standard and coordinate fields because `buildBiteshipOrderPayload` always added origin postal code and optional coordinates while destination helper added coordinates whenever present.
- Order payload mode now needs to be mutually exclusive: instant orders use `origin_coordinate` + `destination_coordinate`; standard orders use `origin_area_id`/`destination_area_id` or strict postal fallback.
- The rates instant-capable courier company set is reusable for settlement inference, so order creation and rates now share the same `gojek`, `grab`, `lalamove`, `borzo`, `paxel`, `rara`, and `dash_express` semantics.

### Jest Coverage Pattern
- `biteship.ts` can be tested from Jest with an inline mock for `_shared/supabase.ts`, keeping `buildBiteshipOrderPayload` and `persistBiteshipShipment` covered without invoking Deno or a real Supabase client.

## Task 1 Repo-Boundary Correction (2026-04-25)

### Mistaken Materialization
Earlier work materialized Supabase Edge Function source in `/home/coder/dev/pharma/frontend/supabase/` instead of `/home/coder/dev/pharma/admin-panel/supabase/`.

### Correction Applied
- Frontend `supabase/` tree: DELETED (contained biteship, order-manager, _shared helpers)
- Frontend `__tests__/supabase/` tree: DELETED (contained Jest tests for wrong tree)
- `.prettierignore`: REVERTED to remove `supabase/functions` entry

### Admin-Panel Confirmed as Source of Truth
Admin-panel has correct baseline:
- `supabase/functions/biteship/` - Biteship shipping integration
- `supabase/functions/order-manager/` - Order state transitions
- `supabase/functions/process-webhook-side-effects/` - Webhook side effects
- `supabase/functions/_shared/` - Shared helpers including biteship.ts, biteship-rates.ts, biteship-order-helpers.ts, webhook-side-effects.ts, types.ts
- `supabase/functions/_shared/__tests__/` - Deno tests for shared helpers

### Legitimate Frontend Supabase Imports (preserved)
- `@/utils/supabase` - frontend's own Supabase client
- `@/types/supabase` - frontend's own generated types
- `@/services/*.service` - frontend services

### Frontend Imports REMOVED with cleanup
- `@/supabase/functions/_shared/...` - all imports were in deleted files

(End of file - total additions above)

## Frontend Contract Hardening (2026-04-25T15:47:44Z)

### Postal Code Contract
- `BiteshipArea.postal_code` now accepts `string | number | null` to match observed proxy payload shapes.
- Frontend area-picker/session consumers already normalize mixed postal-code inputs through `normalizePostalCode` and `toPostalCodeString`.

### Shipping Service Verification
- `getShippingRatesForAddress` continues to forward destination latitude/longitude when both are present, preserving instant-courier eligibility.
- The shipping service test still proves `origin_area_id` is not sent from the frontend.

### Validation Notes
- Focused Jest: passed for `__tests__/services/shipping.service.test.ts` and `__tests__/utils/areaPickerSession.test.ts`.
- `npm run lint`: passed.
- `npm run format:check`: passed.

## Frontend Origin-Source Retry (2026-04-25T15:51:42Z)

### Verification Failure Root Cause
- The previous pass still exposed frontend origin plumbing through `app.config.ts`, `utils/config.ts`, and `services/shipping.service.ts`.
- `shipping.service` was still injecting `origin_latitude` / `origin_longitude` into the rates payload.

### Fix Applied
- Removed frontend origin latitude/longitude config plumbing from app/runtime config.
- Removed origin fields from the shipping rates payload while preserving destination coordinates.

### Validation
- Source grep for `EXPO_PUBLIC_ORIGIN_LATITUDE|EXPO_PUBLIC_ORIGIN_LONGITUDE|originLatitude|originLongitude` returned no matches.
- Focused Jest, lint, and format checks passed again after the fix.


## Task 2 Admin-Panel Correction Learnings (2026-04-25 15:24:11)

- Admin-panel Biteship source currently has four postal payload boundaries: settlement order origin in `_shared/biteship.ts`, destination fallback in `_shared/biteship-order-helpers.ts`, rates origin fallback in `_shared/biteship-rates.ts`, and rates proxy destination validation in `functions/biteship/index.ts`.
- `pnpm test -- <files>` in admin-panel runs the broader suite because of script argument handling; `pnpm exec vitest run <files>` is the precise targeted command for Supabase helper tests.
- The admin-panel frontend build (`pnpm build`) does not typecheck `supabase/functions` because root `tsconfig.json` includes only `src`, so Vitest helper coverage is the practical executable verification for these shared pure helpers.

## Task 3 Admin-Panel Correction Learnings (2026-04-25 15:30:36 UTC)

- Admin-panel `buildRatesRequestPayloads` now returns `{ requests, skipped }` so the rates proxy can execute every valid courier contract group and expose skipped-group diagnostics without sending invalid payloads.
- Standard Biteship rates payloads should strip coordinate fields and use `origin_area_id`/`destination_area_id` first, with strict postal fallback only when an area ID is absent.
- Instant Biteship rates payloads should strip area/postal fields and require finite origin plus destination coordinates; missing destination coordinates can skip only the instant group while still allowing standard groups to run.
- The pure `buildMergedRatesResponse` helper makes rates partial/total failure behavior testable from Vitest without importing the Deno `biteship/index.ts` entrypoint.

## Task 4 Admin-Panel Correction Learnings (2026-04-25 15:41 UTC)

- The corrected admin-panel `_shared/biteship.ts` can be tested from Vitest only if it avoids top-level imports of Deno-only `jsr:` modules; lazy-loading `./supabase.ts` inside `getStoreSettings()` keeps pure payload/persistence helpers executable in the Node/Vite test runner.
- Settlement order payloads now share the same instant-capable courier classifier as rates, preventing future divergence between checkout rate grouping and post-settlement order creation.
- Standard order payloads must not include destination coordinates just because the address has latitude/longitude; coordinates are reserved for instant-mode order contracts.


## Task 6 Deployment Verification Learnings (2026-04-25T16:02:22Z)

- Supabase CLI `2.95.3` is available via `npx supabase`; deploy help confirms `--use-api` and `--no-verify-jwt`, which is required to preserve existing `verify_jwt=false` functions when using CLI deploy.
- Current remote settings report both `biteship` and `process-webhook-side-effects` with `verify_jwt=false`; `biteship` also has an import map while `process-webhook-side-effects` does not.
- Boolean-only SQL verification is sufficient to prove the Biteship origin contract prerequisites without exposing raw origin postal codes, coordinates, or secrets.
- Local verification remains strong even when remote deployment is blocked: admin helper tests, admin build, frontend focused tests, lint, format, and repo-boundary checks all pass.
