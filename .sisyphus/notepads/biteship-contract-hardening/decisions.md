
## Task 1 Decisions (2026-04-25)

### Decision: Placeholder Structure Created Instead of Fabricated Source

When: 2026-04-25
Problem: Cannot retrieve deployed Supabase Edge Function source (CLI not installed, no MCP)

Decision: Created blocker documentation rather than inventing source from memory/plan summaries.

Rationale: 
- Plan explicitly forbids: "Do NOT invent source from memory, plan snippets, previous summaries, or docs"
- Plan requires: "If a file cannot be retrieved, write an explicit blocker"
- Implementation tasks (2, 3, 4) must have REAL deployed source to modify, not reconstructed approximations

Outcome:
- `supabase/functions/_shared/TASK-1-BLOCKER.md` documents plan-intelligence about deployed source structure
- `.sisyphus/evidence/biteship-contract-hardening-supabase.txt` records blocker and pending SQL verification
- Notepads updated with blocker findings

### Decision: Not Creating Empty Source Files

When: 2026-04-25
Problem: Tasks expect `supabase/functions/` tree with real source

Decision: Will NOT create empty stub files that would be overwritten by real retrieved source later.

Rationale: Empty stubs would confuse diff-based verification and require cleanup before deployment. Blocker documentation is cleaner than fabricated baseline.

### Decision: Evidence Includes Plan-Referenced Source Intelligence

When: 2026-04-25
Problem: Evidence file needs to capture what we know about deployed source structure

Decision: Evidence documents the plan-research source intelligence (helpers, functions, risks) as context, not as verified retrieved source.

Rationale: Later tasks can use this as a guide for what to look for during retrieval. Blocker clearly separates "research says" from "retrieved confirmed".

## Task 1 Correction (2026-04-25)

### Decision: Source Retrieved from Atlas Tool-Output Files
When: 2026-04-25
Problem: Earlier entry said MCP unavailable - that was incorrect.

Decision: Used Atlas tool-output files as MCP fallback to retrieve actual deployed source.

Rationale: The tool-output files contained full deployed source content. Successfully wrote all 21 files to supabase/functions/.

### Decision: Source Is Now Ground Truth
When: 2026-04-25

Decision: Local supabase/functions/ tree is now the baseline. All Tasks (2, 3, 4, 6) must use this source.

Rationale: Plan requires actual deployed source as baseline, not memory/invention. This tree matches deployed function files byte-for-byte.

### Decision: Deno Test Harness to Be Added by Implementation Tasks
When: 2026-04-25

Decision: No Deno test runner was available to execute. Later tasks (2, 3, 4) should add deno tests for their respective helpers.

Rationale: Plan says "identify or add lightweight helper-test harness". Adding tests is part of implementation, not baseline.

## Task 1 Verification Fix (2026-04-25)

### Decision: types.ts Is Local Compile-Time Aid, Not Deployed Runtime
When: 2026-04-25

Problem: Deployed source has no types.ts, but 4 files import `./types.ts`.

Decision: Created local `supabase/functions/_shared/types.ts` to satisfy TypeScript.
This file is NOT deployed - it only helps IDEs and TypeScript compilation.
The actual runtime uses `import type` which is fully erased.

Rationale: This is standard practice for Deno/Edge function development.
The consuming files use `import type` which has no runtime footprint.

### Decision: SQL Verification Done (All Booleans True)
When: 2026-04-25

Problem: Evidence claimed SQL was "pending" when Atlas executed it successfully.

Decision: Updated evidence and problems.md to reflect SQL verification complete.
All 7 boolean checks returned TRUE.

### Decision: buildRatesRequestPayloads Returns Single Payload (Baseline Only)
When: 2026-04-25

Clarification: `buildRatesRequestPayloads` in baseline returns array with at most ONE payload.
Task 3 must split mixed courier filters into multiple payloads. This is the core
behavior change for the rates routing task, not a baseline defect.

## Format Check Decision (2026-04-25)

### Decision: Supabase Functions Ignored by Prettier, Not Reformatted
When: 2026-04-25

Problem: `npm run format:check` failed on 13 Supabase Edge Function files because
deployed source style differs from project Prettier configuration.

Decision: Added `supabase/functions` to `.prettierignore` instead of reformatting.

Rationale:
1. Task 1 requires byte-for-byte fidelity to deployed source
2. Reformatting would change baseline from "deployed source" to "reformatted source"
3. Prettier's purpose is consistent code style; ignoring external deployed code is standard practice
4. `import type` statements in these files are compile-time only anyway

### Verification Commands
- `npm run format:check` → All matched files use Prettier code style!
- `npm run lint` → passes
- Supabase function source remains unchanged

## Local File Count Clarification (2026-04-25)

### Previous: "21 files" was ambiguous
Deployed file-map entries = 21 (9 biteship + 12 order-manager)
Local unique files = 16 (3 entry points + 13 _shared helpers, 1 is local-only types.ts)

