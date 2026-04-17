---
title: UX Patterns for Handling Expired Orders in E-Commerce
version: 1.0
date_created: 2026-04-07
last_updated: 2026-04-07
owner: Product & Design Team
tags: [design, ux, orders, payment, e-commerce]
---

# UX Patterns for Handling Expired Orders in E-Commerce

## 1. Purpose & Scope

This specification defines UX patterns and best practices for handling expired/unpaid orders in e-commerce applications, specifically addressing the pharmacy e-commerce context. The goal is to eliminate user confusion when orders can no longer be paid and provide clear, actionable paths forward.

**Scope**: Order status labels, UI/UX patterns, available actions, communication strategies, and order lifecycle management for expired payment windows.

**Audience**: Product managers, UX designers, frontend developers, and backend engineers implementing order management systems.

---

## 2. Definitions

- **Expired Order**: An order where the payment window has closed (typically 15 minutes to 24 hours after order creation) and payment can no longer be accepted.
- **Unpaid Order**: An order that has not received payment confirmation, regardless of expiration status.
- **Payment Window**: The time period during which a customer can complete payment (set by payment gateway, e.g., Midtrans).
- **Order Lifecycle**: The progression of an order through states: Created → Awaiting Payment → Expired/Paid → Processing → Completed.
- **Reorder**: Creating a new order with the same items from a previous order.
- **Status Label**: The text/badge displayed to users indicating the current order state.
- **Soft-Charcoal Hierarchy**: The dark-mode color system used in this pharmacy app (elevation levels from `#0F1419` to `#2D3A44`).

---

## 3. Requirements, Constraints & Guidelines

### 3.1 Status Label Requirements

- **REQ-001**: Expired orders must display a distinct status label that clearly communicates the order can no longer be paid.
- **REQ-002**: Status labels must be in Indonesian (user-facing) and English (backend/code).
- **REQ-003**: The expired status must be visually distinct from "Waiting for Payment" (Menunggu Pembayaran).
- **REQ-004**: Status labels must be consistent across all order views (list, detail, history).
- **REQ-005**: Expired orders must include a timestamp indicating when the payment window closed.

### 3.2 UI/UX Pattern Requirements

- **REQ-006**: Expired orders must be grouped separately from active payment-pending orders in the order list.
- **REQ-007**: A clear, contextual explanation must appear on the order detail page explaining why the order expired.
- **REQ-008**: The explanation must include the original payment deadline and current date/time.
- **REQ-009**: Expired orders must not appear in the default "active orders" tab; they should be in a separate section or filtered view.
- **REQ-010**: The UI must prevent accidental payment attempts on expired orders (disable payment buttons).

### 3.3 Action Requirements

- **REQ-011**: Users must be able to reorder (create a new order with the same items) from an expired order.
- **REQ-012**: Reorder action must be prominent and easily discoverable on the expired order detail page.
- **REQ-013**: Users must be able to view the expired order details (items, prices, address) for reference.
- **REQ-014**: Users should NOT be able to delete expired orders (for audit/record-keeping).
- **REQ-015**: Users should NOT be able to modify expired orders.

### 3.4 Communication Requirements

- **REQ-016**: A clear, empathetic message must explain the expiration and next steps.
- **REQ-017**: The message must be in Indonesian and use simple, non-technical language.
- **REQ-018**: The message must include a direct call-to-action (e.g., "Buat Pesanan Baru" / "Create New Order").
- **REQ-019**: Optional: Send a notification/email when an order expires (backend-driven).

### 3.5 Constraint Requirements

- **CON-001**: Expired orders must remain in the database for audit and analytics purposes.
- **CON-002**: The payment gateway (Midtrans) controls the expiration window; the app must respect this.
- **CON-003**: Expired orders must not block inventory or affect stock levels.
- **CON-004**: The UI must work on mobile (primary use case) and web.

### 3.6 Guideline Requirements

