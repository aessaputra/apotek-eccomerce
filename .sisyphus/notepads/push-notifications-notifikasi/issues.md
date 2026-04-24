# Push Notifications / Notifikasi — Research Issues / Blockers

## Issues Found During Research

### Issue 1: Migration timestamp divergence risk
- **Detail**: The MIGRATION_HISTORY_RECONCILIATION.md documents that live migration metadata timestamps don't always match local file timestamps (e.g., local `20260417194500_*` has no live counterpart; live has `20260418070305` with no local file)
- **Mitigation**: Always run `npx supabase migration list --linked` before pushing new migrations; if divergence appears, do NOT manually edit live schema_migrations — follow reconciliation procedure in MIGRATION_HISTORY_RECONCILIATION.md

### Issue 2: No `read_at`/`is_read` pattern to reference
- **Detail**: Zero matches in admin-panel migrations for read tracking semantics
- **Impact**: Implementer has no existing local pattern to imitate; must make a new convention decision
- **Recommendation**: Use `read_at timestamptz nullable` — more flexible than boolean for "first read at" queries

### Issue 3: FCM token storage location not defined
- **Detail**: No investigation done on where FCM/device tokens are stored in the schema
- **Impact**: `public.notifications` migration needs `user_id` column (FK to profiles), but token storage decision affects whether we need a join or direct filter
- **Action needed**: Implementer must decide: add `fcm_token` column to `public.profiles`, or create `public.user_notification_tokens` table

### Issue 4: Idempotency key design for notifications
- **Detail**: Midtrans uses composite event_key (`transaction_id:status:amount:fraud`). Notifications need a similar composable key to avoid duplicate pushes
- **Impact**: If notifications should be deduplicated by (user_id, event_type, event_id), the migration must create a unique constraint on `(user_id, event_key)` or similar
- **Current state**: No existing notification table to inspect; design decision pending

### Issue 5: Whether to extend `webhook_idempotency` or create separate table
- **Detail**: `webhook_idempotency` already exists with `(provider, event_key)`. Notifications could use same table with `provider = 'notification'` or have their own dedupe table
- **Impact**: Single table is simpler; separate table allows different retention/cleanup policies
- **Recommendation**: Start with extending `webhook_idempotency` for simplicity, migrate to separate if needed

## Blockers for Task 1 Implementation

1. **Must decide**: `read_at` vs `is_read` semantics before writing migration
2. **Must decide**: FCM token storage (profiles column vs dedicated table)
3. **Must decide**: Idempotency key composition strategy before writing unique constraint
4. **Must verify**: Current latest migration timestamp via `npx supabase migration list --linked` to name the new migration file correctly

# Push Notifications - Unresolved Issues / Open Questions
**Date**: 2026-04-23
**Task**: 1 - Research

---

## 1. Token invalidation strategy (not in V1 scope)

**Issue**: When Expo returns `DeviceNotRegistered` in a push receipt, the stored `expo_push_token` on `profiles` should be cleared. However, V1 does NOT implement push receipt polling. This means:

- If a user's device unregisters from push (uninstalls app, revokes permission), the `expo_push_token` stays in `profiles` until manually cleared.
- Subsequent push attempts to the stale token will fail silently (Expo will return `DeviceNotRegistered` but we won't process it in V1).

**Impact**: Low for V1, since the inbox row is created regardless and the user can still see notifications in-app. Push is bonus, not requirement.

**Resolution needed**: Decide if V1 should at minimum clear the token when an explicit push failure occurs, or if this is deferred to a post-V1 improvement.

**Recommendation for now**: Accept this gap in V1 scope as noted. Document in decisions.md as a known limitation.

---

## 2. Token rotation / device change handling

**Issue**: When a user logs in on a new device, the old token is overwritten by the new one. This is expected behavior for single-token V1. However:

- There's no mechanism to detect that the old token is now stale.
- If the new device later becomes invalid, there's no history of previous tokens to fall back to.

**V1 assumption**: Users typically use one active device at a time for this app. Multi-device token management is explicitly out of scope.

**Resolution needed**: None for V1.

---

## 3. Notification deletion (hard delete vs soft delete)

**Issue**: The schema has no `deleted_at` or archive column. The RLS policy includes DELETE. In practice:

- Users can delete notifications from the inbox UI (DELETE row).
- There is no "archive" flow in V1.

**Ambiguity**: If a notification is deleted, and the same `source_event_key` event fires again (e.g., retry of a payment webhook), a new row can be inserted since the old one was deleted. This may be desired (re-notification) or may be undesired (duplicate). The unique constraint on `source_event_key` is per-row, not per-event-lifetime.

**Resolution**: Accept this. If a user deletes a notification and the same event recurs, they receive a new notification. This is standard inbox behavior.

---

## 4. Push delivery confirmation beyond "inserted"

**Issue**: The Edge Function webhook fires on row INSERT. The function sends to Expo and returns. We don't track whether the push was delivered to the device — only whether Expo accepted it.

**Gap**: We have no visibility into:
- Whether Expo successfully delivered to FCM/APNs
- Whether FCM/APNs delivered to the device
- Whether the device was online/offline at delivery time

**V1 decision**: Accept this gap. Inbox is the source of truth. Push is a best-effort side effect. The plan's acceptance criteria only require that "inbox row remains when push fails."

---

## 5. Bulk insert / transaction ordering for notification + event write

**Issue**: The plan mentions domain writers (payment/order status transitions) should insert a notification row as part of their event processing. The question is whether:

a) The notification insert should be in the SAME transaction as the status transition (so a rollback of the status also rolls back the notification), OR
b) The notification insert should be a SEPARATE statement after the status transition commits (so notification is durable even if the transition appears to succeed but later rolls back).

**Official guidance**: The Supabase push notifications example uses a database webhook — the webhook fires AFTER the insert commits. This means the notification is decoupled from the transaction that triggered it. For V1, this is the correct pattern: insert notification → webhook fires → Edge Function sends push.

**However**: For status transitions like `apply_midtrans_webhook_transition`, the current implementation does in-application idempotency (checking `webhook_idempotency` before applying). If the notification insert is added inside that same function, it should use the same idempotency pattern (check dedup key before inserting both the status transition AND the notification).

**Resolution for task 2 implementer**: When writing the notification-insert side effect in the domain writers, ensure the `source_event_key` is derived from the same idempotency key that guards the status transition. E.g., `payment_settlement:{order_id}` guards both the order status update AND the notification insert.

---

## 6. Index on `source_event_key` nullability

**Issue**: The unique index is defined as `where source_event_key is not null`. This means:
- Two rows with `null` source_event_key are allowed (no dedup for those).
- Events that don't provide a source_event_key will not be deduped.

**Ambiguity**: If a domain event writer fails to provide `source_event_key`, duplicate notifications could be inserted.

**Resolution for task 1 implementer**: Ensure all V1 event writers populate `source_event_key`. If it's impossible to derive a key, use a placeholder like `manual:{uuid}` but this should not happen for V1 transaction events.

---

## 7. Expo Access Token secret management

**Issue**: The Edge Function requires `EXPO_ACCESS_TOKEN` as a Supabase secret. The plan and AGENTS.md say to use `supabase secrets set --env-file .env.local`. However:

- The admin-panel repo has a `.env.local.example` pattern but the actual secret value needs to come from the Expo developer account.
- "Enhanced Security for Push Notifications" in Expo (optional flag) adds additional validation — should this be enabled for V1?

**Official guidance**: Supabase example uses plain `EXPO_ACCESS_TOKEN`. The "enhanced security" option is mentioned in both the Supabase guide and Expo docs but is optional. For V1, using the standard token without enhanced security is acceptable. Enhanced security can be added in a later iteration.

**Resolution needed for ops**: The team needs to create an Expo Access Token at https://expo.dev/accounts/_/settings/access-tokens and store it in the Supabase project secrets before deploying the Edge Function.

---

## 8. Admin-panel CLI project-link blocker during task 1 implementation (2026-04-23)

- `npx --yes supabase@2.93.1 migration list --linked` failed with: `Cannot find project ref. Have you run supabase link?`
- `npx --yes supabase@2.93.1 db push --dry-run --include-all` failed with the same linked-project error.
- `supabase/.temp/` is absent in `/home/coder/dev/pharma/admin-panel`, so there is no local CLI link metadata available in this environment.
- Because of that, the migration was **not applied through the admin-panel CLI**, and the frontend types could not be regenerated from a live applied schema through the normal workflow.

## 9. Local Supabase runtime blocker during supplemental validation (2026-04-23)

- `npx --yes supabase@2.93.1 migration list --local` failed because no local database is running on `127.0.0.1:54322`.
- This does not invalidate the SQL itself; the migration body was still validated safely with a rolled-back remote transaction through MCP.

## 10. Pre-existing frontend typecheck failures unrelated to task 1 (2026-04-23)

