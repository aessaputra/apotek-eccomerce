# Push Notifications / Notifikasi — Supabase Migration Research (Admin-Panel)

## Migration File Naming & Placement

- Path: `/home/coder/dev/pharma/admin-panel/supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Naming: timestamp (`YYYYMMDDHHMMSS`) + underscore + descriptive lowercase name
- After local migration creation, timestamp may diverge from live metadata (see MIGRATION_HISTORY_RECONCILIATION.md); use `npx supabase migration list --linked` to verify before pushing
- Do NOT edit existing applied migrations; create new additive migrations only
- All migrations wrapped in `begin;/commit` blocks
- Idempotent SQL guards: `if not exists`, `if not exists ... drop`, `add column if not exists`

## Exact Migration Files to Imitate

### 1. `20260310204000_align_checkout_payment_shipping_schema.sql`
- **What it does**: Creates `webhook_idempotency` table with composite unique constraint
- **Pattern to copy**: Table creation with `gen_random_uuid()` primary key, composite unique `unique (provider, event_key)`, timezone-aware defaults
- Key snippet:
```sql
create table if not exists public.webhook_idempotency (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  created_at timestamptz default timezone('utc'::text, now()),
  unique (provider, event_key)
);
create index if not exists webhook_idempotency_provider_created_idx
  on public.webhook_idempotency (provider, created_at desc);
```

### 2. `20260311102000_harden_checkout_and_webhook_idempotency.sql`
- **What it does**: Adds idempotency column to orders + creates unique conditional index
- **Pattern to copy**: `add column if not exists`, `create unique index if not exists ... where column is not null`
```sql
alter table public.orders
  add column if not exists checkout_idempotency_key text;
create unique index if not exists orders_checkout_idempotency_key_uidx
  on public.orders (checkout_idempotency_key)
  where checkout_idempotency_key is not null;
```

### 3. `20260421111409_add_customer_completion_stage.sql`
- **What it does**: Adds multiple columns to `public.orders`, creates conditional index, adds check constraint, backfill
- **Pattern to copy**: Multiple `add column if not exists`, check constraint with `do $$ begin ... end $$`, conditional index with `where` clause, backfill CTE
```sql
alter table public.orders
  add column if not exists customer_completed_at timestamptz,
  add column if not exists customer_completed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_customer_completion_source_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_customer_completion_source_check
      check (
        customer_completion_source is null
        or customer_completion_source = any (array['customer'::text, 'admin'::text, 'system_backfill'::text])
      );
  end if;
end;
$$;

create index if not exists orders_delivered_completion_idx
  on public.orders (user_id, customer_completed_at, complaint_window_expires_at, created_at desc)
  where status = 'delivered';
```

### 4. `20260325153000_add_webhook_side_effect_tasks.sql`
- **What it does**: Creates `webhook_side_effect_tasks` with composite primary key and default timestamp columns
- **Pattern to copy**: Simple table creation with `if not exists`, index on `updated_at`
```sql
create table if not exists public.webhook_side_effect_tasks (
  order_id uuid primary key references public.orders(id) on delete cascade,
  needs_stock boolean not null default false,
  needs_biteship boolean not null default false,
  retry_count integer not null default 0,
  last_error text,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists webhook_side_effect_tasks_updated_idx
  on public.webhook_side_effect_tasks (updated_at desc);
```

### 5. `20260417174713_normalize_order_payment_shipment_schema.sql`
- **What it does**: Creates `shipments` table with unique indexes, RLS policies, trigger function, and complex backfill
- **Pattern to copy**: Unique index pattern with `where` clause for null filtering, RLS policy naming (`"Admins can manage all X"`, `"Users can view own X"`), `security definer` functions with `search_path = public`

## Dedup / Idempotency Pattern (Existing Architecture)

- **Existing table**: `public.webhook_idempotency` with `(provider, event_key)` unique constraint
- **Existing function**: `public.apply_midtrans_webhook_transition(provider, event_key, ...)` inserts into `webhook_idempotency` first, returns `applied boolean` indicating if this was a new event or a duplicate
- **Pattern**: `insert ... on conflict (provider, event_key) do nothing returning id` → if `id` is null, skip processing
- **event_key format** (Midtrans): `transaction_id:transaction_status:status_code:gross_amount:fraud_status`
- **For notifications**, implementer should follow same pattern with `provider = 'notification'` and `event_key = user_id:event_type:event_id` (or similar composited key)
- The `webhook_idempotency` table is already shared infrastructure; consider whether notifications should reuse it or have its own dedupe table

## RLS Policy Naming Convention

- **Admin policies**: `"Admins can manage all <table_name>"` for all operations
- **User policies**: `"Users can view their own <table_name>"` for select
- **Pattern for access check**: Use `private.is_admin()` helper (defined in `20260401103000_optimize_rls_policies_and_indexes.sql`) rather than inline subquery
- Example from `20260401103000_optimize_rls_policies_and_indexes.sql`:
```sql
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (((select auth.uid()) = id) or (select private.is_admin()));
```
- For notification table, likely needs: anon read (for FCM token fetch?), authenticated read (own notifications), service_role insert (from Edge Functions), admin full access

## Index Naming Convention

- Unique indexes: `<table>_<column>_uidx` or `<table>_<column1>_<column2>_uidx`
- Regular indexes: `<table>_<column>_idx` or descriptive (`webhook_side_effect_tasks_updated_idx`)
- Conditional unique indexes: always include `where column is not null` in definition
- All indexes: always `create index if not exists` or `create unique index if not exists`

## Column Addition Pattern (profiles / auth.users references)

- When adding `user_id` columns, they reference `auth.users(id) on delete set null` (see `order_activities.actor_id` in `20260418123948_adopt_and_harden_order_activities_access.sql`)
- But RLS policies reference `public.profiles(id)` via `auth.uid()`, not `auth.users(id)`
- Pattern: FK to `auth.users(id)` for audit columns (actor, creator), but application-level access checks use `public.profiles` with `role = 'admin'`
- `private.is_admin()` implementation checks both JWT `user_role` claim and `profiles.role = 'admin'`

## Read Status Semantics — No Match Found

- **search result**: Zero uses of `read_at` or `is_read` anywhere in admin-panel migrations
- **Existing timestamps**: `created_at`, `updated_at`, `delivered_at`, `customer_completed_at`, `paid_at`, `expired_at`, `complaint_window_expires_at`
- **Implication**: No existing pattern to imitate. Implementer has full discretion. `read_at timestamptz` (nullable, set on first read) or `is_read boolean default false` both acceptable. Recommend `read_at` for future query flexibility (e.g., "unread first, then by created_at").

## Webhook / Side-Effect Task Table Patterns (Queue Analogue)

- `webhook_side_effect_tasks` has `retry_count`, `last_error`, `lease_owner`, `lease_until` for lease-based concurrency
- For notifications, if a task queue is needed, follow same column shape
- If notifications are simpler (single insert, no retry), skip task table and just use the `notifications` table with RLS + idempotency key

## Timestamp Conventions

- Always use `timezone('utc'::text, now())` not `now()` directly
- All `timestamptz` columns use this pattern
- Default column: `default timezone('utc'::text, now())`

## Unknowns / Blockers

1. Whether `public.notifications` should reuse `webhook_idempotency` table or have its own dedupe key — architecture decision needed
2. Whether notifications need a task/queue table or just direct inserts — depends on push delivery failure handling
3. FCM token storage location not yet investigated (should be in `public.profiles` as `fcm_token` column or separate `user_notification_tokens` table?) — needs clarification from implementer
4. No existing `read_at` / `is_read` pattern; implementer must decide and document rationale

# Push Notifications - Task 1 Research Findings
**Date**: 2026-04-23
**Task**: 1 - Supabase notification contract and migrations

---

## 1. Token Storage: `profiles` column vs separate table

**Decision**: Store `expo_push_token` and `expo_push_token_updated_at` as columns on `public.profiles`, NOT a separate token table.

**Official Source**:
- Supabase official push notifications guide (https://supabase.com/docs/guides/functions/examples/push-notifications) shows the canonical pattern: `ALTER TABLE public.profiles ADD COLUMN fcm_token text` (or `expo_push_token` for Expo). The Edge Function fetches the token directly via `supabase.from('profiles').select('expo_push_token').eq('id', payload.record.user_id)`.
- The example repo at `github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/` uses the same column-on-profiles pattern.

**Rationale for V1 single-token-per-user**: 
- V1 scope explicitly uses single active token per user (per plan: "single active Expo token per user on `profiles`"). A separate token registry adds multi-device complexity that is out of scope.
- Adding two nullable columns to `profiles` is additive, non-breaking, and aligns with the existing ownership model (`profiles.id` references `auth.users(id)`).
- The token lifecycle (upsert on login, clear on logout) maps cleanly to row-level profile updates.

**Conclusion for task**: Add `expo_push_token text` and `expo_push_token_updated_at timestamptz` to `profiles` via migration. Do NOT create a `device_tokens` table in V1.

---

## 2. `read_at` vs `is_read`: Durable Inbox Contract

**Decision**: Use `read_at timestamp with time zone null` as the read-state column, NOT a boolean `is_read`.

**Evidence**:

1. **Temporal correctness**: `read_at` records when the notification was read. A null `read_at` clearly means "unread." A boolean loses the temporal signal and requires guessing at history.

2. **Plan alignment**: The plan's schema definition explicitly names `read_at` as the column: `read_at timestamp with time zone null, created_at timestamp with time zone not null default now()`. This naming matches the official example pattern where notifications table has `created_at timestamp with time zone not null default now()`.

3. **No counter-example found in official docs**: Supabase's own RLS/policy examples show timestamp columns for temporal state (e.g., todo lists use `inserted_at`). The official push-notifications example notification table has only minimal columns but the broader Postgres conventions support timestamp over boolean for state that accumulates history.

4. **UI rendering advantage**: Displaying "2 hours ago" vs "yesterday" requires `read_at`. A boolean only answers "read/unread" with no granularity.

**Implementation note**: `read_at` should be nullable — `null` = unread, non-null = read. To mark as read, UPDATE the row setting `read_at = now()`. Do NOT backfill existing rows.

---

## 3. Minimum RLS Policy Set

**Decision**: Four policies on `public.notifications` — SELECT, INSERT, UPDATE, DELETE — all enforcing `auth.uid() = user_id` using `to authenticated`.

**Official Sources**:

1. Supabase RLS documentation (https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx) explicitly shows the pattern:

```sql
create policy "Users can update their own profile."
on profiles for update
to authenticated                    -- the Postgres Role (recommended)
using ( (select auth.uid()) = user_id )       -- checks if existing row complies
with check ( (select auth.uid()) = user_id ); -- checks if new row complies
```

2. Supabase examples repo (https://github.com/supabase/supabase/blob/master/examples/todo-list/sveltejs-todo-list/README.md) shows full CRUD policy set:

```sql
create policy "Individuals can create todos." on todos for
    insert with check ((select auth.uid()) = user_id);
create policy "Individuals can view their own todos." on todos for
    select using ((select auth.uid()) = user_id);
create policy "Individuals can update their own todos." on todos for
    update using ((select auth.uid()) = user_id);
create policy "Individuals can delete their own todos." on todos for
    delete using ((select auth.uid()) = user_id);
```

3. Performance guidance (https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx) recommends explicit `to authenticated` to prevent policy evaluation for anon users — "stops execution at the role check step."

**Minimum V1 policy set for `public.notifications`**:

```sql
-- Enable RLS
alter table public.notifications enable row level security;

-- SELECT: user can read their own notifications
create policy "notifications_select_own" on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT: user can only insert notifications for themselves (enforced at write time)
create policy "notifications_insert_own" on public.notifications
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- UPDATE: user can only update their own notifications (read_at mark)
-- USING filters which rows are selectable for update; WITH CHECK prevents changing user_id
create policy "notifications_update_own" on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)

## Task 5 Implementation Learnings (2026-04-23)

- Frontend notification access now has a dedicated service boundary at `services/notification.service.ts`, exported through `services/index.ts`, so later hooks/scenes can stay off direct Supabase and Expo-notification calls.
- Inbox methods follow the repo's existing `{ data, error }` service contract and apply defensive ownership filters on every notification mutation (`eq('user_id', userId)` and `eq('id', notificationId)`), even though RLS already exists.
- `markNotificationAsRead()` preserves first-read semantics by updating only rows where `read_at is null`, then falling back to a scoped fetch if the row was already read.
- Token lifecycle stays on `profiles` as planned: `updateExpoPushToken()` writes `expo_push_token` plus `expo_push_token_updated_at`, and `clearExpoPushToken()` nulls both fields for logout/account reset.
- Expo token sync is intentionally split into two callable paths: `syncExpoPushTokenIfPermitted()` uses `getPermissionsAsync()` without prompting, while `requestExpoPushTokenAndSync()` uses `requestPermissionsAsync()` explicitly. Both return controlled statuses for unsupported platform, simulator/non-physical device, missing project ID, permission-not-granted, and empty-token cases.
- The service reuses notification infra only from `utils/notifications.ts`, specifically `resolveNotificationProjectId()`, `isPhysicalNotificationDevice()`, and Android channel bootstrap, without introducing listener registration or routing side effects.
- Focused coverage lives in `__tests__/services/notification.service.test.ts` and verifies inbox ordering, mark-read persistence, permission/token guard behavior, and profile token update/clear behavior with inline mocked Supabase and Expo APIs.
  with check ((select auth.uid()) = user_id);

-- DELETE: user can only delete their own notifications
create policy "notifications_delete_own" on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

**Key point for UPDATE policy**: The `with check` clause prevents a user from reassigning a notification to another user_id during an update — this is important because the only UPDATE operation in V1 is `read_at` update, and the user_id should never change.

---

## 4. `source_event_key` Deduplication / Idempotency

**Decision**: Add a `source_event_key text unique` column to `public.notifications` to prevent duplicate rows from replayed webhooks or status transitions.

**Evidence**:

