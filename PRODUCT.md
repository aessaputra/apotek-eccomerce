# PRODUCT.md — Apotek Online

**Status:** Active Development | **Last Updated:** 2026-05-05 | **Owner:** Engineering & Product Team

---

## 1. Mission & Vision

**Mission:**
To provide trusted and convenient access to health products and medicines for Indonesians through a secure, fast, and integrated mobile platform.

**Vision:**
To become Indonesia's leading mobile-first pharmacy e-commerce platform that bridges patient health needs with professional pharmacy services, supported by digital prescription verification and integrated logistics.

**Product Principles:**
1. **Trust First** — The safety and authenticity of pharmaceutical products is the absolute priority.
2. **Speed & Convenience** — The medicine ordering process must be faster than a physical pharmacy visit.
3. **Transparency** — Order status, shipping costs, and product availability must always be clearly visible.
4. **Accessibility** — The platform must be easy to use for everyone, including first-time users.

---

## 2. Product Overview

Apotek Online is a cross-platform pharmacy e-commerce application (iOS, Android, Web) that enables users to:
- Browse health product and medicine catalogs
- Upload doctor prescriptions for verification
- Order products with delivery to their address
- Track order status in real-time
- Receive push notifications for important updates

The app is built with **Expo SDK 54** and **React Native 0.81.5**, using **TypeScript** with a modular architecture that separates routing (`app/`), screen implementations (`scenes/`), UI components (`components/`), and backend logic (`services/`).

---

## 3. Problem Statement

**Problem Being Solved:**
Indonesian users often spend 2-4 hours on physical pharmacy visits, including travel, queues, and the purchase process. Many users, especially in urban areas, delay prescription refills due to time and mobility constraints.

**Evidence & Context:**
- No mobile-first pharmacy platform in Indonesia is fully integrated with digital prescription verification and real-time delivery logistics.
- Users need a solution that enables medicine ordering from home with guaranteed safety and legality.
- The checkout and payment process for pharmaceutical products is often complicated and non-transparent.

**Impact:**
Delayed treatment due to inconvenient purchase processes, plus the risk of buying health products from untrusted channels.

---

## 4. Target Users & Personas

### Persona 1: Working Mother (Sari, 34 years old)
- **Context:** Lives in Jakarta, manages family while working.
- **Goal:** Buy family medicine quickly without leaving home.
- **Pain Point:** Long queues at pharmacies, difficulty bringing children to the pharmacy, uncertainty about product availability before traveling.
- **Success Trigger:** Can order medicine in 3 minutes and receive same-day delivery.

### Persona 2: Young Professional (Budi, 28 years old)
- **Context:** Busy working in an office, rarely has free time during pharmacy operating hours.
- **Goal:** Routine prescription refills with minimal effort.
- **Pain Point:** Pharmacies closed after work, forgetting to buy routine medicine, difficulty keeping purchase history.
- **Success Trigger:** Reorder feature from order history and reminder notifications.

### Persona 3: Elderly / Caregiver (Mr. Tono, 65 years old / His child)
- **Context:** Needs chronic medicine regularly, often assisted by children or caregivers to place orders.
- **Goal:** A simple and reliable ordering process.
- **Pain Point:** Overly complex app interface, worry about medicine delivery security.
- **Success Trigger:** Easy-to-follow process and clear order confirmation.

---

## 5. Core Jobs To Be Done

1. **I want to find the medicine I need** — through search, categories, or recommendations.
2. **I want to order medicine easily** — add to cart, select address, choose courier, and pay.
3. **I want to know my order status** — from payment, packing, shipping, to completion.
4. **I want to upload a doctor's prescription** — to buy medicine that requires verification.
5. **I want to save addresses and order history** — for faster future orders.

---

## 6. Goals & Non-Goals

### Goals
- **G1:** Order time from browsing to checkout is under 3 minutes for repeat users.
- **G2:** Cart-to-payment conversion rate > 60% within the first 6 months after checkout feature stabilizes.
- **G3:** Secure and trusted payment support through Midtrans Snap.
- **G4:** Real-time delivery tracking through Biteship integration.
- **G5:** Consistent user experience across iOS, Android, and Web.

### Non-Goals (Out of Scope for Now)
- **NG1:** Automatic subscription refill system — not built in the current version.
- **NG2:** Health insurance or reimbursement claim integration.
- **NG3:** Direct doctor consultation within the app.
- **NG4:** Non-pharmaceutical product sales (such as general cosmetics) as the main focus.
- **NG5:** Internal delivery logistics (own fleet) — using third-party couriers.