- `npx tsc --noEmit` in `/home/coder/dev/pharma/frontend` still fails due to unrelated existing test/app typing issues in files such as:
  - `__tests__/hooks/useOrderDetail.test.ts`
  - `__tests__/hooks/useOrderHistoryPaginated.test.ts`
  - `__tests__/hooks/useOrdersPaginated.test.ts`
  - `__tests__/hooks/useUnpaidOrdersPaginated.test.ts`
  - `__tests__/scenes/UnpaidOrders.test.tsx`
  - `__tests__/services/home.service.test.ts`
  - `__tests__/services/order.service.test.ts`
  - `app/(tabs)/_layout.tsx`
  - `scenes/home/Home.tsx`
- `lsp_diagnostics` reported zero issues for `frontend/types/supabase.ts`, so the new type-contract edit itself is clean.

## Task 5 Verification Notes / Non-blocking Issues (2026-04-23)

- Focused notification service verification passed: `lsp_diagnostics` reported zero issues on `services/notification.service.ts`, `services/index.ts`, and `__tests__/services/notification.service.test.ts`; targeted Jest passed for `__tests__/services/notification.service.test.ts`; targeted ESLint passed for the modified files.
- Repo-wide `npx tsc --noEmit --pretty false` still fails due unrelated pre-existing issues in other test/app files (for example `__tests__/hooks/useOrderDetail.test.ts`, `__tests__/services/home.service.test.ts`, `app/(tabs)/_layout.tsx`, and `scenes/home/Home.tsx`). The new notification service files are not part of the remaining `tsc` error list after tightening the new test mocks.
- Supabase docs search returned unrelated Realtime/Postgres Changes content instead of JS update-chain guidance, so implementation decisions for the frontend service layer relied on the repo's existing service patterns plus the already-established Expo notification guidance from prior tasks.

# Push Notifications - Unresolved Issues / Open Questions (Task 2)
**Date**: 2026-04-23
**Task**: 2 - Edge Function delivery pipeline research

---

## 1. Push ticket ID tracking for future receipt polling

**Issue**: The `/push/send` response returns a push ticket `id` (receipt ID) that is required to poll `/push/getReceipts`. V1 does not store this ID. If we need to do receipt polling in the future, we would need to:

- Add a `push_ticket_id text` column to `public.notifications`
- Update the Edge Function to store the returned `id` from `expoRes.data[0].id`
- Create a cron/Edge Function to poll receipts and update notification status

**Status**: Out of V1 scope. Documented here so the schema is not locked in a way that prevents this future addition. The `data jsonb` column could theoretically store this, but a dedicated column would be cleaner.

---

## 2. Whether to store push delivery attempt metadata

**Issue**: V1 accepts that push delivery failures are logged only in Edge Function logs (console.error). There is no database record of:
- Whether push was attempted for a given notification
- What the Expo error code was
- Whether the error was transient or permanent

**Ambiguity**: If an ops team needs to debug why a user isn't receiving push notifications, they must look at Supabase Edge Function deployment logs. There is no in-app or in-database visibility into push delivery status.

**Recommendation**: Accept this for V1. If debugging becomes painful, add a `push_attempts jsonb` or `push_last_error text` column in a future iteration.

---

## 3. Webhook retry behavior on Edge Function failure

**Issue**: When the Edge Function throws or times out (HTTP 500 or timeout), Supabase marks the webhook as failed. The documentation does not specify automatic retry behavior for failed webhooks. The notification row is already committed regardless.

**Ambiguity**: If Expo is temporarily unavailable and the Edge Function returns an error, does Supabase retry the webhook? The official docs at [`examples/user-management/expo-push-notifications/README.md`](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/README.md) sets timeout to 1000ms but does not specify retry policy.

**V1 resolution**: Accept that a small percentage of push attempts may not fire if the function fails at exactly the wrong time. The inbox row is the source of truth. Monitor via Supabase dashboard webhook logs.

---

## 4. Enhanced security for push notifications — decision deferred

**Issue**: The official Supabase example mentions an optional "Enhanced Security for Push Notifications" flag on the Expo access token. When enabled, only authorized Supabase Edge Functions can send push notifications using that token. The example README states:

> "For production environments, it is recommended to enable enhanced security for push notifications through the Expo Access Token Settings."

**Ambiguity**: The plan (D10) records that V1 uses standard token without enhanced security. However, if the app is ever used in a context where unauthorized push spoofing is a concern, enhanced security should be enabled.

**Recommendation**: Document this as a pre-production hardening step, not a V1 blocker. The ops team should evaluate enhanced security before production launch.

---

## 5. `DeviceNotRegistered` in push ticket vs push receipt

**Issue**: `DeviceNotRegistered` can appear in two places:
1. **Push ticket** (synchronous, from `/push/send` response) — returned immediately when Expo rejects the token
2. **Push receipt** (asynchronous, from `/push/getReceipts`) — returned after Expo tries to deliver to FCM/APNs and they reject it

V1 only reads the push ticket response. A token could be temporarily valid for `/push/send` (accepted by Expo) but permanently invalid when Expo tries FCM/APNs delivery (rejected in receipt).

**V1 decision**: Accept this gap. The 15-minute receipt polling window and 24-hour receipt expiry make this impractical for V1 without a background job infrastructure.

---

## 6. Multi-device token handling (out of V1 scope)

**Issue**: V1 assumes one active `expo_push_token` per user. If a user has multiple devices (e.g., phone + tablet), both registered with the same user account, only the last-registered token receives push.

**Status**: Out of V1 scope per plan. Multi-device token registry would require a separate `user_notification_tokens` table and batch sending logic in the Edge Function. Not recommended for V1.

---

## 7. Payload size limits

**Issue**: Expo push payloads to FCM/APNs have size limits. The `data` jsonb field could theoretically exceed these limits if large objects are stored.

**Official source** (per Expo docs): There is no explicit limit documented, but FCM has a 4KB limit on notification payloads and APNs has similar constraints. Large `data` payloads may cause `MessageTooBig` errors.

**V1 recommendation**: Keep `data` payloads small (<1KB). The `cta_route` and entity IDs should be sufficient. Avoid storing full object snapshots in `data`.

---

## 8. Timeout behavior under Supabase webhook configuration

**Issue**: The recommended webhook timeout is 1000ms. If the Expo API call takes longer (e.g., slow network), the webhook fires and the function terminates before returning a response. Supabase may mark the webhook as failed even though the notification row was already committed.

**Resolution needed**: Monitor Supabase webhook logs for timeout patterns. If timeouts become frequent, consider:
- Increasing timeout to 2000ms (with understanding of tradeoffs)
- Implementing async sending (queue-based, not webhook-synchronous)

---

## 9. `EXPO_ACCESS_TOKEN` creation and secret management workflow

**Issue**: The ops team needs to create an Expo Access Token at https://expo.dev/accounts/_/settings/access-tokens BEFORE deploying the Edge Function. This is an operational prerequisite that requires human action and is not automated.

**Blocker**: If the token is not created and set via `supabase secrets set --env-file .env.local` before deployment, the Edge Function will fail at runtime with a missing secret.

**Recommendation**: Document this as a pre-deployment checklist item. The deployer must obtain the token from the Expo console first.

---

## 10. Function placement under admin-panel repo

**Issue**: The plan specifies placing the Edge Function in `/home/coder/dev/pharma/admin-panel/supabase/functions/push/`. However, the admin-panel repo has not been linked to the Supabase project in this environment (see Issue 8 in Task 1 notes).

**Consequence**: Deployment commands (`supabase functions deploy push`) must be run from the admin-panel directory with a valid project link. If the repo is not linked, deployment will fail.

**Mitigation**: Verify `supabase link --project-ref <ref>` works from the admin-panel directory before attempting deployment. If linking fails, use `supabase functions deploy push --project-ref <ref>` with explicit project reference.


---

# Push Notifications - Task 2 Infrastructure Research Issues
**Date**: 2026-04-23
**Task**: 2 - Supabase delivery infrastructure and event writers

---

## 11. Biteship push webhook does not exist (no blocker for V1)

**Detail**: Investigation of the admin-panel Edge Functions reveals there is NO Biteship webhook receiver function. Biteship status is pulled via `order-manager`'s `sync_tracking` action (line 580-832 of `order-manager/index.ts`). The system does not receive incoming Biteship push notifications.

**Impact**: Shipment notifications (in_transit, delivered) would fire when an admin manually syncs tracking via `order-manager` `sync_tracking`, or when a future Biteship webhook handler is added.

**Assessment**: Not a blocker for V1 shipment notification wiring. The notification can be inserted into `order-manager` `sync_tracking` at the same points where `order_activities` are logged (lines 800-820). The notification will fire on manual sync. Real-time Biteship push delivery is a post-V1 improvement.

**Recommendation**: Document this gap in decisions.md as a known V1 limitation. Shipment notifications work on-demand (admin sync) but not in real-time without a Biteship webhook receiver.

---

## 12. No `deno.json` in `_shared/` — import path constraints

**Detail**: The `_shared/` directory contains plain TypeScript files with no `deno.json`. All imports within `_shared/` use relative paths. Functions import `_shared/` via `../_shared/` paths. There is no centralized `imports` map.

**Impact**: The new `push` function must use the same import conventions as existing functions:
- `jsr:@supabase/supabase-js@2` for the Supabase client
- `npm:jose@5` for JWT (if needed)
- Relative `../_shared/` paths for internal utilities

