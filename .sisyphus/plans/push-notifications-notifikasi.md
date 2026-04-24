# Push Notifications untuk Scene Notifikasi

## TL;DR
> **Summary**: Bangun sistem notifikasi transaksional berbasis Supabase yang menjadikan `public.notifications` sebagai sumber kebenaran inbox, lalu kirim push Expo sebagai side effect non-blocking. V1 hanya mencakup notifikasi yang sudah didukung domain saat ini: pembayaran, progres pesanan, pengiriman, dan aksi konfirmasi pesanan.
> **Deliverables**:
> - Skema Supabase untuk inbox + token perangkat
> - Edge Function + webhook delivery ke Expo Push API
> - Registrasi token perangkat di app Expo
> - Service, hook, route contract, dan UI scene Notifikasi
> - Automated tests + agent-executed QA evidence
> **Effort**: Large
> **Parallel**: YES - 2 waves
> **Critical Path**: 1 → 2 → 3 → 5 → 7 → 8 → 9

## Context
### Original Request
- Buat plan untuk sending push notifications pada project ini dengan Supabase.
- Gunakan dokumentasi resmi Supabase push notifications example.
- Gunakan `@librarian` untuk dokumentasi dan `@explore` untuk memeriksa kodebase.
- Tujuan fitur: mengisi scene `Notifikasi`.
- Beri tahu jika migrations tambahan diperlukan.
- Gunakan panduan `/supabase` dan `/vercel-react-native-skills`.

### Interview Summary
- Testing diputuskan: **tests-after**.
- Scope dipersempit berdasarkan riset kodebase + product-fit: V1 fokus pada notifikasi transaksional/operasional yang cocok untuk e-commerce apotek, bukan marketing atau workflow klinis baru.
- Default yang diterapkan:
  - Inbox adalah fitur durable; push hanyalah side effect best-effort.
  - V1 memakai **single active Expo token per user** pada `profiles`, bukan multi-device registry.
  - Scene `Notifikasi` V1 = list inbox + read state + deep-link routing; **tanpa** preference center, bulk actions, filter/search, atau notifikasi promosi.
  - Deep-link target V1 hanya ke screen yang sudah ada: `orders/order-detail/[orderId]` dan `orders/track-shipment/[orderId]`, dengan fallback aman ke tab Notifikasi jika target tidak valid.

### Metis Review (gaps addressed)
- Bedakan eksplisit antara pekerjaan yang **butuh migration** vs **setup operasional non-migration**.
- Wajib masukkan guardrail RLS, ownership, non-PHI copy, dan deduplication/idempotency.
- Hindari scope creep: preferences center, marketing/broadcast, abandoned cart, prescription/refill, analytics/admin tooling, channel lain selain push + inbox.
- Acceptance criteria wajib mencakup: inbox tetap berfungsi walau push gagal, read state persisten, routing push/inbox valid, fallback aman, dan duplicate event tidak membuat duplicate notification.

## Work Objectives
### Core Objective
Menggantikan placeholder scene Notifikasi dengan notification center yang benar-benar terisi dari Supabase, sambil menambahkan push notification Expo untuk event transaksi yang memang sudah ada di domain aplikasi ini.

### Deliverables
- `public.notifications` table + index + RLS + dedupe contract via migrations in `/home/coder/dev/pharma/admin-panel/supabase/migrations/`
- Tambahan kolom token push pada `public.profiles`
- Supabase push Edge Function dan webhook trigger berbasis insert ke `notifications`, ditempatkan di `/home/coder/dev/pharma/admin-panel/supabase/functions/`
- Kontrak route/data untuk deep-link notification → order detail / tracking
- Integrasi Expo Notifications di app config dan bootstrap root listener
- `notification.service` + `useNotifications` + UI scene Notifikasi
- Test coverage untuk service, hook, scene, dan notification bootstrap mocks

### Definition of Done (verifiable conditions with commands)
- `npm run lint` lulus setelah perubahan frontend selesai.
- `npm run test` lulus dengan test baru untuk notifications/service/hook/scene.
- `npx expo config --type public` menunjukkan plugin/config notifikasi yang valid.
- Query Supabase untuk notification inbox milik user mengembalikan urutan terbaru lebih dulu dan read state yang persisten.
- Insert event notifikasi ke `public.notifications` menghasilkan inbox row walau push delivery gagal.

