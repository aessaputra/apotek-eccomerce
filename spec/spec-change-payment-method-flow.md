# Spec: Change Payment Method Flow (Ganti Metode Pembayaran)

## Problem Statement

As a customer, when I checkout an order and select a payment method on the Midtrans Snap page but close it before paying (e.g. bank transfer/Virtual Account is generated), the payment session is locked to that specific payment method. If I want to pay using a different payment method later (e.g., changing from BCA Virtual Account to GoPay), I cannot do so. Reopening the payment page via "Bayar Sekarang" redirects me directly to the previously selected payment method's instructions with no option to change it.

## Solution

Provide a **"Ganti Metode"** (Change Method) button in the application on the unpaid order card. Clicking this button will request a new payment session with a newly generated unique transaction ID from the backend, allowing the customer to see the payment method list on the Snap screen and choose a different payment method.

## User Stories

1. As an e-commerce customer, I want to be able to change my payment method for an unpaid order, so that I can pay using my preferred payment channel.
2. As a customer who initially chose a bank transfer but decided to pay using GoPay instead, I want a button on the unpaid order card to change my payment method, so that I don't have to create a new order from scratch.
3. As a customer, I want the countdown timer to update to the new method's expiry time when I change my payment method, so that I know exactly how much time I have left.
4. As a developer, I want to avoid accidentally cancelling the customer's database order when they choose to change payment methods, so that the order stays in `pending` status.
5. As a developer, I want to reuse the existing database read model view seamlessly, so that the latest payment session is automatically selected and rendered in the frontend.

## Implementation Decisions

### Modules to be Modified

- **Backend Payment Service / Token Generator**:
  - Add support for a `force_new_session` boolean flag in the request payload.
  - If `force_new_session` is `true`, bypass the snap token reuse check and idempotency checks.
  - If `force_new_session` is `true`, generate a new payment reference ID by appending a new timestamp suffix (e.g., `APT-{shortId}-{timestamp}`), request a new Snap token from Midtrans, and insert a new payment record.

- **Frontend API Client & Custom Hooks**:
  - Update the payment client and hooks to accept an optional `forceNewSession` parameter and pass it to the backend payment generation API.

- **Frontend UI Components**:
  - Render a secondary "Ganti Metode" button next to "Bayar Sekarang" on the unpaid order card.
  - Clicking this button will invoke the payment hook with `forceNewSession: true` to trigger the change flow.

### Seams and Database Interactions

- The database view resolves the payment record by querying payments for the latest updated/created record:
  ```sql
  left join lateral (
    select * from public.payments
    where payments.order_id = o.id
    order by payments.updated_at desc, payments.created_at desc
    limit 1
  ) p on true
  ```
- Because this view derives `expired_at` from `payments.expiry_time` of the latest record, inserting a new payment session automatically updates the order's redirect URL and expiry time. No database schema migration is required.
- The transaction lock is released in the `finally` block of the payment generation process, meaning that changing the payment method immediately after closing the previous session will not be blocked by concurrency locks.
- If a customer initiates a change but ends up paying the *old* (non-expired) payment session, the webhook handler will resolve it correctly using the old unique payment reference ID and mark the order as paid.

## Testing Decisions

- **What makes a good test**: Only testing external API contract changes, hook propagation, and lock safety behavior, not database mock internals.
- **Modules to be tested**:
  - **Backend Token Generator Unit Tests**: Verify that when `force_new_session` is `true`, it ignores existing valid tokens, generates a new payment reference ID, and returns a new redirect URL.
  - **Frontend Hook Unit Tests**: Verify it forwards the parameter correctly to the API client.
- **Prior Art**: Refer to existing token reuse tests on the backend and payment hook tests on the frontend.

## Out of Scope

- Calling the Midtrans cancel API `/v2/{order_id}/cancel` for the old payment session (out of scope to prevent webhook cancellation side-effects on database orders and because Midtrans permits letting old pending payments expire naturally).
- Selecting the payment method inside the native React Native UI (we continue to rely on the Midtrans Snap page/WebView redirection).
- Adding the "Ganti Metode" button in the Order Detail screen (Phase 1 focus is strictly on the Unpaid Order Card list view for minimal footprint; detail screen integration is deferred to Phase 2).

## Further Notes

- The old payment session will naturally expire on Midtrans' end after its respective TTL (e.g. 24 hours for bank transfer, 15 minutes for GoPay).
- All front-facing Indonesian UI copies will read "Ganti Metode" for the action button.