---

## 7. Success Metrics / KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Cart-to-Checkout Conversion** | — | > 60% | Midtrans payment success events |
| **Average Order Completion Time** | — | < 3 minutes (repeat users) | Analytics: cart → payment success duration |
| **Daily Active Users (DAU)** | — | 5,000 in 6 months | Supabase auth sessions |
| **App Store Rating** | — | 4.5+ stars | Play Store / App Store aggregate |
| **Push Notification Open Rate** | — | > 25% | Expo notification analytics |
| **Order Tracking Page Views** | — | > 80% of total orders | In-app analytics |

**Primary Metric:** Cart-to-Checkout Conversion Rate
**North Star:** Number of orders successfully completed and shipped per day.

---

## 8. Product Surface Areas & Core Features

### 8.1 Authentication & Account Security
- User login and registration.
- Forgot password and password reset.
- Email verification with OTP.
- Google OAuth login.
- MFA/TOTP (Multi-Factor Authentication) support.
- Session management and user profile validation.

### 8.2 Home & Product Discovery
- Home feed with user greeting, search shortcut, and cart shortcut.
- Promo banners and product categories.
- Latest product listings.
- Product search with filters.
- Product detail page with images and complete information.
- "Add to Cart" confirmation dialog.

### 8.3 Cart & Checkout
- Cart screen with item list, quantity updates, and item removal.
- Cart snapshots for history.
- Delivery address selection.
- Courier option selection and shipping cost estimation (Biteship).
- Checkout review page with state serialization.
- Checkout session persistence.
- Order creation via `create-checkout-order` Edge Function.

### 8.4 Payment
- Midtrans Snap integration for payment.
- Token and redirect URL from `create-snap-token` Edge Function.
- WebView-based payment UI with trusted URL allowlist.
- Payment status polling and confirmation via `confirm-midtrans-payment`.
- Redirect/deep-link handling after payment.
- Checkout session clearing and cache invalidation after terminal status.

### 8.5 Orders & Tracking
- Order list page with status tabs (Unpaid, Packing, Shipped, Completed, Cancelled).
- Order detail page (items, address, payment, shipping, summary).
- Shipment tracking page.
- Post-checkout success page.
- User order receipt confirmation via `confirm-order-received`.

### 8.6 Profile & Address Management
- Profile page and profile editing.
- Profile photo/avatar upload and update.
- Address list, add, edit, and delete address.
- Default address selection.
- Map picker for selecting location (expo-location, react-native-maps).
- Address search with Google Places API.
- Area picker workflow (Province → City/Regency → District → Postal Code).
- Reverse geocoding for current location.

### 8.7 Shipping & Logistics
- Biteship integration for area lookup and shipping rate estimation.
- Public order tracking.
- Postal code and destination area handling.

### 8.8 Notifications
- Expo push token sync to Supabase profile.
- Notification list with read/unread status.
- Mark as read (single or all).
- Realtime subscription for new notifications.
- Navigation to related pages from notification payload.

---

## 9. Core User Flows

### Flow 1: Browse & Order (Happy Path)
1. User opens the app → Home Feed (banners, categories, products).
2. User searches/taps a product → Product Detail.
3. Tap "Add to Cart" → Success dialog.
4. Tap cart → Cart Screen.
5. Update quantity / select address / select courier.
6. Tap "Checkout" → Review Checkout.
7. Confirm → Midtrans Snap WebView.
8. Payment success → Payment Success Screen.
9. Order appears in Order List (Unpaid/Packing status).

### Flow 2: Upload Prescription (If Applicable)
1. From Product Detail or Prescription-specific page → Upload Prescription Photo.
2. System verifies (backend/admin panel).
3. User is notified of verification result via notification.
4. If approved, product is added to cart or proceeds directly to checkout.

### Flow 3: Reorder from History
1. User goes to Order List.
2. Tap a previous order → Order Detail.
3. Tap "Buy Again" / "Reorder".
4. Products are added to cart or proceed directly to checkout review.

### Flow 4: Delivery Tracking
1. From Order Detail → Tap "Track Shipment".
2. Tracking page displays latest status from Biteship.
3. Push notification sent when status changes (Shipped, In Transit, Delivered).

---

## 10. Tech Stack & Architecture

### 10.1 Core Platform
- **Framework:** Expo SDK 54, React Native 0.81.5, React 19.1
- **Language:** TypeScript 5.9 (Strict Mode)
- **Routing:** Expo Router v6 (File-based)
- **UI Library:** Tamagui 1.144
- **State Management:** Redux Toolkit (global), Zustand (local/narrow), TanStack Query (server state)