The 21 vs 16 discrepancy is because 6 files are shared between biteship and order-manager
(cors.ts, supabase.ts, order-status.ts, biteship.ts, biteship-order-helpers.ts, 
biteship-public-tracking.ts) and appear in both deployed function file maps.

## Task 2 Decisions (2026-04-25)

### Decision: Preserve Numeric Biteship Postal Payloads Behind Strict Parser
When: 2026-04-25

Decision: `parseBiteshipPostalCode` returns `number` to preserve current Biteship payload compatibility, but only after trimming strings, rejecting non-digits/decimals/empty values, requiring exactly five digits, rejecting non-finite/non-integer numbers, and rejecting `0` or values that would become fewer than five numeric digits.

Rationale: Existing order/rates payload contracts used numeric postal fields. Centralizing validation removes unsafe coercion without changing the external payload representation.

### Decision: Add Local Supabase Functions TS Config for Diagnostics Only
When: 2026-04-25

Decision: Added `supabase/functions/tsconfig.json` and `_shared/deno-imports.d.ts` as local diagnostic support for Deno-style imports.

Rationale: The root app `tsconfig.json` intentionally excludes `supabase/functions`; local config lets LSP diagnostics validate changed Edge Function files with `.ts`, `jsr:`, and `npm:` import specifiers without changing runtime behavior.

## Task 3 Decisions (2026-04-25)

### Decision: Split Rates by Courier Company Contract
When: 2026-04-25

Decision: `buildRatesRequestPayloads` now trims/lowercases requested couriers, deduplicates by company code, and emits separate standard and instant request entries.

Rationale: Mixed filters such as `jne,grab,gojek` require one area/postal standard request and one coordinate instant request. Sending the whole mixed filter through one origin mode either breaks standard contracts or sends area-id-only instant requests.

### Decision: Preserve Successful Pricing on Partial Biteship Failure
When: 2026-04-25

Decision: The rates action iterates every request entry, merges successful filtered `pricing` arrays, and returns group failure diagnostics as warnings only when at least one group succeeds. If every group fails, it returns an actionable error with the first upstream status when available.

Rationale: Checkout can still offer available courier prices when one contract group fails, while total failure remains visible and actionable.

## Task 4 Decisions (2026-04-25)

### Decision: Infer Settlement Order Mode from Stored Courier Identity
When: 2026-04-25

Decision: Added shared order-mode inference that treats instant-capable courier companies and `instant`/`same_day` service identifiers as instant-mode Biteship order contracts.

Rationale: Settlement side effects only have the stored shipment courier identity. Reusing the rates instant-capable company classifier keeps selected-rate identity interpretation consistent between checkout rates and post-settlement order creation.

### Decision: Persist Standard Origin Area ID During Shipment Upsert
When: 2026-04-25

Decision: `persistBiteshipShipment` accepts optional `originAreaId`, and settlement side effects pass the settings `origin_area_id` for standard shipments only.

Rationale: Standard shipments should retain the Supabase origin area used to create the Biteship order, while instant shipments should remain coordinate-mode and avoid area-id-only payload semantics.

## Task 1 Repo-Boundary Correction Decisions (2026-04-25)

### Decision: Admin-Panel Is Sole Supabase Source of Truth
When: 2026-04-25

Problem: Frontend had mistakenly generated `supabase/` tree that mixed with actual frontend Supabase client (`@/utils/supabase`).

Decision: Delete entire `/home/coder/dev/pharma/frontend/supabase/` and `/home/coder/dev/pharma/frontend/__tests__/supabase/`. All Supabase Edge Function source lives in `/home/coder/dev/pharma/admin-panel/supabase/`.

Rationale: Frontend is React Native/Expo app; backend Supabase Edge Functions belong in admin-panel repo. Clear repository boundary prevents confusion and ensures backend changes aren't accidentally lost in frontend branches.

### Decision: .prettierignore Entry Reverted
When: 2026-04-25

Problem: `supabase/functions` was added to `.prettierignore` to suppress formatting on the mistaken frontend tree.

Decision: Removed `supabase/functions` from `.prettierignore`.

Rationale: The wrong tree is deleted. The prettierignore entry no longer matches anything and was only there for the mistaken tree.

### Decision: tsconfig.json and eslint.config.js Left Unchanged
When: 2026-04-25

Problem: These files had `supabase/functions/**` patterns that would become dead code after deletion.

Decision: Left them as-is (conservative approach; patterns are harmless dead code).

Rationale: Task only explicitly mentioned `.prettierignore`. Dead patterns in tsconfig exclude and eslint ignores cause no broken imports.

(End of file - total additions above)

## Frontend Contract Hardening (2026-04-25T15:47:44Z)

### Decision: Widen Biteship Postal Contract at the Frontend Boundary
- `BiteshipArea.postal_code` is now nullable and accepts string or number forms.
- Rationale: the proxy-backed frontend boundary can surface mixed postal shapes, while downstream consumers already normalize through shared helpers.

### Decision: Keep Origin Ownership Backend-Only
- No frontend `EXPO_PUBLIC_ORIGIN_AREA_ID`, `originAreaId`, or origin settings path was added.
- Rationale: origin handling stays authoritative in backend Supabase settings; the frontend only forwards destination context and coordinates when available.

