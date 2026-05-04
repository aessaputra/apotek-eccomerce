# CART SCENES

Cart, checkout review, and payment flow live here. This directory intentionally keeps cart-specific sheets, banners, payment helpers, and local hooks beside the cart screens.

## STRUCTURE

```
scenes/cart/
├── Cart.tsx                 # Cart screen, address/shipping sheets, checkout CTA
├── CheckoutReview.tsx       # Serialized route payload review before payment
├── Payment.tsx              # Midtrans Snap WebView + payment finalization
├── usePaymentFlow.ts        # Polling, cache invalidation, post-payment state
├── payment.utils.ts         # Payment URL/status parsing and trusted URL checks
├── CartSheets.tsx           # Address and shipping option sheets
├── CartCheckoutDetails.tsx  # Address/shipping/summary presentation
├── CartFeedback.tsx         # Status/error/offline banners
├── cart.constants.ts        # Rupiah formatting and cart constants
├── cart.errors.ts           # Cart recovery suggestions
└── useOfflineActionMessage.ts
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Cart screen behavior | `Cart.tsx` | Composes cart, address, shipping, checkout hooks |
| Review payload parsing | `CheckoutReview.tsx` | Parses JSON route params; invalid state returns to cart |
| Payment WebView | `Payment.tsx` | Blocks untrusted URLs and handles deep links |
| Payment finalization | `usePaymentFlow.ts` | Polls status, clears checkout session, invalidates order caches |
| Payment parsing/security | `payment.utils.ts` | Trusted URL and navigation-status logic |
| Sheets/banners | `CartSheets.tsx`, `CartFeedback.tsx` | Keep cart-only UI here, shared UI in `components/` |

## FLOW

1. `Cart.tsx` loads cart snapshot, address, shipping, and offline state through hooks.
2. Review route receives serialized address, shipping option, snapshot, item summaries, and quote destination.
3. `useCartCheckout` creates/reuses checkout session, creates order, requests Snap token, then routes to `/cart/payment`.
4. `Payment.tsx` validates Snap URL, opens WebView, detects terminal redirect/deep-link status.
5. `usePaymentFlow` polls backend status, clears persisted checkout session, invalidates order caches, and routes to success/orders.

## CONVENTIONS

- Keep cart-only helpers local to `scenes/cart/`; promote to `hooks/`, `services/`, or `components/` only when reused outside cart.
- Route payloads are serialized strings; always parse defensively and handle invalid review/payment states.
- Offline actions should show Indonesian user-facing messages and avoid network mutations.
- Payment URL handling must remain allowlisted through `isTrustedPaymentUrl()`.
- Cache invalidation after payment touches unpaid, packing, shipped, completed order caches and cart-cleared state.

## ANTI-PATTERNS

- **NEVER** navigate to a payment URL that fails `isTrustedPaymentUrl()`.
- **NEVER** assume review route params are valid JSON; use guarded parsing.
- **NEVER** start checkout while offline; surface the existing offline action message pattern.
- **NEVER** clear or reroute payment state without removing `DataPersistKeys.CHECKOUT_SESSION` when the flow is terminal.
