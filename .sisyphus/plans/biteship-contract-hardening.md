# Biteship Contract Hardening

## TL;DR
> **Summary**: Harden Biteship postal-code parsing and origin-mode routing so standard couriers keep the Supabase `origin_area_id` high-accuracy path while Grab/Gojek/Lalamove instant couriers use the coordinate contract required by Biteship.
> **Deliverables**:
> - Strict Biteship postal-code parser at backend payload boundaries; no raw `Number(postal_code)` coercion remains.
> - Supabase Biteship rates routing split for standard-only, instant-only, and mixed courier filters.
> - Biteship order creation payloads use coordinate mode for instant courier services and area/postal mode for standard courier services.
> - Frontend type/test alignment for `BiteshipArea.postal_code` and proof that origin remains backend-owned.
> - Cleanup of any mistakenly generated frontend-local `/supabase` tree; backend source must be edited in `/home/coder/dev/pharma/admin-panel/supabase`.
> - Supabase + Jest evidence under `.sisyphus/evidence/`.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 + Task 3 → Task 4 → Final Verification

## Context

### Original Request
- User asked: "perbaiki issue ke 2 issue tersebut untuk origin area id coba lihat dokumentasi untuk grab dan gojek saya menggunakan origin area di backend supabase gunakan skill /supabase untuk melihat".

### Interview Summary
- User wants both previously identified Biteship risks fixed:
  1. Postal-code type/coercion discipline.
  2. `origin_area_id` / Grab-Gojek instant-courier compatibility.
- User clarified the origin area is configured in Supabase backend, so frontend must not become the origin source of truth.
- User corrected the repository boundary: Supabase functions are owned by `/home/coder/dev/pharma/admin-panel/supabase`, not `/home/coder/dev/pharma/frontend/supabase`.

### Research Summary
- Biteship docs: instant couriers (`gojek`, `grab`, `paxel`, `lalamove`, `borzo`) require coordinates for rates/orders; Rates by Area ID is high accuracy but cannot show instant delivery services.
- Supabase `public.settings` has `origin_area_id`, `origin_postal_code`, `origin_latitude`, `origin_longitude`, and `enabled_couriers`; current row has all origin fields populated and enabled couriers include `gojek`, `grab`, `lalamove`.
- Supabase `public.shipments` stores `origin_area_id`, `destination_area_id`, and `destination_postal_code`.
- Deployed `biteship` Edge Function strips client origin fields and owns origin selection from store settings.
- Local source exploration confirmed `/home/coder/dev/pharma/admin-panel/supabase/functions/` exists with `biteship`, `order-manager`, `process-webhook-side-effects`, `_shared/biteship.ts`, `_shared/biteship-rates.ts`, `_shared/biteship-order-helpers.ts`, `_shared/webhook-side-effects.ts`, and `_shared/__tests__/biteship-*.test.ts`.
- Deployed shared helper `getStandardOriginFields` prefers `origin_area_id`, then origin coordinates, then origin postal code.
- Deployed helper `shouldUseCoordinateOriginForRates` switches to coordinate origin only when store coordinates exist, selected couriers include instant-capable companies, and destination coordinates exist.
- Risk found: current single rates payload can force standard couriers in a mixed filter to use coordinate mode instead of `origin_area_id` high-accuracy mode.
- Risk found: backend order helpers use raw `Number(order.destination_postal_code)` and origin postal coercion; invalid/null postal codes can become `0`/`NaN` payloads.

### Metis Review (gaps addressed)
- Treat this as contract routing, not only postal parsing.
- Split mixed-courier rates into instant-coordinate and standard-area/postal payloads.
- Define partial failure behavior for split Biteship requests.
- Keep Supabase backend settings as the only origin source of truth.
- Add executable coverage for standard-only, instant-only, mixed couriers, missing destination coordinates, invalid postal inputs, and order creation modes.