**No blocker.** Standard JSR/npm imports work.

---

## 13. `verify_jwt = false` on all functions — service role auth only

**Detail**: All existing Edge Functions in `config.toml` use `verify_jwt = false`. The `push` function will also need this flag since it's webhook-triggered (Supabase DB webhook) and uses service role key authorization.

**For the `push` function specifically**:
- Webhook triggers use Supabase's internal service role key
- The function should verify `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}` manually (same pattern as `process-webhook-side-effects`)
- This means `verify_jwt = false` is correct for `push`

**No action needed.** This is the established pattern.

---

## 14. All notification writers require `getSupabaseAdminClient()` with service role key

**Detail**: The notification rows should be written using the service role key (not anon key). All existing domain writers use `getSupabaseAdminClient()` from `_shared/supabase.ts`, which reads `SUPABASE_SERVICE_ROLE_KEY`.

**No blocker.** Use `getSupabaseAdminClient()` for all notification inserts.

---

## 15. No existing notification writer utility — must be implemented fresh

**Detail**: There is no shared `_shared/notification-helpers.ts` or similar. Each notification insertion point is a direct `adminClient.from("notifications").insert({...})` call. There is no abstraction layer.

**Recommendation for implementer**: Create a `_shared/notification-helpers.ts` file with helper functions:
```typescript
export async function insertPaymentNotification(adminClient, params) { ... }
export async function insertOrderStatusNotification(adminClient, params) { ... }
export async function insertCustomerCompletedNotification(adminClient, params) { ... }
```

This keeps the insertion logic centralized and makes testing easier. Each helper should:
- Accept `source_event_key`, `user_id`, `type`, `title`, `body`, `cta_route`, `data`, `priority`
- Perform the `adminClient.from("notifications").insert(...)` with proper error handling
- Return the result/error

---

## 11. Pre-existing admin-panel Deno type issue surfaced during task 2 validation (2026-04-23)

- `npx --yes deno check --node-modules-dir=auto "supabase/functions/midtrans-webhook/index.ts"` and the same command for `order-manager/index.ts` fail because of an existing type mismatch in `admin-panel/supabase/functions/_shared/webhook-side-effects.ts` around `fetchOrderShippingAddress(adminClient, order)`.
- The reported errors are:
  - `TS2589: Type instantiation is excessively deep and possibly infinite`
  - `TS2345: SupabaseClient ... is not assignable ... maybeSingle() Promise shape mismatch`
- This blocker is outside the requested task scope because task 2 must only touch notification delivery infrastructure and approved event writers, not refactor older webhook-side-effects typing.

## 12. Local Supabase stack startup blocker during task 2 validation (2026-04-23)

- `npx --yes supabase@2.94.0 start` downloaded the local images but ultimately failed when starting the database with:
  - `failed to connect to postgres: failed to connect to host=127.0.0.1 user=postgres database=postgres: dial tcp 127.0.0.1:54322: connect: connection refused`
- Because local Postgres never came up, a full local `supabase functions serve` validation pass for the new webhook delivery flow was not possible in this environment.

## 13. LSP limitation for `npm:jose@5` imports in admin-panel Edge Functions (2026-04-23)

- `lsp_diagnostics` reports `Cannot find module 'npm:jose@5'` on existing Edge Functions such as `order-manager/index.ts` and `confirm-order-received/index.ts`.
- `deno check --node-modules-dir=auto` resolves `npm:jose@5`, so this appears to be an editor/LSP environment limitation rather than a source regression introduced by task 2.

---

# Push Notifications - Task 3 Research Issues / Blockers
**Date**: 2026-04-23
**Task**: 3 - Frontend notification types and route contracts

---

## 1. `notifications` tab route is NOT in `AppRoutes` (no blocker, design decision)

**Detail**: The `notifications` tab at `app/(tabs)/notifications/` is wired in `app/(tabs)/_layout.tsx` as a tab screen (line 160: `<Tabs.Screen name="notifications" ...>`). However, it is NOT included in `AppRoutes` (types/routes.types.ts line 65-71). This means:

- `TypedHref = Href<AppRoutes>` does NOT type tab navigation
- The notifications tab fallback is just the literal string `'/notifications'`
- There is no `RouteParams<'notifications'>` defined

**Impact**: Task 3 implementer must understand that the notification deep-link route target union should contain only stack routes (order detail + track shipment), NOT tab routes. The fallback to notifications tab is a tab navigation event using a plain string path, not a `TypedHref`.

**Resolution**: No resolution needed — this is the correct existing architecture. Task 3 should NOT add the notifications tab to `AppRoutes`.

---

## 2. `TypedHref` construction in Cart.tsx and AddressList.tsx uses `as TypedHref` cast

**Detail**: Both `Cart.tsx` (line 111) and `AddressList.tsx` (line 115) construct a `TypedHref` object:
```typescript
const addressFormHref: TypedHref = {
  pathname: '/profile/address-form',
  params: { id: addressId },
};
router.push(addressFormHref);
```

And then use `router.push(addressFormHref)`. The `pathname` is a string literal that matches the key in `ProfileRoutes`. This works because `TypedHref = Href<AppRoutes>` and the pathname matches a route in `AppRoutes`.

**Assessment**: The `as TypedHref` cast is safe when the pathname is a known route. For notification routes, the implementer should use the same pattern for `buildNotificationTypedHref()`.

**No blocker.** This is the established pattern.

---

## 3. `RouteParams<T>` usage requires passing a literal key

**Detail**: `RouteParams<T>` is defined as `AppRoutes[T]` (extracting the param type for route T). Usage in OrderSuccess.tsx line 125:
```typescript
const { orderId } = useLocalSearchParams<RouteParams<'orders/success'>>();
```

This pattern requires the route key as a literal string (`'orders/success'`), not a variable. For notification type-safe routing, the implementer needs to ensure `NotificationRouteTarget` values are typed so they can be used with `TypedHref`.

**No blocker.** The pattern is established and task 3 implementer should follow the same literal usage.

---

## 4. No existing `TypedHref` usage for routes with dynamic segments like `[orderId]`

**Detail**: The `OrderSuccess.tsx` usage of `RouteParams` is for `'orders/success'` which has optional `orderId?: string`. The actual order detail and track shipment routes use the `[orderId]` pattern (dynamic segment):
```typescript
'orders/order-detail/[orderId]': { orderId: string };
'orders/track-shipment/[orderId]': { orderId: string };
```

These are used in `TypedHref` construction in Cart.tsx and AddressList.tsx with string params. The implementer of task 3 must follow the same pattern for notification targets.

**No blocker.** The pattern is already established for dynamic-segment routes.

---

## 5. `data: Json` field in notifications table requires manual parsing

**Detail**: `types/supabase.ts` defines `data: Json` for the notifications table. `Json` is defined at line 5 of `types/supabase.ts` as a recursive union type. There is no automatic type safety for the contents of `data` — the implementer of task 3 must create a `NotificationDataPayload` interface and a `parseNotificationRoute()` helper to safely extract `orderId` from the `Json` field.

**No blocker.** This is exactly what task 3 requires the implementer to build.

---

## 6. `types/routes.types.ts` must NOT be broken for task 3

**Detail**: `types/routes.types.ts` already has a full intersection-based `AppRoutes` union (lines 65-71). Task 3's `NotificationRoutes` (if added) should be included in `AppRoutes` only if there are notification-specific stack routes. Since V1 has no notification-specific stack routes (only the tab), task 3 should NOT modify `AppRoutes`.

**Assessment**: Task 3 should create `types/notification.ts` as a standalone file that:
1. Defines `NotificationType` union (V1 event types)
2. Defines `NotificationRouteTarget` union (stack route targets only)
3. Provides `parseNotificationRoute()` helper
4. Does NOT modify `AppRoutes` or `TypedHref`

---

## 7. Task 3 is blocked by Task 1 (schema + types/supabase.ts must be updated first)

**Detail**: Task 3's implementation depends on `types/supabase.ts` already containing the `notifications` table type (from task 1). This research confirms the `notifications` table type exists in `types/supabase.ts` at lines 179-227, so the blocker from the plan's dependency matrix (`T1 → blocks T3`) is partially resolved.

**Remaining blocker**: The exact `NotificationType` union values depend on Task 2's event writer implementation. The implementer of task 3 should use the V1 type values listed in section 5 above (derived from plan + order.service.ts) but these must be confirmed against Task 2's actual event writer inserts.

**Status**: Partially unblocked. Implementer should coordinate with Task 2 output before finalizing `NotificationType` union.

---

## 8. Repo-wide frontend typecheck still has unrelated pre-existing failures during task 3 validation (2026-04-23)

- `npx tsc --noEmit` in `/home/coder/dev/pharma/frontend` still fails outside the notification contract work.
- The remaining failures are pre-existing and come from files such as:
  - `__tests__/hooks/useOrderDetail.test.ts`
  - `__tests__/hooks/useOrderHistoryPaginated.test.ts`
  - `__tests__/hooks/useOrdersPaginated.test.ts`
  - `__tests__/hooks/useUnpaidOrdersPaginated.test.ts`
  - `__tests__/scenes/UnpaidOrders.test.tsx`
  - `__tests__/services/home.service.test.ts`
  - `__tests__/services/order.service.test.ts`
  - `app/(tabs)/_layout.tsx`
  - `scenes/home/Home.tsx`