1. Supabase Edge Function blog (https://github.com/supabase/supabase/blob/master/apps/www/_blog/2025-09-12-processing-large-jobs-with-edge-functions.mdx) shows application-level dedup pattern using Postgres unique constraint errors:

```typescript
const { error } = await supabase.from('articles').insert({ url, site })
if (error && !error.message.includes('duplicate')) {
  console.error(`Error inserting: ${url}`, error)
}
```

2. The plan explicitly requires idempotency: "Replay event does not create duplicate inbox rows." The canonical way to handle this in Postgres is a unique constraint on the event key, combined with `on conflict do nothing` or error handling.

3. Existing pattern in this codebase: `webhook_idempotency` table at `types/supabase.ts:589-606` already uses an `event_key` + `provider` uniqueness pattern. For notifications, a simpler approach is direct unique constraint on `source_event_key` since V1 doesn't need provider-scoped dedup.

**Migration SQL pattern**:
```sql
-- Add source_event_key with uniqueness constraint
alter table public.notifications add column source_event_key text;
create unique index notifications_source_event_key_unique 
  on public.notifications (source_event_key) 
  where source_event_key is not null;
```

**Why not a separate dedup table**: A separate table (like `webhook_idempotency`) adds a join and is designed for provider-scoped events. For notifications, a direct unique index on `source_event_key` is sufficient and simpler for V1.

**Event writers must populate `source_event_key`** from the originating domain event (e.g., `payment_settlement:{order_id}`, `order_shipped:{order_id}`). If the same event fires twice, the second insert fails with unique constraint violation — safe to ignore.

---

## 5. Best-Effort Push Delivery — Operational Meaning

**Decision**: "Best-effort" means: (a) the `notifications` row MUST be created regardless of Expo delivery outcome, (b) the Edge Function should not throw or roll back on Expo API failure, (c) `DeviceNotRegistered` tokens should be cleared from `profiles` in a follow-up step, (d) no push receipt polling is required for V1.

**Official Sources**:

1. **Expo Push docs on delivery guarantees** (https://docs.expo.dev/push-notifications/sending-notifications/#delivery-guarantees):
   > "Expo makes a best effort to deliver notifications to the push notification services operated by Google and Apple. Expo's infrastructure is designed for at least one attempt at delivery to the underlying push notification services."

2. **Expo Push docs on error handling** (https://docs.expo.dev/push-notifications/sending-notifications/#push-receipt-errors):
   > `DeviceNotRegistered`: "The device cannot receive push notifications anymore and you should stop sending messages to the corresponding Expo push token."

3. **Supabase official Edge Function push example** (https://supabase.com/docs/guides/functions/examples/push-notifications):
   The function fetches the token and sends to Expo but does NOT wrap the Expo call in a transaction. The database insert happens before/independently of the push call. If the push fails, the row is already committed.

**V1 Operational Behavior**:

| Scenario | Database row | Push attempt | Token cleanup |
|---|---|---|---|
| Valid token, Expo succeeds | Created | 1 attempt | No action needed |
| Valid token, Expo returns error | Created | Logged, not retried | No auto-clear in V1 |
| Missing/null token | Created | Skipped gracefully | N/A |
| `DeviceNotRegistered` receipt | Created | Logged | Requires follow-up (out of V1 scope) |
| Edge Function throws | Depends on whether insert committed first | No push | N/A |

**Key design point**: The webhook fires AFTER the notification row is inserted. The Edge Function receives the new row as webhook payload. If the Edge Function fails entirely (network error, uncaught exception), the row is already in the DB and can be retried by checking for rows with no corresponding successful push log. However, V1 does NOT implement push receipt polling — it accepts that push is best-effort and the inbox is the source of truth.

**Implementation guidance for Edge Function** (Task 2):
- Create the Edge Function with `supabase.functions deploy push --no-verify-jwt`
- Set `EXPO_ACCESS_TOKEN` via `supabase secrets set`
- The function must NOT wrap the notification insert in a transaction with the push call
- Handle missing/null token with early return (log and exit 200)
- Do NOT throw on Expo API error — log it and return

---

## 6. Webhook trigger configuration

**Official Source**: Supabase push notifications guide (https://supabase.com/docs/guides/functions/examples/push-notifications):

> "Conditions to fire webhook: Select the `notifications` table and tick the `Insert` event."
> "Webhook configuration: Supabase Edge Functions."
> "Edge Function: Select the `push` edge function and leave the method as `POST` and timeout as `1000`."
> "HTTP Headers: Click 'Add new header' > 'Add auth header with service key' and leave Content-type: `application/json`."

**Note on timeout**: 1000ms is the recommended timeout for the webhook trigger. The Expo Push API call should be fast (<500ms in normal conditions). If the call times out, the webhook is marked as failed by Supabase but the notification row is already committed — this is acceptable for best-effort.

---

## 7. Schema Summary (Decision-Ready)

```sql
-- Migration: add expo_push_token columns to profiles
alter table public.profiles
  add column expo_push_token text,
  add column expo_push_token_updated_at timestamptz;

-- Migration: create notifications table
create table public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  type text not null,                          -- e.g., 'payment_settlement', 'order_shipped'
  title text not null,                         -- Bahasa Indonesia, non-PHI
  body text not null,                          -- Bahasa Indonesia, non-PHI
  cta_route text,                              -- e.g., 'orders/order-detail/123'
  data jsonb,                                  -- supplemental payload for deep-link
  priority text default 'normal',              -- 'normal' | 'high'
  source_event_key text unique,                -- idempotency key, e.g., 'payment_settlement:order_123'
  read_at timestamptz,                         -- null = unread, non-null = read
  created_at timestamptz not null default now()
);

-- Index for efficient newest-first inbox queries
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- RLS policies
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_insert_own" on public.notifications
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using ((select auth.uid()) = user_id);
```

---

## 8. References Summary

| Topic | Source |
|---|---|
| Token on profiles, Edge Function pattern | https://supabase.com/docs/guides/functions/examples/push-notifications |
| Full Edge Function code | https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/supabase/functions/push/index.ts |
| Expo Push API contract | https://docs.expo.dev/push-notifications/sending-notifications/ |
| Expo delivery guarantees | https://docs.expo.dev/push-notifications/sending-notifications/#delivery-guarantees |
| Expo push receipts and errors | https://docs.expo.dev/push-notifications/sending-notifications/#push-receipt-errors |
| Expo notification setup (mobile) | https://docs.expo.dev/versions/latest/sdk/notifications |
| RLS policy examples | https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx |
| Full CRUD RLS policies | https://github.com/supabase/supabase/blob/master/examples/todo-list/sveltejs-todo-list/README.md |
| RLS performance (to authenticated) | https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx |
| Edge Function idempotency pattern | https://github.com/supabase/supabase/blob/master/apps/www/_blog/2025-09-12-processing-large-jobs-with-edge-functions.mdx |

---

## 9. Task 1 implementation outcome (2026-04-23)

- Created additive migration file: `/home/coder/dev/pharma/admin-panel/supabase/migrations/20260423091427_add_notifications_table.sql`
- The migration follows local admin-panel conventions:
  - `begin; ... commit;`
  - `alter table ... add column if not exists`
  - `create table if not exists`
  - `timezone('utc'::text, now())` defaults
  - `create index if not exists` and `create unique index if not exists`
  - guarded constraint creation with `do $$ begin ... end; $$`
- The durable inbox contract implemented in SQL is:
  - `public.profiles.expo_push_token text`
  - `public.profiles.expo_push_token_updated_at timestamptz`
  - `public.notifications(id, user_id, type, title, body, cta_route, data, priority, source_event_key, read_at, created_at)`
  - `notifications.user_id` FK → `public.profiles(id) on delete cascade`
  - partial unique dedupe index on `(user_id, source_event_key) where source_event_key is not null`
  - authenticated ownership CRUD policies on `public.notifications`
- Safe SQL validation succeeded against the connected Supabase project by executing the full migration body inside a manual `begin; ... rollback;` transaction via MCP. This confirmed the schema, policy, and index statements are valid without mutating the live project.
- `frontend/types/supabase.ts` was updated to reflect the new contract (new `notifications` table type + new `profiles` columns) because live apply/regeneration through the admin-panel CLI was blocked in this environment.

# Push Notifications - Task 2 Research Findings
**Date**: 2026-04-23
**Task**: 2 - Supabase Edge Function delivery pipeline and best-effort Expo push behavior

---

## 1. Minimal `push` Edge Function for V1

### Canonical Source Code

The official Supabase example at [`supabase/examples/user-management/expo-push-notifications/supabase/functions/push/index.ts`](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/supabase/functions/push/index.ts) is the authoritative reference:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface Notification {
  id: string
  user_id: string
  body: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Notification
  schema: 'public'
  old_record: null | Notification
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json()
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', payload.record.user_id)
    .single()

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify({
      to: data?.expo_push_token,
      sound: 'default',
      body: payload.record.body,
    }),
  }).then((res) => res.json())

  return new Response(JSON.stringify(res), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**Key observations from the canonical source:**

1. **Service role key** is used (`SUPABASE_SERVICE_ROLE_KEY`), not the anon key, because the webhook fires after insert and the function needs to read the target user's token without being blocked by RLS.
2. **No JWT verification** (`--no-verify-jwt` on deploy) because the webhook fires from within Supabase — the request is already authenticated via the service role key in the header.
3. **No transaction wrapping** — the notification row is already committed before this function fires. The function is a pure side effect.
4. **No `await` wrap on the fetch chain** — the original canonical code does `.then((res) => res.json())` which returns the Expo response inline.
5. **Returns 200** regardless of Expo outcome — the function does not throw on Expo API errors.

The official Supabase push docs at [`supabase.com/docs/guides/functions/examples/push-notifications`](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/examples/push-notifications.mdx) describe the same pattern.

### V1 Function Request Shape

The Edge Function receives a Supabase database webhook HTTP POST with:

```
Content-Type: application/json
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

Webhook payload (`WebhookPayload<Notification>`):
```typescript
{
  type: 'INSERT',        // always INSERT for this trigger
  table: 'notifications',
  record: {
    id: string,          // UUID of the notification row
    user_id: string,     // UUID of the recipient user
    body: string,        // notification body text (Bahasa Indonesia, non-PHI)
    // ... other notification columns from Task 1 schema
  },
  schema: 'public',
  old_record: null       // always null for INSERT
}
```

**The function must additionally include `title`, `priority`, `data`, `cta_route` in the interface** since the Task 1 schema extends beyond the minimal canonical example.

---

## 2. Required Secrets and Headers

### Secrets

| Secret | Purpose | How to set |
|--------|---------|------------|
| `EXPO_ACCESS_TOKEN` | Bearer token for Expo Push API (`https://exp.host/--/api/v2/push/send`) | `supabase secrets set --env-file .env.local` (per [`examples/user-management/expo-push-notifications/README.md`](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/README.md)) |
| `SUPABASE_URL` | Supabase project URL | Auto-injected by Edge Functions runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-to-server auth | Auto-injected by Edge Functions runtime |

**Enhanced security (optional for V1, documented for completeness):** Expo supports an optional "Enhanced Security for Push Notifications" flag on the access token. When enabled, the token can only be used from authorized Supabase Edge Functions. The canonical example does not require this for V1 — standard token is sufficient. See [`examples/user-management/expo-push-notifications/README.md`](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/README.md) and [`apps/docs/content/guides/functions/examples/push-notifications.mdx`](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/examples/push-notifications.mdx).

### HTTP Headers (webhook configuration in Supabase Dashboard)

Per the official Supabase example:
- **Header 1**: `Authorization: Bearer <service_role_key>` — added via "Add auth header with service key" in the Supabase Dashboard webhook UI
- **Header 2**: `Content-Type: application/json` — required for JSON body parsing

Per [`examples/user-management/expo-push-notifications/README.md`](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/README.md):
> "HTTP Headers: Click 'Add new header' > 'Add auth header with service key and leave Content-type: `application/json`."

### Deployment command

```bash
supabase functions deploy push --no-verify-jwt
```

Per [`apps/docs/content/guides/functions/secrets.mdx`](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/secrets.mdx): secrets become available immediately after `supabase secrets set` with no need for redeployment.

---

## 3. What "Best-Effort Delivery" Means

### Official Definition

From Expo's FAQ at [`expo/expo/docs/pages/push-notifications/faq.mdx`](https://github.com/expo/expo/blob/main/docs/pages/push-notifications/faq.mdx):

> "Expo makes the best effort to deliver notifications to the push notification services operated by Google and Apple. Expo's infrastructure is designed for **at-least-once delivery** to the underlying push notification services. In some cases, a notification may be delivered to Google or Apple more than once or not at all, although these cases are rare."

This is the authoritative definition. "Best effort" in this codebase's context means:

1. **At-least-once to Expo's servers** — Expo guarantees it will attempt delivery at least once to FCM/APNs. It may attempt more than once (duplicate) or fail entirely (rare edge case).
2. **No device delivery guarantee** — Expo's `status: "ok"` on `/push/send` means Expo received the notification, NOT that the device received it. True delivery confirmation requires push receipt polling.
3. **Notification content not stored** — Expo does not store notification contents beyond the delivery attempt. Payload is pass-through only.

### Implications for V1

- The `push` Edge Function should treat `status: "ok"` from Expo as success (Expo accepted the delivery task).
- `status: "error"` from Expo should be logged but should NOT roll back or retry the notification row.
- V1 does NOT implement push receipt polling (see Section 5 below), so there is no visibility into whether FCM/APNs successfully delivered to the device.

---

## 4. Expo Error Handling in V1

### Expo Push Send Response Errors

The `/push/send` endpoint returns a `data` array. Each entry has:

```json
{
  "status": "ok",
  "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"   // receipt ID for polling
}
```
OR
```json
{
  "status": "error",
  "message": "\"ExponentPushToken[xxx]\" is not a registered push notification recipient",
  "details": { "error": "DeviceNotRegistered" }
}
```

Per [`expo/expo/docs/pages/push-notifications/sending-notifications.mdx`](https://github.com/expo/expo/blob/main/docs/pages/push-notifications/sending-notifications.mdx):

> "Inside both push tickets and push receipts, look for a `details` object with an `error` field. If present, it may be one of the following values, and you should handle these errors like so: `DeviceNotRegistered`: The device cannot receive push notifications anymore and you should stop sending messages to the corresponding Expo push token."

### Error Types and V1 Treatment

| Expo error | Meaning | V1 treatment |
|-----------|---------|-------------|
| `DeviceNotRegistered` | App uninstalled, permissions revoked, or token invalidated | Log and continue. **Do NOT block inbox creation**. **Do NOT clear token in V1** — requires follow-up background job (out of V1 scope). |
| `InvalidToken` / malformed token | Malformed ExponentPushToken format | Log and skip. Token should not be stored if validation is done at registration time. |
| `MessageTooBig` | Payload exceeds FCM/APNs limits | Log error. This indicates a developer error (V1 payloads should be small). |
| `MessageRateExceeded` | Rate limit hit | Log error. Retry is at-least-once semantics already handled by Expo. |
| Other `error` in `details` | Unknown error from Expo | Log error. Treat as delivery failure (non-blocking). |
| HTTP 4xx/5xx from Expo | Entire request failed | Log and return 200 (webhook does not retry based on HTTP status alone). |

### Source: [`expo/expo/docs/pages/push-notifications/sending-notifications.mdx`](https://github.com/expo/expo/blob/main/docs/pages/push-notifications/sending-notifications.mdx)

### V1 Edge Function Error Behavior

```typescript
// V1 CORRECT: never throw on Expo error
Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json()
  const { data: tokenData } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', payload.record.user_id)
    .single()

  // Early return if no token — graceful skip, NOT an error
  if (!tokenData?.expo_push_token) {
    console.log(`No token for user ${payload.record.user_id}, skipping push`)
    return new Response(JSON.stringify({ skipped: 'no token' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify({
      to: tokenData.expo_push_token,
      title: payload.record.title,
      body: payload.record.body,
      data: payload.record.data,
    }),
  }).then((res) => res.json())

  // V1: handle Expo-level errors non-transactionally
  if (expoRes.data?.[0]?.status === 'error') {
    const errorDetail = expoRes.data[0].details?.error
    // Log but do NOT throw — inbox row is already committed
    console.error(`Push failed for user ${payload.record.user_id}: ${errorDetail}`)
  }

  return new Response(JSON.stringify(expoRes), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

---

## 5. Push Receipt Polling — Deferred Beyond V1

### Official Source on Receipts

From [`expo/expo/docs/pages/push-notifications/sending-notifications.mdx`](https://github.com/expo/expo/blob/main/docs/pages/push-notifications/sending-notifications.mdx):

> "A push receipt is available after Expo has tried to deliver the notification to FCM or APNs and indicates whether the delivery to the provider was successful. You must check your push receipts as they are the best way to get information about the underlying cause of delivery issues... We recommend checking push receipts **15 minutes** after sending your push notifications, as they are cleared from the system after **24 hours**."

Receipts tell you whether Expo successfully handed off to FCM/APNs. A `DeviceNotRegistered` in a receipt means the token is permanently stale — stop sending to it.

### Why V1 Does Not Poll

Implementing receipt polling requires:
1. Storing push ticket `id` from the `/push/send` response alongside the notification row
2. A background job/cron that polls `/push/getReceipts` 15 minutes after sending
3. A mechanism to update the stored ticket status and potentially clear stale tokens
4. Handling the 24-hour receipt expiry window

This is explicitly deferred beyond V1 per the plan's acceptance criteria which only require that "inbox row remains when push fails."

### V1 Consequence

When `DeviceNotRegistered` occurs:
- It appears in the **push ticket** response (synchronous, from `/push/send`), not just in receipts — so V1 can at minimum detect this case synchronously
- BUT: The canonical example does NOT read the ticket `status: "error"` at all — it just logs and continues
- V1 should **log** the `DeviceNotRegistered` error but **not clear the token automatically** — a future cleanup job will handle mass-token-validation via receipt polling

---

## 6. `DeviceNotRegistered` and Inbox Creation

### Decision: `DeviceNotRegistered` Does NOT Block Inbox Creation

This is fundamental to the best-effort design:

1. The `notifications` row is inserted **first** (by the domain event writer), **before** the webhook fires.
2. The webhook fires **after** the row is committed.
3. If Expo returns `DeviceNotRegistered` in the push ticket response, the inbox row is **already durable**.
4. Blocking inbox creation on push failure would make push delivery a transactional requirement — contradicting the plan's "best-effort" and "inbox row must persist even when push fails" acceptance criteria.

**Source**: The canonical Supabase example at [`supabase/examples/user-management/expo-push-notifications/supabase/functions/push/index.ts`](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/supabase/functions/push/index.ts) does not wrap the notification insert in the same transaction as the push call — because the webhook fires post-commit. This structural separation is the mechanism that makes non-blocking push possible.

### Token Cleanup — Deferred Beyond V1

Per the plan, token cleanup when `DeviceNotRegistered` is received is **out of V1 scope**. V1 accept the gap that stale tokens may remain in `profiles` until manually cleared or until a post-V1 background job runs receipt-based validation.

**What V1 does instead**: Log the `DeviceNotRegistered` error. Record it in the Edge Function logs for manual investigation. The notification is still in the inbox — the user can see it in-app. Push is bonus, not requirement.

---

## 7. Webhook Trigger Configuration

### Source: [`examples/user-management/expo-push-notifications/README.md`](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/README.md)

> "Navigate to the Database Webhooks settings in your Supabase Dashboard.
> 1. Enable and create a new hook.
> 2. Conditions to fire webhook: Select the `notifications` table and tick the `Insert` event.
> 3. Webhook configuration: Supabase Edge Functions.
> 4. Edge Function: Select the `push` edge function and leave the method as `POST` and timeout as `1000`.
> 5. HTTP Headers: Click 'Add new header' > 'Add auth header with service key and leave Content-type: `application/json`.
> 6. Click 'Create webhook'."

### Timeout Note

The recommended timeout is `1000` (1 second). Expo Push API calls typically complete in <500ms. If the call times out, the webhook is marked as failed by Supabase but the notification row is already committed — this is acceptable for best-effort delivery. The webhook will not retry automatically — this is a known limitation. For V1, this edge case can be monitored via Supabase dashboard logs.

---

## 8. Summary: V1 Push Edge Function Behavior Table

| Scenario | Edge Function action | Inbox row? | Token cleanup? | Notes |
|----------|---------------------|------------|---------------|-------|
| Valid token, Expo `status: "ok"` | Return 200 | Yes | No action | Normal path |
| Valid token, Expo `status: "error"` with `DeviceNotRegistered` | Log error, return 200 | Yes | No (deferred) | Logged for ops review |
| Valid token, Expo `status: "error"` with other error | Log error, return 200 | Yes | No | Developer error or Expo issue |
| Missing/null token | Log "no token", return 200 | Yes | N/A | Graceful skip |
| Network error calling Expo | Throw/log, function may return 500 | Depends on whether row was pre-committed | No | Webhook may retry; row is already committed |
| Supabase service role auth failure | Throw 500 | Already committed (webhook fires after insert) | No | Check `SUPABASE_SERVICE_ROLE_KEY` secret |
| Expo HTTP 4xx/5xx | Log error, return 200 | Yes | No | Expo service issue |
| Edge Function timeout (>1000ms) | Function terminates | Already committed | No | Monitor via Supabase logs |

---

## 9. References

| Topic | Source URL |
|-------|-----------|
| Canonical Edge Function source | https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/supabase/functions/push/index.ts |
| Push notifications guide | https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/examples/push-notifications.mdx |
| Example repo README (webhook config) | https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/README.md |
| Expo Push `/push/send` API (request/response) | https://github.com/expo/expo/blob/main/docs/pages/push-notifications/sending-notifications.mdx |
| Expo delivery guarantees definition | https://github.com/expo/expo/blob/main/docs/pages/push-notifications/faq.mdx |
| Expo push receipts and errors | https://github.com/expo/expo/blob/main/docs/pages/push-notifications/sending-notifications.mdx |
| Expo `DeviceNotRegistered` semantics | https://github.com/expo/expo/blob/main/docs/pages/push-notifications/sending-notifications.mdx |
| Expo token change FAQ | https://github.com/expo/expo/blob/main/docs/pages/push-notifications/faq.mdx |
| Supabase Edge Function secrets management | https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/secrets.mdx |
| Supabase Edge Functions deploy pattern | https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/examples/elevenlabs-generate-speech-stream.mdx |


---

# Push Notifications - Task 2 Infrastructure Research (Admin-Panel Edge Functions)
**Date**: 2026-04-23
**Task**: 2 - Supabase delivery infrastructure and event writers
**Repo**: `/home/coder/dev/pharma/admin-panel`

---

## 1. Existing Functions to Mirror (Minimum 3)

### A. `midtrans-webhook/index.ts` — PRIMARY PAYMENT NOTIFICATION ANALOGUE
**Path**: `/home/coder/dev/pharma/admin-panel/supabase/functions/midtrans-webhook/index.ts`

**Why it's the primary analogue**: This function handles the Midtrans payment webhook, which is the exact pattern for payment-related notifications (settlement/expire/deny flows). It:
- Validates an inbound webhook with signature verification (lines 240-254)
- Persists raw notification immediately for audit (lines 258-260, `persistRawNotificationEarly`)
- Calls an idempotent RPC (`apply_midtrans_webhook_transition`) that returns an `applied` boolean (lines 361-388)
- AFTER the transition is confirmed (`applied && !ignorableNoop`), triggers async side-effect processor (line 458)
- Logs `order_activities` on successful transition (lines 422-436)
- Uses `ensureSettlementSideEffectsQueued()` to queue background tasks (lines 438-442)

**Key code positions for notification writer insertion**:
- Line 388-420: AFTER `applied` check and before `ensureSettlementSideEffectsQueued`
- Lines 361-388: The RPC call pattern with `event_key` parameter — notification `source_event_key` should mirror this
- The `webhookEventKey` at line 262 uses format: `transaction_id:transaction_status:status_code:gross_amount:fraudStatus`
- Pattern to replicate: derive a `source_event_key` per notification type, pass to RPC or insert directly with dedupe

**Key imports to copy**:
```typescript
import { getSupabaseAdminClient } from "../_shared/supabase.ts";
import { triggerWebhookSideEffectProcessor } from "../_shared/webhook-side-effects.ts";
import { getOrderAggregateByMidtransOrderId } from "../_shared/order-aggregate.ts";
import type { Order, PaymentStatus } from "../_shared/types.ts";
```

### B. `order-manager/index.ts` — SHIPMENT NOTIFICATION ANALOGUE
**Path**: `/home/coder/dev/pharma/admin-panel/supabase/functions/order-manager/index.ts`

**Why it's relevant**: Handles order status transitions including Biteship shipment sync (`sync_tracking` action). This is where shipment-related notifications (in_transit, delivered) would be inserted. It:
- Uses JWT authentication via `requireAdmin()` (lines 227-267)
- Logs `order_activities` on status change (lines 526-547 for `transition_status`, lines 800-827 for `sync_tracking`)
- The `sync_tracking` path (lines 580-832) logs Biteship status to `order_activities` at lines 800-820 with full metadata: `biteship_status`, `biteship_status_mapped`, `biteship_exception_status`, `biteship_exception_alert_type`
- Status resolution at lines 695-696: `const statusResolution = resolveBiteshipStatus(trackingStatus, order.status)`

**Notification insertion point for shipment events**:
- In `sync_tracking` action: AFTER successful order status update (around line 800-820), INSERT notification row using same pattern as payment notifications
- `source_event_key` for shipment: `shipment_update:{order_id}:{biteship_status}` or `order_status:{order_id}:{new_status}`

**Key imports to copy**:
```typescript
import { getSupabaseAdminClient } from "../_shared/supabase.ts";
import { getOrderAggregateById } from "../_shared/order-aggregate.ts";
import { triggerWebhookSideEffectProcessor } from "../_shared/webhook-side-effects.ts";
```

### C. `process-webhook-side-effects/index.ts` — BACKGROUND PROCESSOR PATTERN
**Path**: `/home/coder/dev/pharma/admin-panel/supabase/functions/process-webhook-side-effects/index.ts`

**Why it's the background processor analogue**: This function runs as a triggered background processor (cron-scheduled via `20260408110000_schedule_webhook_side_effect_processor.sql`). It:
- Uses service-role key authorization (`isAuthorizedRequest` at lines 27-32)
- Has runtime budget of 50,000ms (`PROCESSOR_RUNTIME_BUDGET_MS` at line 18)
- Processes a batch of tasks from `webhook_side_effect_tasks` with a runtime budget break (lines 66-69)
- Delegates to `processWebhookSideEffectTask` from `_shared/webhook-side-effects.ts`
- The `triggerWebhookSideEffectProcessor` fires this function asynchronously via `fetch()` (see line 768-802 in webhook-side-effects.ts)

**Relevance for push function**: If the `push` Edge Function needs to be a webhook-triggered function (not user-called), it should follow this pattern for the trigger + the `push` function itself should follow the pattern of `midtrans-webhook` (synchronous, returns quickly).

### D. `confirm-order-received/index.ts` — COMPLETION NOTIFICATION ANALOGUE
**Path**: `/home/coder/dev/pharma/admin-panel/supabase/functions/confirm-order-received/index.ts`

**Why it's relevant**: This handles customer completion confirmation (lines 137-216). When a customer confirms delivery receipt:
- It updates `orders` with `customer_completed_at` and `customer_completion_source` (lines 149-161)
- It inserts `order_activities` with action `customer_completed` (lines 191-207)
- **Notification insertion point**: RIGHT AFTER the successful order update (after line 161 success check) and BEFORE the activity insert (lines 191-207)
- `source_event_key` pattern: `customer_completed:{order_id}:{user_id}`

**Key difference from Midtrans webhook**: Uses user JWT auth (not system-level), so notification insert must use `user_id` from the JWT `sub` claim.

### E. `confirm-midtrans-payment/index.ts` — USER-FACING PAYMENT CONFIRMATION
**Path**: `/home/coder/dev/pharma/admin-panel/supabase/functions/confirm-midtrans-payment/index.ts`

**Why it's relevant**: Alternative payment confirmation triggered by authenticated users (not webhook). Has similar transition + side-effect pattern to `midtrans-webhook` but for user-initiated confirmation. Follows same notification insertion pattern as `midtrans-webhook`.

---

## 2. Shared Utilities to Reuse

### `_shared/supabase.ts`
```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';
export const getSupabaseAdminClient = () => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) { throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); }
  return createClient(url, key);
};
```
**Every Edge Function uses this.** New `push` function must import and use it.

### `_shared/cors.ts`
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT',
};
```
**All JSON-returning functions use `corsHeaders` in their responses.**

### `_shared/types.ts`
Contains `Order`, `PaymentStatus`, `OrderItem`, `OrderAddress`, `OrderProfile` — all types needed for notification writers to look up order/user data.

### `_shared/order-aggregate.ts`
- `getOrderAggregateById(adminClient, orderId)` — fetches full order with payment + shipment + items + profile + address
- `getOrderAggregateByMidtransOrderId(adminClient, midtransOrderId)` — same but by midtrans_order_id

### `_shared/webhook-side-effects.ts`
- `triggerWebhookSideEffectProcessor(orderId)` — fires the background processor via internal `fetch()` to `${supabaseUrl}/functions/v1/process-webhook-side-effects`
- **For the `push` function**: If `push` is webhook-triggered, it should follow this same fire-and-forget pattern to decouple push delivery from the main transaction. However, per the plan, `push` is the webhook receiver itself (triggered by `notifications` INSERT), so the pattern is inverted: the function IS the webhook handler.

### `_shared/midtrans.ts`
- `mapMidtransStatus()` — maps Midtrans transaction_status + fraud_status to `PaymentStatus` + order status
- This is useful for determining notification title/body based on payment status change

---

## 3. config.toml Runtime Settings

**Path**: `/home/coder/dev/pharma/admin-panel/supabase/config.toml`

Key settings for new `push` function:

```toml
[edge_runtime]
enabled = true
policy = "per_worker"     # Deno 2 with hot reload
inspector_port = 8083
deno_version = "2"

# All functions currently use verify_jwt = false
[functions.midtrans-webhook]
verify_jwt = false

[functions.order-manager]
verify_jwt = false

[functions.process-webhook-side-effects]
verify_jwt = false
```

**For new `push` function**: Add the same pattern:
```toml
[functions.push]
verify_jwt = false
```

**No `deno.json` needed** in individual function folders unless custom imports are required. The `_shared/` directory uses plain TypeScript imports (no `deno.json` at that level).

---

## 4. Event-Key / Idempotency Enforcement — Existing Pattern to Align With

### Midtrans webhook idempotency (existing):
- **File**: `midtrans-webhook/index.ts` lines 51-61
- **Event key format**: `transaction_id:transaction_status:status_code:gross_amount:fraudStatus`
- **Storage**: Passed to RPC `apply_midtrans_webhook_transition(p_event_key, ...)` which inserts into `webhook_idempotency(provider, event_key)` with `on conflict do nothing`
- **Applied flag returned**: The RPC returns `{ applied: boolean }` — if false + not ignorable Noop, the transition is skipped

### Notification dedupe (from Task 1 migration):
- **File**: `/home/coder/dev/pharma/admin-panel/supabase/migrations/20260423091427_add_notifications_table.sql` line 95-97
- **Index**: `create unique index if not exists notifications_user_source_event_key_uidx on public.notifications (user_id, source_event_key) where source_event_key is not null`
- **Dedup scope**: `(user_id, source_event_key)` — per-user deduplication

### Recommended `source_event_key` patterns for V1:

| Event | `source_event_key` format | Notes |
|---|---|---|
| Payment settlement | `payment_settlement:{order_id}` | Unique per order |
| Payment expire | `payment_expire:{order_id}` | Unique per order |
| Payment deny | `payment_deny:{order_id}` | Unique per order |
| Order shipped | `order_shipped:{order_id}` | Unique per order |
| Order in_transit | `order_in_transit:{order_id}` | Unique per order |
| Order delivered | `order_delivered:{order_id}` | Unique per order |
| Customer completed | `customer_completed:{order_id}` | Unique per order |

**Key alignment point**: The notification `source_event_key` must be derived from the SAME idempotency context as the domain event that triggers it. For payment events, this means mirroring the `midtrans-webhook` `webhookEventKey` or using the order-scoped key above. For order status events, use the order ID.

---

## 5. Payment/Order/Completion Notification Insertion Points — EXACT LOCATIONS

### A. Payment Settlement/Expire/Deny → `midtrans-webhook/index.ts`

**Settlement path** (transaction_status = "settlement" or "capture" + accept):
- **Location**: After line 388 where `applied` is confirmed
- **Exact insertion point**: Between lines 420 (after `applied && !ignorableNoop` check) and line 421 (before `if (applied) { ... ensureSettlementSideEffectsQueued ... }`)
- **Code context around insertion**:
```typescript
// Line 420: if (!applied && !ignorableNoop) { return errorResponse(...) }
    if (applied) {
      await adminClient.from("order_activities").insert({ ... }); // lines 422-436
    }

    const shouldRunFulfillment = await ensureSettlementSideEffectsQueued(...); // line 438
    // >>> INSERT NOTIFICATION ROW HERE (settlement case)

    if (!shouldRunFulfillment) { ... }
    triggerWebhookSideEffectProcessor(order.id); // line 458
```

**For settlement**: Insert notification row with:
- `user_id: order.user_id`
- `type: 'payment_settlement'`
- `source_event_key: 'payment_settlement:{order.id}'`
- Use `getOrderAggregateByMidtransOrderId` to fetch user profile data if needed for localized title/body

**Deny/Expire path**:
- **Location**: Same function, same spot — the `mapMidtransStatus()` maps deny/expire to `newPaymentStatus = 'deny'/'expire'` and `newOrderStatus = 'cancelled'`
- **Insert notification AFTER the successful transition is confirmed (same spot as settlement)**

### B. Order Status Transitions (shipped, in_transit, delivered) → `order-manager/index.ts`

**For `transition_status` admin action** (lines 311-577):
- **Insertion point**: After line 526-547 `order_activities` insert (inside the `if (to === "awaiting_shipment" ...)` block at lines 550-572 is for courier fulfillment — notification should be INSIDE the main transition block, after lines 526-547 activity insert)
- **Notification insertion point**: After line 547 (after activity log) and before line 549 (the `awaiting_shipment` courier fulfillment check)
- `source_event_key: 'order_status:{order.id}:{to}'`

**For `sync_tracking` Biteship action** (lines 580-832):
- **Insertion point**: After lines 800-820 `order_activities` insert (inside the successful `sync_tracking` block)
- **Exact location**: After line 820 (after activity insert) and before line 829 (return jsonResponse)
- `source_event_key: 'order_status:{order.id}:{nextStatus}'`
- `data`: should include `biteship_status`, `biteship_tracking_id`, `waybill_number` for deep-link context

### C. Customer Completion Confirmation → `confirm-order-received/index.ts`

- **Insertion point**: After line 161 (`updatedOrder` confirmed non-null) and BEFORE line 191 (order_activities insert)
- **Alternative safe point**: AFTER line 189 (`effectiveCompletedAt` derived) and BEFORE line 191
- `source_event_key: 'customer_completed:{order.id}'`
- `user_id`: from JWT `sub` claim (already validated at line 99-102)
- `type: 'customer_completed'` or `'order_completed'`

---

## 6. Shipment Notification Blocker Assessment

**Question**: Can shipment-related notifications be implemented now from existing backend events?

**Answer**: YES, with one caveat.

**Evidence**:
1. **Biteship webhook**: There is NO explicit Biteship webhook handler in the Edge Functions. Biteship status changes are pulled via `order-manager`'s `sync_tracking` action (lines 580-832 of order-manager/index.ts). Admin manually triggers sync or it's triggered by cron.
2. **Notification trigger**: The `order_activities` INSERT at lines 800-820 logs `biteship_status` and `biteship_status_mapped` in metadata. This logging happens AFTER the order status is updated.
3. **Biteship webhook absence**: There is no `biteship-webhook` Edge Function. Biteship pushes are NOT received; status is pulled on-demand. However, the `process-webhook-side-effects` cron runs periodically and would catch status changes.

**CAVEAT**: Since Biteship does not push to the system (no incoming webhook), shipment notifications would be triggered when:
a) Admin manually syncs tracking via `order-manager` `sync_tracking` action
b) Cron job `process-webhook-side-effects` runs (scheduled by `20260408110000_schedule_webhook_side_effect_processor.sql`) — but this processes fulfillment tasks, not tracking

**Recommendation**: For V1, implement shipment notifications at the SAME insertion points in `order-manager` (after `sync_tracking` activity log at lines 800-820). The notification fires when an admin syncs the tracking OR when a future Biteship push webhook is added.

**No blocker for V1** — shipment notifications can be wired into `order-manager` `sync_tracking` now. They will fire when admins manually trigger sync. A Biteship webhook handler (future work) would make this real-time.

---

## 7. New `push` Edge Function — Placement and Structure

**Folder location**: `/home/coder/dev/pharma/admin-panel/supabase/functions/push/`

**File structure**:
```
supabase/functions/push/
└── index.ts        # single-file function, no subfolders needed
```

**No `deno.json` needed** unless custom import mappings are required. The standard JSR imports work.

**Import pattern to copy** (from `process-webhook-side-effects` and `midtrans-webhook`):
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSupabaseAdminClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/cors.ts";
// Expo Push sending:
import type { Order, OrderProfile } from "../_shared/types.ts";
import { getOrderAggregateById } from "../_shared/order-aggregate.ts";
```

**Authorization**: Since this is webhook-triggered (Supabase DB webhook on `notifications` INSERT), it uses service_role key. The authorization check should be:
```typescript
function isAuthorizedRequest(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;
}
```
(Same pattern as `process-webhook-side-effects/index.ts` lines 27-32)

**Webhook trigger configuration** (from Supabase push-notifications guide, confirmed by existing patterns):
- Table: `notifications`
- Event: `Insert`
- Method: `POST`
- Headers: `Content-Type: application/json` + `Authorization: Bearer {SERVICE_ROLE_KEY}`
- Timeout: 1000ms (as recommended by Supabase)

---

## 8. Deployment / Runtime Constraints

**From `config.toml`**:
- `edge_runtime.deno_version = "2"` — Deno 2 required
- `edge_runtime.policy = "per_worker"` — hot reload enabled for local dev, oneshot fallback available
- All functions have `verify_jwt = false` — JWT verification is done per-function (not at gateway level)
- `PROCESSOR_RUNTIME_BUDGET_MS = 50_000` in `process-webhook-side-effects` — background processors have a 50s budget

**Secrets needed for `push` function**:
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)
- `EXPO_ACCESS_TOKEN` — must be set via `supabase secrets set EXPO_ACCESS_TOKEN=<token>`

**Import constraint**: All imports must be either:
- `jsr:@supabase/*` packages
- `npm:jose@5` (used for JWT verification)
- Internal `./` or `../` relative paths to `_shared/`

**No `deno.json` per-folder** unless the function needs custom compiler options or non-standard imports. The `_shared/` folder uses plain TS without its own `deno.json`.

---

## 9. Recommended Insertion Points Summary Table

| Notification Type | Source File | Exact Insertion Point | `source_event_key` pattern |
|---|---|---|---|
| Payment settlement | `midtrans-webhook/index.ts` | After line 420 (applied check), before line 421 (fulfillment queue) | `payment_settlement:{order.id}` |
| Payment expire | `midtrans-webhook/index.ts` | Same as settlement (mapMidtransStatus maps expire to `newPaymentStatus='expire'`) | `payment_expire:{order.id}` |
| Payment deny | `midtrans-webhook/index.ts` | Same as settlement (mapMidtransStatus maps deny to `newPaymentStatus='deny'`) | `payment_deny:{order.id}` |
| Order shipped (manual) | `order-manager/index.ts` | After line 547 (activity log insert), before line 549 (courier check) | `order_status:{order.id}:shipped` |
| Order in_transit | `order-manager/index.ts` `sync_tracking` | After line 820 (activity log), before line 829 (return) | `order_status:{order.id}:in_transit` |
| Order delivered | `order-manager/index.ts` `sync_tracking` | After line 820 (activity log), before line 829 (return) | `order_status:{order.id}:delivered` |
| Customer completed | `confirm-order-received/index.ts` | After line 161 (updatedOrder confirmed), before line 191 (activity log) | `customer_completed:{order.id}` |

---

## 10. Notepad Updates Appended

- **learnings.md**: This section (Task 2 Infrastructure Research) appended
- **issues.md**: Blockers section updated with shipment notification assessment

---

## 11. Task 2 — Delivery pipeline implementation learnings (2026-04-23)

- A narrow shared helper in `admin-panel/supabase/functions/_shared/notification-helpers.ts` is sufficient for V1: keep it limited to route constants plus `insertNotification()` that swallows duplicate inserts via Postgres code `23505` from the `notifications_user_source_event_key_uidx` partial unique index.
- The cleanest V1 mapping is to keep app-facing notification `type` values aligned with the plan catalog even when backend sources differ:
  - `payment_settlement`
  - `payment_failed_or_expired`
  - `order_shipped` (used for both manual `shipped` and synced `in_transit`, differentiated in `data.shipmentStage`)
  - `order_delivered_action_required`
  - `order_completed`
- `source_event_key` should encode the actual business transition, not just a generic type. Implemented examples:
  - `payment_settlement:{orderId}`
  - `payment_failed_or_expired:expire:{orderId}`
  - `payment_failed_or_expired:deny:{orderId}`
  - `order_shipped:manual:{orderId}`
  - `order_shipped:in_transit:{orderId}`
  - `order_delivered_action_required:{orderId}`
  - `order_completed:{orderId}`
- The new `push` Edge Function can safely mirror `process-webhook-side-effects` by disabling platform JWT verification in `config.toml` and then manually requiring `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`.
- Expo push payloads stay future-friendly when the function forwards both durable inbox metadata and deep-link payload data, e.g. `notificationId`, `type`, `ctaRoute`, plus the stored `data` object.
- Best-effort push behavior is straightforward in the Edge Function: missing token, malformed token, missing `EXPO_ACCESS_TOKEN`, HTTP failure, and Expo ticket errors all log and still return HTTP 200 with a JSON reason.

---

# Push Notifications - Task 3 Research Findings
**Date**: 2026-04-23
**Task**: 3 - Frontend notification types and route contracts

---

## 1. Route Typing Architecture (Primary Reference File)

### File: `/home/coder/dev/pharma/frontend/types/routes.types.ts`

**Pattern to replicate** (lines 1-119):

```typescript
import type { Href } from 'expo-router';

// Individual route type objects
export type AuthRoutes = {
  '(auth)/login': undefined;
  '(auth)/signup': undefined;
};

export type OrdersRoutes = {
  orders: undefined;
  'orders/index': undefined;
  'orders/success': { orderId?: string };
  'orders/order-detail/[orderId]': { orderId: string };
  'orders/track-shipment/[orderId]': { orderId: string };
};

// Intersection aggregation
export type AppRoutes = AuthRoutes &
  HomeRoutes &
  ProductDetailsRoutes &
  CartRoutes &
  OrdersRoutes &
  ProfileRoutes &
  GoogleAuthRoutes;

// Utility types (EXACTLY these two lines)
export type TypedHref = Href<AppRoutes>;
export type RouteParams<T extends keyof AppRoutes> = AppRoutes[T];
```

**Key observations**:
- `TypedHref` is `Href<AppRoutes>` — not a generic, not manually constructed
- `RouteParams<T>` extracts the param shape for a specific route key
- All route type objects are named `<Feature>Routes` and merged via intersection
- No discriminated union — just simple key-value route maps merged into `AppRoutes`

---

## 2. Files to Mirror (Minimum 3)

### A. `/home/coder/dev/pharma/frontend/types/routes.types.ts` (PRIMARY PATTERN)
- **What to copy**: The entire intersection style for `AppRoutes`, the `TypedHref = Href<AppRoutes>` pattern, and the `RouteParams<T>` helper
- **Exact lines**: 1-119 (full file)

### B. `/home/coder/dev/pharma/frontend/scenes/orders/OrderSuccess.tsx`
- **What to copy**: `useLocalSearchParams<RouteParams<'orders/success'>>()` pattern at line 125
- **Usage**: `const { orderId } = useLocalSearchParams<RouteParams<'orders/success'>>()`
- **TypedHref not used here** (uses `router.replace('/home')`), but `RouteParams` consumption is the reference

### C. `/home/coder/dev/pharma/frontend/scenes/cart/Cart.tsx` (TypedHref construction)
- **What to copy**: Explicit `TypedHref` object construction with `pathname` + `params`
- **Exact pattern** (lines 111-116):
```typescript
const addressFormHref: TypedHref = {
  pathname: '/profile/address-form',
  params: { id: addressId },
};
router.push(addressFormHref);
```

### D. `/home/coder/dev/pharma/frontend/scenes/profile/AddressList.tsx` (TypedHref construction)
- **What to copy**: Same `TypedHref` construction pattern as Cart.tsx
- **Exact pattern** (lines 115-118):
```typescript
const addressFormHref: TypedHref = {
  pathname: '/profile/address-form',
  params: { id: addressId },
};
router.push(addressFormHref);
```

### E. `/home/coder/dev/pharma/frontend/scenes/profile/addressRouteParams.ts`
- **What to copy**: Route param parsing/validation helper style (for `cta_route` + payload normalization)
- **Pattern**: Parse raw unknown params → typed coordinate/text objects → build summary
- This pattern should be mirrored for notification `data` payload parsing

---

## 3. Exact Allowed Route Targets for V1 Notifications

### Primary deep-link targets (from plan):
- `'orders/order-detail/[orderId]': { orderId: string }` — order detail
- `'orders/track-shipment/[orderId]': { orderId: string }` — shipment tracking

### Safe fallback:
- Notifications tab (already exists at `app/(tabs)/notifications/index.tsx`)

### Tab routes (defined in `/home/coder/dev/pharma/frontend/constants/tabs.ts`):
```typescript
export type TabRouteName = 'home' | 'orders' | 'notifications' | 'profile';
```
The `notifications` tab is a `TabRouteName`, but it is NOT part of `AppRoutes` — tabs are handled separately from stack routes in Expo Router. The notifications tab re-exports from `scenes/notifications/Notifications`.

**Important**: `app/(tabs)/notifications/index.tsx` is just a 1-line re-export:
```typescript
export { default } from '@/scenes/notifications/Notifications';
```

### Where route targets are currently defined:
- `types/routes.types.ts` lines 29-35 define `OrdersRoutes` including order-detail and track-shipment
- `constants/tabs.ts` lines 4, 33-39 define the notifications tab metadata
- `app/(tabs)/_layout.tsx` lines 158-162 wire the tab screens

---

## 4. Exact File Placement

### New file to create:
- `/home/coder/dev/pharma/frontend/types/notification.ts` — notification domain types

### File to update:
- `/home/coder/dev/pharma/frontend/types/index.ts` — add `export * from './notification'`
- `/home/coder/dev/pharma/frontend/types/routes.types.ts` — potentially add `NotificationRoutes` (if including tab route), or just keep notification-specific route target union separate in `notification.ts`

### Where NOT to add routes:
- `AppRoutes` in `types/routes.types.ts` does NOT need to include the notifications tab — tabs are not stack routes and don't participate in `TypedHref` typing the same way
- The notifications scene already exists; no new route files needed

---

## 5. What `types/notification.ts` Must Export

Based on plan task 3 and V1 scope, `types/notification.ts` should contain:

```typescript
import type { TypedHref } from './routes.types';

// V1 notification type union (matching Task 2 event writer types)
// Derived from: order.service.ts status buckets + payment flows
export type NotificationType =
  | 'payment_settlement'
  | 'payment_failed_or_expired'
  | 'order_processing'
  | 'order_awaiting_shipment'
  | 'order_shipped'
  | 'order_delivered_action_required'
  | 'order_completed';

// Allowed deep-link route target union (V1 narrow scope)
export type NotificationRouteTarget =
  | { pathname: '/orders/order-detail/[orderId]'; params: { orderId: string } }
  | { pathname: '/orders/track-shipment/[orderId]'; params: { orderId: string } };

// Parsed payload shape for notification data field
// (mirrors addressRouteParams.ts parsing pattern for safety)
export interface NotificationDataPayload {
  orderId?: string;
  // future fields as needed, mirrored after task 2 event writer data shapes
}

// Type guard / parser for cta_route + data combinations
export function parseNotificationRoute(
  ctaRoute: string | null,
  data: unknown,
): { route: NotificationRouteTarget; fallback: false } | { route: null; fallback: true } {
  // implementation: validate cta_route against allowed targets,
  // extract orderId from data, return typed route or fallback flag
}

// For TypedHref construction from notification tap
export function buildNotificationTypedHref(
  target: NotificationRouteTarget,
): TypedHref {
  return {
    pathname: target.pathname,
    params: target.params,
  } as TypedHref;
}
```

---

## 6. `types/supabase.ts` Notifications Table (Existing DB Types)

From `types/supabase.ts` lines 179-227 (already regenerated after Task 1):

```typescript
notifications: {
  Row: {
    body: string;
    created_at: string;
    cta_route: string | null;   // <-- this is the deep-link target (string)
    data: Json;                  // <-- supplemental payload
    id: string;
    priority: string;
    read_at: string | null;
    source_event_key: string | null;
    title: string;
    type: string;               // <-- NotificationType goes here
    user_id: string;
  };
  Insert: { /* ... */ };
  Update: { /* ... */ };
  Relationships: [
    {
      foreignKeyName: 'notifications_user_id_fkey';
      columns: ['user_id'];
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
  ];
}
```

**Key insight**: `cta_route` is stored as `string | null` in the DB. The frontend types must validate it at runtime/compile-time against `NotificationRouteTarget`. The `data` field is `Json` (flexible), so parsing helpers are needed to extract the `orderId`.

---

## 7. Service Layer Export Convention

From `/home/coder/dev/pharma/frontend/services/index.ts` (lines 1-12):
- All services are exported via barrel in `services/index.ts`
- Task 5 (notification service) will add `export * from './notification.service'`
- Task 3 types should be usable by both service and scene without either importing from the other

---

## 8. Existing Route Param Helper Pattern

`scenes/profile/addressRouteParams.ts` shows the pattern for parsing raw string params into safe typed objects:
- `parseAddressSearchInitialLocation()` — converts unknown params to `GeocodingProximity | null`
- `parseAddressMapInitialCoords()` — converts to `MapCoords | undefined`
- `buildSelectedAddressSummary()` — builds display string from params

This same pattern should be mirrored in `types/notification.ts` for `parseNotificationRoute()`.

---

## 9. Tab Route vs Stack Route Distinction

**Critical finding**: The notifications tab route is NOT in `AppRoutes`.

- `AppRoutes` covers stack routes with typed params (order-detail, track-shipment, etc.)
- Tab routes (`home`, `orders`, `notifications`, `profile`) are handled separately in `app/(tabs)/_layout.tsx`
- `TypedHref` is `Href<AppRoutes>` — it types stack navigation, not tab navigation
- Tab navigation uses simple strings: `router.navigate('/notifications')`

**Implication for task 3**:
- The notification route target union should use the stack route pathname format (e.g., `/orders/order-detail/[orderId]`)
- The fallback to notifications tab is just the string `'/notifications'` — no `TypedHref` needed for tab fallback
- `NotificationRouteTarget` should contain stack routes only, not tab routes

---

## 10. References Summary

| What | File | Key Lines |
|------|------|-----------|
| Route union style | `types/routes.types.ts` | 1-119 (full file) |
| TypedHref construction | `scenes/cart/Cart.tsx` | 111-116 |
| TypedHref construction | `scenes/profile/AddressList.tsx` | 115-118 |
| RouteParams usage | `scenes/orders/OrderSuccess.tsx` | 125 |
| Route param helper pattern | `scenes/profile/addressRouteParams.ts` | 1-63 |
| DB notification types | `types/supabase.ts` | 179-227 |
| Service barrel | `services/index.ts` | 1-12 |
| Tab definition | `constants/tabs.ts` | 4, 33-39 |
| Notifications tab route | `app/(tabs)/notifications/index.tsx` | 1 |
| Tab layout | `app/(tabs)/_layout.tsx` | 158-162 |

---

## 12. Task 3 implementation learnings (2026-04-23)

- `types/notification.ts` can stay fully self-contained: it imports `AppRoutes`, `RouteParams`, and `TypedHref` from `types/routes.types.ts` and derives a narrow notification deep-link contract without modifying `AppRoutes`.
- The safest V1 contract is a **route-by-type mapping**, not just separate unions. Encoding `NotificationRouteTargetByType` makes `order_shipped` compile only with `/orders/track-shipment/[orderId]`, while payment/completion notifications compile only with `/orders/order-detail/[orderId]`.
- Keeping `NotificationNavigationTarget<T>` distributive over `NotificationType` is important. Without the distributive conditional form, TypeScript loses the correlation between `type` and `pathname`, and later consumers cannot narrow safely.
- `parseNotificationRoute()` is easiest to keep type-safe when it branches by notification type after validating the raw `cta_route`. That preserves an exact payload + route pair in each success branch instead of collapsing back to a broad union.
- A lightweight isolated `tsc` proof in `/tmp` works well for negative type validation: `Extract<NotificationNavigationTarget<'order_shipped'>, { pathname: '/orders/order-detail/[orderId]' }>` must resolve to `never` or the compile fails.

---

# Push Notifications - Task 4 Research Findings
**Date**: 2026-04-23
**Task**: 4 - Expo notification foundation and runtime config

---

## 1. Package.json Analysis (Dependency State)

**File**: `/home/coder/dev/pharma/frontend/package.json`

**Current state**:
- Expo SDK 54: `expo@~54.0.33` (line 47)
- `expo-dev-client@~6.0.20` is present (line 53)
- **MISSING**: `expo-notifications`, `expo-device`

**Required additions** (matching SDK 54):
```json
"expo-notifications": "~54.0.0",
"expo-device": "~6.0.0"
```

**Note**: These version ranges must align with Expo SDK 54. The Expo SDK version determines the `expo-notifications` and `expo-device` versions automatically. `npx expo install expo-notifications expo-device` would resolve the correct versions.

---

## 2. app.config.ts Analysis (Plugin + Config Insertion Point)

**File**: `/home/coder/dev/pharma/frontend/app.config.ts`

**Current plugins array** (lines 82-116):
```typescript
plugins: [
  'expo-dev-client',           // line 83
  'expo-router',              // line 84
  'expo-asset',               // line 85
  'expo-secure-store',        // line 86
  [
    'react-native-maps',      // line 88 — with config object
    { androidGoogleMapsApiKey: ..., iosGoogleMapsApiKey: ... },
  ],
  [
    'expo-splash-screen',    // line 94 — with config object
    { backgroundColor: ..., image: ..., imageWidth: ..., resizeMode: ... },
  ],
  [
    'expo-font',             // line 104 — with config object
    { fonts: [...] },
  ],
],
```

**Where to insert**:
- Add `expo-notifications` plugin **after** all existing plugins (before the closing `]`)
- Plugin order does not matter for `expo-notifications` specifically

**Android permissions** (insert into `android` block, lines 45-57):
```typescript
android: {
  ...config.android,
  package: ...,
  softwareKeyboardLayoutMode: 'resize',
  adaptiveIcon: { ... },
  // ADD THESE:
  permissions: [
    'RECEIVE_NOTIFICATIONS',
    'VIBRATE',
    'POST_NOTIFICATIONS',  // Android 13 (API 33) specific
  ],
},
```

**iOS** — no additional Info.plist entries required for `expo-notifications` in SDK 54 (handled by the plugin automatically). However, for iOS push to work, the app must have a push notification capability in the Apple Developer account — this is an EAS Build infrastructure concern, not a config concern.

**Critical `expoProjectId`** (line 69):
```typescript
extra: {
  eas: { projectId: expoProjectId },   // ← this is the Expo project ID for Push
  ...
}
```
This is already exposed. The notification bootstrap utility resolves `projectId` from `Constants.expoConfig?.extra?.eas?.projectId` (from `expo-constants`).

---

## 3. app/_layout.tsx Analysis (Root Composition + Where T4 Does NOT Go)

**File**: `/home/coder/dev/pharma/frontend/app/_layout.tsx`

**Root composition** (lines 98-107):
```typescript
export default function RootLayout() {
  return (
    <Provider>
      <QueryProvider>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryProvider>
    </Provider>
  );
}
```

**Key finding**: Task 4 is **foundation only** (no permission prompt, no listener registration). The implementer should:
- **NOT** modify `app/_layout.tsx` 
- Create a standalone utility file (`utils/notifications.ts`) that T6 will import and call from `AuthProvider`/`app/_layout.tsx`

**Existing `PROTECTED_ROUTE_GROUPS`** (line 19):
```typescript
const PROTECTED_ROUTE_GROUPS = ['(tabs)', 'cart', 'product-details'];
```
This list has no notification-specific routes to add for T4.

---

## 4. AuthProvider Lifecycle Hook Pattern (T6 integration point, not T4)

**File**: `/home/coder/dev/pharma/frontend/providers/AuthProvider.tsx`

**Deferred callback pattern** (lines 154-172):
```typescript
setTimeout(async () => {
  try {
    const result = await getCurrentUser({
      createIfMissing: event === 'SIGNED_IN' || event === 'INITIAL_SESSION',
      session,
    });
    if (!mounted) return;
    await validateAndDispatch(result.user, result.profile, mounted);
  } catch (error) {
    if (__DEV__) console.error('[AuthProvider] onAuthStateChange error:', error);
    if (mounted) dispatch(setChecked(true));
  }
}, 0);
```

**Auth state events to hook for token sync** (T6, not T4):
- `INITIAL_SESSION` → no-prompt token sync
- `SIGNED_IN` → no-prompt token sync
- `TOKEN_REFRESHED` → no-prompt token sync
- `SIGNED_OUT` → clear token

**T4 does NOT interact with AuthProvider**. T4 creates the utility. T6 wires it.

---

## 5. Permission Request Pattern (Existing — for reference only)

**File**: `/home/coder/dev/pharma/frontend/scenes/profile/areaPickerCurrentLocation.ts` (lines 183-189):
```typescript
const permission = await locationModule.requestForegroundPermissionsAsync();
if (permission.status !== 'granted') {
  return {
    kind: 'error',
    errorMessage: 'Izin lokasi diperlukan untuk menggunakan lokasi saat ini.',
    provinceOptions: availableProvinces,
  };
}
```

**Canonical pattern**:
- Injectable `locationModule` for testability
- Early return with descriptive error if not granted
- No prompting on splash/startup

**For notifications (T4 foundation, no prompt)**:
- `expo-notifications` requires `Notifications.requestPermissionsAsync()` before sending
- BUT the plan says T4 is "foundation only: dependency + config + shared runtime helper, no permission prompt at startup"
- The utility should configure `setNotificationHandler` and channel setup, but permission request happens in T6/T7 (triggered from UI, not startup)

---

## 6. Utils Directory Pattern (Where Notification Utility Lives)

**Existing utils files**:
- `utils/config.ts` — reads from `Constants.expoConfig?.extra`
- `utils/supabase.ts` — creates + exports Supabase client
- `utils/fonts.ts` — async font loading
- `utils/images.ts` — async image preloading
- `utils/store.ts` — Redux store creation
- `utils/LargeSecureStore.ts` — encrypted storage

**Pattern to mirror for notification utility**:
- File: `utils/notifications.ts`
- Exports: singleton setup function that configures + returns notification-related helpers
- Imports `expo-notifications`, `expo-device`, `expo-constants`
- Guards platform-specific code with `Platform.OS !== 'web'`
- No-op on web (notifications not applicable)

**Canonical file header pattern** (from `utils/supabase.ts` line 1):
```typescript
// Polyfill crypto.subtle.digest for PKCE S256 (must be before @supabase/supabase-js)
import '@/utils/cryptoPolyfill';
```

The notification utility should follow the same imports-first convention:
```typescript
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
```

---

## 7. services/index.ts Pattern (Service Barrel)

**File**: `/home/coder/dev/pharma/frontend/services/index.ts` (lines 1-12)

**Pattern**: Re-export through barrel. The notification service (T5) will be added here. T4 does NOT add anything to `services/index.ts`.

---

## 8. Config Bridge Pattern (utils/config.ts ↔ app.config.ts)

**File**: `/home/coder/dev/pharma/frontend/utils/config.ts`

The `expoProjectId` is already:
- Set in `app.config.ts` line 12: `const expoProjectId = process.env.EXPO_PROJECT_ID`
- Exposed in `app.config.ts` line 69: `extra: { eas: { projectId: expoProjectId } }`
- Read in `utils/config.ts` line 4: `const extra = Constants.expoConfig?.extra as {...}`

**For notifications**, the utility should resolve `projectId` via:
```typescript
import Constants from 'expo-constants';
const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
```

This is already available — no new env vars needed.

---

## 9. Android Notification Channel Setup

**Required for Android 8+ (API 26+)**: `Notifications.setNotificationChannelAsync(channelId, channelConfig)`

**Where**: In the bootstrap utility, before registering any listeners

**Canonical channel config** (from Expo docs):
```typescript
await Notifications.setNotificationChannelAsync('default', {
  name: 'default',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF23193C',
});
```

**Importance levels** (Android):
- `MAX` = 4 (heads-up display)
- `HIGH` = 3 (heads-up display)
- `DEFAULT` = 3
- `LOW` = 2
- `MIN` = 1
- `NONE` = 0 (suppressed)

---

## 10. Foreground Notification Handler Pattern

**Expo API**: `Notifications.setNotificationHandler`

**Canonical pattern** (from Expo docs):
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // ... other options
  }),
});
```