### Oracle Review (gaps addressed)
- Preserve enough contract-mode determinism so order creation rebuilds the correct payload for the selected courier.
- Do not dedupe merged rates too aggressively; use stable courier/service identity.
- Fail fast for instant order creation when required coordinates are missing.
- Postal parser must reject `null`, empty, decimal, `NaN`, non-numeric, non-five-digit values before Biteship calls.

## Work Objectives

### Core Objective
Make Biteship rates and order payload construction deterministic, contract-compatible, and safe for Indonesian five-digit postal codes and mixed standard/instant courier selections.

### Deliverables
- Admin-panel Supabase `biteship` Edge Function source updated with strict postal parsing and split rates routing under `/home/coder/dev/pharma/admin-panel/supabase/functions/`.
- Biteship order side-effect helpers updated to use instant-coordinate or standard-area/postal fields according to selected courier/service.
- Frontend shipping types/tests updated only where needed to align with backend contract and postal-code normalization.
- Any mistakenly created `/home/coder/dev/pharma/frontend/supabase` tree removed from the frontend repo; frontend keeps only app-facing type/test changes.
- Evidence files:
  - `.sisyphus/evidence/biteship-contract-hardening-supabase.txt`
  - `.sisyphus/evidence/biteship-contract-hardening-tests.txt`
  - `.sisyphus/evidence/biteship-contract-hardening-qa.txt`

### Definition of Done (verifiable conditions with commands/tools)
- Supabase settings verification query shows `origin_area_id`, `origin_postal_code`, `origin_latitude`, `origin_longitude`, and enabled instant couriers are present.
- Backend source changes are in `/home/coder/dev/pharma/admin-panel/supabase/functions/`, not `/home/coder/dev/pharma/frontend/supabase/functions/`.
- `git status` in `/home/coder/dev/pharma/frontend` shows no generated `supabase/` directory after cleanup.
- No backend Biteship payload builder uses raw `Number(...postal...)` without strict parser validation.
- Standard-only rates request uses `origin_area_id` when Supabase settings has one.
- Instant-only rates request uses origin and destination coordinates and excludes area-id-only instant payloads.
- Mixed courier rates request creates separate standard and instant Biteship requests, merges pricing, and preserves standard area-id accuracy.
- Instant order creation uses `origin_coordinate` and `destination_coordinate`; standard order creation uses `origin_area_id`/`destination_area_id` or validated postal fallback.
- `npm run test -- --runInBand __tests__/services/shipping.service.test.ts __tests__/services/checkout.service.test.ts` exits `0`.
- `npm run lint` and `npm run format:check` exit `0`.
- Supabase Edge Function deployment preserves existing JWT settings unless explicitly changed by the task; `biteship` currently has `verify_jwt=false` and must remain unchanged unless the deployed function already differs.

### Must Have
- Backend Supabase settings remain the only origin source of truth.
- Do not add `EXPO_PUBLIC_ORIGIN_AREA_ID` or make frontend config the origin source.
- Instant-capable companies set must include at least `gojek`, `grab`, `lalamove`, `paxel`, `borzo`; preserve existing deployed entries `rara`, `dash_express` if present.
- Destination coordinates are required for instant courier rates/orders; if missing, instant couriers are excluded/reported unavailable while standard couriers still run when valid.
- Postal parser validates exactly five digits after trimming; invalid values throw actionable errors and never produce `0`, `NaN`, or malformed Biteship payload fields.
- `origin_area_id` is preferred for standard rates/orders when present in Supabase settings.