- After fixing the local notification contract errors, `types/notification.ts` no longer appears in the repo-wide `tsc` failure list.
- Task 3 validation therefore relied on: zero `lsp_diagnostics` findings for changed files, `eslint` passing on `types/notification.ts` and `types/index.ts`, and an isolated negative `tsc` proof confirming invalid `order_shipped` route combinations are rejected.

---

# Push Notifications - Task 4 Unresolved Issues / Open Questions
**Date**: 2026-04-23
**Task**: 4 - Expo notification foundation setup

---

## 1. File location for the runtime helper

**Issue**: The plan says "create a small app-side notification utility" but does not specify the exact file path. Options:

- `utils/notifications.ts` — utility-style (matches `utils/config.ts`, `utils/theme.ts`)
- `hooks/useNotificationSetup.ts` — hook-style (matches `hooks/useColorScheme.ts`)
- `providers/NotificationSetup.tsx` — provider-style

**Recommendation for task 4 implementer**: Use `utils/notifications.ts` as a plain module with exported setup functions, keeping it infrastructure-style. Hooks in `hooks/` are meant for stateful orchestration, which Task 4 does not need. Provider pattern is overkill for foundation-only setup. If future tasks need to subscribe to the listeners reactively, they can wrap or import from `utils/notifications.ts`.

---

## 2. `expo-notifications` version compatibility with Expo SDK 54

**Issue**: The Expo SDK version is `~54.0.33` (from package.json line 47). `expo-notifications` must be installed at the compatible version for SDK 54. Running `npx expo install expo-notifications expo-device expo-constants` will resolve the correct version, but there is a small risk if `expo-notifications` major version has breaking API changes.

**No blocker**: `npx expo install` pins the correct version automatically. The Context7 SDK v54 docs confirm the API shape used in this research is valid for SDK 54.

---

## 3. Does `expo-notifications` plugin require config properties?

**Issue**: The official example shows an optional config object for the plugin (`icon`, `color`, `defaultChannel`, `sounds`). The minimal working example in the setup guide uses just the string `'expo-notifications'` without any config object. For V1 foundation, using the string-only form is sufficient.

**No blocker**: String-only plugin is valid per the setup guide example. Config properties are for custom icon/color/default channel/sounds — none are required for V1 foundation.

---

## 4. Android `SCHEDULE_EXACT_ALARM` permission (edge case for scheduled notifications)

**Issue**: The Expo docs note that on Android 12+ (API level 31), apps that need exact-time scheduling need `SCHEDULE_EXACT_ALARM` permission added to `AndroidManifest.xml`. However:
- V1 does NOT implement scheduled local notifications (only push received via webhook → Supabase → Expo)
- The `expo-notifications` plugin does not automatically add this permission
- If a future task adds `scheduleNotificationAsync` with an exact-time trigger, this permission would be needed

**No V1 blocker**: V1 uses only received push notifications (not scheduled local ones), so `SCHEDULE_EXACT_ALARM` is not needed. Documented here so the team knows this is a future consideration if `scheduleNotificationAsync` is added.

---

## 5. iOS background remote notifications — `enableBackgroundRemoteNotifications`

**Issue**: The plugin supports `enableBackgroundRemoteNotifications: false` (default) or `true`. Enabling background remote notifications requires additional iOS capability setup (UIBackgroundModes in Info.plist).

**No V1 blocker**: V1 uses foreground + background notification receipt only. Background remote notifications (`enableBackgroundRemoteNotifications: true`) is not needed for V1. The plugin's default (`false`) is correct for V1.

---

## 6. `expo-device` availability

**Issue**: `expo-device` is a required dependency for the token registration pattern (`Device.isDevice` check). This package is NOT currently in `package.json`. `npx expo install expo-device` will add it.

**No blocker**: The install command resolves the correct version. `expo-device` is a well-established Expo package.

---

## 7. Listener cleanup pattern

**Issue**: The official example shows listener removal in a `useEffect` cleanup function:
```typescript
return () => {
  notificationListener.remove();
  responseListener.remove();
};
```

For the foundation helper, if it's a plain utility module (not a React component), listener cleanup would need to be exposed as a returned teardown function that the caller (e.g., `AuthProvider` or `app/_layout.tsx`) invokes on unmount/sign-out.

**Recommendation for task 4 implementer**: If `utils/notifications.ts` registers global listeners, export a `cleanupNotifications()` function that removes them. The caller (Task 6 / AuthProvider) should call `cleanupNotifications()` on unmount.

---

## 8. Listener removal vs `remove()` return value

**Issue**: The Expo docs show `listener.remove()` but also note that `addNotificationReceivedListener` and `addNotificationResponseReceivedListener` return a `Subscription` object with a `.remove()` method. Both patterns work.

**No blocker**: Standard pattern is to store the subscription and call `.remove()` in cleanup, or to call the function returned by `addNotificationReceivedListener` directly. Task 4 implementer should pick one pattern and document it clearly.

---

# Push Notifications - Task 4 Research Issues / Blockers
**Date**: 2026-04-23
**Task**: 4 - Expo notification foundation and runtime config

---

## 1. `expo-notifications` SDK 54 version compatibility

**Issue**: The correct version of `expo-notifications` and `expo-device` must match Expo SDK 54. SDK 54 maps to specific minor versions.

**Evidence**: `package.json` line 47: `expo@~54.0.33` confirms SDK 54.

**Status**: Use `npx expo install expo-notifications expo-device` to auto-resolve correct versions rather than manually specifying versions. This ensures version alignment.

**Recommendation**: Run `npx expo install expo-notifications expo-device` rather than editing `package.json` directly.

---

## 2. Android notification channel — naming conflict risk

**Issue**: Creating a channel named `'default'` risks conflict with Expo's default channel behavior. Some Android versions treat `'default'` specially for default sound.

**Evidence**: Expo docs and community examples use both `'default'` and `'default-channel'` as channel IDs.

**Recommendation**: Use `ANDROID_CHANNEL_ID = 'default'` which is established practice, but document that if users hear the default system sound instead of a custom one, the channel name may need adjustment.

---

## 3. iOS push capability — EAS Build infrastructure requirement

**Issue**: For iOS push notifications to work, the app must have the Push Notification capability registered in the Apple Developer account and included in the EAS Build. This is an **EAS Build configuration concern**, not a config.ts or plugin concern.

**Evidence**: `app.config.ts` has no iOS-specific notification configuration beyond the plugin. The plugin handles Info.plist automatically, but the **capability** must be added through Apple Developer Portal and EAS Build.

**Status**: Not a blocker for T4 foundation — the plugin and config are correct. But iOS push will not work in development without proper signing/capability setup.

**Recommendation**: Document this as a pre-production requirement in the notepad, not a T4 blocker.

---

## 4. EAS Build --profile development and notification capability

**Issue**: The current `npm run dev:build:mobile` command uses `--profile development`. Push notification capability may not be enabled for development builds.

**Evidence**: `package.json` line 17: `dev:build:mobile` uses `development` profile.

**Status**: Not a T4 blocker — this is an EAS Build configuration question for the team to address before production push works on iOS.

---

## 5. No existing `utils/notifications.ts` — new file creation

**Issue**: T4 requires creating a new utility file `utils/notifications.ts`. This is a deviation from the existing pattern where utility files are created for existing infrastructure, not new mobile runtime features.

**Evidence**: All existing `utils/*.ts` files correspond to existing packages (`supabase.ts` for Supabase client, `config.ts` for config, `fonts.ts` for expo-font, etc.). No existing file for notifications.

**Status**: This is expected and correct. T4 creates the file; T5/T6/T7/T8/T9 will use it.

---

## 6. `expo-device` — `isDevice` returns `false` on iOS Simulator (expected)

**Issue**: On iOS Simulator, `Device.isDevice` returns `false` (since simulator is not a physical device). Push notifications cannot be tested on iOS Simulator without a physical device or special workaround.

**Evidence**: This is a known Expo/iOS Simulator limitation.

**Status**: Not a blocker for T4 (foundation is platform-agnostic). Will affect T6/T7 testing on simulator.

---

## 7. `expo-notifications` web behavior

**Issue**: `expo-notifications` does not support web. The utility must guard all notification code with `Platform.OS !== 'web'` and the web platform must not import or call notification code.

**Evidence**: Expo documentation confirms `expo-notifications` is native-only.

**Status**: Resolved by design — the utility already includes `isPushSupported()` which returns `false` for web.

---

## 8. No existing notification type imports from T3 (types/notification.ts)

**Issue**: T3 created `types/notification.ts` with `NotificationType`, `NotificationRouteTarget`, `parseNotificationRoute()`, etc. T4's utility should NOT import from `types/notification.ts` — the utility is infrastructure-only, not domain-aware.

