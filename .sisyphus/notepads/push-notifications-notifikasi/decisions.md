
# Push Notifications - Architectural Decisions
**Date**: 2026-04-23
**Task**: 1 - Research

---

## D1: Token storage — columns on `profiles`, not a separate table

**Decision**: Store `expo_push_token` and `expo_push_token_updated_at` as columns on `public.profiles`.

**Rationale**: The official Supabase push notifications pattern uses `ALTER TABLE public.profiles ADD COLUMN fcm_token` (or equivalent). V1 scope is single active token per user, so a separate token registry adds unnecessary complexity. Adding two nullable columns to an existing table is additive and non-breaking. The `profiles.id -> auth.users(id)` ownership model is already established.

**Source**: https://supabase.com/docs/guides/functions/examples/push-notifications

---

## D2: Read state column — `read_at timestamptz null`, not `is_read boolean`

**Decision**: Use `read_at timestamp with time zone null` as the read-state column.

**Rationale**: `null` = unread, non-null = read. `read_at` preserves temporal information (when was it read) which is needed for UI display ("2 hours ago") and is more precise than a boolean. The plan's schema explicitly uses `read_at`. Postgres timestamp conventions in Supabase examples support this pattern.

**Implementation**: UPDATE ... SET read_at = now() WHERE id = $1 AND user_id = auth.uid().

---

## D3: Token sync strategy — no-prompt on auth events, explicit request in UI

**Decision**: Token sync (reading device token and upserting to `profiles`) happens on auth lifecycle events (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED) only when permission is already granted. The UI layer triggers the explicit permission request separately.

**Rationale**: Expo docs show `getPermissionsAsync` → `requestPermissionsAsync` separately. Prompting on startup is explicitly forbidden in the plan ("do not prompt on splash/startup"). The no-prompt sync on auth events ensures tokens are current for returning users without UX disruption.

**Source**: https://docs.expo.dev/versions/latest/sdk/notifications (`getPermissionsAsync`, `requestPermissionsAsync`)

---

## D4: Best-effort push — row creation is independent of delivery success

**Decision**: The `public.notifications` row is created first (by domain event writers), and the webhook/Edge Function fires AFTER the row is committed. Push delivery success or failure does not affect row persistence. The Edge Function returns 200 even on Expo API errors.

**Rationale**: This is the standard Supabase webhook pattern. The notification is the source of truth; push is a non-blocking side effect. Accepting this means inbox is always durable regardless of push delivery issues.

**Source**: Supabase webhook fires on insert event (post-commit). Expo docs: delivery is "best effort."

---

## D5: `source_event_key` as idempotency key — unique constraint with null-aware index

**Decision**: `source_event_key text unique` (implemented as partial unique index WHERE NOT NULL) prevents duplicate notification rows from replayed webhooks or domain event retries.

**Rationale**: Direct unique constraint on the event key column is simpler than a separate dedup table (which is appropriate for provider-scoped idempotency like `webhook_idempotency`). Event writers must provide a deterministic, unique key per domain event (e.g., `payment_settlement:{order_id}`). On conflict (duplicate key), the insert fails — safe to ignore.

**Source**: Supabase idempotency pattern at https://github.com/supabase/supabase/blob/master/apps/www/_blog/2025-09-12-processing-large-jobs-with-edge-functions.mdx

---

## D6: RLS policy set — 4 policies, `to authenticated`, `USING` + `WITH CHECK` for UPDATE

**Decision**: SELECT, INSERT, UPDATE, DELETE policies all enforce `auth.uid() = user_id`. UPDATE uses both USING (row-level filter) and WITH CHECK (prevents user_id reassignment).

**Rationale**: Standard Supabase RLS CRUD pattern. Explicit `to authenticated` prevents policy evaluation for anon users. USING + WITH CHECK for UPDATE ensures rows can't be stolen via update.

**Source**: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx

---

## D7: Delivery guarantee — at-least-once to Expo, no device delivery guarantee

**Decision**: V1 accepts that Expo push delivery is "at best effort to FCM/APNs." We do not implement push receipt polling. We accept that `DeviceNotRegistered` tokens may remain in `profiles` until manually cleared.

**Rationale**: The plan acceptance criteria only requires inbox row to persist on push failure. Adding receipt polling adds complexity (background job, storage of ticket IDs, retry logic). V1 is scoped to transactional events with in-app fallback.