### Must NOT Have
- Do not refactor unrelated checkout, payment, address, order lifecycle, Midtrans, notification, or cart behavior.
- Do not hand-edit `types/supabase.ts`; regenerate only if schema changes are actually made. This plan should not require schema changes.
- Do not create a new frontend origin env/config path.
- Do not create, keep, deploy, test, or commit a frontend-local `/home/coder/dev/pharma/frontend/supabase` function tree; it is the wrong repository boundary.
- Do not send client-provided origin fields through to Biteship; the backend already strips and owns origin fields.
- Do not silently swallow all Biteship failures in split rates; partial failures must be represented in logs/evidence and not hide total failure.
- Do not mark this complete with only local Jest if the Supabase function change is not deployed or at least staged with a documented blocker.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after contract hardening with focused frontend Jest and Supabase Edge Function tests/log verification.
- QA policy: Every implementation task has happy + failure/edge scenarios.
- Evidence:
  - `.sisyphus/evidence/biteship-contract-hardening-supabase.txt`
  - `.sisyphus/evidence/biteship-contract-hardening-tests.txt`
  - `.sisyphus/evidence/biteship-contract-hardening-qa.txt`
- Supabase source directory: `/home/coder/dev/pharma/admin-panel/supabase/functions/`.
- Supabase helper tests directory: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/__tests__/`.
- Supabase verification tools: `supabase_list_tables`, `supabase_execute_sql`, `supabase_get_edge_function`, `supabase_deploy_edge_function`, and logs/advisors if deployment occurs.
- Biteship docs sources:
  - `https://biteship.com/id/docs/api/rates/retrieve`
  - `https://biteship.com/id/docs/api/orders/create`
  - `https://biteship.com/id/docs/api/couriers/overview`

## Execution Strategy

### Parallel Execution Waves
Wave 1: Task 1 source baseline/harness in admin-panel + cleanup of wrong frontend `/supabase`; Task 5 frontend type/test alignment can inspect in parallel after Task 1 identifies backend contracts.
Wave 2: Task 2 postal parser hardening; Task 3 rates routing split.
Wave 3: Task 4 order creation payload hardening; Task 6 deployment/verification.
Wave 4: Final verification wave F1-F4.

### Dependency Matrix
| Task | Depends On | Blocks |
| --- | --- | --- |
| 1. Materialize Supabase function source baseline | None | 2, 3, 4, 6 |
| 2. Strict backend postal-code parser | 1 | 4, 6 |
| 3. Split rates payloads by courier contract | 1 | 4, 6 |
| 4. Harden order creation payload mode | 2, 3 | 6 |
| 5. Align frontend types and service tests | 1 | 6 |
| 6. Deploy/verify Biteship contract hardening | 2, 3, 4, 5 | Final verification |