**Evidence**: T4 plan says "Keep the handler global and lightweight." The handler should not know about `NotificationType` or route parsing — those are T6/T7 responsibilities.

**Status**: No issue — correct separation. T4 utility handles infrastructure only; T6 registers the listener that calls `parseNotificationRoute()` from `types/notification.ts`.

---

## 9. `setNotificationHandler` must be called before any listener registration

**Issue**: `Notifications.setNotificationHandler` must be called before `addNotificationReceivedListener` or `addNotificationResponseReceivedListener`. If T6 registers listeners before the handler is configured, behavior is undefined.

**Evidence**: Expo docs specify that the handler must be set before listeners are added.

**Status**: T6 must call `bootstrapNotifications()` (which calls `setNotificationHandler`) before registering any listeners. T4 makes this the responsibility of T6 implementer.

---

## 10. No pre-existing `expo-notifications` mock in jest.setup.js

**Issue**: T9 (tests) will need to mock `expo-notifications` and `expo-device`. There is no existing mock for these packages in `jest.setup.js`.

**Evidence**: `jest.setup.js` exists and contains mocks for `AsyncStorage`, `@react-native-async-storage/async-storage`, and Supabase, but no `expo-notifications` mock.

**Status**: Not a T4 blocker — documented as T9 concern.

---

## 11. `expo-notifications` babel/metro configuration

**Issue**: `expo-notifications` may require additional babel/metro configuration for optimal performance (e.g., Reanimated plugin ordering).

**Evidence**: `babel.config.js` contains `@tamagui/babel-plugin` but no specific `expo-notifications` babel configuration. This may or may not be needed for SDK 54.

**Status**: Not investigated fully — Expo SDK 54 with `expo-notifications@~54.0.0` may work without additional babel config. If build errors occur, the implementer should check if `@babel/plugin-transform-react-native-modules` or similar is needed.

---

## 12. Task 4 is unblocked by other tasks

**Issue**: T4 is listed in the plan as "Can Parallel: YES" and "Blocked By: none". However, T4 should ideally be aware of the existing `types/notification.ts` (T3 output) before finalizing the utility's interface.

**Evidence**: T3 created `types/notification.ts` (already confirmed present at `/home/coder/dev/pharma/frontend/types/notification.ts`). T4's utility does not directly import from it — correct separation.

**Status**: T4 is truly unblocked — it only needs package.json, app.config.ts, and the new utility file. No dependency on T1/T2/T3 output.

---

## 13. Pre-existing frontend typecheck failures remain during Task 4 validation (2026-04-23)

- `npx tsc --noEmit` still fails on unrelated existing files outside the notification foundation change, including:
  - `__tests__/hooks/useOrderDetail.test.ts`
  - `__tests__/hooks/useOrderHistoryPaginated.test.ts`
  - `__tests__/hooks/useOrdersPaginated.test.ts`
  - `__tests__/hooks/useUnpaidOrdersPaginated.test.ts`
  - `__tests__/scenes/UnpaidOrders.test.tsx`
  - `__tests__/services/home.service.test.ts`
  - `__tests__/services/order.service.test.ts`
  - `app/(tabs)/_layout.tsx`
  - `scenes/home/Home.tsx`
- This does **not** appear to be caused by Task 4 because `lsp_diagnostics` for the touched files (`package.json`, `app.config.ts`, `utils/notifications.ts`) were clean, while Expo config generation, lint, and web export all succeeded.
- Impact: repo-wide typecheck still cannot be used as a clean green gate for this task until the existing frontend typing backlog is fixed.

---

# Push Notifications - Task 5 Research Issues / Blockers
**Date**: 2026-04-23
**Task**: 5 - Permission and token APIs: service layer research

---

## 1. `expo-notifications` web behavior — service must guard

**Issue**: `expo-notifications` does not support web. Importing it on web (even without calling functions) can cause runtime errors or bundler warnings.

**Official source**: Expo documentation confirms `expo-notifications` is native-only — see "Push notification functionality is unavailable in Expo Go on Android starting from SDK 53" at https://docs.expo.dev/versions/latest/sdk/notifications

**Resolution**: The service must guard all Expo imports/calls with `isPhysicalNotificationDevice()` (which already returns `false` for web). Additionally, if the service file itself is imported on web, the Expo import itself may break. Consider using dynamic imports or conditional exports. For this codebase, `isPhysicalNotificationDevice()` returning `false` for web before any Expo API call is sufficient.

**Recommendation for implementer**: Import `expo-notifications` and `expo-device` at the top of the service file (standard practice). Guard all Expo API calls with `if (!isPhysicalNotificationDevice())` returning early with `{ error: 'not_device' }`. This is sufficient because the service won't be called on web for token operations.

---

## 2. iOS `PROVISIONAL` permission status

**Issue**: On iOS, `getPermissionsAsync()` can return `ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL` when the user has granted provisional permissions (App Store app in testing). The canonical Expo example uses `settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL` as a pass for `allowsNotificationsAsync()`.

**Official source**: https://docs.expo.dev/versions/latest/sdk/notifications — "Call `getPermissionsAsync` to check the current notification permission status. This function has no user-facing effect and is used to verify if the app is allowed to display alerts, play sounds, etc."

**Ambiguity for V1**: The plan specifies explicit permission request ("Push permission diminta pada momen yang masuk akal") rather than auto-prompt. The no-prompt sync (`syncTokenIfGranted`) should only proceed on `'granted'`. However, iOS provisional tokens ARE real tokens that can receive push. If V1 wants to sync tokens for users who have granted provisional permission (without full access), the `syncTokenIfGranted` would need to check `PROVISIONAL` as well.

**Recommendation**: Keep `syncTokenIfGranted` conservative — require full `'granted'` status only. The explicit permission request path (`requestPermission`) can optionally check `PROVISIONAL` as an enhancement, but the plan doesn't require it. Document that iOS provisional is not included in V1 no-prompt sync.

**No blocker**: Implementation can use `status === 'granted'` only. This is the simplest and safest V1 approach.

---

## 3. `requestPermissionsAsync` iOS options — what to pass

**Issue**: The official `requestPermissionsAsync` accepts iOS-specific options:
```typescript
requestPermissionsAsync({
  ios: {
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
  },
});
```

**Official source**: https://docs.expo.dev/versions/latest/sdk/notifications — shows `allowAlert: true, allowBadge: true, allowSound: true` as the standard values.

**Recommendation**: Pass all three as `true` — this is what the official example shows. Do not selectively disable badge or sound — V1 should ask for full permission when the user explicitly requests it.

**No blocker**: This is the established canonical pattern.

---

## 4. Token storage format — is it a plain string or an object?

**Issue**: `getExpoPushTokenAsync()` returns `ExpoPushToken` which is `{ data: string }`. The token stored in `profiles.expo_push_token` should be the raw string (the `data` field), not the full object.

**Source**: The official example at https://docs.expo.dev/push-notifications/push-notifications-setup/ stores `token.data`:
```typescript
token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
```

**Clarification for implementer**: Always extract `.data` from the returned `ExpoPushToken` object before storing. The column `profiles.expo_push_token text` stores a string.

---

## 5. `IosAuthorizationStatus` import path

**Issue**: If the service needs to check iOS-specific `IosAuthorizationStatus.PROVISIONAL`, it needs to import from `expo-notifications`.

**Resolution**: Import the enum if needed:
```typescript
import { IosAuthorizationStatus } from 'expo-notifications';
```

For V1 conservative approach (require `'granted'` only), no need to import this enum.

---

## 6. Service must use authenticated Supabase client for profile updates

**Issue**: Token upsert (`update profiles set expo_push_token = ...`) requires the user's own row to be writable. Using the anon key would be blocked by RLS. The service must use the authenticated Supabase client (same session client used throughout the app, not the service-role client used in Edge Functions).

**Resolution**: The service should use the same Supabase client pattern as `profile.service.ts` — which uses the app-level authenticated client via the `getSupabaseClient()` from `utils/supabase.ts`. The token upsert uses `.eq('id', currentUserId)` to scope the update to the authenticated user.

**Source**: `services/profile.service.ts:196-214` — uses `supabase.from('profiles').update(...)` with `.eq('id', userId)`. The same pattern applies for token upsert.

---

## 7. Token clear on logout — async race condition risk

**Issue**: If a user signs out and signs in as a different user rapidly, there's a race between clearing the old token and upserting the new one. The plan specifies `on SIGNED_OUT` the token should be cleared.

**Recommendation**: The `clearPushToken()` function should be called in the `SIGNED_OUT` handler in T6 (AuthProvider). The async nature of the clear means it might race with a new `syncTokenIfGranted` from the new `SIGNED_IN` handler. This is acceptable for V1 — the new user's token will win on next sync.

**No blocker**: Accept the race as a V1 limitation. A future improvement could use a mutation ID or timestamp comparison to prevent stale token overwrites.

---

## 8. `projectId` resolution from `Constants` vs injected env

**Issue**: T4 and the official Expo example use `Constants.expoConfig?.extra?.eas?.projectId` at runtime. This requires `expo-constants` which is already installed.

**Alternative**: Could the service read from `utils/config.ts` instead? `utils/config.ts` reads from `Constants.expoConfig?.extra` but does not currently export `projectId`.

