# Supabase Deploy Runbook: Checkout/Payment/Shipping Hardening

This runbook applies the execution-phase remediations safely in staging, then production.

## Scope

- Enforce correct Edge Function auth boundaries:
  - `biteship`: `verify_jwt=true`
  - `midtrans-webhook`: `verify_jwt=false`
- Apply checkout schema alignment migration.
- Add webhook idempotency table and constraints.
- Add checkout-init idempotency key constraint and atomic Midtrans transition RPC.
- Regenerate and verify TypeScript database types.

## Prerequisites

1. Supabase CLI available via `npx supabase`.
2. Supabase access token configured for deploy machine/CI:
   - `SUPABASE_ACCESS_TOKEN`
3. Per-environment values:
   - `SUPABASE_PROJECT_ID`
   - `SUPABASE_DB_PASSWORD`
4. Secrets already set in project:
   - `MIDTRANS_SERVER_KEY`
   - `BITESHIP_API_KEY`
   - optional shipper identity secrets

## Safety Rules

1. Never change `midtrans-webhook` to `verify_jwt=true`.
2. Always deploy to staging first and run payment dry-run before production.
3. Treat webhook handlers as idempotent; duplicate events must be no-op updates.
4. Do not deploy schema and function-auth changes without smoke testing create-payment and webhook paths.

## Step 1: Sync and Validate Local Migration Chain

```bash
git pull origin <branch>
npx supabase login
npx supabase link --project-ref "$SUPABASE_PROJECT_ID"
npx supabase migration list
```

If remote has unapplied local migrations, stop and reconcile first.

## Step 2: Apply Schema Migration (Staging First)

This repo includes:

- `supabase/migrations/20260310204000_align_checkout_payment_shipping_schema.sql`
- `supabase/migrations/20260311102000_harden_checkout_and_webhook_idempotency.sql`

Apply to linked project:

```bash
npx supabase db push
```

Post-apply checks (SQL editor or CLI query):

1. `orders` has:
   - `origin_area_id`
   - `destination_area_id`
   - `destination_postal_code`
   - `biteship_order_id`
   - `updated_at`
2. `products.weight` exists and is `not null` with default `200`.
3. `webhook_idempotency` exists with unique `(provider, event_key)`.
4. `orders.checkout_idempotency_key` exists and has unique partial index.
5. RPC `public.apply_midtrans_webhook_transition(...)` exists.

## Step 3: Enforce Function Auth Flags

Update `supabase/config.toml` in backend source-of-truth repository (or function deployment config):

```toml
[functions.biteship]
verify_jwt = true

[functions.midtrans-webhook]
verify_jwt = false
```

Deploy functions:

```bash
npx supabase functions deploy biteship
npx supabase functions deploy midtrans-webhook
```

Verify metadata after deploy:

1. `biteship.verify_jwt == true`
2. `midtrans-webhook.verify_jwt == false`

## Step 4: Webhook Idempotency Hardening

Ensure webhook processing is atomic via SQL RPC and no partial writes are possible:

1. Build deterministic key per provider event, for example:
   - `midtrans:{order_id}:{transaction_status}:{transaction_id}`
2. Call `public.apply_midtrans_webhook_transition(...)` from `midtrans-webhook` handler.
3. Function must atomically insert into `webhook_idempotency` and apply guarded order transition.
4. If event is duplicate, function returns `applied=false` and existing state; handler returns HTTP 200.
5. Keep signature verification and provider status API double-check before calling RPC.

## Step 5: Checkout Init Idempotency Hardening

Ensure checkout-init is deduplicated for retry/double-tap safety:

1. Generate client idempotency key per checkout intent.
2. Send key during order creation and persist as `orders.checkout_idempotency_key`.
3. On unique conflict, return existing pending order for same key/user.
4. Reset idempotency key only when address/shipping/cart snapshot changes.
5. Persist active checkout idempotency session on device to survive app remount/restart until terminal payment state.

## Step 6: Type Regeneration and Drift Gate

Generate fresh types from linked project:

```bash
npx supabase gen types typescript --linked > types/supabase.ts
```

Run project checks:

```bash
npm run lint
npm run test -- --runInBand
```

Recommended CI guard:

```bash
npx supabase gen types typescript --linked > /tmp/supabase.types.ts
diff -u /tmp/supabase.types.ts types/supabase.ts
```

Fail pipeline if diff is non-empty.

## Step 7: Staging Smoke Tests

1. Mobile authenticated user can call `biteship` maps/rates.
2. Unauthenticated call to `biteship` is rejected.
3. Checkout creates order with selected shipping fields.
4. `create-snap-token` returns token+redirect URL for valid pending/unpaid order.
5. Midtrans webhook (sandbox) updates status exactly once for duplicate notifications.
6. Successful payment results in order `payment_status='success'` and status progression.
7. Rapid double-tap checkout generates only one pending order for same idempotency key.
8. Retry after network timeout reuses same pending order instead of creating duplicates.

## Step 8: Production Rollout

1. Repeat Steps 2-6 in production.
2. Monitor function logs for 30 minutes:
   - signature failures
   - webhook duplicate skips
   - order update errors
3. Keep rollback option:
   - revert function deployment to prior version
   - if needed, hotfix migration with additive SQL only (avoid destructive rollback during live payments)

## Rollback Notes

- Function auth rollback:
  - redeploy prior function version/config.
- Schema rollback:
  - avoid dropping columns during incident response.
  - prefer forward-fix migration with safe defaults.

## Operational Checklist

- [ ] Staging migration applied
- [ ] Staging auth flags verified
- [ ] Staging webhook idempotency verified
- [ ] Types regenerated and committed
- [ ] Lint and tests passing
- [ ] Production migration applied
- [ ] Production auth flags verified
- [ ] Production smoke tests passed
- [ ] Post-deploy monitoring completed