### Agent Dispatch Summary
- Wave 1 → 2 tasks → `deep`, `quick`
- Wave 2 → 2 tasks → `deep`, `deep`
- Wave 3 → 2 tasks → `deep`, `unspecified-high`
- Final → 4 review tasks → `oracle`, `unspecified-high`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Materialize Supabase Biteship function source baseline and test harness in admin-panel, then clean frontend misplacement

  **What to do**: Use `/home/coder/dev/pharma/admin-panel/supabase/functions/` as the only editable Supabase Edge Function source tree. Verify existing admin-panel files for `biteship`, `_shared/biteship-rates.ts`, `_shared/biteship.ts`, `_shared/biteship-order-helpers.ts`, `_shared/webhook-side-effects.ts`, `order-manager`, and `process-webhook-side-effects`. Compare against deployed source only when needed, preserving deployed configuration, especially `verify_jwt=false` for `biteship` unless Supabase reports otherwise. Identify the existing helper-test harness under `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/__tests__/`. Remove or explicitly revert any mistakenly generated `/home/coder/dev/pharma/frontend/supabase` tree before continuing backend implementation.

  **Must NOT do**: Do not deploy changes in this task. Do not invent source from memory; use admin-panel Supabase source and deployed source as baseline. Do not alter schema, secrets, RLS, or frontend app code. Do not keep a frontend-local `supabase/` copy.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: deployed Supabase function source must be reconstructed accurately before edits.
  - Skills: `supabase`, `typescript-expert`, `systematic-debugging` - Needed for Supabase edge source retrieval and safe baseline verification.
  - Omitted: `frontend-design` - No UI changes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 3, 4, 6 | Blocked By: none

  **References**:
  - Supabase active functions: `biteship` slug version 61; `order-manager` slug version 39; `create-checkout-order` slug version 2.
  - Supabase schema: `public.settings.origin_area_id`, `origin_postal_code`, `origin_latitude`, `origin_longitude`, `enabled_couriers`.
  - Supabase schema: `public.shipments.origin_area_id`, `destination_area_id`, `destination_postal_code`.
  - Admin-panel source: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/biteship-rates.ts` contains Biteship rates helpers and existing tests under `_shared/__tests__/biteship-rates.test.ts`.
  - Admin-panel source: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/biteship.ts` contains store settings and Biteship order creation helpers.
  - Admin-panel source: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/biteship-order-helpers.ts` contains Biteship order destination helpers and existing tests under `_shared/__tests__/biteship-order.test.ts`.
  - Admin-panel source: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/webhook-side-effects.ts` handles post-settlement side effects.

  **Acceptance Criteria**:
  - [ ] Local editable Supabase function files exist in `/home/coder/dev/pharma/admin-panel/supabase/functions/` or a blocker is recorded explaining why that source could not be used.
  - [ ] `/home/coder/dev/pharma/frontend/supabase` does not remain as an untracked/generated function source tree.
  - [ ] Baseline source diff matches deployed source before modifications.
  - [ ] Current Supabase settings row verification is saved with booleans only, not secret values.
  - [ ] Test harness command is documented and runnable by later tasks.

  **QA Scenarios**:
  ```
  Scenario: Deployed source is reproducible locally
    Tool: Supabase MCP + Bash
    Steps: Retrieve `biteship` and related shared files, write local baseline, compare checksums or normalized snippets for key helpers.
    Expected: Local baseline includes all referenced helpers and preserves deployed function settings.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-supabase.txt

  Scenario: Missing source retrieval is blocked explicitly
    Tool: Supabase MCP
    Steps: If retrieval fails, capture exact Supabase tool error and list unavailable files.
    Expected: Blocker recorded; subsequent tasks do not fabricate backend code.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-supabase.txt
  ```

  **Commit**: NO | Message: n/a | Files: Supabase function baseline files and evidence only; commit after implementation tasks.

- [x] 2. Replace unsafe backend postal-code coercion with strict parser

  **What to do**: In `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/` Biteship helpers, add or update a single strict postal-code parser that accepts `string | number | null | undefined`, trims, rejects decimals, rejects non-digits, requires exactly five digits, preserves leading-zero validation before final Biteship payload conversion, and returns the Biteship-required representation only after validation. Replace all raw `Number(...postal...)` usages in Biteship payload construction, including `buildBiteshipOrderDestinationFields` and `withServerShipperAndOriginFields`. Errors must name the offending field (`origin_postal_code`, `destination_postal_code`) and never produce `0`, `NaN`, or `undefined` in Biteship payloads.

  **Must NOT do**: Do not change database column types. Do not hand-edit generated `types/supabase.ts`. Do not weaken validation to accept four/six digits or alphanumeric postal codes.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: backend contract safety and order side-effects depend on exact coercion behavior.
  - Skills: `supabase`, `typescript-expert`, `systematic-debugging`, `testing-strategy` - Needed for strict helper typing and edge-case tests.
  - Omitted: `tamagui-best-practices` - No UI styling.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4, 6 | Blocked By: 1

  **References**:
  - Current frontend parser: `utils/postalCode.ts:14-22` - `parsePostalCode` validates five digits and returns `number | null`.
  - Deployed backend risk: `_shared/biteship-order-helpers.ts` uses `Number(order.destination_postal_code)`.
  - Deployed backend risk: `_shared/biteship.ts` `withServerShipperAndOriginFields` uses `Number(getRequiredStoreOriginPostalCode(settings))`.
  - Supabase schema: `public.settings.origin_postal_code` is text with five-digit check.
  - Supabase schema: `public.shipments.destination_postal_code` is integer nullable.

  **Acceptance Criteria**:
  - [ ] No raw `Number(...postal...)` remains in Biteship payload builders.
  - [ ] Invalid inputs `null`, `undefined`, `''`, `'1234'`, `'123456'`, `'12A45'`, `'40181.0'`, `NaN`, `0` are rejected before payload construction.
  - [ ] Valid inputs `'12345'`, `' 12345 '`, and `12345` produce the exact payload representation expected by existing Biteship calls.
  - [ ] Error messages identify the field name and are recorded in tests.

  **QA Scenarios**:
  ```
  Scenario: Valid postal code is converted only after validation
    Tool: Deno test / Bash
    Steps: Run shared helper tests for string and numeric valid five-digit postal codes.
    Expected: Payload contains valid Biteship postal value and no parser error.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt

  Scenario: Invalid postal code never becomes 0 or NaN
    Tool: Deno test / Bash
    Steps: Test `null`, `undefined`, empty, decimal, alphanumeric, four-digit, six-digit values in origin and destination payload helpers.
    Expected: Each invalid input throws/returns a structured error before Biteship invocation; payload never includes `0` or `NaN`.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt
  ```

  **Commit**: YES | Message: `fix(biteship): validate postal codes before payload coercion` | Files: Supabase shared Biteship helpers, helper tests, evidence

