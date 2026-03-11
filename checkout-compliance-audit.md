# Checkout Compliance Audit (Midtrans + Biteship)

Date: 2026-03-10
Scope: Frontend checkout flow, local Supabase artifacts, and previously inspected live Supabase deployment metadata.
Baseline docs: `payment-integration.md`, `shipping-integration.md`

## Executive Summary

- Compliance is partial: shipping quote retrieval exists, but checkout payment orchestration is incomplete in app flow.
- Payment and shipping guidelines require a server-driven order lifecycle (`create-snap-token` and webhook-led transitions) that is not fully represented in current mobile flow.
- Local repository is not a full source of truth for backend: Edge Function source and full SQL/RLS definitions are missing locally.
- Type drift exists between local generated types and live database schema, increasing integration risk.

## Requirement Matrix

### 1) Payment flow (`payment-integration.md`)

1. `create-snap-token` invoked from mobile with JWT
   - Requirement: Mobile calls `create-snap-token` with authenticated user.
   - Observed: `scenes/cart/Cart.tsx` currently calculates shipping and navigates to orders tab; no `create-snap-token` invocation.
   - Status: FAIL

2. Order ownership and state validation before token generation
   - Requirement: Server validates `user_id`, `status='pending'`, `payment_status='unpaid'`.
   - Observed: No local order-creation + payment initiation orchestration in current checkout screen.
   - Status: FAIL (frontend orchestration missing)

3. Webhook security (`midtrans-webhook`)
   - Requirement: `verify_jwt=false`, SHA-512 signature verification, Midtrans status API double-check, idempotency.
   - Observed: Previously inspected deployment metadata has `midtrans-webhook verify_jwt=false` (correct). Local repo does not contain edge source for code-level verification.
   - Status: PARTIAL (deployment flag aligns, code-level verification cannot be proven from local repo)

4. Stock reduction + auto shipping order after successful payment
   - Requirement: Atomic stock reduction and automatic Biteship order creation after payment settlement.
   - Observed: Local frontend has no orchestration visibility; local SQL does not include these RPC/functions; edge source absent.
   - Status: PARTIAL/UNVERIFIED (cannot verify implementation without edge source)

### 2) Shipping flow (`shipping-integration.md`)

1. `biteship` edge proxy secured with JWT
   - Requirement: `verify_jwt=true` in Supabase function config.
   - Observed: Previously inspected deployment metadata showed `biteship verify_jwt=false`.
   - Status: FAIL (security gap)

2. Maps/rates flow from mobile
   - Requirement: Mobile uses proxy action `maps` and `rates` and captures selected courier data.
   - Observed: `services/shipping.service.ts` implements `maps` and `rates`; `scenes/cart/Cart.tsx` fetches and selects shipping options.
   - Status: PASS (for quote selection)

3. Persist shipping selections to order before payment
   - Requirement: Save `origin_area_id`, `destination_area_id`, `courier_code`, `courier_service`, `shipping_cost`, `shipping_etd`.
   - Observed: Cart screen does not update/create order with selected shipping data.
   - Status: FAIL

4. Tracking support
   - Requirement: Tracking via `track` endpoint.
   - Observed: Shipping service currently focuses on maps/rates only.
   - Status: PARTIAL

## Confirmed Architectural Gaps

1. Checkout stops before payment token creation.
2. Shipping selection is not persisted to order record in current UI flow.
3. Security mismatch on deployed `biteship` function (`verify_jwt=false` vs expected true).
4. Local backend artifacts are incomplete (missing Edge Function source and comprehensive SQL/RLS files).
5. Local generated type definitions are stale relative to live schema (orders/addresses field drift).

## Exact Remediation Plan

### A. Security hardening (highest priority)

1. Update Supabase function config for `biteship`:
   - Set `verify_jwt=true`.
   - Redeploy `biteship` function.
2. Keep `midtrans-webhook` as `verify_jwt=false`.
3. In `midtrans-webhook`, enforce:
   - Signature verification on raw body.
   - Midtrans status API reconciliation before DB update.
   - Idempotency on webhook event key with unique constraint.

### B. Checkout orchestration

1. Introduce `services/checkout.service.ts` with:
   - `createOrderFromCart(userId, shippingAddressId)`
   - `attachShippingSelection(orderId, selection)`
   - `createSnapToken(orderId)` (invoke edge function)
2. Update `scenes/cart/Cart.tsx` to:
   - Create draft order from cart.
   - Persist selected courier and destination area.
   - Invoke `create-snap-token`.
   - Route to payment webview screen using `redirect_url`.

### C. Schema/type consistency

1. Export live schema and add migrations to repo for:
   - `orders` shipping/payment columns (`origin_area_id`, `destination_area_id`, `biteship_order_id`, `updated_at`).
   - `products.weight` default and constraints.
2. Regenerate `types/supabase.ts` from live project after schema alignment.
3. Remove legacy location fields usage if replaced by area IDs.

### D. Reliability and state correctness

1. Enforce order status transitions:
   - `pending -> paid -> processing -> shipped -> delivered`
2. Make stock reduction atomic (RPC/transaction).
3. Add mobile order status polling after webview close for webhook lag handling.

## Evidence Paths (Local)

- `payment-integration.md`
- `shipping-integration.md`
- `scenes/cart/Cart.tsx`
- `services/shipping.service.ts`
- `services/address.service.ts`
- `types/supabase.ts`
- `supabase/migrations/20260308220500_add_byteship_address_fields.sql`

## Audit Conclusion

- The project has foundational shipping quote capability but is not yet compliant with the full payment-shipping architecture described in the official integration guides.
- Immediate remediation should prioritize JWT protection for `biteship`, then complete the checkout-to-payment orchestration and schema/type synchronization.
