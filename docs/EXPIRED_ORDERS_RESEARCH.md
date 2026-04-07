# Expired Orders UX Research Summary

**Date**: April 7, 2026  
**Status**: Research Complete  
**Deliverable**: Comprehensive UX specification + implementation guide

---

## Executive Summary

Expired orders are a critical UX problem in e-commerce. When users see "Menunggu Pembayaran" (Waiting for Payment) on an order that can no longer be paid, it creates confusion and frustration. This research provides evidence-based recommendations from major platforms (Tokopedia, Shopee, Amazon) and industry best practices.

**Key Finding**: The solution is NOT to hide expired orders, but to clearly label them, separate them from active orders, and provide a frictionless reorder path.

---

## 1. Recommended Status Label: "Pesanan Kadaluarsa"

### Why This Label?

| Aspect | Details |
|--------|---------|
| **Indonesian** | "Pesanan Kadaluarsa" (Order Expired) |
| **English (Backend)** | `EXPIRED` status |
| **Clarity** | Distinct from "Menunggu Pembayaran" (Waiting for Payment) |
| **Familiarity** | "Kadaluarsa" is commonly used in Indonesian for expired items (food, documents, licenses) |
| **Tone** | Neutral (not error/failure), just a state change |

### Alternatives Considered & Rejected

- ❌ "Pembayaran Kadaluarsa" (Payment Expired) — too technical
- ❌ "Waktu Pembayaran Habis" (Payment Time Ended) — too wordy
- ❌ "Pesanan Tidak Aktif" (Order Inactive) — too vague
- ❌ "Pesanan Dibatalkan" (Order Cancelled) — implies user action, not automatic expiration

---

## 2. UI/UX Pattern: Separate Tabs + Clear Explanation

### Order List View

**Pattern**: Separate tabs for "Aktif" (Active), "Kadaluarsa" (Expired), "Selesai" (Completed)

```
┌─────────────────────────────────────────┐
│ Pesanan (Orders)                        │
├─────────────────────────────────────────┤
│ [Aktif] [Kadaluarsa] [Selesai]         │  ← Tabs
├─────────────────────────────────────────┤
│                                         │
│ ⏰ Pesanan Kadaluarsa                   │  ← Icon + header
│ ─────────────────────────────────────── │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Pesanan #12345                      │ │
│ │ Rp 250.000 • 3 items                │ │
│ │ Kadaluarsa 2 hari yang lalu         │ │  ← Muted text
│ │ [Buat Pesanan Baru]                 │ │  ← CTA button
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Why This Works**:
- ✅ Expired orders are NOT in the default "Aktif" tab (reduces confusion)
- ✅ Users can still find expired orders if needed (separate tab)
- ✅ Clear visual hierarchy with icon + muted colors
- ✅ Prominent "Buat Pesanan Baru" (Create New Order) button

### Order Detail View

**Pattern**: Clear explanation box + prominent reorder action

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
└─────────────────────────────────────────────────────┘
```

**Why This Works**:
- ✅ Specific dates/times (created, deadline, expired) eliminate ambiguity
- ✅ Clear statement: "Anda tidak lagi dapat membayar pesanan ini" (You can no longer pay this order)
- ✅ Direct CTA: "Buat Pesanan Baru" (Create New Order)
- ✅ Read-only order summary (no edit/pay options)

---

## 3. Available Actions for Expired Orders

### ✅ Allowed Actions

| Action | Rationale |
|--------|-----------|
| **View order details** | Users need to reference items, prices, address |
| **Reorder (Buat Pesanan Baru)** | One-tap reorder with pre-filled items + address |
| **View order history** | Audit trail for user reference |

### ❌ Disabled Actions

| Action | Rationale |
|--------|-----------|
| **Pay** | Payment window has closed; Midtrans will reject |
| **Edit order** | Order is immutable once expired |
| **Delete order** | Must preserve for audit/analytics |
| **Modify items/address** | Order is read-only |

---

## 4. Reorder Flow (One-Tap Pattern)

```
User clicks "Buat Pesanan Baru" on expired order
        ↓
App creates new order with same items
        ↓
Pre-fill address from expired order (user can change)
        ↓
Show order summary with "Lanjutkan ke Pembayaran" button
        ↓
Proceed to payment (Midtrans Snap)
        ↓
New order gets fresh payment window (15 minutes)
```