- [x] 3. Split Biteship rates payloads by instant vs standard courier contract

  **What to do**: In `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/biteship-rates.ts`, update `buildRatesRequestPayloads` so courier filters are partitioned into instant-capable and non-instant groups. For instant group (`gojek`, `grab`, `lalamove`, `paxel`, `borzo`, plus existing deployed `rara`, `dash_express`), build a coordinate payload only when store origin coordinates and destination coordinates are present. For standard group, build a standard payload that prefers `origin_area_id` and `destination_area_id`, with validated postal fallback. For mixed courier filters, return two payloads. Update `/home/coder/dev/pharma/admin-panel/supabase/functions/biteship/index.ts` rates action if needed to execute all returned payloads, merge pricing arrays, preserve courier/service identity, and represent partial failure behavior: if at least one group succeeds, return its pricing and include dev/log diagnostics for failed group; if all groups fail, return the error.

  **Must NOT do**: Do not send area-id-only payloads for instant couriers. Do not force standard couriers into coordinate mode when `origin_area_id`/`destination_area_id` exists. Do not dedupe only by price or service name; use courier company/code + service type/code + shipping type as stable identity.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: contract routing changes affect rate availability and shipping price correctness.
  - Skills: `supabase`, `api-design-principles`, `typescript-expert`, `testing-strategy` - Needed for API contract routing and merge semantics.
  - Omitted: `frontend-design` - No UI changes.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4, 6 | Blocked By: 1

  **References**:
  - Biteship docs: `https://biteship.com/id/docs/api/rates/retrieve` - instant couriers require coordinates; Area ID mode cannot show instant delivery services.
  - Deployed backend: `_shared/biteship-rates.ts` has `INSTANT_CAPABLE_COMPANIES`, `shouldUseCoordinateOriginForRates`, `getStandardOriginFields`, `buildRatesRequestPayloads`.
  - Frontend rates input: `services/shipping.service.ts:413-427` sends `destination_area_id` plus destination coordinates when address has lat/lng; backend strips client origin fields.
  - Current Supabase settings: origin area ID and origin coordinates are present; enabled couriers include standard + instant.

  **Acceptance Criteria**:
  - [ ] Standard-only couriers create one payload with `origin_area_id` when settings has it.
  - [ ] Instant-only couriers create one payload with `origin_latitude`, `origin_longitude`, `destination_latitude`, `destination_longitude` and no area-id-only instant request.
  - [ ] Mixed couriers create two payloads: standard area/postal payload and instant coordinate payload.
  - [ ] Missing destination coordinates excludes/reports instant group while still attempting standard group when valid.
  - [ ] Partial failure tests prove successful group rates are returned; total failure returns an actionable error.

  **QA Scenarios**:
  ```
  Scenario: Mixed couriers preserve both contracts
    Tool: Deno test / Bash
    Steps: Build rates payloads for `jne,grab,gojek` with origin area ID, destination area ID, and destination coordinates.
    Expected: Two payloads; standard payload uses `origin_area_id`/`destination_area_id`; instant payload uses origin/destination coordinates.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt

  Scenario: Missing destination coordinates does not break standard rates
    Tool: Deno test / Bash
    Steps: Build rates payloads for `jne,grab` with area IDs but no destination coords.
    Expected: Standard `jne` payload exists; instant `grab` is excluded or marked unavailable with diagnostics; no invalid coordinate payload is sent.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt
  ```

  **Commit**: YES | Message: `fix(biteship): split rates by courier contract` | Files: Supabase Biteship rates helpers, edge function rates action, tests, evidence