**Recommendation**: The service should call `resolveNotificationProjectId()` from `utils/notifications.ts` directly, rather than importing from `utils/config.ts`. This keeps the T4 foundation utility as the single resolution point for `projectId`.

**No blocker**: `resolveNotificationProjectId()` is already exported from `utils/notifications.ts` and handles the correct fallback chain.

---

## 9. Android 13+ channel prerequisite before token fetch

**Issue**: On Android 13+, token retrieval fails if no notification channel has been created. T4's `bootstrapAndroidNotificationChannelAsync` creates the channel at app startup. However, if `syncTokenIfGranted` is called before `bootstrapNotificationsAsync` (T4 foundation), the token fetch might fail.

**Official source**: https://docs.expo.dev/versions/latest/sdk/notifications — "On Android 13, users must opt-in to receive notifications through an OS-triggered prompt. This prompt appears only after at least one notification channel is created."

**Resolution**: T4 calls `bootstrapNotificationsAsync` at app startup via `app/_layout.tsx` (T6 wires this). The channel is created before any token sync happens. Token fetch always happens after the Android channel exists.

**No blocker for T5**: The service can assume `bootstrapNotificationsAsync` has already run (from T4/T6 wiring). If it hasn't run, token fetch on Android 13+ would fail — but this would be a T6 wiring bug, not a T5 service bug.

---

## 10. `read_at` mark-read — ownership guard via user_id filter

**Issue**: `markAsRead` updates a notification row. The update filter must include `user_id` to prevent one user from marking another user's notifications as read.

**Resolution**: The service function signature:
```typescript
async function markAsRead(notificationId: string, userId: string): Promise<void>
```
Update call:
```typescript
supabase.from('notifications').update({ read_at: now }).eq('id', notificationId).eq('user_id', userId);
```

This ensures RLS + application-level double enforcement. The RLS policy already allows UPDATE for authenticated user owning the row, but adding `user_id` in the filter is defense in depth.

**No blocker**: This is the established pattern from other services.

---

## 11. Pre-existing TypeScript failures not caused by Task 5

- `npx tsc --noEmit` in `/home/coder/dev/pharma/frontend` continues to report pre-existing failures in unrelated test files (see T1-T4 issues).
- The new service file should be clean — verify with `lsp_diagnostics` on the new file before declaring done.


---

# Push Notifications - Task 5 Unresolved Issues / Open Questions
**Date**: 2026-04-23
**Task**: 5 - Notification service layer for inbox data and token lifecycle APIs

---

## 1. `NotificationRow` type dependency on Task 1 schema

**Issue**: `types/notification.ts` line 89-91 defines `NotificationRow` as:
```typescript
export interface NotificationRow extends Omit<Tables<'notifications'>, 'type'> {
  type: NotificationType;
}
```

This requires `Tables<'notifications'>` to exist in `types/supabase.ts`, which was updated in Task 1 (migration applied to live project). However, if the implementer runs `notification.service.ts` before the migration is confirmed applied, TypeScript will show `notifications` table as missing from `Tables`.

**Action needed**: Before writing the service, run `npx tsc --noEmit` and confirm `Tables<'notifications'>` is resolved in `types/supabase.ts`. If not, the admin-panel migration needs to be applied.

---

## 2. Token column naming conflict

**Issue**: Task 1 migration may have added `expo_push_token` and `expo_push_token_updated_at` columns to `profiles` table. The service's `updateExpoPushToken` and `clearExpoPushToken` functions must use the exact column names from the migration.

**Verification needed**: Confirm exact column names in `types/supabase.ts` `ProfilesUpdate` type before writing the token update functions.

---

## 3. No realtime subscription pattern in the service (future consideration)

**Issue**: `cart.service.ts` shows `subscribeToCartChanges()` realtime pattern. If notifications should also use Supabase Realtime for live inbox updates, the service would need a `subscribeToInboxChanges(userId, onChange)` function.

**V1 scope**: Per plan, task 5 does not include realtime subscription. The service provides polling-based inbox reads only. Realtime is deferred to post-V1.

**Action needed**: None for V1. Documented as a consideration for future iteration.

---

## 4. No existing `notification.service.ts` barrel export entry

**Issue**: `services/index.ts` currently has 12 exports (line 1-12). Adding `export * from './notification.service'` will be the 13th export.

**No blocker**: This follows the established pattern. The implementer should add it after the existing exports.

---

## 5. `Notifications` table RLS requires `user_id` on all operations

**Issue**: All RLS policies on `public.notifications` enforce `auth.uid() = user_id`. This means:
- All service functions must pass `userId` as a query filter
- No function should ever query notifications without a `user_id` guard
- The service must never expose a "get all notifications" function without a userId