**Key Points**:
- Single tap (not multi-step wizard)
- Pre-fill items, quantities, address
- Allow user to modify before checkout
- New order = new payment window
- Original order remains in database (EXPIRED status)

---

## 5. Color & Typography (Dark Mode)

### Colors

| Element | Token | Hex | Usage |
|---------|-------|-----|-------|
| Expired order card | `surfaceElevated` | #2D3A44 | Card background |
| Expired order text | `colorMuted` | #7A8A9A | "Kadaluarsa X hari yang lalu" |
| Explanation box | `surfaceSubtle` | #242D35 | Info container |
| Explanation text | `color` | #F0F4F8 | Primary text |
| Reorder button | `primary` | #06B6D4 | CTA button |
| Icon (⏰) | `colorMuted` | #7A8A9A | Status icon |

### Typography

- **Status Label**: Poppins 14px, weight 600, `colorMuted`
- **Explanation Text**: Poppins 14px, weight 400, `color`
- **Order ID**: Poppins 16px, weight 600, `color`
- **Timestamp**: Poppins 12px, weight 400, `colorMuted`

**Important**: Avoid red/error colors. Expiration is a state change, not an error.

---

## 6. Comparison with Major Platforms

### Tokopedia

- **Status**: "Menunggu Pembayaran" → "Pesanan Dibatalkan" (Order Cancelled)
- **Pattern**: Expired orders move to "Riwayat" (History) section
- **Reorder**: "Beli Lagi" (Buy Again) button
- **Lesson**: Separate expired from active; easy reorder path

### Shopee

- **Status**: "Chờ Thanh Toán" (Waiting for Payment) → "Đã Hủy" (Cancelled)
- **Pattern**: Expired orders in order history with cancellation reason
- **Reorder**: "Mua Lại" (Buy Again) button
- **Lesson**: Clear reason for cancellation; prominent reorder

### Amazon

- **Status**: "Pending" → "Cancelled"
- **Pattern**: Cancelled orders in order history
- **Reorder**: "Buy Again" button on order detail
- **Lesson**: Minimal status labels; focus on reorder convenience

### Pharmacy App Recommendation

**Hybrid Approach**:
1. Use distinct "Pesanan Kadaluarsa" status (not "Dibatalkan")
2. Separate expired orders into dedicated tab (like Tokopedia)
3. Prominent "Buat Pesanan Baru" action (like Shopee/Amazon)
4. Clear explanation of why order expired + next steps

---

## 7. Industry Best Practices (Saleor, Midtrans, WooCommerce)

### Saleor Commerce

- **Order Expiration**: Configurable (default 360 minutes / 6 hours)
- **Status**: `UNCONFIRMED` → `EXPIRED` → deleted after 30-60 days
- **Stock**: Released when order expires
- **Lesson**: Automatic expiration + cleanup; preserve audit trail

### Midtrans Payment Gateway

- **Payment Window**: Configurable (default 15 minutes)
- **Expiration**: Automatic via `custom_expiry` object
- **Webhook**: Sends `expire` notification when payment window closes
- **Reuse**: Expired `order_id` can be reused for new payment
- **Lesson**: Gateway controls expiration; app must respect and handle notifications

### WooCommerce

- **Status**: "Pending payment" → "Failed" (if payment not received)
- **Pattern**: Manual status updates or plugins for automation
- **Reorder**: "Buy Again" button on order history
- **Lesson**: Clear status progression; easy reorder path

---

## 8. Implementation Checklist

### Backend

- [ ] Add `EXPIRED` status to order status enum
- [ ] Implement order expiration logic (check payment window vs. current time)
- [ ] Add `expired_at` timestamp field to orders table
- [ ] Create API endpoint to filter orders by status
- [ ] Implement reorder endpoint (creates new order from expired order)
- [ ] Add database migration
- [ ] Implement Midtrans webhook handler for expiration notifications

### Frontend (React Native/Tamagui)