- [x] 4. Harden Biteship order creation payload mode for instant vs standard shipments

  **What to do**: Update backend Biteship order creation helpers in `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/` used by settlement side effects so selected instant courier services (`courier_company` instant-capable or `courier_service`/`courier_type` instant/same-day where applicable) require origin and destination coordinates and send `origin_coordinate` + `destination_coordinate`. For non-instant/standard shipments, prefer Supabase `origin_area_id` and order `destination_area_id`; use strictly validated postal fallback only if an area ID is absent. Persist `origin_area_id` to `shipments.origin_area_id` for standard shipments when settings has it. Ensure selected rate identity contains enough courier/service data to infer contract mode at settlement time; if not, derive from stored shipment `courier_code` and `courier_service` consistently.

  **Must NOT do**: Do not re-enable direct `create_order` action; deployed `biteship` function intentionally returns 403 for direct create order. Do not create Biteship orders before payment settlement. Do not alter Midtrans payment status behavior.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: settlement side-effects and Biteship order creation are production-critical.
  - Skills: `supabase`, `checkout-payments`, `api-design-principles`, `systematic-debugging`, `testing-strategy` - Needed for payment/shipping boundary safety.
  - Omitted: `frontend-design` - No UI changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 6 | Blocked By: 2, 3

  **References**:
  - Biteship docs: `https://biteship.com/id/docs/api/orders/create` - instant courier orders require origin/destination coordinates.
  - Admin-panel backend: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/biteship-order-helpers.ts` has Biteship order destination helpers and existing order tests.
  - Admin-panel backend: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/webhook-side-effects.ts` creates Biteship orders after Midtrans settlement.
  - Admin-panel backend: `/home/coder/dev/pharma/admin-panel/supabase/functions/biteship/index.ts` disables direct `create_order` action.
  - Supabase schema: `public.shipments.origin_area_id`, `destination_area_id`, `destination_postal_code`, `courier_code`, `courier_service`.

  **Acceptance Criteria**:
  - [ ] Instant order payload contains `origin_coordinate` and `destination_coordinate`; missing coords fail fast with actionable error.
  - [ ] Standard order payload uses `origin_area_id` when settings has it and `destination_area_id` when order has it.
  - [ ] Postal fallback for order creation uses the strict parser from Task 2.
  - [ ] Direct `create_order` action remains disabled.
  - [ ] Shipment rows retain `origin_area_id` for standard shipments when settings has it.

  **QA Scenarios**:
  ```
  Scenario: Grab/Gojek order creation uses coordinates
    Tool: Deno test / Bash
    Steps: Build an order payload for `courier_company: grab`, `courier_type/service: instant`, with store and destination coordinates.
    Expected: Payload has `origin_coordinate` and `destination_coordinate`; no area-id-only instant order payload is generated.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt

  Scenario: Standard courier order uses origin_area_id
    Tool: Deno test / Bash
    Steps: Build an order payload for `jne` with store `origin_area_id` and destination area ID.
    Expected: Payload uses `origin_area_id` + `destination_area_id`; postal fallback is not used.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt
  ```

  **Commit**: YES | Message: `fix(biteship): route order payloads by courier contract` | Files: Admin-panel Supabase Biteship order helpers, webhook side-effect tests, evidence

