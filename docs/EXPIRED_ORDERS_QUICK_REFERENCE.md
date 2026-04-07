# Expired Orders UX — Quick Reference Card

## 🎯 The Problem
Users see "Menunggu Pembayaran" (Waiting for Payment) on orders that can no longer be paid → confusion & frustration.

## ✅ The Solution
**Separate + Label + Reorder**

---

## 1️⃣ Status Label

### Use: "Pesanan Kadaluarsa" (Order Expired)

```
Indonesian:  Pesanan Kadaluarsa
English:     EXPIRED (backend)
Icon:        ⏰ (clock/timer)
Color:       Muted (#7A8A9A) — NOT red
```

### Why Not Other Labels?
- ❌ "Pembayaran Kadaluarsa" — too technical
- ❌ "Waktu Pembayaran Habis" — too wordy
- ❌ "Pesanan Dibatalkan" — implies user action
- ❌ "Pesanan Tidak Aktif" — too vague

---

## 2️⃣ UI Pattern

### Order List View
```
[Aktif] [Kadaluarsa] [Selesai]  ← Separate tabs
         ↓
⏰ Pesanan Kadaluarsa
├─ Pesanan #12345
│  Rp 250.000 • 3 items
│  Kadaluarsa 2 hari yang lalu
│  [Buat Pesanan Baru] ← CTA
└─ Pesanan #12346
   ...
```

### Order Detail View
```
⏰ Pesanan Kadaluarsa

┌─────────────────────────────────┐
│ Waktu pembayaran telah berakhir │
│                                 │
│ Dibuat: 5 April 2026, 10:00    │
│ Batas: 5 April 2026, 10:15     │
│ Status: Kadaluarsa (2 hari)    │
│                                 │
│ Anda tidak lagi dapat membayar  │
│ pesanan ini. Silakan buat       │
│ pesanan baru untuk melanjutkan. │
└─────────────────────────────────┘

[Buat Pesanan Baru] [Lihat Detail]
```

---

## 3️⃣ Available Actions

### ✅ Allowed
- View order details
- Reorder (Buat Pesanan Baru)
- View order history

### ❌ Disabled
- Pay (payment window closed)
- Edit order (immutable)
- Delete order (audit trail)
- Modify items/address (read-only)

---

## 4️⃣ Reorder Flow

```
Click "Buat Pesanan Baru"
        ↓
Create new order (same items)
        ↓
Pre-fill address (user can change)
        ↓
Show summary → "Lanjutkan ke Pembayaran"
        ↓
Midtrans Snap (new payment window)
        ↓
Original order stays EXPIRED in database
```

---

## 5️⃣ Colors & Typography

| Element | Token | Hex | Size | Weight |
|---------|-------|-----|------|--------|
| Card background | `surfaceElevated` | #2D3A44 | — | — |
| Status label | `colorMuted` | #7A8A9A | 14px | 600 |
| Explanation box | `surfaceSubtle` | #242D35 | — | — |
| Explanation text | `color` | #F0F4F8 | 14px | 400 |
| Reorder button | `primary` | #06B6D4 | — | — |
| Order ID | `color` | #F0F4F8 | 16px | 600 |
| Timestamp | `colorMuted` | #7A8A9A | 12px | 400 |

**Key**: Avoid red/error colors. This is a state change, not an error.

---

## 6️⃣ Comparison with Major Platforms

| Platform | Status | Pattern | Reorder |
|----------|--------|---------|---------|
| **Tokopedia** | "Pesanan Dibatalkan" | Separate "Riwayat" section | "Beli Lagi" |
| **Shopee** | "Đã Hủy" (Cancelled) | Order history | "Mua Lại" |
| **Amazon** | "Cancelled" | Order history | "Buy Again" |
| **Our App** | "Pesanan Kadaluarsa" | Separate "Kadaluarsa" tab | "Buat Pesanan Baru" |

---

## 7️⃣ Implementation Checklist

### Backend
- [ ] Add `EXPIRED` status enum
- [ ] Implement expiration logic
- [ ] Add `expired_at` timestamp field
- [ ] Create filter API endpoint
- [ ] Implement reorder endpoint
- [ ] Add database migration
- [ ] Handle Midtrans webhooks

### Frontend
- [ ] `OrderStatusBadge` component
- [ ] "Kadaluarsa" tab in order list
- [ ] `ExpiredOrderExplanation` component
- [ ] Update order detail screen
- [ ] Disable payment button
- [ ] Implement reorder action
- [ ] Add analytics events
- [ ] Update order filtering

### Testing
- [ ] Unit tests (status logic)
- [ ] Integration tests (reorder)
- [ ] UI tests (display)
- [ ] E2E test (full flow)

---

## 8️⃣ Key Messages

### In-App (Order Detail)
```
Waktu pembayaran telah berakhir

Pesanan ini dibuat pada 5 April 2026, 10:00
Batas waktu pembayaran: 5 April 2026, 10:15
Status: Kadaluarsa (2 hari yang lalu)

Anda tidak lagi dapat membayar pesanan ini.
Silakan buat pesanan baru untuk melanjutkan.
```

### Push Notification (Optional)
```
Pesanan Anda telah kadaluarsa

Pesanan #12345 tidak lagi dapat dibayar.
Tap untuk membuat pesanan baru.
```

---

## 9️⃣ Edge Cases

### Case 1: User Pays After Expiration
```
Midtrans: "Transaction expired"
App: Show "Pesanan Kadaluarsa" + reorder option
```

### Case 2: Reorder with Out-of-Stock Items
```
Original: Obat A (in stock), Obat B (out of stock)
Reorder: Create new order, detect OOS
User: Remove item, choose alternative, or proceed with Obat A only
```

### Case 3: Multiple Expired Orders
```
Display: Sorted by expiration date (most recent first)
Reorder: Each order has independent "Buat Pesanan Baru" button
```

---

## 🔟 Metrics to Track

| Metric | Purpose |
|--------|---------|
| Expired orders per user | How many users have expired orders? |
| Reorder rate | % of expired orders → reorder |
| Time to reorder | How long after expiration? |
| Reorder completion | % of reorders → payment |
| Support tickets | Reduction in "Why can't I pay?" |

---

## 📚 Full Documentation

- **Detailed Spec**: `spec/spec-design-expired-orders-ux.md`
- **Research Summary**: `docs/EXPIRED_ORDERS_RESEARCH.md`
- **This Card**: `docs/EXPIRED_ORDERS_QUICK_REFERENCE.md`

---

**Last Updated**: April 7, 2026  
**Status**: Ready for Implementation  
**Owner**: Product & Design Team