**Source**: https://docs.expo.dev/push-notifications/sending-notifications/#delivery-guarantees

---

## D8: Migration file location — `/home/coder/dev/pharma/admin-panel/supabase/migrations/`

**Decision**: All schema changes go into the admin-panel repo migrations directory per AGENTS.md conventions. Migration file uses `YYYYMMDDHHMMSS_<snake_case_description>.sql` naming.

**Rationale**: admin-panel is the source of truth for Supabase schema per plan and MIGRATION_HISTORY_RECONCILIATION.md.

---

## D9: Deep-link route validation — only existing routes allowed

**Decision**: `cta_route` in notifications points only to already-implemented routes: `orders/order-detail/[orderId]` and `orders/track-shipment/[orderId]`. Invalid/missing route falls back to notifications tab safely.

**Rationale**: The plan explicitly limits deep-link targets to existing routes. TypeScript union constraint ensures only approved routes compile. This prevents broken deep-links.

---

## D10: Edge Function secret — standard Expo Access Token, enhanced security deferred

**Decision**: V1 uses standard `EXPO_ACCESS_TOKEN` secret without the optional "Enhanced Security for Push Notifications" flag.

**Rationale**: Standard token is sufficient for V1. The enhanced security adds additional validation overhead. The ops team needs to create the token at Expo settings before deploying.

---

## D11: Recipient FK — `public.notifications.user_id` references `public.profiles(id)`

**Decision**: The recipient ownership FK for notifications points to `public.profiles(id)`, not `auth.users(id)`.

**Rationale**: Notifications are user-facing app data, not auth/audit metadata. This codebase models most app-owned entities against `public.profiles(id)`, and push token storage is also being added on `profiles`, so using the same anchor avoids cross-schema joins and keeps app queries/RLS simpler.

---

## D12: Notification dedupe lives on `public.notifications` itself

**Decision**: Dedupe should use a partial unique index on `(user_id, source_event_key)` in `public.notifications`, not reuse `public.webhook_idempotency` as the durable contract.

**Rationale**: Inbox is the durable source of truth, so dedupe belongs on the durable inbox table. `webhook_idempotency` only protects ingress-specific webhook replay; the notifications table needs to protect all write paths. Use stable business identifiers for `source_event_key`.

---

## D13: Do not force remote apply without admin-panel CLI linkage

**Decision**: Do not mutate the live project through ad-hoc SQL apply tools when the admin-panel repo is not linked via `supabase link`.

**Rationale**: Task 1 requires the migration file in `admin-panel/supabase/migrations/` to remain the source of truth. Applying the schema outside the normal linked CLI flow would risk migration-history drift between the local file timestamp and remote metadata. Instead, validate the SQL safely in a rolled-back transaction, update the frontend contract file, and record the exact linkage blocker for follow-up.

---

## D14: V1 client notification access is read + mark-read only

**Decision**: Client-authenticated users should only `select` their own notifications and `update` their own `read_at`; notification inserts remain backend/domain-writer-only and delete is out of V1 scope.

---

## D15: Keep shipment progress notifications on the plan's `order_shipped` type

**Decision**: Use the existing V1 `order_shipped` notification type for both manual `shipped` transitions and synced `in_transit` transitions, and distinguish them with `data.shipmentStage`.

**Rationale**: This preserves the smaller app-facing type catalog already described in the plan while still letting the future frontend render different copy or badges for `shipped` vs `in_transit` without another backend type expansion in task 2.

---

## D16: Delivery auth uses service-role header matching, not user JWTs

**Decision**: The new `push` Edge Function requires the exact `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` pattern already used by `process-webhook-side-effects`, with `[functions.push] verify_jwt = false` in `config.toml`.

**Rationale**: Database webhooks are backend-to-backend calls, not end-user requests. Matching the existing service-role pattern keeps the function private to trusted callers while avoiding user-JWT assumptions that do not apply to webhook execution.

---

## D17: Push failure remains observable only through logs in V1

**Decision**: Do not add database status columns for push attempts in task 2. The `push` function logs failures and returns HTTP 200 with a machine-readable reason, while `public.notifications` remains the durable source of truth.

**Rationale**: The task explicitly keeps push non-transactional and best-effort. Logging is enough for V1 operational visibility without expanding the schema contract from task 1.