- [x] 5. Align frontend Biteship postal types and service tests without adding origin source

  **What to do**: Update frontend types/tests only as needed to reflect robust Biteship postal code inputs. Either keep `BiteshipArea.postal_code?: number` if docs and service tests prove proxy returns numbers, or widen to `postal_code?: string | number | null` if Supabase proxy/tests demonstrate nullable/string values. In either case, ensure all `BiteshipArea.postal_code` consumers use `normalizePostalCode` / `toPostalCodeString` and no direct comparisons are introduced. Update `__tests__/services/shipping.service.test.ts` to assert frontend sends destination coordinates for instant eligibility but does not add `origin_area_id` as a frontend env/config source. If backend strips origin fields, update tests to document that backend origin settings are authoritative.

  **Must NOT do**: Do not add `EXPO_PUBLIC_ORIGIN_AREA_ID`. Do not add `originAreaId` to `app.config.ts`/`utils/config.ts` as primary source. Do not hand-edit generated `types/supabase.ts`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: constrained frontend type/test alignment after backend contract decisions.
  - Skills: `typescript-expert`, `testing-strategy`, `native-data-fetching` - Needed for service-boundary tests and type safety.
  - Omitted: `supabase-postgres-best-practices` - No schema/index work.

  **Parallelization**: Can Parallel: YES | Wave 1/3 | Blocks: 6 | Blocked By: 1 for final backend contract details

  **References**:
  - `types/shipping.ts:3-15` - `BiteshipArea.postal_code` currently `number | undefined`.
  - `utils/postalCode.ts:1-22` - canonical frontend normalization/parser helpers.
  - `scenes/profile/useAreaPickerFlow.ts:163-167` - compares normalized Biteship area postal code with selected postal code.
  - `scenes/profile/areaPickerHelpers.ts:77-99` - builds pending selection and converts Biteship postal to string.
  - `utils/areaPickerSession.ts:23-46` - consumes pending selection and converts `area.postal_code` to string.
  - `services/shipping.service.ts:409-427` - forwards destination coords for instant courier eligibility.
  - `__tests__/services/shipping.service.test.ts` - existing tests for rates payloads, destination area ID, postal fallback, and instant courier coords.

  **Acceptance Criteria**:
  - [ ] Frontend `BiteshipArea.postal_code` type matches observed/API-backed proxy response policy.
  - [ ] Tests cover `BiteshipArea.postal_code` as number and, if widened, string/null.
  - [ ] No direct postal-code equality checks bypass normalization.
  - [ ] No frontend origin area env/config path is added.
  - [ ] Focused service tests pass.

  **QA Scenarios**:
  ```
  Scenario: Biteship area postal code normalization is type-safe
    Tool: Bash
    Steps: Run AreaPicker/helper/service tests with Biteship area postal code fixtures covering number and configured nullable/string cases.
    Expected: Pending selection stores a string postal code; invalid or missing postal codes do not create false matches.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt

  Scenario: Frontend does not own origin_area_id
    Tool: Grep + Bash
    Steps: Search for `EXPO_PUBLIC_ORIGIN_AREA_ID`, `originAreaId`, and frontend `origin_area_id` config additions; run shipping service tests.
    Expected: No frontend origin source exists; destination coordinate forwarding remains covered.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-tests.txt
  ```

  **Commit**: YES | Message: `test(biteship): align postal types and origin ownership` | Files: `types/shipping.ts`, `utils/postalCode.ts` if needed, tests, evidence

