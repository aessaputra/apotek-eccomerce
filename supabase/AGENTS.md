# SUPABASE

Co-located Supabase backend: Edge Functions (Deno runtime) + SQL migrations. Excluded from app's `tsconfig.json`.

## STRUCTURE

```
supabase/
├── functions/
│   ├── _shared/                    # Shared utilities (imported by all functions)
│   │   ├── cors.ts                 # CORS headers (wildcard — see security note)
│   │   ├── supabase.ts             # Admin client factory (SUPABASE_SERVICE_ROLE_KEY)
│   │   ├── types.ts                # Shared TypeScript types
│   │   ├── midtrans.ts             # Midtrans payment helpers
│   │   └── biteship.ts             # Biteship shipping helpers
│   ├── create-snap-token/index.ts  # Midtrans Snap payment token generation
│   ├── order-manager/index.ts      # Admin order state transitions + tracking sync
│   ├── biteship/index.ts           # Shipping rate + tracking (Biteship API)
│   ├── midtrans-webhook/index.ts   # Payment notification webhook handler
│   ├── ban-customer/index.ts       # Admin customer ban/unban
│   └── cleanup-orphan-storage/index.ts  # Storage cleanup utility
├── migrations/                     # 17 SQL migration files (schema history)
└── config.toml                     # Local Supabase CLI config
```

## WHERE TO LOOK

| Task               | Location                                   | Notes                                                     |
| ------------------ | ------------------------------------------ | --------------------------------------------------------- |
| Add edge function  | `functions/[name]/index.ts`                | Single-file entry per function                            |
| Add shared utility | `functions/_shared/[name].ts`              | Import as relative path `../_shared/x.ts`                 |
| Add DB migration   | `migrations/`                              | Use `supabase migration new` CLI                          |
| Payment logic      | `create-snap-token/` + `midtrans-webhook/` | Midtrans Snap API                                         |
| Shipping logic     | `biteship/`                                | Biteship courier API                                      |
| Order management   | `order-manager/`                           | State machine: pending → processing → shipped → delivered |

## CONVENTIONS

- **Runtime**: Deno (not Node) — imports use `jsr:` and `npm:` specifiers
- **Admin client**: Always via `getSupabaseAdminClient()` from `_shared/supabase.ts`
- **CORS**: Every function starts with `if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })`
- **Auth**: Verify JWT via `jose` library or Supabase auth — never trust client input
- **Env vars**: `Deno.env.get('VAR_NAME')` — set in Supabase dashboard, not `.env` files
- **Error handling**: `console.error` is unguarded (no `__DEV__` — server-side logging is fine)
- **Entry pattern**: Each function exports a single `Deno.serve()` handler

## ANTI-PATTERNS

- **NEVER** import from `@/` alias — Deno doesn't use the app's path resolution
- **NEVER** import Node.js builtins — use Deno equivalents or `npm:` specifiers
- **NEVER** use `SUPABASE_ANON_KEY` in edge functions — use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- **NEVER** skip CORS preflight handler — mobile ignores CORS but web doesn't