### Must Have
- Migration tambahan untuk `public.notifications` dan kolom token pada `public.profiles`, dibuat di `/home/coder/dev/pharma/admin-panel/supabase/migrations/`
- RLS yang membatasi user hanya bisa membaca/menandai-notification miliknya sendiri
- Dedupe/idempotency contract untuk replay webhook/status transition
- Scene Notifikasi menampilkan loading, empty, error, unread/read, dan item tap state
- Push permission diminta pada momen yang masuk akal, bukan saat splash pertama kali
- Payload/data cukup untuk deep-linking ke route yang sudah ada

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Tidak boleh ada direct Supabase call dari scene Notifikasi
- Tidak boleh menyimpan PHI/medication name di title/body push atau inbox text
- Tidak boleh membuat workflow klinis/prescription/refill baru di V1
- Tidak boleh menjadikan sukses push sebagai syarat sukses order/payment/shipment flow
- Tidak boleh menambah preference center, marketing notifications, bulk actions, filter/search, analytics, atau admin UI di V1
- Tidak boleh memakai multi-device token registry di V1

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **tests-after** + Jest (`jest-expo`) + render via `@/test-utils/renderWithTheme`
- QA policy: Setiap task implementasi wajib punya happy path + edge/failure path yang bisa dieksekusi agent
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Security verification: uji RLS untuk SELECT/UPDATE notification row lintas user
- Delivery verification: uji bahwa inbox row tetap tercipta saat Edge Function/Expo push gagal

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. Extract shared dependencies early.

Wave 1: T1 backend contract, T2 delivery infra, T3 type/route contract, T4 Expo foundation, T5 service layer

Wave 2: T6 auth/bootstrap lifecycle, T7 notification hook/state, T8 Notifikasi scene UI, T9 tests and QA harness