- [x] 6. Deploy and verify Supabase Biteship contract hardening

  **What to do**: Deploy the updated `biteship` Edge Function and any shared dependencies from `/home/coder/dev/pharma/admin-panel/supabase` using Supabase tooling while preserving existing function settings. Run Supabase SQL verification for settings origin fields and courier configuration. Run focused tests and inspect function logs after a safe validation invocation if available. If deployment is blocked by missing secrets, auth, or environment restrictions, document the blocker in `.sisyphus/notepads/biteship-contract-hardening/problems.md` and keep local changes/test evidence complete.

  **Must NOT do**: Do not deploy unrelated functions. Do not rotate secrets. Do not change RLS or table schemas. Do not expose service-role keys or Biteship API keys in logs/evidence.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: deployment verification crosses repo and Supabase project state.
  - Skills: `supabase`, `lint-and-validate`, `systematic-debugging`, `testing-strategy` - Needed for safe deploy and validation evidence.
  - Omitted: `frontend-design` - No UI changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final verification | Blocked By: 2, 3, 4, 5

  **References**:
  - Supabase function list: active `biteship` slug currently `verify_jwt=false`.
  - Supabase settings verification query used during planning: `select origin_area_id is not null ..., enabled_couriers from public.settings where id = 1;` returned all origin booleans true and couriers include `gojek,grab,lalamove`.
  - `README.md` / `AGENTS.md` commands: `npm run lint`, `npm run format:check`, `npm run test`.

  **Acceptance Criteria**:
  - [ ] `biteship` Edge Function deployment succeeds or blocker is documented with exact error.
  - [ ] Supabase settings verification confirms required origin fields are present without logging secret values.
  - [ ] Focused admin-panel Supabase helper tests and frontend shipping service tests pass.
  - [ ] `npm run lint` and `npm run format:check` pass.
  - [ ] Frontend repo has no generated `supabase/` source tree left from the mistaken earlier attempt.
  - [ ] Evidence files record commands, exit status, and Supabase validation results.

  **QA Scenarios**:
  ```
  Scenario: Supabase origin settings support both standard and instant contracts
    Tool: Supabase MCP
    Steps: Execute a SQL verification returning booleans for origin_area_id, origin_postal_code, origin_latitude, origin_longitude, and instant-courier presence.
    Expected: All required booleans for current deployment are true; no secret values are printed.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-supabase.txt

  Scenario: Deployed Biteship function preserves contract routing
    Tool: Supabase MCP + logs/tests
    Steps: Deploy function, run safe helper tests or validation invocation, inspect logs for routing errors.
    Expected: No deployment/runtime errors; standard uses area mode, instant uses coordinate mode in tested helper paths.
    Evidence: .sisyphus/evidence/biteship-contract-hardening-qa.txt
  ```

  **Commit**: YES | Message: `fix(biteship): harden courier contract routing` | Files: Supabase functions, frontend type/test updates, evidence

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Biteship Contract Compliance Audit — oracle
  - Verify standard couriers use `origin_area_id` high-accuracy mode and instant couriers use coordinate mode per Biteship docs.
  - Verify postal-code parser rejects invalid inputs and no raw unsafe postal coercion remains.
- [x] F2. Supabase Security/Deployment Review — unspecified-high
  - Confirm no secrets leaked, no RLS/schema drift, function settings preserved, and deployment/evidence are safe.
- [x] F3. QA Execution Review — unspecified-high
  - Rerun focused helper/service tests, lint, format check, and any Supabase verification commands; save consolidated logs.
- [x] F4. Scope Fidelity Check — deep
  - Confirm no unrelated checkout/payment/order/address refactor or frontend origin-source creep occurred.

## Commit Strategy
- Commit after Tasks 1-5 pass locally in the correct repositories; deploy verification can be included in the same commit if source changes are complete.
- Suggested final message: `fix(biteship): harden postal and courier contract routing`.
- Do not push unless explicitly requested by the user.

## Success Criteria
- Both requested issues are fixed: postal-code coercion is safe, and origin-area/instant-courier routing matches Biteship docs and Supabase backend ownership.
- Supabase backend remains the origin source of truth.
- Standard couriers keep high-accuracy area-id rates.
- Grab/Gojek/Lalamove instant couriers use coordinate-compatible rates/orders.
- All required tests and validation commands pass or deployment blocker is explicitly documented.