- [ ] Create `OrderStatusBadge` component with icon + label
- [ ] Update `OrderListScreen` with "Kadaluarsa" tab
- [ ] Create `ExpiredOrderExplanation` component
- [ ] Update `OrderDetailScreen` for expired orders
- [ ] Disable payment button for expired orders
- [ ] Implement "Buat Pesanan Baru" action
- [ ] Add `expired_at` timestamp display
- [ ] Update order filtering logic
- [ ] Add analytics events: `expired_order_viewed`, `reorder_clicked`, `reorder_completed`

### Testing

- [ ] Unit tests for order status logic
- [ ] Integration tests for reorder flow
- [ ] UI tests for expired order display
- [ ] E2E test: Create order → Wait for expiration → Verify status → Reorder

### Localization

- [ ] Verify Indonesian translations
- [ ] Test on Indonesian locale
- [ ] Verify date/time formatting

---

## 9. Key Metrics to Track

| Metric | Purpose |
|--------|---------|
| **Expired orders per user** | How many users have expired orders? |
| **Reorder rate** | % of expired orders that trigger reorder |
| **Time to reorder** | How long after expiration do users reorder? |
| **Reorder completion rate** | % of reorders that complete payment |
| **Support tickets** | Reduction in "Why can't I pay?" inquiries |

---

## 10. Edge Cases to Handle

### Case 1: User Pays After Expiration

```
Order created: 10:00 AM
Payment deadline: 10:15 AM
User attempts payment at 10:20 AM

Midtrans response: "Transaction expired"
App response: Show "Pesanan Kadaluarsa" with reorder option
```

### Case 2: Reorder with Out-of-Stock Items

```
Original order: Obat A (in stock), Obat B (now out of stock)
Reorder action: Create new order with both items
System detects: Obat B is out of stock
User options: Remove item, choose alternative, or proceed with Obat A only
```

### Case 3: Multiple Expired Orders

```
User has 5 expired orders from different dates
Display: Sorted by expiration date (most recent first)
Reorder: Each order has independent "Buat Pesanan Baru" button
```

---

## 11. Communication Strategy

### In-App Messages

**Expired Order Detail Page**:
```
Waktu pembayaran telah berakhir

Pesanan ini dibuat pada 5 April 2026, 10:00
Batas waktu pembayaran: 5 April 2026, 10:15
Status: Kadaluarsa (2 hari yang lalu)

Anda tidak lagi dapat membayar pesanan ini.
Silakan buat pesanan baru untuk melanjutkan.
```

### Optional: Push Notification (When Order Expires)

```
Pesanan Anda telah kadaluarsa

Pesanan #12345 tidak lagi dapat dibayar.
Tap untuk membuat pesanan baru.
```

### Optional: Email Notification (When Order Expires)

```
Subject: Pesanan Anda Telah Kadaluarsa (#12345)

Halo [User],

Pesanan Anda #12345 telah kadaluarsa dan tidak lagi dapat dibayar.

Pesanan dibuat: 5 April 2026, 10:00
Batas pembayaran: 5 April 2026, 10:15
Status: Kadaluarsa

Anda dapat membuat pesanan baru dengan item yang sama.
[Buat Pesanan Baru]

Terima kasih,
Tim Apotek
```

---

## 12. Related Documentation

- **Full Specification**: `spec/spec-design-expired-orders-ux.md`
- **Saleor Order Expiration**: https://docs.saleor.io/developer/order/order-expiration
- **Midtrans Transaction Expiration**: https://docs.midtrans.com/reference/expire-transaction
- **WooCommerce Order Status**: https://woocommerce.com/document/managing-orders/order-statuses/
- **Reorder Flow UX (2026)**: https://ecomdesignpro.com/reorder-flow-ux/
- **App Color System**: `tamagui.config.ts`, `constants/ui.ts`

---

## 13. Next Steps

1. **Review & Approve**: Share this research with product, design, and engineering teams
2. **Create Tickets**: Break down implementation checklist into JIRA/GitHub issues
3. **Design Mockups**: Create Figma designs for order list + detail views
4. **Backend Implementation**: Add `EXPIRED` status + expiration logic
5. **Frontend Implementation**: Build UI components + reorder flow
6. **Testing**: Unit, integration, E2E, and user testing
7. **Deployment**: Roll out with feature flag (optional)
8. **Monitor**: Track metrics and gather user feedback

---

**Research Completed**: April 7, 2026  
**Specification File**: `spec/spec-design-expired-orders-ux.md`  
**Status**: Ready for Implementation
