---
active: true
iteration: 1
completion_promise: "VERIFIED"
initial_completion_promise: "DONE"
verification_attempt_id: "546507d3-4abd-4af4-afb9-e40526e88c55"
started_at: "2026-03-16T16:25:44.711Z"
session_id: "ses_30888460dffelCA7gJN1jHSUVz"
ultrawork: true
verification_pending: true
strategy: "continue"
message_count_at_start: 1
---
use /supabase-automation
use /typescript-expert
use /api-design-principles

You are Sisyphus. Orchestrate the full Biteship API integration for this React Native Expo + Supabase project.

OBJECTIVE: Integrate Biteship full flow (Pre-Purchase → Post-Purchase) using the existing Edge Function pattern.

PHASE 1 — Research (parallel):

task(
  subagent_type="document-specialist",
  prompt="""
  Research Biteship API documentation:
  1. POST /v1/orders — required fields, request/response shape, draft vs confirmed order
  2. GET /v1/trackings/{waybill_id} — response shape, history array structure
  3. GET /v1/couriers — list available couriers response shape
  4. POST /v1/rates/couriers — confirm origin_area_id, destination_area_id, items fields
  5. Authentication: Bearer token header format
  6. Error response format and common error codes
  Return: exact field names, types, and example payloads for each endpoint.
  """,
  category="ultrabrain"
)

task(
  subagent_type="explore",
  prompt="""
  Read and summarize these files:
  - supabase/functions/biteship/index.ts (existing action routing, auth pattern, timeout pattern)
  - supabase/functions/_shared/biteship.ts (createBiteshipOrder helper — has type errors, needs fixing)
  - supabase/functions/_shared/supabase.ts (getSupabaseAdminClient pattern)
  - supabase/functions/_shared/cors.ts (corsHeaders)
  - services/shipping.service.ts (supabase.functions.invoke pattern, response mapping)
  - services/checkout.service.ts (createCheckoutOrder, pollOrderPaymentStatus)
  - types/shipping.ts (existing types)
  Return: current action list in edge function, existing type definitions, any type errors found.
  """,
  category="quick"
)

PHASE 2 — Implementation (after Phase 1 completes):

task(
  subagent_type="executor-high",
  prompt="""
  Fix and extend Biteship integration based on research findings.

  FILES TO MODIFY:

  1. supabase/functions/_shared/biteship.ts
     - Fix type errors: add `/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />` at top
     - Create/fix types inline (no external ./types.ts import — use inline interfaces)
     - Fix implicit `any` on item parameter
     - Ensure Deno.env references are correct

  2. supabase/functions/biteship/index.ts
     - Add `action: 'draft_order'` → POST /v1/orders with draft payload
     - Add `action: 'create_order'` → POST /v1/orders (confirmed), verify order ownership via orders table, write back biteship_order_id + waybill_id using getSupabaseAdminClient()
     - Add `action: 'couriers'` → GET /v1/couriers
     - Keep all existing actions (rates, maps, track, orders) intact
     - Reuse existing JWT auth pattern, corsHeaders, 10s timeout

  3. types/shipping.ts
     - Add: BiteshipOrderPayload, BiteshipOrderResult, TrackingEvent, TrackingResult

  4. services/shipping.service.ts
     - Add: createBiteshipDraftOrder(orderId, params) → calls action: 'draft_order'
     - Add: createBiteshipOrder(orderId, params) → calls action: 'create_order', returns { biteship_order_id, waybill_id }
     - Add: trackShipment(waybillId) → calls action: 'track', returns TrackingResult

  5. services/checkout.service.ts
     - After successful order creation (createCheckoutOrder), expose a new function: confirmBiteshipShipment(orderId) that calls createBiteshipOrder and saves result to orders table

  MUST DO:
  - Run lsp_diagnostics on every modified file
  - Run npm run lint after all changes
  - Follow existing invoke pattern: supabase.functions.invoke('biteship', { body: { action, payload } })
  - Use getSupabaseAdminClient() for DB writes in edge function
  - Never hardcode BITESHIP_API_KEY

  MUST NOT DO:
  - Do not break existing rates/maps/track/orders actions
  - Do not import from ./types.ts in edge functions (use inline types or jsr: imports)
  - Do not add StyleSheet or non-Tamagui code
  """,
  category="deep",
  load_skills=["git-master"]
)

COMPLETION CRITERIA:
- lsp_diagnostics clean on all 5 modified files
- npm run lint passes
- All existing actions in biteship edge function still work
- New actions: draft_order, create_order, couriers are implemented
- New service functions exported from shipping.service.ts
- Types added to types/shipping.ts

ultrawork