**For this codebase**: The handler should be lightweight (plan: "Keep the handler global and lightweight"). The handler dispatches to whatever listener is registered, but does not navigate directly (navigation happens in T6's notification-open handler).

---

## 11. projectId Resolution Pattern

**Expo SDK 54 pattern** for getting `projectId`:
```typescript
import Constants from 'expo-constants';
const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
```

**Alternative** (fallback): `Constants.expoConfig?.projectId`

**The `expoProjectId` env var** is already loaded in `app.config.ts` line 7-9:
```typescript
if (!process.env.EXPO_PROJECT_ID) {
  loadEnv({ path: path.resolve(process.cwd(), '.env.dev') });
}
```

No new env vars needed for T4.

---

## 12. Three Files the Implementer Must Mirror (Minimum)

### File A: `utils/supabase.ts` — Infrastructure client creation
**Why**: Follow the same singleton-export pattern for the notification bootstrap. Imports first, then client creation, then exports.

### File B: `utils/config.ts` — Runtime config bridge
**Why**: Follow the same `Constants.expoConfig?.extra` pattern for reading the `projectId` without needing new env vars.

### File C: `scenes/profile/areaPickerCurrentLocation.ts` — Permission request separation
**Why**: Follow the same injectable-dependency pattern for testability. However, for T4 foundation (no prompt), the pattern is inverted — the utility should accept an optional `Notifications` module override for testing.

---

## 13. Suggested Utility File: `utils/notifications.ts`

```typescript
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const ANDROID_CHANNEL_ID = 'default';
export const ANDROID_CHANNEL_NAME = 'default';

/**
 * Resolves the Expo project ID from runtime config.
 * Falls back to undefined — callers must handle missing projectId.
 */
export function getExpoProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

/**
 * Configures the Android notification channel.
 * No-op on iOS and web.
 */
async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: ANDROID_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF23193C',
  });
}

/**
 * Sets the global notification handler for foreground notifications.
 * Lightweight — actual navigation is delegated to listeners registered at app startup.
 */
function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Returns true if the current platform supports push notifications (native only).
 * Returns false for web.
 */
export function isPushSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return Device.isDevice;
}

/**
 * Main bootstrap function — call once at app startup (T6 will call this).
 * Configures Android channel + global handler.
 * Safe to call multiple times (idempotent).
 */
export async function bootstrapNotifications(): Promise<void> {
  await configureAndroidChannel();
  configureNotificationHandler();
}
```

**Placement**: `/home/coder/dev/pharma/frontend/utils/notifications.ts`

**Note**: This utility does NOT request permissions, does NOT register listeners, and does NOT import `AuthProvider` or `app/_layout.tsx`. T6 imports and calls `bootstrapNotifications()` from `AuthProvider` or root layout.

---

## 14. Exact Plugin Insertion Point in app.config.ts

**Location**: `app.config.ts` line 116, after the `expo-font` plugin entry, before the closing `]`

```typescript
// At line 116 (before the closing bracket of plugins array):
],
// ADD: 'expo-notifications',  ← insert here
```

The full `plugins` array should become:
```typescript
plugins: [
  'expo-dev-client',
  'expo-router',
  'expo-asset',
  'expo-secure-store',
  [
    'react-native-maps',
    { ... },
  ],
  [
    'expo-splash-screen',
    { ... },
  ],
  [
    'expo-font',
    { ... },
  ],
  'expo-notifications',   // ← NEW
],
```

---

## 15. Files to Modify for T4 (Summary)

| File | Action |
|------|--------|
| `package.json` | Add `expo-notifications` and `expo-device` to `dependencies` |
| `app.config.ts` | Add `'expo-notifications'` plugin + Android permissions in `android` block |
| `utils/notifications.ts` | **CREATE** — bootstrap utility with channel + handler setup |

**Files T4 does NOT touch**:
- `app/_layout.tsx` (T6 adds listener registration)
- `providers/AuthProvider.tsx` (T6 adds token sync hooks)
- `services/` (T5 adds notification service)
- `hooks/` (T7 adds useNotifications hook)
- `scenes/notifications/Notifications.tsx` (T8 replaces placeholder)

---

## 16. Verification Commands

```bash
# Verify expo-notifications is installed
npm ls expo-notifications expo-device

# Verify config includes the plugin (should show expo-notifications in output)
npx expo config --type public

# Verify Android permissions are present
npx expo config --type public | grep -A 20 '"permissions"'
```


---

# Push Notifications - Task 4 Research Findings
**Date**: 2026-04-23
**Task**: 4 - Expo notification foundation setup

---

## 1. Required Packages

**Decision**: Install two additional packages alongside the already-present `expo-constants`:

| Package | Purpose | Installed |
|---------|---------|-----------|
| `expo-notifications` | Core notification API (permissions, tokens, channels, handlers, listeners) | NO — needs install |
| `expo-device` | `Device.isDevice` check — push requires physical device | NO — needs install |
| `expo-constants` | `projectId` resolution via `Constants.expoConfig.extra.eas.projectId` | YES — already present at `"expo-constants": "~18.0.8"` |

**Install command** (per [Expo push notifications setup guide](https://docs.expo.dev/push-notifications/push-notifications-setup/)):
```bash
npx expo install expo-notifications expo-device expo-constants
```

**Important version constraint**: `expo-notifications` SDK 54 version ships as part of the Expo SDK 54 release. The exact compatible version will be resolved by `npx expo install` — do NOT add manually to `package.json`.

**Source**: [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — "Run the following command to install the `expo-notifications`, `expo-device` and `expo-constants` libraries"

---

## 2. Plugin Addition in `app.config.ts`

**Decision**: Add `'expo-notifications'` (string, no config object needed for V1) to the `plugins` array in `app.config.ts`.

```typescript
// app.config.ts plugins array (existing entries preserved)
plugins: [
  'expo-dev-client',
  'expo-router',
  'expo-asset',
  'expo-secure-store',
  // ... existing plugins ...
  'expo-notifications',  // <-- ADD THIS
  // ...
],
```

**Why no config object for V1**: The plugin accepts optional properties (`icon`, `color`, `defaultChannel`, `sounds`, `enableBackgroundRemoteNotifications`). None are required for the foundation task. Default channel and sounds can be configured at runtime instead.

**Source**: [Expo SDK Notifications — configure plugin](https://docs.expo.dev/versions/v54.0.0/sdk/notifications) — shows plugin config structure with icon/color/defaultChannel/sounds.

**Source**: [Expo push notifications setup — add plugin](https://docs.expo.dev/push-notifications/push-notifications-setup/) — "Add the `expo-notifications` plugin in the `plugins` array of your app config"

---

## 3. `projectId` Resolution Pattern for `getExpoPushTokenAsync`

**Decision**: Use the canonical fallback chain documented in the official Expo example:

```typescript
import Constants from 'expo-constants';

const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
if (!projectId) {
  throw new Error('Project ID not found');
}
const pushTokenString = (
  await Notifications.getExpoPushTokenAsync({ projectId })
).data;
```

**Why `Constants.expoConfig.extra.eas.projectId` for this repo specifically**: The repo already exposes `extra.eas.projectId` in `app.config.ts`:
```typescript
extra: {
  eas: { projectId: expoProjectId },  // ← already set
  // ...
}
```

This is the primary path (`Constants.expoConfig.extra.eas.projectId`). The `Constants.easConfig.projectId` fallback handles the case where EAS injects it differently.

**Source**: [Expo push notifications setup — configure projectId](https://docs.expo.dev/push-notifications/push-notifications-setup/) — "We recommend setting it manually in your project's code. To do so, you can use `expo-constants` to get the `projectId` value from the app config. `const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;`"

**Source**: [Expo SDK Notifications — ExpoPushTokenOptions](https://docs.expo.dev/versions/v54.0.0/sdk/notifications) — "`projectId`: Defaults to `Constants.expoConfig.extra.eas.projectId`. When using EAS Build, this value is automatically set."

**Source**: [Expo SDK Notifications — registerForPushNotificationsAsync example](https://docs.expo.dev/versions/v54.0.0/sdk/notifications) — shows the same `projectId` resolution pattern.

---

## 4. Android Channel Setup (Minimal)

**Decision**: Create a single Android default channel at app startup (in the foundation helper):

```typescript
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}
```

**Why `default` channelId**: Matches the plugin's `defaultChannel: 'default'` config (when added). Using `'default'` is the conventional Android channel ID for fallback/foreground notifications.

**Why this MUST precede token retrieval on Android 13+**: Per the Expo docs:
> "On Android 13, users are required to opt-in to receive notifications through an operating system-triggered prompt. This prompt only appears after at least one notification channel has been created. Therefore, it's crucial to call `setNotificationChannelAsync` before `getDevicePushTokenAsync` or `getExpoPushTokenAsync` to ensure you can obtain a push token."

**iOS note**: iOS uses the permission system instead of channels. No channel setup needed for iOS.

**Source**: [Expo SDK Notifications — Permissions > Android](https://docs.expo.dev/versions/v54.0.0/sdk/notifications) — "On Android 13, users are required to opt-in to receive notifications through an operating system-triggered prompt. This prompt only appears after at least one notification channel has been created."

**Source**: [Expo SDK Notifications — setNotificationChannelAsync](https://docs.expo.dev/versions/v54.0.0/sdk/notifications) — API documentation for channel creation.

---

## 5. Foreground Notification Handler Setup (Minimal)

**Decision**: Set the handler globally before any listeners are registered:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

**This handler is for foreground notifications only** (when the app is already open). Background/terminated notification tap behavior is handled by the notification response listener (wired in Task 6, not here).

**V1 behavior for handler**: `shouldShowBanner: true, shouldShowList: true` — shows notifications as banners/lists when app is in foreground. No sound, no badge (badge management is out of V1 scope).

**Source**: [Expo SDK Notifications — Set Handler for Incoming Notifications](https://docs.expo.dev/versions/v54.0.0/sdk/notifications) — "The `setNotificationHandler` function allows you to define a callback that determines how incoming notifications are displayed when the app is running."

**Source**: [Expo push notifications setup — minimal working example](https://docs.expo.dev/push-notifications/push-notifications-setup/) — shows the complete `setNotificationHandler` + listener pattern.

---

## 6. Minimal Runtime Helper Responsibilities for V1 Foundation

**Decision**: Create a single file `utils/notifications.ts` (or `hooks/useNotificationSetup.ts`) that exports a setup function. This file should:

1. Call `Notifications.setNotificationHandler(...)` with V1-consistent behavior
2. On Android: call `Notifications.setNotificationChannelAsync('default', {...})` to create the default channel
3. Register a global `addNotificationReceivedListener` for foreground receipt handling (future-extensible, lightweight)
4. Register a global `addNotificationResponseReceivedListener` for notification tap handling (listened on in Task 6 / AuthProvider)
5. **NOT** call `requestPermissionsAsync()`, `getExpoPushTokenAsync()`, or any user-facing prompts

**Rationale for keeping it minimal**: Task 4 is foundation only. Permission requests belong to Task 5 (service layer) and Task 6 (auth lifecycle). Token fetching and storage belong to Task 5. The helper's job is to set up the Android channel and global handlers so the app is ready when a user triggers permission from a UI CTA.

**Source**: [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — full working example shows `setNotificationHandler` + listener registration in a `useEffect`, with channel setup + token fetch in `registerForPushNotificationsAsync`.

---

## 7. What Must NOT Happen at Startup (Explicit Deferrals)

Per the plan's "Must NOT have" guardrails and official Expo guidance:

| MUST NOT DO | Why | Deferred To |
|---|---|---|
| Permission prompt at splash/startup | Plan guardrail: "Push permission diminta pada momen yang masuk akal, bukan saat splash pertama kali" | Task 5 (service layer, UI-triggered) or Task 6 (auth lifecycle no-prompt sync) |
| Background task infrastructure | Plan guardrail: "do not add background task infrastructure" | Post-V1 (receipt polling deferred) |
| Multi-device token logic | Plan guardrail: V1 single active token per user | Post-V1 |
| Direct Supabase calls | Plan guardrail: "Do not call Supabase directly from scenes" | Task 5 (service layer) |
| Token fetch on startup | Foundation-only scope; token fetch = permission request = user consent event | Task 5 (service layer with no-prompt sync path) |
| Push receipt polling | Best-effort V1; receipt polling requires background cron | Post-V1 |

**Source**: Plan Task 4 description — "Do not request permission here; foundation only."

**Source**: [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — the working example shows `requestPermissionsAsync()` alongside token fetch, but the plan explicitly defers this to a UI-triggered moment (Task 5/6).

---

## 8. Config Validation

After adding the plugin to `app.config.ts`, the acceptance criterion is:
```bash
npx expo config --type public
```
Should show `expo-notifications` in the plugins list without breaking existing config output.

**Source**: Plan Task 4 acceptance criteria — "Run `npx expo config --type public` after dependency/config changes. Expected: The generated Expo config includes the notifications plugin/project configuration and does not regress existing config output."

---

## 9. References Summary

| Topic | Source URL |
|-------|-----------|
| Push notifications setup guide (primary) | https://docs.expo.dev/push-notifications/push-notifications-setup/ |
| SDK v54 notifications API + projectId pattern | https://docs.expo.dev/versions/v54.0.0/sdk/notifications |
| ExpoPushTokenOptions (projectId default) | https://docs.expo.dev/versions/v54.0.0/sdk/notifications |
| Android channel + permission ordering | https://docs.expo.dev/versions/v54.0.0/sdk/notifications |
| Background remote notifications (iOS) | https://docs.expo.dev/versions/v54.0.0/sdk/notifications |

---

## 10. Task 4 implementation outcome (2026-04-23)

- Installed `expo-notifications` and `expo-device` with `npx expo install` so package versions match Expo SDK 54 instead of being guessed manually.
- `app.config.ts` now includes the `expo-notifications` config plugin with `{ defaultChannel: 'default' }`, which is reflected by `npx expo config --type public`.
- Kept Android config minimal: no explicit `android.permissions` entry was added because Expo's permissions guidance says most library permissions are added automatically by the library/config plugin; Task 4 only needed channel bootstrap support, not extra manual manifest permissions.
- The new `utils/notifications.ts` module stays infrastructure-only and exports:
  - `resolveNotificationProjectId()` using `Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId`
  - native/platform guards (`hasNativeNotificationSupport`, `isPhysicalNotificationDevice`)
  - `bootstrapAndroidNotificationChannelAsync()` for Android default channel creation
  - `configureForegroundNotificationHandler()` for foreground presentation behavior
  - `bootstrapNotificationsAsync()` as an idempotent native-only bootstrap wrapper
- Web stays safe because the bootstrap/handler helpers no-op unless `Platform.OS` is `ios` or `android`.
- Validation results for Task 4:
  - `lsp_diagnostics` on `package.json`, `app.config.ts`, and `utils/notifications.ts`: clean
  - `npm run lint`: passed
  - `npm run dev:config:public`: passed and showed `expo-notifications` with `defaultChannel: 'default'`
  - `npm run dev:build:web`: passed after the notification foundation change

---

# Push Notifications - Task 5 Research Findings
**Date**: 2026-04-23
**Task**: 5 - Notification service layer: permission and token APIs

---

## 1. Exact Expo APIs for Permission and Token Operations

### A. No-prompt permission check — `getPermissionsAsync()`

**API**: `Notifications.getPermissionsAsync()`

**Signature** (per [Expo SDK Notifications — Check Notification Permissions](https://docs.expo.dev/versions/latest/sdk/notifications)):
```typescript
const { status } = await Notifications.getPermissionsAsync();
// status: 'granted' | 'denied' | 'undetermined' | 'not-deterministic'
```

**Behavior**: Reads the current permission state from the OS. No user-facing dialog. Returns immediately.

**No-prompt sync use case**: The service's no-prompt token sync should call this first. If `status !== 'granted'`, skip token fetch silently. If `status === 'granted'`, proceed to `getExpoPushTokenAsync`.

**Source**: [Expo SDK Notifications — Check Notification Permissions](https://docs.expo.dev/versions/latest/sdk/notifications) — "Call `getPermissionsAsync` to check the current notification permission status. This function has no user-facing effect and is used to verify if the app is allowed to display alerts, play sounds, etc."

---

### B. Explicit permission request — `requestPermissionsAsync()`

**API**: `Notifications.requestPermissionsAsync(options?)`

**Signature** (per [Expo SDK Notifications — Request Notification Permissions](https://docs.expo.dev/versions/latest/sdk/notifications)):
```typescript
const { status } = await Notifications.requestPermissionsAsync({
  ios: {
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
  },
});
// status: 'granted' | 'denied' | 'undetermined'
```

**Behavior**: Triggers the OS permission dialog. Blocks until user responds. Should only be called from a user-gesture-triggered CTA (plan: "Push permission diminta pada momen yang masuk akal").

**Service exposure**: The service should expose an explicit `requestPermission()` function that the UI layer (Task 7 hook, Task 8 scene) calls when the user taps a permission CTA.

**iOS note**: On iOS, `requestPermissionsAsync` with no options defaults to all permissions. On Android 13+, the OS shows its own prompt after a channel is created (already done in T4 foundation via `bootstrapAndroidNotificationChannelAsync`).

**Source**: [Expo SDK Notifications — Request Notification Permissions](https://docs.expo.dev/versions/latest/sdk/notifications) — "Use `requestPermissionsAsync` to prompt the user for notification permissions. It defaults to requesting permission for alerts, badge count, and sounds."

---

### C. Token retrieval — `getExpoPushTokenAsync()`

**API**: `Notifications.getExpoPushTokenAsync(options?)`

**Signature** (per [Expo SDK Notifications — getExpoPushTokenAsync](https://docs.expo.dev/versions/latest/sdk/notifications)):
```typescript
const { data: token } = await Notifications.getExpoPushTokenAsync({
  projectId: string;  // required for project attribution
});
// Returns: { data: string } — the ExponentPushToken string
```

**Critical constraint**: This must ONLY be called on a physical device (`Device.isDevice === true`). On simulators/emulators/web it will throw or return invalid tokens.

**Prerequisites before calling** (per official example and T4 foundation):
1. Permission must already be granted (`getPermissionsAsync` returned `'granted'`)
2. Android channel must be created (`setNotificationChannelAsync`) — done by T4's `bootstrapAndroidNotificationChannelAsync`
3. `projectId` must be available from `Constants.expoConfig?.extra?.eas?.projectId`

**Source**: [Expo SDK Notifications — getExpoPushTokenAsync](https://docs.expo.dev/versions/latest/sdk/notifications) — "Returns an Expo token that can be used to send a push notification to the device using Expo's push notifications service."

**Source**: [Expo SDK Notifications — registerForPushNotificationsAsync example](https://docs.expo.dev/push-notifications/push-notifications-setup/) — full working code showing the `if (Device.isDevice) { ... getPermissionsAsync ... requestPermissionsAsync ... getExpoPushTokenAsync }` pattern.

---

### D. Device-only guard — `Device.isDevice`

**API**: `Device.isDevice` from `expo-device`

**Usage pattern** (per [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)):
```typescript
import * as Device from 'expo-device';

if (Device.isDevice) {
  // safe to call getPermissionsAsync and getExpoPushTokenAsync
} else {
  // push notifications not available (simulator/web)
}
```

**Source**: [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — "Requires a physical device for testing."

**Note**: `expo-device` is already in `package.json` (T4 installed it). `Device.isDevice` is a synchronous boolean.

---

## 2. Required Platform Guards (from `utils/notifications.ts`)

The existing foundation utility at `utils/notifications.ts` already exports two guards the service should reuse:

### `isPhysicalNotificationDevice()`
```typescript
// utils/notifications.ts:29-31
export function isPhysicalNotificationDevice(): boolean {
  return hasNativeNotificationSupport() && Device.isDevice;
}
```
Where `hasNativeNotificationSupport()` returns `Platform.OS === 'android' || Platform.OS === 'ios'`.

### `hasNativeNotificationSupport()`
```typescript
// utils/notifications.ts:25-27
export function hasNativeNotificationSupport(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}
```

**Web**: `expo-notifications` is not supported on web. All service methods must guard against web using these helpers. The service should NOT import `expo-notifications` on web.

---

## 3. Required Runtime Values from `utils/notifications.ts`

The service must consume the following from `utils/notifications.ts`:

| Value | Source | Purpose |
|-------|--------|---------|
| `resolveNotificationProjectId()` | `utils/notifications.ts:18-23` | Resolves `projectId` for `getExpoPushTokenAsync`. Returns `string \| null`. The service must throw if null. |
| `isPhysicalNotificationDevice()` | `utils/notifications.ts:29-31` | Guard for all Expo notification calls. Only call token APIs if `true`. |
| `DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID` | `utils/notifications.ts:12` | `'default'` — already created by T4's `bootstrapAndroidNotificationChannelAsync`; no need to recreate. |

---

## 4. Service API Surface Design

### No-prompt token sync (`syncTokenIfGranted`)

```
syncTokenIfGranted(): Promise<{ data: string } | { error: 'not_granted' | 'not_device' | 'no_project_id' | 'fetch_failed' }>
```

**Logic**:
1. If NOT `isPhysicalNotificationDevice()` → return `{ error: 'not_device' }` (no-op on simulator/web)
2. Call `getPermissionsAsync()` → if `status !== 'granted'` → return `{ error: 'not_granted' }` (silent, no prompt)
3. Resolve `projectId` via `resolveNotificationProjectId()` → if null → return `{ error: 'no_project_id' }`
4. Call `getExpoPushTokenAsync({ projectId })` → return token in `{ data: token }`
5. Wrap in try/catch → return `{ error: 'fetch_failed' }` on exception

**Key rule**: No `requestPermissionsAsync` call. No user dialog. Silently skip if permission not yet granted.

**Source**: [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — "If `existingStatus !== 'granted'`, call `requestPermissionsAsync()`" is the explicit-request path; the no-prompt path skips this step.

---

### Explicit permission request (`requestPermission()`)

```
requestPermission(): Promise<{ granted: boolean }>
```

**Logic**:
1. If NOT `isPhysicalNotificationDevice()` → return `{ granted: false }`
2. Call `getPermissionsAsync()` → if already `'granted'` → return `{ granted: true }`
3. Call `requestPermissionsAsync()` with iOS options `{ allowAlert: true, allowBadge: true, allowSound: true }`
4. Return `{ granted: status === 'granted' }`

**This is the only function that triggers the OS permission dialog.** Must only be called from a UI gesture (e.g., "Allow notifications" button tap).

**Source**: [Expo SDK Notifications — Request Notification Permissions](https://docs.expo.dev/versions/latest/sdk/notifications) — "Use `requestPermissionsAsync` to prompt the user for notification permissions."

---

### Token upsert (`upsertPushToken`)

```
upsertPushToken(token: string): Promise<{ data: true } | { error: 'update_failed' }>
```

**Logic**: Uses `services/profile.service.ts`-style `{ data, error }` pattern. Calls Supabase `from('profiles').update({ expo_push_token: token, expo_push_token_updated_at: new Date().toISOString() }).eq('id', currentUserId)`.

**Must only be called after `syncTokenIfGranted` returns `{ data }` or after `requestPermission` returns `{ granted: true }`.** The service should not blindly upsert — it should only upsert a token that was successfully obtained.

**Token clear on logout** (from Task 6 spec): `clearPushToken()` → `update profiles set expo_push_token = null where id = currentUserId`.

---

## 5. Permission Status Values (Official)

Per [Expo SDK Notifications](https://docs.expo.dev/versions/latest/sdk/notifications), the possible values for `getPermissionsAsync` and `requestPermissionsAsync` status:

| Status | Meaning |
|--------|---------|
| `'granted'` | User has granted permission |
| `'denied'` | User has denied permission |
| `'undetermined'` | User has not been asked yet (iOS pattern) |
| `'not-deterministic'` | Android behavior where the OS cannot determine status |

**On iOS**: `allowNotificationsAsync()` helper from docs:
```typescript
const settings = await Notifications.getPermissionsAsync();
return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
```

The service should treat `PROVISIONAL` as "granted" for iOS if it wants to allow provisional tokens in V1, but the plan specifies explicit permission request so this is not needed for the no-prompt sync path.

---

## 6. Service Result Shape Conventions (from existing services)

### Pattern to follow: `services/profile.service.ts:196-214`

```typescript
export async function updateProfile(...) {
  // ... logic ...
  if (error) {
    return { data: null, error: normalizeError(error) };
  }
  return { data: updatedProfile, error: null };
}
```

The service must return `{ data, error }` where `error` is `null` on success. Task 5 implementer should use the same `normalizeError` pattern.

---

## 7. Web / Non-Device Handling

**Rule**: `expo-notifications` throws or returns garbage on web and simulator.

The service's token functions must:
1. Check `isPhysicalNotificationDevice()` BEFORE any Expo API call
2. Return `{ error: 'not_device' }` if `false` (not a thrown error — a structured result)
3. Never call `getExpoPushTokenAsync` or `requestPermissionsAsync` on non-physical devices

**On web specifically**: The service can also check `Platform.OS === 'web'` as a first-line guard, but `isPhysicalNotificationDevice()` already returns `false` for web since `hasNativeNotificationSupport()` returns `false` for web.

---

## 8. Token Upsert to Supabase (Runtime Values Consumed)

The service's `upsertPushToken` method writes to `public.profiles`:
- `expo_push_token text` — the token string from `getExpoPushTokenAsync().data`
- `expo_push_token_updated_at timestamptz` — `timezone('utc'::text, now())`

**Columns added by Task 1 migration**: Confirmed in `types/supabase.ts` (after Task 1 type regeneration): `profiles.expo_push_token` and `profiles.expo_push_token_updated_at`.

**Auth requirement**: The service must use the authenticated Supabase client (not anon key) since profile updates require the user's own row. The service should use the same client pattern as `profile.service.ts`.

---

## 9. What the Service Should NOT Do

| Must NOT | Reason |
|----------|--------|
| Call `requestPermissionsAsync` at startup | Plan guardrail: "push permission diminta pada momen yang masuk akal" |
| Call `getExpoPushTokenAsync` without permission check | Will throw or return invalid token on Android 13+ without permission |
| Call token APIs without `isPhysicalNotificationDevice()` guard | Simulator/web return invalid tokens or throw |
| Write to `profiles.expo_push_token` without a valid token | Storing invalid tokens causes push failures |
| Store token on `SIGNED_OUT` without verification | Should verify user is actually signing out before clearing |
| Use bare `console.log` | Guard with `if (__DEV__)` per codebase conventions |

---

## 10. References Summary

| Topic | Source URL |
|-------|-----------|
| Permission check API | https://docs.expo.dev/versions/latest/sdk/notifications |
| Permission request API | https://docs.expo.dev/versions/latest/sdk/notifications |
| Token retrieval API (getExpoPushTokenAsync) | https://docs.expo.dev/versions/latest/sdk/notifications |
| ExpoPushTokenOptions (projectId default) | https://docs.expo.dev/versions/latest/sdk/notifications |
| Full working registration example | https://docs.expo.dev/push-notifications/push-notifications-setup/ |
| Android channel prerequisite for token | https://docs.expo.dev/versions/latest/sdk/notifications |
| Expo push setup guide | https://docs.expo.dev/push-notifications/push-notifications-setup/ |

---

## 11. Decision-Ready Brief for Task 5

### Service Functions to Expose

| Function | Signature | Purpose |
|----------|-----------|---------|
| `syncTokenIfGranted()` | `() => Promise<{ data: string } \| { error: PermissionError }>` | No-prompt token sync on auth init (T6) |
| `requestPermission()` | `() => Promise<{ granted: boolean }>` | UI-triggered permission request (T7/T8) |
| `upsertPushToken(token)` | `(token: string) => Promise<{ data: true } \| { error: string }>` | Write token to `profiles` after successful fetch |
| `clearPushToken()` | `() => Promise<{ data: true } \| { error: string }>` | Clear token on logout (T6) |

### `PermissionError` Union
```typescript
type PermissionError = 'not_device' | 'not_granted' | 'no_project_id' | 'fetch_failed';
```

### Separation: No-Prompt vs Explicit

- **No-prompt** (`syncTokenIfGranted`): Only calls `getPermissionsAsync` + `getExpoPushTokenAsync`. Skips silently if not granted. Used on `INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED` in T6.
- **Explicit** (`requestPermission`): Calls `requestPermissionsAsync` (triggers OS dialog). Used from the notification permission CTA in T7/T8 scene.

### Device Guard

```typescript
if (!isPhysicalNotificationDevice()) {
  return { error: 'not_device' };
}
```
`isPhysicalNotificationDevice()` is already exported from `utils/notifications.ts`.

### ProjectId Guard

```typescript
const projectId = resolveNotificationProjectId();
if (!projectId) {
  return { error: 'no_project_id' };
}
```
`resolveNotificationProjectId()` is already exported from `utils/notifications.ts`.

### Supabase Profile Token Columns (Task 1 contract)

```typescript
// Read
const { data: profile } = await supabase
  .from('profiles')
  .select('expo_push_token, expo_push_token_updated_at')
  .eq('id', userId)
  .single();

// Upsert
const { error } = await supabase
  .from('profiles')
  .update({
    expo_push_token: token,
    expo_push_token_updated_at: new Date().toISOString(),
  })
  .eq('id', userId);
```

### Web Handling

All token functions must return `{ error: 'not_device' }` on web and simulator without calling any Expo notification API. `isPhysicalNotificationDevice()` already handles this.

---

## 12. Inbox Fetch and Mark-Read (Brief for Completeness)

### Fetch Inbox
```typescript
async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  // ...
}
```

### Mark as Read
```typescript
async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId); // ownership guard
}
```

These follow the existing service pattern from `profile.service.ts` and `order.service.ts`.

---

## 13. Task 5 implementation outcome (2026-04-23)

- Created `services/notification.service.ts` as the single zone for all notification data access and Expo token operations.
- Exports four public functions: `syncTokenIfGranted()`, `requestPermission()`, `upsertPushToken()`, `clearPushToken()`.
- Exports inbox functions: `fetchNotifications()`, `markAsRead()`, `markAllAsRead()`.
- All functions return typed `{ data, error }` shapes consistent with existing services.
- All Expo API calls guarded by `isPhysicalNotificationDevice()` and `resolveNotificationProjectId()` from `utils/notifications.ts`.
- `fetchNotifications` returns `Notification[]` (from `types/notification.ts`) ordered newest-first.
- `markAsRead` uses ownership guard via `user_id` in the update filter.
- Web/simulator: all token functions return `{ error: 'not_device' }` without calling Expo APIs.
- Permission-denied: `syncTokenIfGranted` returns `{ error: 'not_granted' }` without prompting.
- All error messages follow codebase conventions (no bare console.log, guarded by `__DEV__`).


---

# Push Notifications - Task 5 Service Layer Research Findings
**Date**: 2026-04-23
**Task**: 5 - Notification service layer for inbox data and token lifecycle APIs

---

## 1. Core File to Mirror (Minimum 4)

### File 1: `services/address.service.ts` — PRIMARY UPDATE + OWNED-ROW PATTERN
**Path**: `/home/coder/dev/pharma/frontend/services/address.service.ts`
**Why**: Most closely mirrors the notification service's update semantics. Notifications are user-owned rows (RLS enforced with `auth.uid() = user_id`) that require: (a) read (inbox list), (b) update (mark read), (c) delete. `address.service.ts` demonstrates all three operations with the correct result shape pattern `{ data, error }`.

**Key patterns to copy**:
- Export typed helper functions: `getAddresses`, `getNotificationById`, `markNotificationAsRead`, `deleteNotification`, `getUnreadCount`
- `withAbortSignal()` wrapper for all queries (lines 34-49)
- Result shape: `Promise<{ data: Address[] | null; error: Error | null }>` for lists, `Promise<{ error: Error | null }>` for mutations, `Promise<{ data: T | null; error: Error | null }>` for single-row reads
- Supabase error normalization: `error as unknown as Error`
- `profile_id` ownership check pattern (`.eq('profile_id', profileId)`) — for notifications the equivalent is `.eq('user_id', userId)`

### File 2: `services/profile.service.ts` — TOKEN UPSERT + PROFILE UPDATE PATTERN
**Path**: `/home/coder/dev/pharma/frontend/services/profile.service.ts`
**Why**: Task 5 must handle `expo_push_token` lifecycle (upsert on login/update, clear on logout). `profile.service.ts` shows the canonical pattern for updating a user's profile columns: `updateProfile` at line 196 uses `.update(updatePayload).eq('id', userId).select().single()` and returns `{ data: ProfileRow | null, error: Error | null }`.

**Key patterns to copy**:
- Token upsert pattern: same structure as `updateProfile` but for `expo_push_token` and `expo_push_token_updated_at` columns
- Conditional payload construction (lines 201-207): only include fields that are explicitly set
- `getProfile` pattern for reading user profile data (line 9-18): `supabase.from('profiles').select('*').eq('id', userId).single()`

### File 3: `services/order.service.ts` — PAGINATED LIST + METRICS + ERROR NORMALIZATION PATTERN
**Path**: `/home/coder/dev/pharma/frontend/services/order.service.ts`
**Why**: Notification inbox needs paginated list with ordering by `created_at desc`, plus error normalization. `order.service.ts` at `getOrdersOptimized` (line 864) is the canonical paginated list pattern with `OrderListResult = { data, error, metrics }` (line 183-187). It also shows the complete error handling pipeline: `logSupabaseError` + `normalizeSupabaseError` + `classifyError` + `translateErrorMessage`.

**Key patterns to copy**:
- Result shape: `interface NotificationListResult { data: NotificationRow[] | null; error: Error | null; metrics: NotificationListMetrics | null }`
- Query construction: `supabase.from('notifications').select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + fetchLimit - 1)`
- Pagination with `hasMore = rows.length > pageSize` (lines 979-980)
- Metrics object: `{ durationMs, fetchedAt, offset, limit, hasMore }` (line 196-201)
- `withRetry` wrapper for query execution (line 889)
- Error normalization via `normalizeSupabaseError` (line 755-768)

### File 4: `services/cart.service.ts` — MUTATION RESULT + REALTIME PATTERN
**Path**: `/home/coder/dev/pharma/frontend/services/cart.service.ts`
**Why**: Shows `CartMutationResult = { error: Error | null }` pattern (line 24-26) for mutations that don't need a return value. Also shows `subscribeToCartChanges` realtime pattern which is relevant if notifications use realtime subscription for inbox updates.

**Key patterns to copy**:
- Mutation result shape: `export interface NotificationMutationResult { error: Error | null }`
- For read-state updates (mark as read): `supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('user_id', userId)` returning `{ error }`
- For mark-all-as-read: batch update pattern

### File 5 (bonus): `services/checkout.service.ts` — FUNCTION INVOKE PATTERN
**Why**: If notification service needs to call Edge Functions (e.g., for token registration/deregistration), the `checkout.service.ts` function invoke pattern is relevant. However, for token upsert via direct Supabase write, this is not needed.

---

## 2. Result Shape Conventions (Exact Contract)

All services use the same result shape pattern:

```
// Single row read
Promise<{ data: T | null; error: Error | null }>

// List read with metrics
Promise<{ data: T[] | null; error: Error | null; metrics: { durationMs, fetchedAt, offset, limit, hasMore } | null }>

// Mutation (no return row)
Promise<{ error: Error | null }>

// Mutation (returns row)
Promise<{ data: T | null; error: Error | null }>
```

For notification service, the exact result types should be:
```typescript
export interface NotificationListResult {
  data: NotificationRow[] | null;
  error: Error | null;
  metrics: NotificationListMetrics | null;
}

export interface NotificationDetailResult {
  data: NotificationRow | null;
  error: Error | null;
}

export interface NotificationMutationResult {
  error: Error | null;
}

export interface TokenUpdateResult {
  data: { expo_push_token: string | null; expo_push_token_updated_at: string | null } | null;
  error: Error | null;
}
```

---

## 3. Permission/Token Helper Boundaries

**CRITICAL**: `services/notification.service.ts` must NOT import from `utils/notifications.ts`.

- `utils/notifications.ts` (Task 4 output) handles Expo notification infrastructure: `bootstrapNotificationsAsync()`, `configureForegroundNotificationHandler()`, `isPhysicalNotificationDevice()`. This is native-only mobile setup.
- `services/notification.service.ts` handles database-level token lifecycle and inbox data: update `expo_push_token` on profiles, read/write `notifications` rows.

**Token lifecycle functions in the service**:
```typescript
// Upsert token on login/profile update
export async function updateExpoPushToken(
  userId: string,
  token: string
): Promise<TokenUpdateResult>

// Clear token on logout
export async function clearExpoPushToken(userId: string): Promise<TokenUpdateResult>
```

These follow `profile.service.ts` pattern: `.update(payload).eq('id', userId).select('expo_push_token, expo_push_token_updated_at').single()`.

**Inbox functions in the service** (follow `address.service.ts` + `order.service.ts` patterns):
```typescript
// Paginated inbox list
export async function getNotifications(
  userId: string,
  params?: { offset?: number; limit?: number; signal?: AbortSignal }
): Promise<NotificationListResult>

// Single notification
export async function getNotificationById(
  notificationId: string,
  userId: string
): Promise<NotificationDetailResult>

// Mark one as read
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationMutationResult>

// Mark all as read
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ count: number; error: Error | null }>

// Delete notification
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<NotificationMutationResult>

// Unread count (for badge)
export async function getUnreadNotificationCount(
  userId: string
): Promise<{ count: number; error: Error | null }>
```

**What stays OUT of the service** (UI/Expo responsibilities):
- Notification listener registration (T6/T7)
- Push permission request handling (T6/T7)
- UI rendering of notification items (scenes)
- `parseNotificationRoute()` from `types/notification.ts` (called by scenes, not service)

---

## 4. Read-State Persistence — Where It Lives

`read_at` is a column on the `notifications` table (from Task 1 migration). The service layer is the ONLY place that should UPDATE this column.

- **Mark one as read**: `supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('user_id', userId)` — follows same pattern as `address.service.ts` update operations
- **Mark all as read**: `supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).eq('read_at', null)` — update all unread for a user in one query
- **Get unread count**: `supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null)`

**No Redux/Zustand for read state**: The read state is stored durably in the `notifications.read_at` column. Services return the current state; scenes can cache in local state if needed.

---

## 5. Best Existing Test Pattern to Copy

**Primary: `__tests__/services/cart.service.test.ts`** — most comprehensive pattern for service tests in this repo.

Key characteristics:
1. Mocks `supabase` via `jest.mock('@/utils/supabase', () => ({ supabase: { from: (...args) => mockFrom(...args) } }))` with `const mockFrom = jest.fn()`
2. Uses `beforeEach(() => { mockFrom.mockReset(); })` to reset mocks
3. Query builders are constructed as plain objects with method chains that return themselves or async executors
4. Test cases are grouped in `describe()` blocks by behavior/feature, not by method name
5. Uses `createDeferred<T>()` helper for async test control (lines 69-79)
6. Tests cover: happy path, error path, empty rows, pagination detection, abort signal passthrough

**Secondary: `__tests__/services/order.service.test.ts`** — simpler pattern for pure function/state tests without Supabase mocking (uses `jest.mock()` for utilities only).

**Test file location**: `__tests__/services/notification.service.test.ts`

**Test cases to mirror**:
1. `getNotifications` returns paginated inbox ordered by `created_at desc`
2. `getNotifications` returns empty array when no notifications exist
3. `getNotifications` handles Supabase error and returns normalized error
4. `getNotificationById` returns correct row for valid notificationId + userId
5. `getNotificationById` returns null for non-existent notification
6. `markNotificationAsRead` updates `read_at` column for owned notification
7. `markNotificationAsRead` returns error for notification not owned by user
8. `markAllNotificationsAsRead` returns count of updated rows
9. `getUnreadNotificationCount` returns correct count
10. `updateExpoPushToken` upserts token on profiles table
11. `clearExpoPushToken` clears token on logout

---

## 6. Supabase Query Style

**Column selection**: Use explicit column lists, not `*` (following `order.service.ts` `ORDER_READ_MODEL_SELECT` pattern):
```typescript
const NOTIFICATION_SELECT = `
  id,
  user_id,
  type,
  title,
  body,
  cta_route,
  data,
  priority,
  read_at,
  created_at
`;
```

**User-owned row queries**: Always filter by `user_id` (enforced by RLS, but defensive):
```typescript
supabase
  .from('notifications')
  .select(NOTIFICATION_SELECT)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + fetchLimit - 1)
```

**Update pattern**: Use `.eq('id', rowId).eq('user_id', userId)` for ownership guarantee:
```typescript
supabase
  .from('notifications')
  .update({ read_at: new Date().toISOString() })
  .eq('id', notificationId)
  .eq('user_id', userId)
```

**No direct token read from `notifications` table**: Token lifecycle reads/writes go to `profiles` table, not `notifications`.

---

## 7. Interaction with `utils/notifications.ts` (Task 4)

`utils/notifications.ts` (infrastructure, native-only) vs `services/notification.service.ts` (data layer):

```
utils/notifications.ts         services/notification.service.ts
─────────────────────────────────────────────────────────────
bootstrapNotificationsAsync()  getNotifications(userId, params)
configureForeground...()       getNotificationById(id, userId)
isPhysicalNotificationDevice() markNotificationAsRead(id, userId)
hasNativeNotificationSupport() markAllNotificationsAsRead(userId)
isPushSupported()              deleteNotification(id, userId)
                               getUnreadNotificationCount(userId)
                               updateExpoPushToken(userId, token)
                               clearExpoPushToken(userId)

UI layer (scenes/hooks) calls BOTH:
- Calls utils/notifications.ts to set up Expo listeners
- Calls notification.service.ts to read/write inbox data
- Calls parseNotificationRoute() from types/notification.ts to resolve cta_route
```

**The boundary is clean**: The service knows nothing about Expo. Scenes call both independently.

---

## 8. Integration with Existing Service Architecture

**File placement**: `/home/coder/dev/pharma/frontend/services/notification.service.ts`

**Barrel export**: Add `export * from './notification.service'` to `services/index.ts` (line 13 after `googlePlaces.service`)

**Dependencies**:
- Imports `supabase` from `@/utils/supabase` (via `@/services/supabase.service` re-export, same as all other services)
- Imports types from `@/types/supabase` (`Tables`, `TablesUpdate`)
- Imports error utilities from `@/utils/error` (`classifyError`, `isRetryableError`, `translateErrorMessage`) — same as `order.service.ts`
- **Does NOT import** from `utils/notifications.ts`
- **Does NOT import** from Expo notification packages

**Type imports**:
```typescript
import { supabase } from '@/services/supabase.service';  // re-export of @/utils/supabase
import type { Tables, TablesUpdate } from '@/types/supabase';
import { classifyError, isRetryableError, translateErrorMessage } from '@/utils/error';
import type { NotificationType, NotificationRow } from '@/types/notification';
```

---

## 9. Blocker: `NotificationRow` type from `types/notification.ts` depends on Task 1 schema

`types/notification.ts` line 89-91 defines:
```typescript
export interface NotificationRow extends Omit<Tables<'notifications'>, 'type'> {
  type: NotificationType;
}
```

This requires `Tables<'notifications'>` from `types/supabase.ts`, which was updated in Task 1. The implementer should verify `types/supabase.ts` has the `notifications` table type before writing `notification.service.ts`.

**No other blockers found.** The service layer is purely frontend — no backend/Edge Function changes needed.

---

# Push Notifications - Task 6 Research Findings
**Date**: 2026-04-23
**Task**: 6 - Auth/root lifecycle wiring for listeners and no-prompt token sync

---

## 1. Official Expo Listener APIs

### A. `addNotificationReceivedListener` — Foreground Receipt

**Source**: [Expo SDK Notifications — Listen for Received Notifications](https://docs.expo.dev/versions/latest/sdk/notifications)

> "Registers a listener to handle notifications received while the app is running. Always remove the subscription in the cleanup function to prevent memory leaks."

```typescript
import * as Notifications from 'expo-notifications';

const subscription = Notifications.addNotificationReceivedListener(notification => {
  console.log(notification);
});
return () => subscription.remove();
```

**Key facts**:
- Called when a notification arrives **while the app is in the foreground**
- Does NOT fire for tap/interaction — only for receipt while foregrounded
- Returns `EventSubscription` with `.remove()` method
- Must be cleaned up on unmount to prevent memory leaks

### B. `addNotificationResponseReceivedListener` — Notification Tap / Interaction

**Source**: [Expo SDK Notifications — addNotificationResponseReceivedListener](https://docs.expo.dev/versions/latest/sdk/notifications)

> "Listeners registered by this method will be called whenever a user interacts with a notification (for example, taps on it)."

```typescript
const subscription = Notifications.addNotificationResponseReceivedListener(response => {
  const url = response.notification.request.content.data.url;
  Linking.openURL(url);
});
return () => subscription.remove();
```

**Key facts**:
- Fires when user **taps or interacts** with a notification, regardless of foreground/background
- `response.notification.request.content.data` contains the push payload `data` object
- `response.notification.request.content.url` for URL-based deep links
- Returns `EventSubscription` with `.remove()` method
- Cleanup pattern identical to `addNotificationReceivedListener`

### C. `setNotificationHandler` — Foreground Display Behavior

**Source**: [Expo SDK Notifications — setNotificationHandler](https://docs.expo.dev/versions/latest/sdk/notifications)

> "Sets a global handler to determine if notifications should show banners, sounds, or badges when received while the app is running. The handler must respond within 3 seconds, otherwise the notification will be discarded."

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

**Key facts**:
- **Must be called BEFORE registering any listeners** (per Expo docs)
- Handler runs when notification is received **while app is in foreground**
- Response must come within 3 seconds or notification is discarded
- T4's `bootstrapNotificationsAsync()` already calls this — so listener registration in T6 is safe

---

## 2. Cleanup/Remove Pattern

**Source**: [Expo SDK Notifications — Listen for Received Notifications](https://docs.expo.dev/versions/latest/sdk/notifications)

```typescript
useEffect(() => {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    setNotification(notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log(response);
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}, []);
```

**All three cleanup requirements confirmed**:
1. Both listeners return `EventSubscription` with `.remove()` method
2. Cleanup runs in `useEffect` return function (component unmount)
3. Both listeners removed in the same cleanup function

**For AuthProvider / root layout (non-React lifecycle)**:
- T4 already exports `bootstrapNotificationsAsync()` which is idempotent
- T6 must export a `cleanupNotifications()` teardown from `utils/notifications.ts` (or the module itself stores subscriptions and provides removal)
- The caller (AuthProvider unmount, or SIGNED_OUT) calls `remove()` on stored subscriptions

---

## 3. What Can Safely Run at Startup Now That T4 Foundation Exists

### Already safe to call at startup (no prompt):

| Action | What it does | Source |
|--------|-------------|--------|
| `bootstrapNotificationsAsync()` from `utils/notifications.ts` | Sets `setNotificationHandler` + Android channel | T4 foundation — idempotent, no prompt |
| `addNotificationReceivedListener(fn)` | Registers foreground receipt listener | [Expo docs](https://docs.expo.dev/versions/latest/sdk/notifications) |
| `addNotificationResponseReceivedListener(fn)` | Registers notification-tap listener | [Expo docs](https://docs.expo.dev/versions/latest/sdk/notifications) |
| `getPermissionsAsync()` | Checks permission status without prompting | [Expo docs](https://docs.expo.dev/versions/latest/sdk/notifications) |
| `syncExpoPushTokenIfPermitted(userId)` from T5 service | No-prompt token sync when permission already granted | T5 service — uses `getPermissionsAsync` only |

### Why these are safe:
- `bootstrapNotificationsAsync()` configures handler + channel (already implemented in T4)
- Both listener registrations are **pure setup** — they don't prompt or mutate state
- `syncExpoPushTokenIfPermitted()` uses `getPermissionsAsync()` without prompting (T5 service behavior confirmed)

### Call order for startup safety:
```
1. bootstrapNotificationsAsync()     ← T4 foundation, sets handler, idempotent
2. addNotificationReceivedListener(fn)  ← register foreground receipt
3. addNotificationResponseReceivedListener(fn) ← register tap listener
4. syncExpoPushTokenIfPermitted(userId) ← T5 no-prompt sync, only if permission granted
```

---

## 4. What Must Still Remain Deferred (No Startup Prompt)

The plan explicitly forbids permission prompting at startup. The following remain deferred to explicit UI triggers:

| Action | Why deferred | Source |
|--------|-------------|--------|
| `requestPermissionsAsync()` | Prompts OS permission dialog — forbidden at startup | [Expo docs](https://docs.expo.dev/versions/latest/sdk/notifications) — `requestPermissionsAsync` triggers user-facing dialog |
| `requestExpoPushTokenAndSync()` from T5 | Calls `requestPermissionsAsync()` internally | T5 service — explicit path only, not auto-sync |
| Any UI component that calls `requestPermissionsAsync()` on mount | Would trigger on splash/root | Plan task 6: "Must NOT do: Do not prompt for OS permission from AuthProvider or splash/root startup" |

**No startup prompt rule is absolute**: `AuthProvider` and `app/_layout.tsx` must not call `requestPermissionsAsync()` or `requestExpoPushTokenAndSync()` on any startup path (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED).

---

## 5. Notification Response Payload — How to Consume

### From `addNotificationResponseReceivedListener` callback:

**Source**: [Expo SDK Notifications — Listen for Notification Interactions](https://docs.expo.dev/versions/latest/sdk/notifications)

```typescript
const subscription = Notifications.addNotificationResponseReceivedListener(response => {
  const url = response.notification.request.content.data.url;
  Linking.openURL(url);
});
```

### Payload consumption for this codebase:

The `data` field from the push payload is accessible at:
```
response.notification.request.content.data
```

This is the same `data` jsonb stored in `public.notifications.cta_route` and `public.notifications.data`.

### Navigation routing from notification tap:

**Source**: [Expo SDK Notifications — Configure React Navigation for Push Notification Redirects](https://docs.expo.dev/versions/latest/sdk/notifications)

```typescript
// Check for initial URL from notification (app was cold-started by notification)
const response = Notifications.getLastNotificationResponse();
return response?.notification.request.content.data.url;
```

For T6 implementation, the response handler should:
1. Read `response.notification.request.content.data` from the tap event
2. Extract `cta_route` and `data` from the payload (matching `parseNotificationRoute()` from T3)
3. Build a `TypedHref` using `buildNotificationTypedHref()` from T3 types
4. Navigate with `router.push()` or fall back to `/notifications` tab

### T3 type helpers available for T6:
- `parseNotificationRoute(ctaRoute: string | null, data: unknown)` from `types/notification.ts`
- `buildNotificationTypedHref(target: NotificationRouteTarget): TypedHref` from `types/notification.ts`
- `NotificationRouteTarget` union for route-by-type routing

---

## 6. Integration Points for T6

### AuthProvider auth event handlers (where to add no-prompt token sync):

From `providers/AuthProvider.tsx` lines 150-173:

```typescript
if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  setTimeout(async () => {
    // T6: add syncExpoPushTokenIfPermitted(userId) here — no prompt
    // T6: add listener registration here
  }, 0);
}
```

**No-prompt token sync call site** (inside the setTimeout callback, after `validateAndDispatch`):
```typescript
// After user is validated and dispatchAuth is called:
await syncExpoPushTokenIfPermitted(user.id);
```

**Token clear on SIGNED_OUT** (line 145-147):
```typescript
if (event === 'SIGNED_OUT' || !session?.user) {
  // T6: add clearExpoPushToken(lastUserId) here
  if (mounted) dispatchAuth(undefined, false);
}
```

### Root app / listener registration in app/_layout.tsx:

From `app/_layout.tsx` lines 98-107, the composition is:
```typescript
<Provider>
  <QueryProvider>
    <AuthProvider>
      <Router />
    </AuthProvider>
  </QueryProvider>
</Provider>
```

**T6 listener registration should happen**:
- In `app/_layout.tsx` BEFORE `<Router />` (or as part of a new notification bootstrap component)
- OR in `AuthProvider` after user is confirmed (more appropriate for token sync)

### Recommended structure:
1. **Listener registration**: `app/_layout.tsx` (or a thin wrapper component inside it) — registers the two global listeners once at app mount
2. **Token sync**: `AuthProvider` on `INITIAL_SESSION`/`SIGNED_IN`/`TOKEN_REFRESHED` using `syncExpoPushTokenIfPermitted()`
3. **Token clear**: `AuthProvider` on `SIGNED_OUT` using `clearExpoPushToken()`

---

## 7. `getLastNotificationResponse` for Cold-Start Navigation

**Source**: [Expo SDK Notifications — Configure React Navigation for Push Notification Redirects](https://docs.expo.dev/versions/latest/sdk/notifications)

> "Handle URL from expo push notifications: `Notifications.getLastNotificationResponse()` returns the response from the last notification that was opened."

```typescript
const response = Notifications.getLastNotificationResponse();
return response?.notification.request.content.data.url;
```

**Use case for T6**: When the app is cold-started by tapping a notification (app was not running or was in background), `getLastNotificationResponse()` provides the payload on initial navigation setup.

**Implementation approach**:
- In `app/_layout.tsx`, before rendering `<Router />`, call `getLastNotificationResponseAsync()` 
- If non-null, route to the appropriate destination via the T3 navigation helpers
- This handles the "app opened from notification tap" cold-start case

---

## 8. Summary — What T6 Can and Cannot Do

### CAN DO at startup/root (no prompt):
- ✅ Call `bootstrapNotificationsAsync()` from `utils/notifications.ts` (T4 foundation)
- ✅ Register `addNotificationReceivedListener` for foreground notification receipt
- ✅ Register `addNotificationResponseReceivedListener` for notification tap handling
- ✅ Call `syncExpoPushTokenIfPermitted(userId)` on auth events (permission check only, no prompt)
- ✅ Call `getLastNotificationResponse()` to check if app was cold-started from a notification

### MUST NOT DO at startup:
- ❌ Call `requestPermissionsAsync()` on any startup path
- ❌ Call `requestExpoPushTokenAndSync()` on any startup path
- ❌ Any UI that triggers OS permission dialog on mount/splash

### Must happen via explicit UI trigger (not startup):
- Permission request via `requestExpoPushTokenAndSync()` triggered by user action in the Notifikasi scene (T8) or notification permission CTA

---

## 9. References Summary

| Topic | Source URL |
|-------|-----------|
| `addNotificationReceivedListener` API | https://docs.expo.dev/versions/latest/sdk/notifications |
| `addNotificationResponseReceivedListener` API | https://docs.expo.dev/versions/latest/sdk/notifications |
| Listener cleanup pattern | https://docs.expo.dev/versions/latest/sdk/notifications |
| `setNotificationHandler` API | https://docs.expo.dev/versions/latest/sdk/notifications |
| `setNotificationHandler` timing requirement | https://docs.expo.dev/versions/latest/sdk/notifications |
| React Navigation + notification deep linking | https://docs.expo.dev/versions/latest/sdk/notifications |
| `getLastNotificationResponse` for cold-start | https://docs.expo.dev/versions/latest/sdk/notifications |
| `getPermissionsAsync` (no-prompt check) | https://docs.expo.dev/versions/latest/sdk/notifications |
| `requestPermissionsAsync` (user-prompted) | https://docs.expo.dev/versions/latest/sdk/notifications |
| T5 service `syncExpoPushTokenIfPermitted` | services/notification.service.ts (lines 385-409) |
| T5 service `requestExpoPushTokenAndSync` | services/notification.service.ts (lines 411-435) |
| T5 service `clearExpoPushToken` | services/notification.service.ts (lines 473-505) |
| T4 foundation `bootstrapNotificationsAsync` | utils/notifications.ts (lines 62-83) |
| T4 foundation `configureForegroundNotificationHandler` | utils/notifications.ts (lines 45-60) |
| T3 notification route types | types/notification.ts |
| AuthProvider auth event handling | providers/AuthProvider.tsx:150-173 |
| AuthProvider SIGNED_OUT handling | providers/AuthProvider.tsx:145-147 |

---

# Push Notifications - Task 7 Research Findings
**Date**: 2026-04-23
**Task**: 7 - Build `useNotifications` hook with inbox state machine and optional live updates

---

## 1. Minimum Files to Mirror (At Least 4 Required)

### File 1: `hooks/useOrderDetail.ts` — PRIMARY HOOK RETURN-SHAPE + STATE-MACHINE PATTERN
**Path**: `/home/coder/dev/pharma/frontend/hooks/useOrderDetail.ts`

**Why this is the primary reference**: This is the most complete single-hook pattern for a screen-sized data fetching hook. It demonstrates ALL the patterns task 7 needs:
- Explicit `UseOrderDetailState` + `UseOrderDetailReturn` typed exports (lines 17-29)
- `OrderDetailStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'not-found' | 'error'` union (lines 9-15)
- Request-id cancellation (`activeRequestIdRef`, lines 40, 68-69, 81-83, 132-134)
- Mounted-ref guard (`isMountedRef`, lines 41, 47-50, 81-83, 132-134)
- Focus-refresh debounce with `useFocusEffect` (lines 160-169)
- Fetch reason parameter (`'initial' | 'refresh'`) controlling loading/refreshing states (lines 62, 71-76)

**Key code positions to copy exactly**:

**State type (lines 17-21)**:
```typescript
export interface UseOrderDetailState {
  order: OrderWithItems | null;
  status: OrderDetailStatus;
  error: string | null;
}
```

**Return type (lines 23-29)**:
```typescript
export interface UseOrderDetailReturn extends UseOrderDetailState {
  isLoading: boolean;
  isRefreshing: boolean;
  isConfirming: boolean;
  confirmReceived: () => Promise<boolean>;
  refresh: () => Promise<void>;
}
```

**Request-id cancellation (lines 40, 68-69, 81-83)**:
```typescript
const activeRequestIdRef = useRef(0);
// ...
const requestId = activeRequestIdRef.current + 1;
activeRequestIdRef.current = requestId;
// ...
if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
  return; // stale response, discard
}
```

**Focus refresh with debounce (lines 160-169)**:
```typescript
useFocusEffect(
  useCallback(() => {
    if (orderId && hasInitialLoadCompletedRef.current) {
      const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
      if (timeSinceLoad > 2000) {
        void fetchOrder('refresh');
      }
    }
  }, [orderId, fetchOrder]),
);
```

**Unmount cleanup (lines 45-50)**:
```typescript
useEffect(() => {
  return () => {
    isMountedRef.current = false;
    activeRequestIdRef.current += 1;
  };
}, []);
```

---

### File 2: `hooks/useCartPaginated.ts` — REALTIME SUBSCRIPTION INTEGRATION PATTERN
**Path**: `/home/coder/dev/pharma/frontend/hooks/useCartPaginated.ts`

**Why this is the reference for realtime**: This is the ONLY hook in the repo that integrates a Supabase Realtime subscription. It shows exactly how to:
- Maintain subscription cleanup ref (`subscriptionCleanupRef`, line 130)
- Track subscribed-ID to avoid duplicate subscriptions (`subscribedCartIdRef`, line 131)
- Track whether connected at least once (`hasConnectedOnceRef`, line 132)
- Track reconnect needs (`needsReconnectSyncRef`, line 133)
- Re-subscribe when the subscribed ID changes (lines 365-429)
- Apply realtime changes to local state (lines 189-238, `applyRealtimeChange`)
- Reset all tracking state on cleanup (`resetRealtimeTrackingState`, lines 103-116)

**Key code positions to copy exactly**:

**Reset function (lines 103-116)**:
```typescript
function resetRealtimeTrackingState(
  subscriptionCleanupRef: React.MutableRefObject<(() => void) | null>,
  subscribedCartIdRef: React.MutableRefObject<string | null>,
  hasConnectedOnceRef: React.MutableRefObject<boolean>,
  needsReconnectSyncRef: React.MutableRefObject<boolean>,
  pendingRealtimeItemFetchesRef: React.MutableRefObject<Set<string>>,
) {
  subscriptionCleanupRef.current?.();
  subscriptionCleanupRef.current = null;
  subscribedCartIdRef.current = null;
  hasConnectedOnceRef.current = false;
  needsReconnectSyncRef.current = false;
  pendingRealtimeItemFetchesRef.current.clear();
}
```

**Realtime effect (lines 365-429)** — the FULL subscription lifecycle:
```typescript
useEffect(() => {
  if (!cartId) {
    resetRealtimeTrackingState(...);
    return;
  }

  if (subscribedCartIdRef.current === cartId && subscriptionCleanupRef.current) {
    return; // already subscribed
  }

  subscriptionCleanupRef.current?.();
  subscriptionCleanupRef.current = subscribeToCartChanges(
    cartId,
    applyRealtimeChange,
    nextState => {
      setRealtimeState(currentState => {
        // connection state transitions
        if (nextState === 'connected') {
          hasConnectedOnceRef.current = true;
          // ... reconnect logic
        }
        return nextState;
      });
    },
  );
  subscribedCartIdRef.current = cartId;

  return () => {
    if (subscribedCartIdRef.current === cartId) {
      subscriptionCleanupRef.current?.();
      subscriptionCleanupRef.current = null;
      subscribedCartIdRef.current = null;
      hasConnectedOnceRef.current = false;
    }
  };
}, [applyRealtimeChange, cartId]);
```

**applyRealtimeChange callback (lines 189-238)**:
Shows how to handle INSERT/UPDATE/DELETE realtime events on local state.

---

### File 3: `services/cart.service.ts:850-918` — SUPABASE REALTIME SUBSCRIPTION FACTORY
**Path**: `/home/coder/dev/pharma/frontend/services/cart.service.ts`

**Why this is the reference for realtime wiring in the service layer**: This is the ONLY place in the repo where `supabase.channel()` + `postgres_changes` + `onConnectionStateChange` is implemented. Task 7 implementer must decide: should the subscription live in the service (like cart) or in the hook directly?

**Key code to mirror (lines 850-918)**:
```typescript
export function subscribeToCartChanges(
  cartId: string,
  onChange: (event: CartRealtimeChange) => void,
  onConnectionStateChange?: (state: CartRealtimeConnectionState) => void,
): () => void {
  const normalizedCartId = cartId.trim();
  const channelName = `cart:${normalizedCartId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  onConnectionStateChange?.('connecting');

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cart_items',
        filter: `cart_id=eq.${normalizedCartId}`,
      },
      (payload: RealtimePostgresChangesPayload<CartRealtimeRecord>) => {
        const eventType = payload.eventType;
        if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
          onChange({ type: eventType, new: toCartRealtimeItem(payload.new), old: toCartRealtimeItem(payload.old) });
        }
      },
    )
    .subscribe(status => {
      switch (status) {
        case 'SUBSCRIBED':
          onConnectionStateChange?.('connected');
          break;
        case 'TIMED_OUT':
        case 'CHANNEL_ERROR':
          onConnectionStateChange?.('reconnecting');
          break;
        case 'CLOSED':
          onConnectionStateChange?.('disconnected');
          break;
      }
    });

  return () => {
    onConnectionStateChange?.('disconnected');
    void channel.unsubscribe();
    void supabase.removeChannel(channel);
  };
}
```

**Decision for task 7**: The subscription should follow this same pattern — create a `subscribeToInboxChanges` function in `services/notification.service.ts` (NOT in the hook), mirroring how `subscribeToCartChanges` lives in `services/cart.service.ts`. This keeps the Supabase channel management in the service layer.

**Realtime filter for notifications**: `filter: \`user_id=eq.${userId}\`` — RLS already enforces ownership, but the filter ensures the channel only receives the signed-in user's rows.

---

### File 4: `hooks/useHomeData.ts` — FOCUS-REFRESH WITHOUT REQUEST-ID (alternative simpler pattern)
**Path**: `/home/coder/dev/pharma/frontend/hooks/useHomeData.ts`

**Why this is an alternative reference**: Shows focus-refresh using `hasLoadedOnceRef` + `latestStateRef` pattern instead of request-id. Useful for understanding the simpler end of the spectrum. Also shows `Promise.allSettled` for parallel fetches.

**Key pattern (lines 161-165)**:
```typescript
useFocusEffect(
  useCallback(() => {
    void fetchData(hasLoadedOnceRef.current ? 'focus' : 'initial');
  }, [fetchData]),
);
```

---

### File 5: `__tests__/hooks/useOrderDetail.test.ts` — HOOK TEST PATTERN
**Path**: `/home/coder/dev/pharma/frontend/__tests__/hooks/useOrderDetail.test.ts`

**Why this is the reference for hook tests**: Shows:
- `jest.mock('expo-router', () => ({ useFocusEffect: () => undefined }))` — disables focus effect in tests (line 14-16)
- Inline service mocks via `jest.mock('@/services/order.service', ...)` (lines 18-21)
- `renderHook` + `waitFor` + `act` for async state testing (lines 85-127)
- `beforeEach` reset pattern (lines 58-62)

**Exact mock pattern for expo-router (line 14-16)**:
```typescript
jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
}));
```

---

## 2. Hook Return-Shape Pattern

### Status Union
Following `useOrderDetail.ts` lines 9-15, define a `NotificationInboxStatus` union:
```typescript
export type NotificationInboxStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'success'
  | 'empty'
  | 'error';
```

**Semantic decisions**:
- `'idle'` — no userId provided, no fetch attempted
- `'loading'` — initial fetch in progress
- `'refreshing'` — pull-to-refresh or focus-refresh in progress (preserves existing items)
- `'success'` — fetch succeeded with items
- `'empty'` — fetch succeeded but zero items
- `'error'` — fetch failed

### State Interface
```typescript
export interface UseNotificationsState {
  items: NotificationRow[];
  status: NotificationInboxStatus;
  error: string | null;
  unreadCount: number | null;
  realtimeState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'unavailable';
}
```

### Return Interface
```typescript
export interface UseNotificationsReturn extends UseNotificationsState {
  isLoading: boolean;
  isRefreshing: boolean;
  isRealtimeConnected: boolean;
  permissionStatus: NotificationPermissionStatus | 'unknown';
  requestPermission: () => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  dismissItem: (notificationId: string) => Promise<void>;
}
```

---

## 3. Request-Id + Mounted-Ref Cancellation Pattern

**Mirror exactly from `useOrderDetail.ts` lines 40-50, 68-83, 131-134**:

```typescript
const activeRequestIdRef = useRef(0);
const isMountedRef = useRef(true);
const hasInitialLoadCompletedRef = useRef(false);
const lastLoadTimeRef = useRef(0);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
    activeRequestIdRef.current += 1; // invalidates all in-flight requests
  };
}, []);

const fetchInbox = useCallback(
  async (reason: 'initial' | 'refresh' = 'initial') => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    const isRefresh = reason === 'refresh';
    setState(prev => ({
      ...prev,
      status: isRefresh ? 'refreshing' : 'loading',
      error: isRefresh ? prev.error : null,
    }));

    const { data, error } = await fetchNotifications(userId, abortController.signal);

    if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
      return; // stale — discard
    }

    if (error) {
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      return;
    }

    if (!data || data.length === 0) {
      setState({ items: [], status: 'empty', error: null, unreadCount: 0, realtimeState: prev.realtimeState });
      return;
    }

    const unreadCount = data.filter(n => !n.read_at).length;
    setState({ items: data, status: 'success', error: null, unreadCount, realtimeState: prev.realtimeState });
    lastLoadTimeRef.current = Date.now();
    hasInitialLoadCompletedRef.current = true;
  },
  [userId],
);
```

---

## 4. Focus-Rresh Pattern

**Mirror from `useOrderDetail.ts` lines 160-169** (2-second debounce):

```typescript
useFocusEffect(
  useCallback(() => {
    if (!userId) return;
    if (hasInitialLoadCompletedRef.current) {
      const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
      if (timeSinceLoad > 2000) {
        void fetchInbox('refresh');
      }
    }
  }, [userId, fetchInbox]),
);
```

**Alternative from `useHomeData.ts` lines 161-165** (no debounce, simpler):
```typescript
useFocusEffect(
  useCallback(() => {
    void fetchData(hasLoadedOnceRef.current ? 'focus' : 'initial');
  }, [fetchData]),
);
```

**Recommendation**: Use the debounce version from `useOrderDetail.ts` — it prevents redundant fetches when the user rapidly switches tabs.

---

## 5. Realtime Subscription Decision: Service vs Hook

**Finding**: The realtime subscription should live in `services/notification.service.ts` as `subscribeToInboxChanges`, NOT in the hook directly.

**Rationale**:
1. `subscribeToCartChanges` in `services/cart.service.ts` is the established pattern in this repo
2. Keeping subscription in the service makes it testable in isolation
3. The hook just calls `subscribeToInboxChanges(userId, onChange, onConnectionStateChange)` and stores the cleanup ref — same as `useCartPaginated`
4. This preserves the service-layer boundary: hook orchestrates, service provides data/subscription

**Service function signature to add to `services/notification.service.ts`**:
```typescript
export type NotificationRealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export interface NotificationRealtimeChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  new: NotificationRow | null;
  old: NotificationRow | null;
}

export function subscribeToInboxChanges(
  userId: string,
  onChange: (event: NotificationRealtimeChange) => void,
  onConnectionStateChange?: (state: NotificationRealtimeConnectionState) => void,
): () => void {
  // mirrors subscribeToCartChanges exactly
  // filter: user_id=eq.{userId}
  // table: 'notifications'
  // event: '*' (INSERT/UPDATE/DELETE)
}
```

---

## 6. Permission CTA Integration

The hook should expose `permissionStatus` and `requestPermission` so the scene can render a permission CTA card when push is not enabled.

From `services/notification.service.ts` existing exports:
- `syncExpoPushTokenIfPermitted(userId)` → returns `{ data: { status, permissionStatus }, error }`
- `requestExpoPushTokenAndSync(userId)` → returns `{ data: { status, permissionStatus }, error }`

```typescript
const permissionStatus = /* derived from syncExpoPushTokenIfPermitted call */;
const requestPermission = useCallback(async (): Promise<boolean> => {
  const { data } = await requestExpoPushTokenAndSync(userId);
  return data?.status === 'updated';
}, [userId]);
```

---

## 7. Duplicate Prevention on Realtime INSERT

**Mirror from `useCartPaginated.ts` lines 191-205**:

```typescript
const applyRealtimeChange = useCallback((change: NotificationRealtimeChange) => {
  setItems(currentItems => {
    if (change.type === 'INSERT') {
      const insertedItem = change.new;
      if (!insertedItem) return currentItems;
      // Prevent duplicates: if item already exists with same id, skip
      if (currentItems.some(item => item.id === insertedItem.id)) {
        return currentItems;
      }
      // Prepend newest
      return [insertedItem, ...currentItems];
    }
    // ... UPDATE/DELETE handling
  });
}, []);
```

---

## 8. Hook Test Pattern to Copy

**Primary reference**: `__tests__/hooks/useCartPaginated.test.ts` (lines 1-129)

Key patterns:
1. **expo-router mock** (line 14-16 in `useOrderDetail.test.ts`):
   ```typescript
   jest.mock('expo-router', () => ({
     useFocusEffect: () => undefined,
   }));
   ```

2. **Inline service mocks** (from `useOrderDetail.test.ts` lines 18-21):
   ```typescript
   jest.mock('@/services/order.service', () => ({
     getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
     confirmOrderReceived: (...args: unknown[]) => mockConfirmOrderReceived(...args),
   }));
   ```

3. **Mock reset in beforeEach**:
   ```typescript
   beforeEach(() => {
     mockGetOrderById.mockReset();
     mockConfirmOrderReceived.mockReset();
   });
   ```

4. **renderHook + waitFor**:
   ```typescript
   const { result } = renderHook(() => useOrderDetail('order-1'));
   await waitFor(() => {
     expect(result.current.order?.id).toBe('order-1');
   });
   ```

5. **Async actions with act**:
   ```typescript
   await act(async () => {
     const response = await result.current.confirmReceived();
     expect(response).toBe(true);
   });
   ```

6. **Realtime mock pattern** (from `useCartPaginated.test.ts` lines 32-47):
   ```typescript
   jest.mock('@/services/cart.service', () => ({
     subscribeToCartChanges: jest.fn((_, onChange, onConnectionStateChange) => {
       mockLatestRealtimeHandler = onChange;
       mockLatestConnectionHandler = onConnectionStateChange ?? null;
       return mockUnsubscribe;
     }),
   }));
   ```

---

## 9. Exact File Locations Summary

| Pattern | File | Lines |
|---------|------|-------|
| Hook return type + state machine | `hooks/useOrderDetail.ts` | 9-29, 31-37 |
| Request-id cancellation | `hooks/useOrderDetail.ts` | 40, 45-50, 68-83, 131-134 |
| Mounted-ref guard | `hooks/useOrderDetail.ts` | 41, 47-50, 81-83, 132-134 |
| Focus-refresh debounce | `hooks/useOrderDetail.ts` | 160-169 |
| Realtime subscription (service) | `services/cart.service.ts` | 850-918 |
| Realtime hook integration | `hooks/useCartPaginated.ts` | 103-116, 126-136, 365-429 |
| Realtime apply change | `hooks/useCartPaginated.ts` | 189-238 |
| Simple focus refresh | `hooks/useHomeData.ts` | 161-165 |
| Hook test (expo-router mock) | `__tests__/hooks/useOrderDetail.test.ts` | 14-16 |
| Hook test (async + waitFor) | `__tests__/hooks/useOrderDetail.test.ts` | 85-127 |
| Hook test (realtime mock) | `__tests__/hooks/useCartPaginated.test.ts` | 26-47 |
| Notification service (existing) | `services/notification.service.ts` | 1-505 |
| Notification types | `types/notification.ts` | 1-439 |

---

## 10. Decision: Where Realtime Lives

**Decision: Realtime subscription factory (`subscribeToInboxChanges`) belongs in `services/notification.service.ts`, mirroring `subscribeToCartChanges` in `services/cart.service.ts`.**

**Evidence**: The repo consistently puts Supabase channel management in the service layer, not the hook. The hook integrates the subscription via refs and effects, following the `useCartPaginated` pattern.

**Optional realtime in hook**: The hook should support an optional `enableRealtime` parameter (default `true`). If `false`, no subscription is created and the hook falls back to fetch-only + focus refresh. This mirrors the plan's "optional live updates" requirement.

---

## 11. Task 7 Implementation Brief (Concise)

### File: `services/notification.service.ts` — ADD
```typescript
// Add to notification.service.ts
export type NotificationRealtimeConnectionState =
  | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface NotificationRealtimeChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  new: NotificationRow | null;
  old: NotificationRow | null;
}

export function subscribeToInboxChanges(
  userId: string,
  onChange: (event: NotificationRealtimeChange) => void,
  onConnectionStateChange?: (state: NotificationRealtimeConnectionState) => void,
): () => void {
  const channelName = `notifications:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  onConnectionStateChange?.('connecting');

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload: RealtimePostgresChangesPayload<NotificationTableRow>) => {
        const evt = payload.eventType;
        if (evt === 'INSERT' || evt === 'UPDATE' || evt === 'DELETE') {
          onChange({ type: evt, new: normalizeNotificationRow(payload.new as NotificationTableRow), old: normalizeNotificationRow(payload.old as NotificationTableRow) });
        }
      },
    )
    .subscribe(status => {
      switch (status) {
        case 'SUBSCRIBED': onConnectionStateChange?.('connected'); break;
        case 'TIMED_OUT':
        case 'CHANNEL_ERROR': onConnectionStateChange?.('reconnecting'); break;
        case 'CLOSED': onConnectionStateChange?.('disconnected'); break;
      }
    });

  return () => {
    onConnectionStateChange?.('disconnected');
    void channel.unsubscribe();
    void supabase.removeChannel(channel);
  };
}
```

### File: `hooks/useNotifications.ts` — CREATE
Follow the `useOrderDetail.ts` state machine (lines 31-227) with these customizations:
1. Replace `order` state with `items: NotificationRow[]`
2. Add `unreadCount: number | null`
3. Add `realtimeState: NotificationRealtimeConnectionState`
4. Replace `fetchOrder` with `fetchInbox` calling `fetchNotifications(userId)`
5. Replace `confirmReceived` with `markAsRead(notificationId)` calling `markNotificationAsRead`
6. Add `markAllAsRead` calling `markAllNotificationsAsRead`
7. Add `dismissItem` calling `deleteNotification`
8. Add `permissionStatus` + `requestPermission` for the CTA
9. Add `subscribeToInboxChanges` integration (mirror `useCartPaginated` lines 365-429)
10. Add `resetRealtimeTrackingState` cleanup on unmount/userId change
11. Add `useFocusEffect` with 2000ms debounce (mirror `useOrderDetail` lines 160-169)
12. Add `activeRequestIdRef` + `isMountedRef` cancellation (mirror lines 40-50)

### File: `hooks/index.ts` — ADD
```typescript
export { useNotifications } from './useNotifications';
export type { UseNotificationsReturn, UseNotificationsState } from './useNotifications';
```

### File: `__tests__/hooks/useNotifications.test.ts` — CREATE
Mirror `__tests__/hooks/useCartPaginated.test.ts` for realtime integration and `__tests__/hooks/useOrderDetail.test.ts` for basic state machine tests.

---

## 12. References Summary

| Pattern | File | Lines |
|---------|------|-------|
| Full hook state machine | `hooks/useOrderDetail.ts` | 31-227 |
| Request-id cancellation | `hooks/useOrderDetail.ts` | 40, 45-50, 68-83 |
| Focus debounce refresh | `hooks/useOrderDetail.ts` | 160-169 |
| Realtime subscription factory | `services/cart.service.ts` | 850-918 |
| Realtime hook integration | `hooks/useCartPaginated.ts` | 103-116, 126-136, 365-429 |
| Duplicate prevention on INSERT | `hooks/useCartPaginated.ts` | 191-205 |
| Hook test (focus mock) | `__tests__/hooks/useOrderDetail.test.ts` | 14-16 |
| Hook test (async/await) | `__tests__/hooks/useOrderDetail.test.ts` | 85-127 |
| Hook test (realtime mock) | `__tests__/hooks/useCartPaginated.test.ts` | 26-47 |
| Simple focus refresh | `hooks/useHomeData.ts` | 161-165 |
| Notification service | `services/notification.service.ts` | 1-505 |
| Notification types | `types/notification.ts` | 1-439 |

---

## Task 8 — Notifications Scene Inbox UI (2026-04-23)

- The production `Notifications` scene can stay thin by reading `user?.id` from `useAppSlice()` and delegating inbox loading, refresh, permission CTA, and mark-as-read behavior to `useNotifications({ userId })`.
- The stable screen-state order that fits this repo is: full-screen loading when there is no user-backed data yet, full-screen error only when the inbox has no items, then a FlatList that can layer an inline error banner, permission banner, empty state, or populated list rows.
- Inbox taps should reuse `parseNotificationRoute()` + `buildNotificationTypedHref()` after calling `markAsRead()` for unread rows so manual inbox taps stay aligned with the existing notification-response routing contract in `app/_notificationRouting.ts`.
- Existing Tamagui tokens were enough for read/unread differentiation: unread rows using `$infoSoft`/`$info` plus a primary accent rail made the state obvious without introducing a new visual language.

## Task 9 — Notifications Automated Coverage & Validation (2026-04-23)

- Notifications coverage is coherent across the intended boundaries: service (`notification.service.test.ts`), hook (`useNotifications.test.ts`), scene (`Notifications.test.tsx`, `Notifications.theme.test.tsx`), auth lifecycle (`auth-provider.lifecycle.test.tsx`), and app routing/bootstrap (`root-layout.notifications.test.tsx`).
- A meaningful missing hook branch was realtime reconnect reconciliation. Adding explicit coverage for `reconnecting -> connected` proves `useNotifications` silently refreshes after reconnect so missed events are reconciled.
- A meaningful missing app branch was live notification-tap handling through `addNotificationResponseReceivedListener`. Covering only `getLastNotificationResponseAsync` was not enough to prove runtime taps route correctly after bootstrap.
- The stale `Notifications.theme.test.tsx` file showed that notifications scene tests need the same inline `@/hooks` and `@/slices` mocks as the main scene test; otherwise importing the real scene can fall through to the hooks barrel and trip the `react-redux` ESM build in Jest.
- No shared `jest.setup.js` changes were needed. Keeping the notifications mocks inline was sufficient and stayed aligned with the centralized test conventions.
- Validation after the fixes:
  - `lsp_diagnostics` reported zero issues for `__tests__/hooks/useNotifications.test.ts`, `__tests__/app/root-layout.notifications.test.tsx`, and `__tests__/scenes/Notifications.theme.test.tsx`.
  - Targeted notifications Jest runs passed.
  - Required repo gates passed: `npm run lint` and `npm run test`.

## Task 10 — Native Module Import Leak Fix (2026-04-24)

- The runtime crash on unrelated screens came from barrel evaluation, not screen logic: importing `@/hooks` or `@/services` for ordinary product/order helpers was enough to eagerly evaluate notification modules.
- The minimal safe barrel fix was to stop re-exporting notification values from `hooks/index.ts` and `services/index.ts`, then switch the real notification scene/tests to direct `@/hooks/useNotifications` imports.
- `utils/notifications.ts` must not import `expo-device` at module scope. Mirroring the existing lazy `expo-notifications` pattern with an async `import('expo-device')` guard prevents stale native builds or unsupported environments from crashing during module evaluation.
- Keeping the physical-device check async inside `notification.service.ts` preserves notification behavior where used, while unrelated routes like `home/all-products` stay decoupled from native notification modules.
- Focused verification that proved the fix shape:
  - `lsp_diagnostics` reported zero issues for every edited file.
  - Targeted Jest passed for `__tests__/services/notification.service.test.ts`, `__tests__/scenes/Notifications.test.tsx`, `__tests__/scenes/Notifications.theme.test.tsx`, and `__tests__/scenes/AllProducts.test.tsx`.
  - Targeted ESLint passed for the modified files.
  - `npm run dev:build:web` succeeded and exported both `/home/all-products` and `/(tabs)/home/all-products`, confirming the unrelated route graph now compiles without the ExpoDevice crash path.