### 10.2 Backend & Data
- **Backend-as-a-Service:** Supabase (PostgreSQL, Auth, Edge Functions, Realtime, Storage)
- **Client:** `@supabase/supabase-js` with generated types
- **Auth:** PKCE flow, session persistence, MFA/TOTP

### 10.3 Third-Party Integrations
- **Payment:** Midtrans Snap (via Edge Function proxy)
- **Logistics:** Biteship (via Edge Function proxy)
- **Maps & Location:** Google Places API, Google Geocoding API, expo-location, react-native-maps
- **Regional Data:** `wilayah.id`, `ArrayAccess/Indonesia-Postal-And-Area`
- **Push Notifications:** Expo Notifications

### 10.4 Directory Architecture
```
app/          → Expo Router wrappers & root layout
scenes/       → Screen implementations per feature
components/   → Tamagui UI primitives & composites
services/     → Backend boundary (Supabase, Edge Functions, external APIs)
hooks/        → Reusable stateful logic
providers/    → App-wide provider stack (Gesture, SafeArea, Redux, Tamagui, Query, Auth)
utils/        → Infra helpers (Supabase client, config, storage, retry)
types/        → Domain & generated Supabase types
constants/    → Domain & UI constants
__tests__/    → Centralized Jest tests
```

**Key Architecture Rules:**
- Route files in `app/` must be thin; screen logic lives in `scenes/`.
- Components/scenes must not call Supabase client directly — use `services/`.
- All runtime config is accessed through `utils/config.ts` (not `Constants.expoConfig?.extra` directly).

---

## 11. Trust, Safety & Compliance

- **Prescription Verification:** Products requiring a doctor's prescription must be verified before processing.
- **Payment Security:** All payment transactions are processed through PCI-DSS compliant Midtrans Snap.
- **Location Data Privacy:** Location usage (expo-location) is only for delivery addresses and requires explicit permission.
- **Platform Policy:** Complies with App Store and Play Store policies for health/medical applications.
- **Personal Data:** User personal data storage follows Supabase security standards and Indonesian data regulations.

---

## 12. Roadmap / Milestones

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| **MVP Launch** | Q2 2026 | 🚧 In Progress | Core catalog, cart, checkout, Midtrans payment, Biteship shipping |
| **v1.1 — Order Tracking & Notifications** | Q3 2026 | 🔜 Planned | Push notifications, real-time tracking UI, status updates |
| **v1.2 — Digital Prescription & Verification** | Q3 2026 | 🔜 Planned | Prescription upload, admin verification flow, prescription-linked products |
| **v1.3 — Loyalty & Promo Engine** | Q4 2026 | 🔜 Planned | Vouchers, loyalty points, special promos |
| **v2.0 — Subscription Refills** | Q1 2027 | 🔜 Planned | Auto-reminder, quick reorder, scheduled delivery (Non-Goal for now) |

---

## 13. Anti-Goals (Scope Boundaries)

- Do not build internal logistics system (own delivery fleet).
- Do not integrate health insurance or reimbursement claims in the app.
- Do not provide direct medical consultation with doctors/pharmacists.
- Do not sell non-pharmaceutical products as the main focus.
- Do not support cryptocurrency payments.

---

## 14. Open Questions & Assumptions

| Item | Owner | Status |
|------|-------|--------|
| Will prescription verification be done manually by admin or via OCR first? | Product | Open |
| What is the handling mechanism for products that suddenly go out-of-stock after checkout? | Engineering | Open |
| Will there be a "chat with pharmacist" feature in future versions? | Product | Assumed No (v2.0+) |
| How long is the delivery time guarantee to users? | Operations | Open |
| Return/refund strategy for damaged/wrongly shipped pharmaceutical products? | Product/Legal | Open |

---

## Technical Document References

- [README.md](./README.md) — Development overview and quick-start.
- [AGENTS.md](./AGENTS.md) — Project architecture knowledge base.
- `app/AGENTS.md` — Routing and protected routes guide.
- `scenes/AGENTS.md` — Feature map and screen orchestration.
- `services/AGENTS.md` — Service layer conventions and backend integration.
- `components/AGENTS.md` — Tamagui UI component guide.
- `providers/AGENTS.md` — Provider order and auth bootstrap.

---

*This document is a living document. Update it regularly according to product strategy changes and development iteration results.*