### Dependency Matrix (full, all tasks)
- T1 → blocks T2, T3, T5
- T2 → blocks delivery QA in T6/T9
- T3 → blocks T5, T7, T8
- T4 → blocks T6 and mobile notification QA in T9
- T5 → blocks T6, T7, T8, T9
- T6 → blocks deep-link and push-open QA in T9
- T7 → blocks T8 and some T9 hook/scene tests
- T8 → blocks T9 scene QA
- T9 → blocks Final Verification Wave

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 5 tasks → `unspecified-high`, `deep`, `mobile-developer`, `unspecified-low`
- Wave 2 → 4 tasks → `unspecified-high`, `visual-engineering`, `mobile-developer`
- Final Verification → 4 tasks → `oracle`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define Supabase notification contract and additive migrations

  **What to do**: Create the backend source-of-truth contract for V1 notifications. Add `profiles.expo_push_token` and `profiles.expo_push_token_updated_at`; create `public.notifications` with `id`, `user_id`, `type`, `title`, `body`, `cta_route`, `data jsonb`, `priority`, `source_event_key`, `read_at`, `created_at`; add `user_id, created_at desc` index and uniqueness on `source_event_key`; enable RLS so users can `SELECT` and `UPDATE read_at` only for their own rows. Use `user_id -> public.profiles(id)` for consistency with the existing domain schema. Treat inbox persistence as durable and push as a side effect. **Create these migration files in `/home/coder/dev/pharma/admin-panel/supabase/migrations/` using the repo convention `YYYYMMDDHHMMSS_<snake_case_description>.sql`, not anywhere in the frontend repo.**
  **Must NOT do**: Do not add multi-device token tables, notification preferences tables, marketing columns, delete/archive fields, or clinical/prescription-specific schemas in V1.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this task defines the durable product contract, RLS model, dedupe strategy, and migration boundaries.
  - Skills: [`supabase`, `supabase-postgres-best-practices`, `supabase-edge-functions`] - why needed: migration workflow, RLS defaults, Postgres schema/index guidance, and alignment with the admin-panel Supabase project conventions.
  - Omitted: [`database-design`] - why not needed: the schema is narrow and already anchored to concrete repo/domain evidence plus project-specific Supabase skills.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 5 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `types/supabase.ts:557-588` - current `profiles` row shape; confirms token columns do not exist yet.
  - Pattern: `types/supabase.ts:611-648` - `order_read_model` already joins order/payment/shipment state; notification payloads should point back to these entities.
  - API/Type: `types/supabase.ts:657-674` - `apply_midtrans_webhook_transition` is the cleanest idempotent payment/order transition hook.
  - Pattern: `services/profile.service.ts:196-214` - profile updates are row-scoped by `id`; token write path should stay consistent with this ownership model.
  - Pattern: `/home/coder/dev/pharma/admin-panel/supabase/migrations/` - canonical migration directory for schema changes.
  - Pattern: `/home/coder/dev/pharma/admin-panel/supabase/AGENTS.md` - Supabase repo conventions, migration workflow, and `npx supabase db push --include-all` usage.
  - Pattern: `/home/coder/dev/pharma/admin-panel/supabase/MIGRATION_HISTORY_RECONCILIATION.md` - confirms admin-panel migration files are the schema source of truth.
  - External/Skill: `/home/coder/dev/pharma/admin-panel/.agents/skills/supabase-postgres-best-practices` - must be loaded before writing the migration SQL.
  - External/Skill: `/home/coder/dev/pharma/admin-panel/.agents/skills/supabase-edge-functions` - must be loaded so schema changes stay compatible with the adjacent Edge Function workflow.
  - External: `https://supabase.com/docs/guides/functions/examples/push-notifications` - official Supabase push architecture and webhook-triggered Edge Function example.
  - External: `https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/refill-reminders/index.html` - compliance boundary: keep copy logistical/non-PHI.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Migration files add `public.notifications` and `profiles.expo_push_token*` without altering unrelated tables.
  - [ ] `types/supabase.ts` reflects the new table and new `profiles` columns after regeneration.
  - [ ] RLS allows an authenticated user to read/update only their own notification rows and denies cross-user access.
  - [ ] `source_event_key` prevents duplicate rows for replayed webhook/status events.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Notification schema and ownership work end-to-end
    Tool: Bash
    Steps: Create the migration under `/home/coder/dev/pharma/admin-panel/supabase/migrations/`; from `/home/coder/dev/pharma/admin-panel` run `npx supabase migration list --linked` and `npx supabase db push --dry-run --include-all`, then apply in the target environment; regenerate frontend types; insert one notification row for user A and one for user B; query as user A and attempt to update both rows.
    Expected: User A can read/update only their own row; user B row is hidden or rejected by RLS; regenerated types include the new table and columns.
    Evidence: .sisyphus/evidence/task-1-notification-contract.md

  Scenario: Replay event does not create duplicate inbox rows
    Tool: Bash
    Steps: Insert the same logical event twice using the same `source_event_key`.
    Expected: Exactly one notification row exists for that source event key.
    Evidence: .sisyphus/evidence/task-1-notification-dedupe.md
  ```

  **Commit**: YES | Message: `feat(supabase): add notification inbox contract` | Files: [`/home/coder/dev/pharma/admin-panel/supabase/migrations/*`, `types/supabase.ts`]

- [x] 2. Implement Supabase delivery infrastructure and event writers

  **What to do**: Add a Supabase Edge Function `push` that receives notification-insert webhooks and forwards them to Expo Push API using `EXPO_ACCESS_TOKEN`. Configure the delivery flow so domain writers insert into `public.notifications`, and the webhook invokes the Edge Function. Wire V1 event creation only for: `payment_settlement`, `payment_failed_or_expired`, `order_processing`, `order_awaiting_shipment`, `order_shipped`, `order_delivered_action_required`, and `order_completed`. Use `apply_midtrans_webhook_transition` for payment/order transitions, the existing `confirm-order-received` completion path for completion follow-up, and only existing shipment/order status transitions already present in the backend. Make push best-effort: inbox row creation must succeed even if Expo delivery fails or token is missing. **Create or update the function under `/home/coder/dev/pharma/admin-panel/supabase/functions/` and deploy from the admin-panel repo using its Supabase CLI workflow.**
  **Must NOT do**: Do not expose service role or Expo token to the client, do not require push success for webhook success, do not add marketing or refill reminder writers, and do not introduce Biteship polling cron jobs in V1.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this task crosses database events, Edge Functions, secrets, idempotency, and operational setup.
  - Skills: [`supabase`, `supabase-edge-functions`, `supabase-postgres-best-practices`] - why needed: Edge Function patterns, deployment/secrets workflow, and safe Postgres-side event-writing/idempotency decisions.
  - Omitted: [`vercel-react-native-skills`] - why not needed: this task is backend delivery, not mobile UI/runtime behavior.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6, 9 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - API/Type: `types/supabase.ts:657-674` - payment/order transition function already receives canonical next statuses.
  - Pattern: `services/order.service.ts:1100-1135` - completion confirmation already goes through Edge Function `confirm-order-received`; completion notification should attach here, not from the scene.
  - Pattern: `services/order.service.ts:1161-1241` - canonical Bahasa Indonesia labels and status semantics for order/payment states.
  - Pattern: `types/supabase.ts:408-492` - shipment table contains `latest_biteship_status`, `waybill_number`, and courier fields for shipped/tracking copy.
  - Pattern: `/home/coder/dev/pharma/admin-panel/supabase/functions/` - canonical Supabase Edge Function directory, one folder per function.
  - Pattern: `/home/coder/dev/pharma/admin-panel/supabase/functions/_shared/` - shared Deno utilities location for any common push helper logic.
  - Pattern: `/home/coder/dev/pharma/admin-panel/supabase/config.toml` - function runtime config and local Supabase settings.
  - Pattern: `/home/coder/dev/pharma/admin-panel/supabase/AGENTS.md` - deploy convention uses `npx supabase --workdir "/home/coder/dev/pharma/admin-panel" functions deploy <function-name> --project-ref <project-ref> --use-api`.
  - External/Skill: `/home/coder/dev/pharma/admin-panel/.agents/skills/supabase-edge-functions` - must be loaded before creating/updating the push Edge Function.
  - External/Skill: `/home/coder/dev/pharma/admin-panel/.agents/skills/supabase-postgres-best-practices` - must be loaded before designing event-write SQL, indexes, and dedupe constraints that support the function.
  - External: `https://supabase.com/docs/guides/functions/examples/push-notifications` - official push Edge Function + webhook example.
  - External: `https://docs.expo.dev/push-notifications/sending-notifications/` - Expo Push API request/response contract.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Inserting a V1 notification row triggers the `push` Edge Function via webhook and attempts Expo delivery.
  - [ ] Missing token, invalid token, or Expo API failure does not roll back the inbox row.
  - [ ] Replay/retry of the same domain event does not create duplicate notification rows or duplicate push attempts beyond the deduped row.
  - [ ] Event writers are limited to the approved V1 catalog and use non-PHI Bahasa Indonesia copy.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Inbox persists even when push delivery fails
    Tool: Bash
    Steps: Deploy the push function from `/home/coder/dev/pharma/admin-panel`; insert a notification row for a user with no valid token or with a forced Expo API failure path; inspect DB row and function logs.
    Expected: Notification row remains in `public.notifications`; function logs show delivery failure handling without breaking the originating event.
    Evidence: .sisyphus/evidence/task-2-push-failure-graceful.md

  Scenario: Approved V1 domain event produces one notification
    Tool: Bash
    Steps: Trigger one settlement or completion event through the backend path that now writes notifications.
    Expected: Exactly one inbox row is created with the expected type, route, and payload; webhook invokes `push` once.
    Evidence: .sisyphus/evidence/task-2-event-writer.md
  ```

  **Commit**: YES | Message: `feat(supabase): add push delivery pipeline` | Files: [`/home/coder/dev/pharma/admin-panel/supabase/functions/push/**`, `/home/coder/dev/pharma/admin-panel/supabase/migrations/*`, operational setup notes if stored in repo-safe path]

- [x] 3. Add frontend notification types and route contracts

  **What to do**: Define explicit app-side types for notification rows, payloads, and allowed route targets. Update `types/routes.types.ts` to include the existing notifications tab route and any typed aliases needed for safe fallback navigation. Add a dedicated notification domain type file (for example `types/notification.ts`) that encodes the V1 type union, route target union, and parsed payload shape used by both service and UI. Ensure the app can safely map `cta_route` + `data` into the existing order detail and shipment tracking routes only.
  **Must NOT do**: Do not invent new feature routes for marketing, settings, or prescription flows; do not leave `cta_route` as an unvalidated string in UI code.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: typed contract work spans DB types, routing, and future-safe payload parsing.
  - Skills: [`typescript-expert`] - why needed: discriminated unions and safe route/payload modeling.
  - Omitted: [`react-ui-patterns`] - why not needed: no UI rendering decisions happen here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 7, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `types/routes.types.ts:21-35` - existing cart/orders route typing style.
  - Pattern: `types/routes.types.ts:65-119` - `AppRoutes`, `TypedHref`, and `RouteParams` aggregation pattern to extend.
  - Pattern: `app/(tabs)/notifications/_layout.tsx:15-21` - notifications route already exists and should be typed instead of re-invented.
  - Pattern: `services/order.service.ts:217-241` - existing status buckets justify the V1 notification type union.
  - API/Type: `types/supabase.ts:557-588` and `types/supabase.ts:611-648` - DB types that notification payloads should reference.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The app has a single typed notification domain contract shared by service, hook, and scene code.
  - [ ] `cta_route` values are constrained to approved existing route targets.
  - [ ] TypeScript rejects unsupported notification types or invalid route payloads at compile time.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Valid notification payload compiles and maps to supported route
    Tool: Bash
    Steps: Run TypeScript/lint validation after adding the notification type contract and route typing.
    Expected: Supported notification payloads compile cleanly and route helpers accept only approved destinations.
    Evidence: .sisyphus/evidence/task-3-types-valid.md

  Scenario: Invalid notification type or unsupported route is rejected
    Tool: Bash
    Steps: Add or run a type-level negative test/fixture that attempts to use an unsupported notification type or route.
    Expected: TypeScript rejects the invalid contract before runtime.
    Evidence: .sisyphus/evidence/task-3-types-invalid.md
  ```

  **Commit**: NO | Message: `feat(types): add notification routing contracts` | Files: [`types/routes.types.ts`, `types/notification.ts`, `types/supabase.ts`]

- [x] 4. Add Expo notification foundation and runtime config

  **What to do**: Install and configure the mobile notification runtime pieces required by Expo. Add `expo-notifications` and `expo-device`; update `app.config.ts` with the notifications plugin plus platform-specific permissions/capabilities; create a small app-side notification utility that configures the Android default channel, registers a foreground handler, and safely resolves `projectId` from `Constants`/EAS config. Keep the handler global and lightweight. Do not request permission here; foundation only.
  **Must NOT do**: Do not prompt on splash/startup, do not add background task infrastructure, and do not scatter notification setup across multiple unrelated screens.

  **Recommended Agent Profile**:
  - Category: `mobile-developer` - Reason: Expo mobile runtime configuration and notification platform behavior are mobile-specific.
  - Skills: [`vercel-react-native-skills`] - why needed: Expo/React Native mobile setup and platform constraints.
  - Omitted: [`supabase`] - why not needed: this task is client runtime plumbing, not backend/data design.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 6, 9 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `app.config.ts:18-117` - current Expo config structure, plugins array, and `extra.eas.projectId` exposure.
  - Pattern: `package.json:32-88` - current Expo dependency set; confirms notification packages are not installed yet.
  - Pattern: `app/_layout.tsx:98-107` - root composition point where global listeners/providers are wired.
  - External: `https://docs.expo.dev/push-notifications/push-notifications-setup/` - official Expo setup, projectId resolution, permission prerequisites.
  - External: `https://docs.expo.dev/versions/latest/sdk/notifications/` - `setNotificationHandler`, channel setup, and listener APIs.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `package.json` includes required Expo notification packages and installs cleanly.
  - [ ] `app.config.ts` includes the notification plugin and valid platform config without breaking existing Expo config output.
  - [ ] The app has a single reusable runtime bootstrap/helper for notification channel + foreground handling.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Expo config exposes valid notification setup
    Tool: Bash
    Steps: Run `npx expo config --type public` after dependency/config changes.
    Expected: The generated Expo config includes the notifications plugin/project configuration and does not regress existing config output.
    Evidence: .sisyphus/evidence/task-4-expo-config.txt

  Scenario: Notification runtime foundation builds without prompt side effects
    Tool: Bash
    Steps: Run lint/tests or targeted type checks after adding the runtime helper; verify no startup prompt logic is introduced in the foundation layer.
    Expected: The project builds cleanly and runtime setup exists independently from permission prompting.
    Evidence: .sisyphus/evidence/task-4-runtime-foundation.md
  ```

  **Commit**: YES | Message: `feat(mobile): add expo notification foundation` | Files: [`package.json`, `app.config.ts`, app-side notification utility files]

- [x] 5. Implement notification service layer for inbox data and token lifecycle

  **What to do**: Create `services/notification.service.ts` and export it through `services/index.ts`. This service must: fetch paginated notifications newest-first; mark a row as read via `read_at`; optionally mark all loaded rows read only if explicitly used later (do not expose bulk UI yet); parse/normalize notification payloads; expose a no-prompt token sync function for already-granted permission; expose an explicit permission-request function for UI-triggered opt-in; upsert/clear `profiles.expo_push_token` and `expo_push_token_updated_at`; and return normalized `{ data, error }` shapes consistent with existing services.
  **Must NOT do**: Do not call Expo APIs directly from scenes, do not write token logic into `AuthProvider` or scene code, do not depend on Redux for core data fetching, and do not silently insert notifications from the client.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: combines Supabase access, Expo runtime calls, payload normalization, and service boundary design.
  - Skills: [`supabase`, `vercel-react-native-skills`] - why needed: secure row access plus Expo token/permission handling.
  - Omitted: [`react-ui-patterns`] - why not needed: no screen rendering choices belong here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6, 7, 8, 9 | Blocked By: 1, 3, 4

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `services/profile.service.ts:196-214` - row update contract for `profiles` and `{ data, error }` shape.
  - Pattern: `services/checkout.service.ts:331-434` - service error normalization and polling/transport patterns.
  - Pattern: `services/order.service.ts:183-192` and `services/order.service.ts:1090-1135` - result type conventions and edge function invocation style.
  - Pattern: `services/index.ts:1-12` - public barrel export convention.
  - Pattern: `types/supabase.ts:557-588` - `profiles` table typing that the token update path must extend.
  - External: `https://docs.expo.dev/push-notifications/push-notifications-setup/` - permission/token retrieval APIs and device-only constraints.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `notification.service` is the single place that touches `public.notifications` and Expo token APIs.
  - [ ] Inbox fetch returns newest-first, typed notification rows for the signed-in user only.
  - [ ] Mark-read updates persist across refresh/restart.
  - [ ] No-prompt sync only writes tokens when permission is already granted; explicit request path is separate.
  - [ ] Logout/account-switch path can clear or overwrite the stored token consistently for the current user.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Signed-in user fetches and marks own notifications as read
    Tool: Bash
    Steps: Run service tests that mock Supabase rows for one user, fetch notifications, then mark one as read and refetch.
    Expected: Results are newest-first, user-scoped, and the chosen row comes back with persisted `read_at`.
    Evidence: .sisyphus/evidence/task-5-service-read-state.txt

  Scenario: Permission denied or simulator/no-device does not corrupt token state
    Tool: Bash
    Steps: Run tests for the explicit permission request path and the no-prompt sync path under denied/non-device conditions.
    Expected: No token is written, the function returns a controlled result, and the service does not throw unhandled runtime errors.
    Evidence: .sisyphus/evidence/task-5-service-permission.txt
  ```

  **Commit**: NO | Message: `feat(services): add notification service` | Files: [`services/notification.service.ts`, `services/index.ts`, notification type helpers]

- [x] 6. Wire auth/root lifecycle for token sync and notification-open routing

  **What to do**: Integrate the notification service into app bootstrap without creating startup spam. In `AuthProvider`, on `INITIAL_SESSION`, `SIGNED_IN`, and `TOKEN_REFRESHED`, perform a **no-prompt** token sync only when permission is already granted. On `SIGNED_OUT` or account reset, clear the stored token for the last authenticated user if it matches the current device token. In root app composition (`app/_layout.tsx`), register listeners for foreground receipt and notification response taps; when a notification is opened, validate `cta_route` + payload and navigate to the existing destination route or fallback to the notifications tab if the payload is stale/invalid.
  **Must NOT do**: Do not prompt for OS permission from `AuthProvider` or splash/root startup; do not put navigation logic inside the service; do not create deadlock-prone auth calls inside the Supabase auth callback beyond the current deferred pattern.

  **Recommended Agent Profile**:
  - Category: `mobile-developer` - Reason: combines Expo notification listeners, navigation, and auth lifecycle behavior.
  - Skills: [`vercel-react-native-skills`] - why needed: Expo runtime listener patterns and mobile lifecycle constraints.
  - Omitted: [`supabase`] - why not needed: data access should already be encapsulated in the service from T5.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9 | Blocked By: 2, 4, 5

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `providers/AuthProvider.tsx:77-180` - existing session bootstrap and `onAuthStateChange` flow; preserve the deferred callback pattern.
  - Pattern: `providers/AuthProvider.tsx:182-197` - app active/inactive lifecycle handling already exists here.
  - Pattern: `app/_layout.tsx:19-67` - protected-route redirect logic and router access live here.
  - Pattern: `app/google-auth.tsx:33-66` - URL processing and retry/fallback pattern for guarded route handling.
  - External: `https://docs.expo.dev/versions/latest/sdk/notifications/` - notification received/response listener APIs.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Existing logged-in users with granted permission auto-sync a valid token without seeing a permission prompt at startup.
  - [ ] Opening a push notification navigates to order detail or tracking when payload is valid.
  - [ ] Invalid/missing route payload falls back safely to the notifications tab without crashing.
  - [ ] Logout/account switch does not leave the previous user’s device token incorrectly attached.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Push-open routes to the correct guarded destination
    Tool: Bash
    Steps: Run tests or scripted listener invocations with a valid notification response payload for order detail and tracking.
    Expected: The router is called with the expected existing route and params.
    Evidence: .sisyphus/evidence/task-6-routing-valid.txt

  Scenario: Invalid push payload falls back safely
    Tool: Bash
    Steps: Trigger the notification-open handler with missing/unsupported `cta_route` or missing entity identifiers.
    Expected: The app navigates to the notifications tab (or remains there) without throwing, and no unsafe route is attempted.
    Evidence: .sisyphus/evidence/task-6-routing-fallback.txt
  ```

  **Commit**: YES | Message: `feat(auth): sync push token and open routing` | Files: [`providers/AuthProvider.tsx`, `app/_layout.tsx`, notification bootstrap helpers]

- [x] 7. Build `useNotifications` hook with inbox state machine and optional live updates

  **What to do**: Create `hooks/useNotifications.ts` as the single orchestration layer for the Notifikasi screen. The hook must expose explicit return types and manage: initial load, pull-to-refresh, empty/error states, mark-as-read on item tap, permission-status fetch, explicit permission request CTA, and safe refresh after notification-related app events. Use the established `loading | refreshing | success | error | empty`-style contract. Subscribe to Supabase Realtime for the signed-in user’s `public.notifications` rows while the screen is active so newly inserted/updated rows can appear without a manual full restart. Keep state local to the hook; do **not** add Redux cache in V1.
  **Must NOT do**: Do not put data fetching in the scene, do not mutate notifications directly from UI components, do not introduce TanStack Query or Redux just for this feature, and do not keep a global unread badge system in V1.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this task is orchestration-heavy and sits between services, realtime, and screen contract design.
  - Skills: [`react-ui-patterns`, `vercel-react-native-skills`] - why needed: async UI state modeling plus mobile runtime constraints.
  - Omitted: [`supabase`] - why not needed: database access belongs in the service layer already defined in T5.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9 | Blocked By: 3, 5

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `hooks/useOrderDetail.ts:17-29` - explicit shared hook return type pattern.
  - Pattern: `hooks/useOrderDetail.ts:31-69` - state initialization + request-id cancellation pattern.
  - Pattern: `hooks/useOrderDetail.ts:160-169` - `useFocusEffect` refresh pattern for screen revisit.
  - Pattern: `services/cart.service.ts:850-917` - repo-approved Supabase Realtime subscription pattern, including connection-state handling and cleanup.
  - Pattern: `hooks/AGENTS.md` - hooks should orchestrate services, navigation utilities, and subscriptions while keeping the scene thin.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `useNotifications` exposes a typed contract covering items, loading/error state, refresh, permission CTA state, and item-press behavior.
  - [ ] New notifications inserted for the signed-in user appear in the hook state without duplicate items.
  - [ ] Mark-read updates local state and persists on refetch.
  - [ ] The hook remains functional when realtime is unavailable by falling back to fetch + focus refresh.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Hook loads inbox and updates read state correctly
    Tool: Bash
    Steps: Run hook tests that mock service fetch results, invoke refresh, and tap/mark a notification as read.
    Expected: The hook transitions through loading/success states, persists read state after refresh, and exposes the expected contract.
    Evidence: .sisyphus/evidence/task-7-hook-read-flow.txt

  Scenario: Realtime insert or connection failure is handled safely
    Tool: Bash
    Steps: Simulate one realtime INSERT for the current user, then a connection timeout/error.
    Expected: The new item appears once; on connection failure the hook falls back without crashing and still supports manual refresh.
    Evidence: .sisyphus/evidence/task-7-hook-realtime.txt
  ```

  **Commit**: NO | Message: `feat(hooks): add notifications orchestration` | Files: [`hooks/useNotifications.ts`, `hooks/index.ts`]

- [x] 8. Replace the placeholder Notifikasi scene with a production inbox UI

  **What to do**: Replace `scenes/notifications/Notifications.tsx` with a real inbox screen that consumes `useNotifications`. Render at minimum: loading state, empty state, error state with retry, permission CTA card when push permission is not granted, list items grouped or visually differentiated by unread/read, and item tap behavior that marks as read then routes to the validated destination. Use existing Tamagui primitives and existing icon set. Keep UI copy in Bahasa Indonesia and keep copy logistical/administrative (no PHI). Reuse the existing route/layout; do not move logic back into `app/` wrappers.
  **Must NOT do**: Do not call Supabase or Expo APIs directly from the scene, do not keep the maintenance placeholder, do not introduce filters/search/bulk actions/preferences, and do not create new route files for notification detail in V1.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this task is primarily scene composition, states, and UX polish within an existing Tamagui app.
  - Skills: [`react-ui-patterns`, `vercel-react-native-skills`] - why needed: loading/error/empty patterns plus mobile-friendly list behavior.
  - Omitted: [`frontend-design`] - why not needed: the UI should stay aligned with existing product patterns rather than inventing a new visual system.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9 | Blocked By: 3, 5, 6, 7

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scenes/notifications/Notifications.tsx:56-90` - current placeholder to replace; keep route ownership in `scenes/`.
  - Pattern: `app/(tabs)/notifications/_layout.tsx:6-26` - existing auth-guarded stack and title.
  - Pattern: `scenes/AGENTS.md` - scenes must stay thin and consume hooks/services rather than backend clients.
  - Pattern: `scenes/orders/OrderDetail.tsx:95-176` - repo’s accepted loading/error/not-found state treatment.
  - Pattern: `components/icons/index.tsx:69-75`, `components/icons/index.tsx:145-175` - available `BellIcon`, `CreditCardIcon`, `TruckIcon`, `CheckCircleIcon`, `ClockIcon`, `ShoppingBagIcon` for notification item variants.
  - Test: `__tests__/scenes/Notifications.test.tsx:6-33` - existing scene test file to replace/expand rather than creating a new location.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The scene renders meaningful loading, empty, error, unread/read, and permission-request states.
  - [ ] Tapping an unread item marks it as read and navigates through the validated route handler.
  - [ ] Empty-state messaging and permission CTA remain useful when the user has no notifications or no push permission.
  - [ ] All scene copy stays in Bahasa Indonesia and avoids medication-specific PHI wording.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Inbox scene renders all primary UI states
    Tool: Bash
    Steps: Run scene tests with mocked hook returns for loading, empty, error, permission-needed, and populated inbox states.
    Expected: Each state renders the correct headline/CTA/list content without accessing backend services directly.
    Evidence: .sisyphus/evidence/task-8-scene-states.txt

  Scenario: Item tap marks read and routes correctly
    Tool: Bash
    Steps: Mock a populated unread inbox item, press it in a scene test, and assert hook/router interactions.
    Expected: The scene invokes the mark-read/tap handler once and navigates to the correct existing route.
    Evidence: .sisyphus/evidence/task-8-scene-navigation.txt
  ```

  **Commit**: YES | Message: `feat(scene): ship notifications inbox` | Files: [`scenes/notifications/Notifications.tsx`, related small UI helpers if added]

- [x] 9. Add automated tests, mocks, and end-to-end validation harness

  **What to do**: Expand centralized tests to cover the new notification service, hook, scene, and root/bootstrap behaviors. Add only the minimum new mocks required to `jest.setup.js` for `expo-notifications` / `expo-device` if repeated local mocking becomes noisy; otherwise prefer inline mocks. Update the existing notifications scene test file rather than abandoning it. Add tests for route fallback, permission denied, no-device behavior, realtime insert/update handling, and service read-state persistence. Finish by running lint + Jest and collecting evidence artifacts.
  **Must NOT do**: Do not create source-adjacent tests or `__mocks__` directories, do not skip route fallback coverage, and do not rely solely on happy-path UI snapshots.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this task spans service, hook, scene, and runtime integration validation.
  - Skills: [`testing-strategy`] - why needed: ensures coverage is targeted and non-redundant.
  - Omitted: [`playwright`] - why not needed: this is a React Native/Expo app and the critical coverage here is Jest/service-hook-scene driven.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Final Verification Wave | Blocked By: 2, 4, 5, 6, 7, 8

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `__tests__/hooks/useOrderDetail.test.ts:1-128` - hook test style using `renderHook`, mocked services, and cache assertions.
  - Pattern: `__tests__/scenes/Notifications.test.tsx:1-33` - existing notification scene test location to expand.
  - Pattern: `test-utils/renderWithTheme.tsx:13-57` - required Tamagui/SafeArea render wrapper for scene tests.
  - Pattern: `jest.setup.js:35-58` - current Supabase mock shape.
  - Pattern: `jest.setup.js:65-145` - shared fake timer / warning suppression behavior to preserve.
  - Pattern: `__tests__/AGENTS.md` - centralized test-tree rules and anti-patterns.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Service, hook, scene, and root notification-open paths all have automated coverage.
  - [ ] Tests cover permission denied, no-device, invalid payload fallback, realtime insert, and read-state persistence.
  - [ ] `npm run lint` and `npm run test` both pass after the feature is integrated.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full notifications test suite passes
    Tool: Bash
    Steps: Run `npm run test` after adding notification service/hook/scene/bootstrap tests.
    Expected: The suite passes without flaky timer or native-module failures; notifications coverage is included in the centralized tree.
    Evidence: .sisyphus/evidence/task-9-jest.txt

  Scenario: Lint and route fallback validation pass together
    Tool: Bash
    Steps: Run `npm run lint` and the focused notification-related tests for invalid payload fallback and permission-denied branches.
    Expected: Lint passes, and the branch coverage proves the app fails safely on unsupported or incomplete notification payloads.
    Evidence: .sisyphus/evidence/task-9-lint-and-fallback.txt
  ```

  **Commit**: YES | Message: `test(notifications): cover inbox and push flows` | Files: [`__tests__/services/*`, `__tests__/hooks/*`, `__tests__/scenes/Notifications.test.tsx`, `jest.setup.js`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: backend notification contract + Supabase delivery infra in `admin-panel/supabase`
- Commit 2: Expo/mobile integration + service/hook wiring
- Commit 3: Notifikasi scene + tests + mocks
- Do not merge or mark complete before Final Verification Wave passes and user gives explicit approval

## Success Criteria
- Scene `Notifikasi` tidak lagi placeholder dan menampilkan inbox dari Supabase
- Event transaksi utama menghasilkan inbox row yang benar tanpa duplicate rows
- Push Expo terkirim untuk event V1 yang didukung dan gagal secara graceful bila device/token tidak valid
- Tapping push notification dan tapping inbox row sama-sama membuka route tujuan yang benar atau fallback aman
- Read state persisten lintas restart/session refresh
- Frontend lint + test lulus, dan verifikasi RLS/delivery selesai dengan evidence