## Frontend Origin-Source Retry (2026-04-25T15:51:42Z)

### Decision: Remove Shipping-Origin Config From Frontend App Runtime
- `app.config.ts` and `utils/config.ts` no longer expose origin latitude/longitude.
- Rationale: the frontend should not own or advertise shipping-origin configuration when backend settings are the source of truth.

### Decision: Keep Destination Coordinates Only in Shipping Requests
- `getShippingRatesForAddress` now sends destination coordinates only.
- Rationale: instant courier eligibility depends on destination coordinates, while origin ownership belongs to the backend contract.


## Task 2 Admin-Panel Correction Decisions (2026-04-25 15:24:11)

### Decision: Preserve Numeric Biteship Postal Payloads

Decision: `parseBiteshipPostalCode` returns a number after strict validation.

Rationale: Existing admin-panel Biteship payload contracts use numeric `origin_postal_code` and `destination_postal_code`; preserving that representation avoids unrelated provider-contract changes while rejecting unsafe coercions.

### Decision: Validate Rates Proxy Postal Aliases Before Forwarding

Decision: The rates proxy parses either `destination_postal_code` or legacy `destination_postalcode`, writes the normalized value to `destination_postal_code`, and returns HTTP 400 on invalid supplied values.

Rationale: The proxy was the path where decimal strings such as `40181.0` could pass `Number(...)` + integer checks. Normalizing only after strict parsing prevents bad payloads from reaching Biteship.

## Task 3 Admin-Panel Correction Decisions (2026-04-25 15:30:36 UTC)

### Decision: Return Rates Requests with Skipped Diagnostics

Decision: `buildRatesRequestPayloads` returns request entries plus skipped diagnostics rather than only raw payload records.

Rationale: The rates action needs group/courier metadata to log, execute, merge, and report partial failures without leaking helper-only metadata into the Biteship request body.

### Decision: Standard and Instant Location Contracts Are Mutually Exclusive

Decision: Standard payloads remove coordinate fields and instant payloads remove area/postal fields.

Rationale: Biteship instant couriers require coordinate mode, while standard couriers should retain high-accuracy area/postal mode when available. Mixed filters therefore require separate requests instead of one compromise payload.

### Decision: Partial Upstream Failure Returns Successful Pricing with Warnings

Decision: The rates action now merges successful filtered pricing arrays and attaches failed/skipped group diagnostics as warnings when any group succeeds; if all groups fail, it returns an actionable error using the first upstream status when present.

Rationale: Checkout should still show available courier rates when one Biteship contract group fails, but total failures must remain visible and debuggable.

## Task 4 Admin-Panel Correction Decisions (2026-04-25 15:41 UTC)

### Decision: Extract Shared Courier Contract Classifier

Decision: Added `_shared/biteship-courier-contract.ts` and reused it from both rates and order payload helpers.

Rationale: The instant-capable company set (`gojek`, `grab`, `lalamove`, `paxel`, `borzo`, `rara`, `dash_express`) is a provider contract rule, not a rates-only rule. Sharing it keeps instant/standard inference consistent.

### Decision: Make Order Payload Location Modes Mutually Exclusive

Decision: Instant settlement orders send only `origin_coordinate` and `destination_coordinate`; standard orders send `origin_area_id`/`destination_area_id` or strict postal fallbacks only when area IDs are absent.

Rationale: Biteship instant orders require coordinate mode, while standard shipments preserve higher-accuracy area ID semantics and Task 2 strict postal validation.

### Decision: Persist Standard Origin Area Through Shipment Params

Decision: `persistBiteshipShipment` accepts optional `originAreaId`, and webhook side effects pass settings-derived origin area only for standard order contracts.

Rationale: Persistence should record the standard shipment origin area actually used for Biteship order creation without adding schema changes or leaking area-id semantics into instant shipments.


## Task 6 Deployment Decisions (2026-04-25T16:02:22Z)

### Decision: Deploy Scope Limited to Biteship and Processor

Decision: Treat `biteship` and `process-webhook-side-effects` as the affected deployment set for this task.

Rationale: `biteship` directly imports the changed Biteship helpers and rates logic. `process-webhook-side-effects` imports the changed webhook side-effect/order creation path. Other functions importing shared webhook utilities were not deployed to avoid unrelated rollout scope.

### Decision: Preserve `verify_jwt=false`

Decision: Planned CLI deploy commands included `--no-verify-jwt` for both affected functions.

Rationale: Supabase MCP reported `verify_jwt=false` for both current functions. The task explicitly required preserving the existing JWT settings.

### Decision: Do Not Run Live Mutation Validation

Decision: Do not invoke `process-webhook-side-effects` or live Biteship provider-backed paths during this blocked rollout.

Rationale: Processor invocation can mutate order fulfillment side effects and requires service-role authorization; Biteship provider calls require secrets/live API behavior. Focused helper tests validate the contract safely without creating orders or payments.
