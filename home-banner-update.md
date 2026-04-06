# Home Banner CTA Route Update (Simplified)

## Overview

Enable CTA route to "All Products" page (`home/all-products`) for home banner bottom.

**Current Issue:**

- Database constraint `home_banners_cta_consistency_check` only allows `cta_route = 'home/all-products'`
- This was hardcoded and too restrictive
- While we only need `home/all-products` for now, we want flexibility to add more routes later without database migrations

**Solution (Minimal & Pragmatic):**

- Keep database constraint flexible (structure validation only)
- Application-level validation with single route for now
- Easy to extend when needed

---

## Scope

### In Scope:

- Update database constraint to allow any route string (when cta_kind = 'route')
- Add simple constants file with current route: `home/all-products`
- Add validation in banner service
- Update API to use validation

### Out of Scope:

- Multiple routes (only `home/all-products` for now)
- Complex validation logic
- Admin dashboard UI changes
- Frontend changes (handled separately)

---

## 1. Database Migration (One-time)

### File: `supabase/migrations/20250406_update_home_banners_cta_constraint.sql`

```sql
-- Migration: Make CTA route constraint flexible
-- Date: 2026-04-06

-- Drop the hardcoded constraint
ALTER TABLE public.home_banners
DROP CONSTRAINT IF EXISTS home_banners_cta_consistency_check;

-- Add flexible constraint (only validates structure, not specific route)
ALTER TABLE public.home_banners
ADD CONSTRAINT home_banners_cta_consistency_check
CHECK (
  (
    cta_kind = 'none'
    AND cta_label IS NULL
    AND cta_route IS NULL
  )
  OR
  (
    cta_kind = 'route'
    AND cta_label IS NOT NULL
    AND cta_label <> ''
    AND cta_route IS NOT NULL
    AND cta_route <> ''
  )
);

-- Verify no existing data violates new constraint
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.home_banners
  WHERE cta_kind = 'route'
    AND (cta_label IS NULL OR cta_label = '' OR cta_route IS NULL OR cta_route = '');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration blocked: % banners have incomplete CTA data', invalid_count;
  END IF;
END $$;
```

---

## 2. Constants

### File: `src/constants/banner.constants.ts`

```typescript
/**
 * Valid CTA routes for home banners
 * Currently only supports All Products page
 * Add more routes here when needed (no database migration required)
 */
export const VALID_CTA_ROUTES = ['home/all-products'] as const;

export type ValidCtaRoute = (typeof VALID_CTA_ROUTES)[number];

/**
 * Check if route is valid
 */
export function isValidCtaRoute(route: string): route is ValidCtaRoute {
  return VALID_CTA_ROUTES.includes(route as ValidCtaRoute);
}
```

---

## 3. Service Validation

### File: `src/services/banner.service.ts`

```typescript
import { isValidCtaRoute, VALID_CTA_ROUTES } from '@/constants/banner.constants';

export interface CreateBannerInput {
  placement_key: 'home_banner_top' | 'home_banner_bottom';
  intent: 'promotional' | 'informational' | 'branding';
  title?: string | null;
  body?: string | null;
  media_path?: string | null;
  cta_kind: 'none' | 'route';
  cta_label?: string | null;
  cta_route?: string | null;
  is_active?: boolean;
}

/**
 * Validate banner input
 */
export function validateBannerInput(input: CreateBannerInput): { valid: boolean; error?: string } {
  // Validate CTA
  if (input.cta_kind === 'route') {
    if (!input.cta_label?.trim()) {
      return { valid: false, error: 'CTA label wajib diisi' };
    }

    if (!input.cta_route) {
      return { valid: false, error: 'CTA route wajib diisi' };
    }

    if (!isValidCtaRoute(input.cta_route)) {
      return {
        valid: false,
        error: `Route tidak valid. Route yang diizinkan: ${VALID_CTA_ROUTES.join(', ')}`,
      };
    }
  }

  // Validate visible content
  if (!input.title?.trim() && !input.body?.trim() && !input.media_path?.trim()) {
    return {
      valid: false,
      error: 'Minimal salah satu dari title, body, atau media_path harus diisi',
    };
  }

  return { valid: true };
}

/**
 * Create banner with validation
 */
export async function createBanner(input: CreateBannerInput, userId: string) {
  const validation = validateBannerInput(input);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const { data, error } = await supabase
    .from('home_banners')
    .insert({
      ...input,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      cta_label: input.cta_label?.trim() || null,
      cta_route: input.cta_route?.trim() || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

/**
 * Update banner with validation
 */
export async function updateBanner(id: string, input: Partial<CreateBannerInput>, userId: string) {
  // Validate if CTA fields are being updated
  if (input.cta_kind === 'route' || input.cta_route) {
    const routeToValidate = input.cta_route;
    if (routeToValidate && !isValidCtaRoute(routeToValidate)) {
      return {
        error: `Route tidak valid. Route yang diizinkan: ${VALID_CTA_ROUTES.join(', ')}`,
      };
    }
  }

  const { data, error } = await supabase
    .from('home_banners')
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}
```

---

## 4. API Routes

### File: `src/routes/banners.routes.ts`

```typescript
import { Router } from 'express';
import { createBanner, updateBanner, validateBannerInput } from '@/services/banner.service';
import { requireAuth, requireAdmin } from '@/middleware/auth';

const router = Router();

// POST /api/banners
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const validation = validateBannerInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const result = await createBanner(req.body, req.user.id);

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.status(201).json({ success: true, data: result.data });
});

// PUT /api/banners/:id
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await updateBanner(req.params.id, req.body, req.user.id);

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({ success: true, data: result.data });
});

export default router;
```

---

## Action Items

### Phase 1: Database

- [ ] Create migration file
- [ ] Run on local: `supabase db reset` or `supabase migration up`
- [ ] Run on staging
- [ ] Run on production

### Phase 2: Code

- [ ] Create `src/constants/banner.constants.ts`
- [ ] Create `src/services/banner.service.ts`
- [ ] Update `src/routes/banners.routes.ts`

### Phase 3: Test

- [ ] Test create banner with `cta_route: 'home/all-products'` → Should succeed
- [ ] Test create banner with `cta_route: 'invalid-route'` → Should fail with error message
- [ ] Test update banner CTA
- [ ] Verify existing banners still work

### Phase 4: Deploy

- [ ] Deploy to staging
- [ ] Deploy to production

---

## Future Extensions (When Needed)

To add more routes later, simply update constants:

```typescript
// src/constants/banner.constants.ts
export const VALID_CTA_ROUTES = [
  'home/all-products',
  'orders', // Add this later
  'cart', // Add this later
] as const;
```

No database migration required!

---

## Rollback (Emergency)

```sql
-- Restore original constraint (if needed)
ALTER TABLE public.home_banners
DROP CONSTRAINT IF EXISTS home_banners_cta_consistency_check;

ALTER TABLE public.home_banners
ADD CONSTRAINT home_banners_cta_consistency_check
CHECK (
  ((cta_kind = 'none') AND (cta_label IS NULL) AND (cta_route IS NULL))
  OR
  ((cta_kind = 'route') AND (cta_label IS NOT NULL) AND (cta_label <> '') AND (cta_route IS NOT NULL) AND (cta_route = 'home/all-products'))
);
```

---

**Created:** 2026-04-06  
**Status:** Ready for Implementation  
**Scope:** Single route (`home/all-products`) with flexibility to extend later