- **GUD-001**: Use the app's dark-mode color system: `surfaceElevated` (#2D3A44) for expired order cards, `colorMuted` (#7A8A9A) for secondary text.
- **GUD-002**: Use a warning/alert icon (e.g., ⏰ or ⚠️) to visually signal expiration.
- **GUD-003**: Avoid red/error colors for expired orders; use neutral/muted tones (this is not an error, just a state change).
- **GUD-004**: Provide a "Reorder" button with `primary` color (#06B6D4) for high visibility.
- **GUD-005**: Follow the app's existing typography and spacing conventions (Poppins font, Tamagui spacing).

---

## 4. Recommended Status Labels

### 4.1 Indonesian Labels (User-Facing)

| Status | Indonesian Label | English (Backend) | Context |
|--------|------------------|-------------------|---------|
| Unpaid, within payment window | Menunggu Pembayaran | AWAITING_PAYMENT | Order created, payment deadline not passed |
| Unpaid, payment window closed | Pesanan Kadaluarsa | EXPIRED | Payment window closed, order can no longer be paid |
| Payment failed | Pembayaran Gagal | PAYMENT_FAILED | Payment attempt was declined/failed |
| Paid, processing | Diproses | PROCESSING | Payment confirmed, order being prepared |
| Completed | Selesai | COMPLETED | Order delivered |
| Cancelled | Dibatalkan | CANCELLED | Order cancelled by user or admin |

### 4.2 Rationale for "Pesanan Kadaluarsa"

- **"Kadaluarsa"** = "Expired" in Indonesian (commonly used for food, documents, licenses)
- **Clear distinction** from "Menunggu Pembayaran" (Waiting for Payment)
- **Familiar to Indonesian users** (used in banking, e-commerce, government contexts)
- **Alternatives considered**:
  - "Pembayaran Kadaluarsa" (Payment Expired) — too technical
  - "Waktu Pembayaran Habis" (Payment Time Ended) — too wordy
  - "Pesanan Tidak Aktif" (Order Inactive) — too vague

---

## 5. UI/UX Patterns

### 5.1 Order List View

**Pattern**: Separate tabs or sections for active vs. expired orders.

```
┌─────────────────────────────────────────┐
│ Pesanan (Orders)                        │
├─────────────────────────────────────────┤
│ [Aktif] [Kadaluarsa] [Selesai]         │  ← Tabs
├─────────────────────────────────────────┤
│                                         │
│ ⏰ Pesanan Kadaluarsa                   │  ← Section header with icon
│ ─────────────────────────────────────── │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Pesanan #12345                      │ │
│ │ Rp 250.000 • 3 items                │ │
│ │ Kadaluarsa 2 hari yang lalu         │ │  ← Muted text
│ │ [Buat Pesanan Baru]                 │ │  ← CTA button
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Pesanan #12346                      │ │
│ │ Rp 150.000 • 2 items                │ │
│ │ Kadaluarsa 5 hari yang lalu         │ │
│ │ [Buat Pesanan Baru]                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Design Notes**:
- Use `surfaceElevated` (#2D3A44) for expired order cards (slightly elevated from background).
- Use `colorMuted` (#7A8A9A) for "Kadaluarsa X hari yang lalu" text.
- Use ⏰ icon to signal time-related state.
- "Buat Pesanan Baru" button uses `primary` color (#06B6D4).
- Expired orders are NOT in the default "Aktif" tab (reduces confusion).

### 5.2 Order Detail View

**Pattern**: Clear explanation + prominent reorder action.

```
┌─────────────────────────────────────────────────────┐
│ Pesanan #12345                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ⏰ Pesanan Kadaluarsa                               │  ← Status badge
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Waktu pembayaran telah berakhir                 │ │  ← Explanation
│ │                                                 │ │
│ │ Pesanan ini dibuat pada 5 April 2026, 10:00    │ │
│ │ Batas waktu pembayaran: 5 April 2026, 10:15    │ │
│ │ Status: Kadaluarsa (2 hari yang lalu)          │ │
│ │                                                 │ │
│ │ Anda tidak lagi dapat membayar pesanan ini.    │ │
│ │ Silakan buat pesanan baru untuk melanjutkan.   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Buat Pesanan Baru]  [Lihat Detail]                │  ← Actions
│                                                     │
│ ─────────────────────────────────────────────────── │
│ Ringkasan Pesanan                                   │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ Obat A (Rp 100.000) × 1                            │
│ Obat B (Rp 75.000) × 2                             │
│ Obat C (Rp 50.000) × 1                             │
│                                                     │
│ Subtotal:        Rp 300.000                        │
│ Ongkir:          Rp 10.000                         │
│ ─────────────────────────────────────────────────── │
│ Total:           Rp 310.000                        │
│                                                     │
│ Alamat Pengiriman:                                  │
│ Jl. Merdeka No. 123, Jakarta Selatan               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Design Notes**:
- Status badge uses ⏰ icon + "Pesanan Kadaluarsa" label.
- Explanation box uses `surfaceSubtle` (#242D35) background with `color` (#F0F4F8) text.
- Include specific dates/times (created, deadline, expired).
- "Buat Pesanan Baru" is the primary action (prominent, cyan color).
- "Lihat Detail" is secondary (view-only, no edit/pay options).
- Order summary is read-only (no modification allowed).

### 5.3 Reorder Flow

**Pattern**: One-tap reorder with pre-filled items and address.

```
Step 1: User clicks "Buat Pesanan Baru" on expired order
        ↓
Step 2: App creates new order with same items
        ↓
Step 3: Pre-fill address from expired order (user can change)
        ↓
Step 4: Show order summary with "Lanjutkan ke Pembayaran" button
        ↓
Step 5: Proceed to payment (Midtrans Snap)
```

**Design Notes**:
- Reorder should be a single tap (not a multi-step wizard).
- Pre-fill items, quantities, and address from the expired order.
- Allow user to modify address/items before checkout.
- Show a confirmation: "Pesanan baru dibuat. Silakan lanjutkan pembayaran."
- New order gets a fresh payment window (e.g., 15 minutes from Midtrans).

---

## 6. Order Lifecycle State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    ORDER LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │ Order Created    │
                    │ (AWAITING_PAYMENT)
                    └────────┬─────────┘
                             │
                    ┌────────▼────────┐
                    │ Payment Window  │
                    │ Active (15 min) │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
        ┌───────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
        │ Payment      │ │ Payment │ │ Payment     │
        │ Successful   │ │ Failed  │ │ Timeout     │
        │ (PROCESSING) │ │ (FAILED)│ │ (EXPIRED)   │
        └───────┬──────┘ └────┬────┘ └──┬──────────┘
                │             │         │
        ┌───────▼──────┐      │    ┌────▼──────────┐
        │ Order        │      │    │ User can:     │
        │ Processing   │      │    │ • View order  │
        │ (PROCESSING) │      │    │ • Reorder     │
        └───────┬──────┘      │    │ • NOT pay     │
                │             │    │ • NOT modify  │
        ┌───────▼──────┐      │    └────┬──────────┘
        │ Order        │      │         │
        │ Completed    │      │    ┌────▼──────────┐
        │ (COMPLETED)  │      │    │ Expired Order │
        └──────────────┘      │    │ (EXPIRED)     │
                              │    └───────────────┘
                    ┌─────────▼────────┐
                    │ User can retry   │
                    │ payment or       │
                    │ create new order │
                    └──────────────────┘
```

---

## 7. Acceptance Criteria

- **AC-001**: Given an order with expired payment window, When user views order list, Then expired orders appear in a separate "Kadaluarsa" tab/section, not in "Aktif" tab.

- **AC-002**: Given an expired order detail page, When user views the page, Then a clear explanation appears stating: order creation date, payment deadline, expiration date, and "Anda tidak lagi dapat membayar pesanan ini."

- **AC-003**: Given an expired order, When user clicks "Buat Pesanan Baru", Then a new order is created with the same items, pre-filled address, and user is directed to checkout.

- **AC-004**: Given an expired order, When user attempts to pay, Then payment button is disabled/hidden with message "Pesanan ini telah kadaluarsa. Silakan buat pesanan baru."

- **AC-005**: Given an expired order, When user views the order, Then status badge displays "⏰ Pesanan Kadaluarsa" in muted colors (not red/error).

- **AC-006**: Given an expired order, When user views order summary, Then all fields are read-only (no edit, delete, or modify options).

- **AC-007**: Given a user with multiple expired orders, When user filters by "Kadaluarsa" tab, Then all expired orders are displayed with most recent expiration first.

- **AC-008**: Given an expired order, When user views the detail page, Then the original order ID is preserved and visible for reference.

---

## 8. Implementation Checklist

### Backend (Order Service)

- [ ] Add `EXPIRED` status to order status enum
- [ ] Implement order expiration logic (check payment window against current time)
- [ ] Add `expired_at` timestamp field to orders table
- [ ] Create API endpoint to filter orders by status (including EXPIRED)
- [ ] Implement reorder endpoint that creates new order from expired order
- [ ] Add database migration for new fields
- [ ] Implement webhook handler for Midtrans expiration notifications

### Frontend (React Native/Tamagui)

- [ ] Create `OrderStatusBadge` component with icon + label
- [ ] Update `OrderListScreen` to show separate "Kadaluarsa" tab
- [ ] Create `ExpiredOrderExplanation` component with clear messaging
- [ ] Update `OrderDetailScreen` to show explanation for expired orders
- [ ] Disable payment button for expired orders
- [ ] Implement "Buat Pesanan Baru" action (reorder flow)
- [ ] Add `expired_at` timestamp display on order detail
- [ ] Update order filtering logic to exclude expired from "Aktif" tab
- [ ] Add analytics events: `expired_order_viewed`, `reorder_clicked`, `reorder_completed`

### Testing

- [ ] Unit tests for order status logic
- [ ] Integration tests for reorder flow
- [ ] UI tests for expired order display
- [ ] E2E test: Create order → Wait for expiration → Verify status → Reorder

### Localization

- [ ] Verify Indonesian translations for all labels
- [ ] Test on Indonesian locale
- [ ] Verify date/time formatting for Indonesian users

---

## 9. Color & Typography Specifications

### Colors (Dark Mode)

| Element | Color Token | Hex | Usage |
|---------|-------------|-----|-------|
| Expired order card background | `surfaceElevated` | #2D3A44 | Card container |
| Expired order text | `colorMuted` | #7A8A9A | "Kadaluarsa X hari yang lalu" |
| Explanation box background | `surfaceSubtle` | #242D35 | Info/explanation container |
| Explanation box text | `color` | #F0F4F8 | Primary text in explanation |
| Reorder button | `primary` | #06B6D4 | CTA button |
| Icon (⏰) | `colorMuted` | #7A8A9A | Status icon |

### Typography

- **Status Label**: Poppins 14px, weight 600, `colorMuted`
- **Explanation Text**: Poppins 14px, weight 400, `color`
- **Order ID**: Poppins 16px, weight 600, `color`
- **Timestamp**: Poppins 12px, weight 400, `colorMuted`

---

## 10. Examples & Edge Cases

### Example 1: Typical Expired Order Flow

```
User creates order at 10:00 AM
Payment window: 15 minutes (Midtrans default)
Deadline: 10:15 AM

User forgets to pay.

At 10:16 AM:
- Order status changes to EXPIRED
- Order moves from "Aktif" to "Kadaluarsa" tab
- User receives notification (optional): "Pesanan Anda telah kadaluarsa"

User opens app at 2:00 PM:
- Sees order in "Kadaluarsa" tab
- Clicks "Buat Pesanan Baru"
- New order created with same items
- New payment window: 2:00 PM - 2:15 PM
- User completes payment
- Original order remains in database (EXPIRED status)
- New order proceeds to PROCESSING
```

### Example 2: Multiple Expired Orders

```
User has 5 expired orders from different dates.

Order List View:
┌─────────────────────────────────┐
│ [Aktif] [Kadaluarsa] [Selesai]  │
│                                 │
│ Kadaluarsa (5)                  │
│ ─────────────────────────────── │
│ • Pesanan #12345 (5 hari lalu)  │
│ • Pesanan #12344 (3 hari lalu)  │
│ • Pesanan #12343 (2 hari lalu)  │
│ • Pesanan #12342 (1 hari lalu)  │
│ • Pesanan #12341 (6 jam lalu)   │
└─────────────────────────────────┘

Sorted by expiration date (most recent first).
```

### Example 3: Edge Case - User Pays After Expiration

```
Order created: 10:00 AM
Payment deadline: 10:15 AM
User attempts payment at 10:20 AM (5 minutes late)

Midtrans response: "Transaction expired"
Order status: EXPIRED (not PAYMENT_FAILED)
User sees: "Pesanan Kadaluarsa" with explanation
User action: Click "Buat Pesanan Baru" to retry
```

### Example 4: Edge Case - Reorder with Out-of-Stock Items

```
User clicks "Buat Pesanan Baru" on expired order.
Original order had: Obat A (in stock), Obat B (now out of stock)

Reorder flow:
1. New order created with both items
2. System detects Obat B is out of stock
3. Show warning: "Obat B tidak tersedia. Silakan pilih alternatif atau hapus dari pesanan."
4. User can:
   - Remove Obat B
   - Choose alternative product
   - Proceed with Obat A only
5. User completes checkout with available items
```

---

## 11. Related Specifications & Further Reading

- **Saleor Order Expiration**: https://docs.saleor.io/developer/order/order-expiration
- **Midtrans Transaction Expiration**: https://docs.midtrans.com/reference/expire-transaction
- **WooCommerce Order Status**: https://woocommerce.com/document/managing-orders/order-statuses/
- **Reorder Flow UX (2026)**: https://ecomdesignpro.com/reorder-flow-ux/
- **App Color System**: See `tamagui.config.ts` and `constants/ui.ts` (dark-mode palette)

---

## 12. Appendix: Comparison with Major Platforms

### Tokopedia

- **Status Label**: "Menunggu Pembayaran" (Waiting for Payment) → "Pesanan Dibatalkan" (Order Cancelled) after expiration
- **Pattern**: Expired orders move to "Riwayat" (History) section
- **Reorder**: Available via "Beli Lagi" (Buy Again) button
- **Lesson**: Separate expired from active orders; provide easy reorder path

### Shopee

- **Status Label**: "Chờ Thanh Toán" (Waiting for Payment) → "Đã Hủy" (Cancelled) after expiration
- **Pattern**: Expired orders appear in order history with clear cancellation reason
- **Reorder**: Available via "Mua Lại" (Buy Again) button
- **Lesson**: Clear cancellation reason; prominent reorder action

### Amazon

- **Status Label**: "Pending" → "Cancelled" (if payment not received within window)
- **Pattern**: Cancelled orders appear in order history with reason
- **Reorder**: Available via "Buy Again" button on order detail
- **Lesson**: Minimal status labels; focus on reorder convenience

### Recommendation for Pharmacy App

Adopt a **hybrid approach**:
1. Use a distinct "Pesanan Kadaluarsa" status (not "Dibatalkan") to preserve order history
2. Separate expired orders into a dedicated tab/section (like Tokopedia)
3. Provide prominent "Buat Pesanan Baru" action (like Shopee/Amazon)
4. Include clear explanation of why order expired and what user can do next

---

**End of Specification**