**Pattern to follow**: Every function that reads or writes notifications must accept `userId: string` as a required parameter. The `userId` comes from the authenticated session (caller's responsibility to provide).

**No blocker**: This is by design from Task 1 RLS policy. The implementer must ensure all functions enforce ownership.

---

## 6. Test file location follows AGENTS.md convention

**Issue**: `__tests__/services/notification.service.test.ts` does not exist yet. Creating it follows the `__tests__/services/*.test.ts` pattern.

**No blocker**: Standard file creation following established conventions.

---

## 7. No pre-existing `expo-notifications` mock in test infrastructure

**Issue**: `jest.setup.js` has no `expo-notifications` mock. Service tests for `notification.service.ts` should NOT need to mock `expo-notifications` since the service handles database operations only, not Expo APIs. However, if any test helper imports Expo, it will fail.

**Action needed**: Keep all `notification.service.ts` tests focused on Supabase query behavior (mocked via `supabase` mock). Do NOT test Expo integration in service tests.

---

## 8. `NotificationType` enum imported from `types/notification.ts` — verify it matches DB enum

**Issue**: `types/notification.ts` defines `NotificationType` as a union of string literals (line 12). The actual database enum `notification_type` in Supabase may have different values or casing.

**Verification needed**: Confirm `types/supabase.ts` has a `notification_type` enum and its values match `NOTIFICATION_TYPES` in `types/notification.ts` (`'payment_settlement'`, `'payment_failed_or_expired'`, `'order_shipped'`, `'order_delivered_action_required'`, `'order_completed'`). If the DB enum is different, `NotificationRow.type` typing will be misaligned.

**Recommendation**: The service should use `notification.type` as a string and NOT rely on TypeScript enum matching — treat it as a tagged union from the frontend perspective. The `type` column in DB and the `NotificationType` in `types/notification.ts` must be kept in sync by the team.

---

# Push Notifications - Task 6 Research Issues / Open Questions
**Date**: 2026-04-23
**Task**: 6 - Auth/root lifecycle wiring for listeners and no-prompt token sync

---

## 1. Subscription storage location for cleanup

**Issue**: The official examples show listener cleanup in a React component's `useEffect` return. But T6 wiring is in `AuthProvider` (React component) and potentially `app/_layout.tsx` (root component). The question is whether T6 needs to export a `cleanupNotifications()` function from `utils/notifications.ts` or if component-level `useEffect` cleanup is sufficient.

**Status**: Both approaches work. If listeners are registered in `AuthProvider`'s `useEffect`, the cleanup return handles removal on unmount. If T6 also needs a programmatic cleanup (e.g., on SIGNED_OUT without full unmount), a module-level subscription storage with exported `cleanupNotifications()` would be needed.

**Recommendation**: Store subscriptions at module level in `utils/notifications.ts` and export `cleanupNotifications()` as a teardown function. `AuthProvider` calls it on unmount and on SIGNED_OUT. This mirrors what T4's notepad recommended in its Issue 7.

**Not a blocker**: The pattern is clearly documented and implementer can choose.

---

## 2. Order of `bootstrapNotificationsAsync()` vs listener registration

**Issue**: The Expo docs specify that `setNotificationHandler` must be called before registering listeners. T4's `bootstrapNotificationsAsync()` calls `configureForegroundNotificationHandler()` (which calls `setNotificationHandler`). If T6 calls `bootstrapNotificationsAsync()` and then immediately registers listeners in the same effect, the ordering is guaranteed. But if the app structure changes, this ordering must be preserved.

**Resolution**: T6 implementer should ensure the effect that registers listeners also calls `bootstrapNotificationsAsync()` first, or depends on T4's initialization having already run. Since `bootstrapNotificationsAsync()` is idempotent and stores `hasBootstrappedNotifications = true`, calling it multiple times is safe.

**No blocker**: The idempotency guard in T4's implementation handles the ordering concern.

---

## 3. `getLastNotificationResponseAsync` vs `getLastNotificationResponse` (API naming)

**Issue**: The Expo docs reference `getLastNotificationResponse()` (synchronous-looking) but the SDK API may be `getLastNotificationResponseAsync()` or returned via Promise. Checking the exact API shape is needed before implementing cold-start navigation.

**Resolution needed**: Verify the exact method signature:
- Is it `Notifications.getLastNotificationResponse()` (returns value or null)?
- Is it `Notifications.getLastNotificationResponseAsync()` (returns Promise)?
- Is the return type `NotificationResponse | null` or `Promise<NotificationResponse | null>`?

**Source of truth**: [Expo SDK Notifications — Configure React Navigation for Push Notification Redirects](https://docs.expo.dev/versions/latest/sdk/notifications) shows `getLastNotificationResponse()` as a sync accessor in the `getInitialURL` context, but T6 implementer should verify with a type-check or API check.

**Not a blocker for research**: This is an implementation-time verification item.

---

## 4. Web platform guard for listener registration

**Issue**: `expo-notifications` does not support web. T6 implementer must guard listener registration with `isPhysicalNotificationDevice()` or `hasNativeNotificationSupport()` from `utils/notifications.ts`.

**Status**: T4's `bootstrapNotificationsAsync()` already guards with `hasNativeNotificationSupport()`. T6 must do the same for listener registration and token sync calls.

**No blocker**: Pattern already established in T4 and T5 service.

---

## 5. App cold-start vs warm-start notification handling

**Issue**: When a notification tap cold-starts the app (was not running), `addNotificationResponseReceivedListener` may not fire immediately — the listener needs to be registered first, then the tap event is processed. For cold-start, the `getLastNotificationResponse()` approach is needed as documented in Section 7.

**Ambiguity**: Whether `addNotificationResponseReceivedListener` fires for the notification that launched the app (if the app was in background, not fully terminated) depends on OS behavior. The cold-start `getLastNotificationResponse()` approach handles the terminated-app case, but the background-wake case may double-fire or miss.

**Recommendation for T6 implementer**: 
1. On app mount, call `getLastNotificationResponse()` and route if non-null (cold/warm start from notification)
2. ALSO register `addNotificationResponseReceivedListener` for when app is already running and user taps a notification (foreground/warm)
3. This covers both cases: already-running + cold-start

**No blocker**: Both APIs are documented; implementer should test on physical device.

---

## 6. Token clear race on rapid sign-out/sign-in

**Issue**: If a user signs out and a new user signs in rapidly, the `clearExpoPushToken()` from the SIGNED_OUT handler of the old user may race with `syncExpoPushTokenIfPermitted()` from the SIGNED_IN handler of the new user.

**Status**: Documented in T5 issues as accepted V1 limitation. No change needed for T6 — the race is acceptable for V1 as the new user's token will win on next sync.

**No action needed**.

---

## 7. Listener registration timing relative to Redux dispatch

**Issue**: `AuthProvider` dispatches user state to Redux inside a `setTimeout(0)` callback (deferred). If T6 also registers notification listeners and syncs tokens in the same callback, there may be a timing dependency. The notification listeners should be registered once at app mount (outside the auth callback), not per auth event.

**Resolution**: 
- **Listener registration** should happen once in a `useEffect` at the AuthProvider mount level (not inside the auth state change callback)
- **Token sync** is appropriate inside the auth state change callback (per user session change)

This keeps listeners as a one-time global setup and token sync as a per-session action.

**No blocker**: Clear separation of concerns.

---

## 8. Android 13+ `POST_NOTIFICATIONS` permission — no-prompt check only

**Issue**: On Android 13 (API 33)+, the `POST_NOTIFICATIONS` permission is separate from earlier notification permissions. `getPermissionsAsync()` will return `'denied'` if the user has not granted this permission, even on a device that would otherwise support push.

**Resolution for no-prompt sync**: `syncExpoPushTokenIfPermitted()` must handle the case where `getPermissionsAsync()` returns `'denied'` — it should return `permission_not_granted` status and NOT prompt. This is already handled by T5's service implementation.

**UI-triggered prompt path**: In the Notifikasi scene (T8), when the user sees the permission CTA and taps it, `requestExpoPushTokenAndSync()` triggers the OS permission dialog. After granting, the next `syncExpoPushTokenIfPermitted()` call will succeed.

**No blocker**: T5 service already handles this correctly.

---

## 9. Navigation router access in notification response handler

**Issue**: The notification tap handler (`addNotificationResponseReceivedListener`) needs access to `router` to navigate. In `app/_layout.tsx`, the `router` is available from `expo-router`. In `AuthProvider`, router access requires using `expo-router`'s `useRouter()` hook, which requires React context.

**Ambiguity**: Where exactly should the response handler live? Options:
- `app/_layout.tsx`: Has direct `router` access, but this is not inside a React component directly (it's inside a function component)
- A dedicated `NotificationHandler` component rendered inside `app/_layout.tsx` that calls `useRouter()`
- The handler could dispatch an event that a hook or component picks up

**Recommendation**: Create a thin `NotificationHandler` component inside `app/_layout.tsx`:
```typescript
function NotificationHandler() {
  const router = useRouter();
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      // parse route using T3 helpers, navigate with router
    });
    return () => subscription.remove();
  }, [router]);
  return null;
}
```

Then render `<NotificationHandler />` inside the root layout before `<Router />`.

**No blocker**: Standard Expo Router pattern.

---

## 10. iOS Simulator and `Device.isDevice` — listener testability

**Issue**: On iOS Simulator, `Device.isDevice` returns `false`. Listeners registered when `Device.isDevice` is `false` may not behave as expected on simulator.

**Status**: Documented in T4 issues — not a T6 blocker. Physical device testing required for push notification listeners.

**No action needed**.

---

## 11. `getLastNotificationResponse` requires iOS Safari context or proper app lifecycle

**Issue**: On iOS, `getLastNotificationResponse()` works when the app was opened via a notification tap. However, its behavior when the app is backgrounded and brought back to foreground without tapping is less reliable — it may return the last response from a previous session, not the current one.

**Recommendation**: Test on physical devices to verify `getLastNotificationResponse()` doesn't stale-route on background-to-foreground without tap. If stale, implementer may need additional state tracking to avoid re-navigating to a stale notification destination.

**Not a blocker for research**: Implementation-time test verification item.

---

## 12. Listener duplicate registration risk on React StrictMode or hot reload

**Issue**: In development, React StrictMode may double-invoke effects. If listener registration is inside a `useEffect`, StrictMode in development may register the listener twice without cleaning up properly between invocations.

**Status**: Expo SDK documentation does not explicitly address StrictMode. The cleanup function (`return () => subscription.remove()`) should handle this, but implementer should verify in development that listeners are not duplicated.

**Mitigation**: T4's `bootstrapNotificationsAsync()` already uses module-level `hasConfiguredForegroundNotificationHandler` and `hasBootstrappedNotifications` guards. T6 implementer should add a similar module-level guard for listener registration to prevent double registration.

**No blocker**: Well-understood React StrictMode behavior.


---

# Push Notifications - Task 7 Research Issues / Blockers
**Date**: 2026-04-23
**Task**: 7 - Build `useNotifications` hook with inbox state machine and optional live updates

---

## 1. `subscribeToInboxChanges` should live in service, not hook — decision needed

**Issue**: The repo has two valid patterns for realtime:
- Pattern A: Subscription factory in service (`subscribeToCartChanges` in `services/cart.service.ts`) + hook integrates via refs
- Pattern B: Subscription directly in hook using `supabase.channel()` inline

**Evidence**:
- `services/cart.service.ts:850-918` — service owns the subscription factory
- `hooks/useCartPaginated.ts:385-416` — hook calls the service factory, stores cleanup ref

**Recommendation for task 7**: Pattern A — add `subscribeToInboxChanges` to `services/notification.service.ts` mirroring the cart pattern exactly. This keeps Supabase channel management in the service layer where it belongs per the repo's architecture.

**No blocker**: This is a clear decision based on existing repo evidence.

---

## 2. `NotificationRealtimeChange` type — duplicate of existing notification row type

**Issue**: The realtime payload `new` / `old` from Supabase `postgres_changes` returns the raw `NotificationTableRow` (from `Tables<'notifications'>`), but the service normalizes to `NotificationRow` (from `types/notification.ts`). The realtime callback needs to normalize the raw rows before passing to the hook.

**Resolution**: Use `normalizeNotificationRow()` from `notification.service.ts` on both `payload.new` and `payload.old` in the realtime handler.

**No blocker**: Pattern already exists in `subscribeToCartChanges` which uses `toCartRealtimeItem()` normalization.

---

## 3. Permission status integration in the hook

**Issue**: The hook needs to expose whether the user has granted push permission so the scene can render a CTA card. The service already has `syncExpoPushTokenIfPermitted()` which returns `permissionStatus`. But calling it inside the hook means an extra API call on mount.

**Options**:
- Option A: Hook calls `syncExpoPushTokenIfPermitted(userId)` on mount (adds 1 Supabase call per mount)
- Option B: Scene calls `syncExpoPushTokenIfPermitted` separately and passes `permissionStatus` as a param to the hook
- Option C: Hook fetches permission status via `Notifications.getPermissionsAsync()` directly (Expo API, not Supabase)

**Recommendation**: Option A — hook calls `syncExpoPushTokenIfPermitted` as part of initial load. This is a no-prompt call (uses `getPermissionsAsync` only) and is fast. The result (`permissionStatus`) flows into the hook state for the scene to consume.

**No blocker**: Standard no-prompt flow, fast enough to call on mount.

---

## 4. Unread count — derived locally or fetched separately?

**Issue**: The hook exposes `unreadCount`. Should this be:
- Derived locally: `items.filter(n => !n.read_at).length` (free, no extra call)
- Fetched separately: `fetchUnreadNotificationCount(userId)` (extra Supabase call)

**Resolution**: Derived locally — the full inbox fetch already returns all rows with `read_at` values. `unreadCount` is `items.filter(n => !n.read_at).length` computed in the hook's derived state.

**No blocker**: Follows the "no extra round-trip" principle.

---

## 5. Focus refresh + realtime INSERT interaction

**Issue**: When a realtime INSERT arrives while the user is looking at the inbox, the new item is prepended to `items`. If the user then does a pull-to-refresh, the full fetch might return the same item again (if the server hasn't processed dedup). The `read_at` of the new item would be `null`, so it appears as unread.

**Resolution**: The realtime INSERT should use the same dedup logic as `applyRealtimeChange` — if `currentItems.some(item => item.id === insertedItem.id)`, skip the insert.

**No blocker**: Already resolved in the `applyRealtimeChange` pattern from `useCartPaginated.ts`.

---

## 6. What happens when realtime is unavailable?

**Issue**: Supabase Realtime may be disabled, the user's network blocks WebSocket, or the `notifications` table has realtime disabled in Supabase. The hook should degrade gracefully.

**Resolution**: 
- If `subscribeToInboxChanges` calls back with `reconnecting` or `disconnected` repeatedly, set `realtimeState: 'unavailable'`
- The hook should still work with focus-refresh as fallback
- The plan explicitly says "falling back to fetch + focus refresh" is acceptable

**No blocker**: Covered by the connection-state tracking pattern from `useCartPaginated`.

---

## 7. `deleteNotification` vs `markAsRead` — does the hook need delete?

**Issue**: The plan says "dismiss item" behavior. The service exposes `deleteNotification`. But does V1 UI actually allow deleting notifications? The current placeholder scene has no delete affordance.

**Resolution**: Include `dismissItem(notificationId)` in the hook return type pointing to `deleteNotification`. Even if the scene doesn't expose a swipe-to-delete UI in V1, having the hook method available is harmless.

**No blocker**: Service already has the method.

---

## 8. No existing hook test for realtime + permission integration

**Issue**: The closest existing test (`useCartPaginated.test.ts`) covers realtime integration, but there's no precedent for testing permission CTA state transitions in a hook test.

**Recommendation**: Mirror the `useCartPaginated.test.ts` realtime mock pattern. For permission CTA, mock `syncExpoPushTokenIfPermitted` and `requestExpoPushTokenAndSync` inline (same as other service mocks).

**No blocker**: Patterns clearly established in `useOrderDetail.test.ts` and `useCartPaginated.test.ts`.

---

## 9. `useFocusEffect` in tests — already mocked in `useOrderDetail.test.ts`

**Issue**: Need to verify the `expo-router` mock is applied globally in `jest.setup.js` or per-test.

**Finding**: `__tests__/hooks/useOrderDetail.test.ts` line 14-16 mocks `expo-router` per-test with `jest.mock(...)`. This is already the established pattern. The `useNotifications` test should follow the same per-test mock.

**No blocker**: Pattern confirmed and working.

---

## 10. Hook must handle `userId` being undefined / null

**Issue**: Like `useCartPaginated` which returns empty state when `userId` is missing, `useNotifications` must handle the case where there is no authenticated user (e.g., navigating to notifications tab while logged out, though the route is protected).

**Resolution**: The hook should return empty/idle state when `userId` is falsy, same as `useCartPaginated` lines 242-254.

**No blocker**: Pattern already established.

---

## 11. `markAsRead` optimistic update vs server confirmation

**Issue**: When user taps a notification, should the UI update `read_at` optimistically (immediately in local state) or wait for server confirmation?

**Resolution**: Follow `useOrderDetail.confirmReceived` pattern — call the service, then call `fetchInbox('refresh')` to get the authoritative state. Do NOT optimistically update local state without confirmation. This avoids inconsistency if the server rejects the update.

**No blocker**: `useOrderDetail.confirmReceived` at lines 174-217 shows the exact pattern.

---

## 12. No Redux cache for notifications — plan constraint respected

**Issue**: The plan explicitly says "Keep state local to the hook; do NOT add Redux cache in V1." The existing `app.slice.ts` has order caching (`invalidateOrdersByStatusCache`) but should NOT be extended for notifications.

**Status**: Confirmed — do NOT add notification cache to Redux. Hook-local `useState` + focus-refresh is the V1 pattern.

---

## 13. Concurrent refresh guard

**Issue**: If user triggers pull-to-refresh while a focus-refresh is in-flight, there could be two concurrent fetches. The request-id pattern in `useOrderDetail` handles this by having both use the same `activeRequestIdRef` counter — whichever response arrives with the latest ID wins.

**Resolution**: Both `fetchInbox('initial')` and `fetchInbox('refresh')` increment the same `activeRequestIdRef`. The guard `activeRequestIdRef.current !== requestId` ensures only the latest response updates state.

**No blocker**: Pattern confirmed in `useOrderDetail.ts` lines 68-83.

---

## 14. Realtime channel naming uniqueness

**Issue**: `subscribeToCartChanges` uses `${Date.now()}:${Math.random().toString(36).slice(2, 8)}` to ensure channel name uniqueness. The same pattern should be used for `subscribeToInboxChanges`.

**Status**: Already confirmed — this is the established pattern from `cart.service.ts:856`.

---

## 15. Web platform — realtime not supported

**Issue**: Supabase Realtime uses WebSocket which is not available in the same way on web. The hook should set `realtimeState: 'unavailable'` on web.

**Resolution**: The service's `subscribeToInboxChanges` should check `Platform.OS === 'web'` and immediately call `onConnectionStateChange?.('disconnected')` and return a no-op cleanup function.

**No blocker**: `hasNativeNotificationSupport()` in `utils/notifications.ts` already guards Expo APIs for web. The service should add a similar guard for realtime.

---

## Task 8 Verification Notes / Non-blocking Issues (2026-04-23)

- `lsp_diagnostics` reported zero issues for `scenes/notifications/Notifications.tsx` and `__tests__/scenes/Notifications.test.tsx` after the inbox UI replacement.
- Focused Jest passed for `__tests__/scenes/Notifications.test.tsx`, targeted ESLint passed for the modified files, and `npm run dev:build:web` succeeded.
- Repo-wide `npx tsc --noEmit --pretty false` still fails due unrelated pre-existing issues outside this task (for example `__tests__/hooks/useOrderDetail.test.ts`, `__tests__/hooks/useOrdersPaginated.test.ts`, `__tests__/services/home.service.test.ts`, `app/(tabs)/_layout.tsx`, and `scenes/home/Home.tsx`). The notifications scene/test files are not part of the remaining `tsc` error list.

## Task 9 Issues Encountered / Resolved (2026-04-23)

- `npm run test` initially failed in `__tests__/scenes/Notifications.theme.test.tsx` before executing assertions.
- Failure detail: the stale theme test imported the current notifications scene without scene-boundary mocks, which fell through to the `@/hooks` barrel and then `react-redux/dist/react-redux.legacy-esm.js`, causing `SyntaxError: Cannot use import statement outside a module`.
- The same file was also outdated functionally because it still asserted removed placeholder copy (`Segera Hadir`, `Under Maintenance`) instead of the shipped inbox UI.
- Resolution: rewrote `__tests__/scenes/Notifications.theme.test.tsx` with inline notifications mocks and current-screen assertions, then re-ran targeted notifications suites plus the full repo gates.
- Final state: `npm run lint` passed and `npm run test` passed with `114` suites / `667` tests green. No remaining notifications-specific failures were left open for this task.

## Task 10 Verification Notes / Non-blocking Issues (2026-04-24)

- `lsp_diagnostics` reported zero issues for `utils/notifications.ts`, `services/notification.service.ts`, `hooks/index.ts`, `services/index.ts`, `scenes/notifications/Notifications.tsx`, `__tests__/scenes/Notifications.test.tsx`, `__tests__/scenes/Notifications.theme.test.tsx`, and `__tests__/services/notification.service.test.ts`.
- Focused Jest passed for `__tests__/services/notification.service.test.ts`, `__tests__/scenes/Notifications.test.tsx`, `__tests__/scenes/Notifications.theme.test.tsx`, and the unrelated-screen proof test `__tests__/scenes/AllProducts.test.tsx`.
- Targeted ESLint passed for the modified files, and `npm run dev:build:web` succeeded after increasing the tool timeout; the exported route list included both `/home/all-products` and `/(tabs)/home/all-products`.
- Repo-wide `npx tsc --noEmit --pretty false` still fails due unrelated pre-existing issues outside this task (for example `__tests__/hooks/useOrderDetail.test.ts`, `__tests__/hooks/useOrdersPaginated.test.ts`, `__tests__/services/home.service.test.ts`, `app/(tabs)/_layout.tsx`, and `scenes/home/Home.tsx`). None of the edited notification import-leak files appeared in the reported error list.
