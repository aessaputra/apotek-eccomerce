---
title: Spesifikasi Frontend Checkout & Order - React Native
version: 1.1
status: implementation-guide
date_created: 2026-04-06
date_updated: 2026-04-06
owner: Pharmacy E-Commerce Frontend Team
tags: [frontend, react-native, checkout, orders, ui-ux, implementation]
---

# Spesifikasi Frontend Checkout & Order Flow

## Status Dokumen

| Versi | Tanggal    | Perubahan                                                                                                           |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 1.0   | 2026-04-06 | Initial spec                                                                                                        |
| 1.1   | 2026-04-06 | Update berdasarkan implementasi saat ini - menambahkan bagian "Current Implementation" dan "Implementation Roadmap" |

---

## 1. Tujuan & Scope

### Tujuan

Dokumen ini mendefinisikan spesifikasi teknis untuk:

- **Current State**: Implementasi UI/UX checkout dan order yang sudah ada
- **Target State**: Pengembangan fitur 4 tabs (Belum Bayar, Dikemas, Dikirim, Selesai) dengan filtering

### Scope

**IMPLEMENTED (Current):**

- ✅ Orders list dengan FlatList dan pagination
- ✅ OrderCard dengan status badge
- ✅ Payment scene dengan Midtrans WebView
- ✅ Cart scene dengan checkout flow
- ✅ OrderSuccess scene
- ✅ Services (order, checkout, shipping)

**TO BE IMPLEMENTED:**

- 🔄 OrderStatusTabs dengan 4 kategori
- 🔄 Badge counts per tab
- 🔄 Filter logic untuk setiap tab
- 🔄 OrderDetail scene
- 🔄 StatusBadge reusable component
- 🔄 TrackShipment screen

---

## 2. Current Implementation

### 2.1 Struktur File Existing

```
scenes/
├── orders/
│   ├── Orders.tsx           ✅ Ada - 366 lines
│   └── OrderSuccess.tsx     ✅ Ada - 90 lines
├── cart/
│   ├── Cart.tsx             ✅ Ada - 1013 lines (checkout embedded)
│   └── Payment.tsx          ✅ Ada - 429 lines

services/
├── order.service.ts         ✅ Ada - 434 lines
├── checkout.service.ts      ✅ Ada - 487 lines
└── shipping.service.ts      ✅ Ada - 472 lines

hooks/
└── useOrdersPaginated.ts    ✅ Ada - 290 lines
```

### 2.2 Current Orders Scene Layout

**Layout Saat Ini (Tanpa Tabs):**

```
┌─────────────────────────────────────────┐
│  Pesanan (Header)                       │
├─────────────────────────────────────────┤
│ (Tidak ada tabs - semua order)         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Order #ORD-001                       │ │
│ │ 2 items • Rp 150.000                 │ │
│ │ [Menunggu Pembayaran]               │ │ ← Payment Status Badge
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Order #ORD-002                       │ │
│ │ 1 item • Rp 85.000                   │ │
│ │ [Dikirim]                           │ │ ← Order Status Badge
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Order #ORD-003                       │ │
│ │ 3 items • Rp 250.000                 │ │
│ │ [Selesai]                           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Masalah dengan Layout Saat Ini:**

- Semua order ditampilkan campur (unpaid + shipped + delivered)
- Customer sulit menemukan order yang perlu ditindaklanjuti
- Tidak ada visualisasi jumlah order per status

---

## 3. Target Implementation (4 Tabs)

### 3.1 Orders Scene dengan 4 Tabs

**Target Layout:**

```
┌─────────────────────────────────────────┐
│  Pesanan (Header)                       │
├─────────────────────────────────────────┤
│ [Belum Bayar(2)][Dikemas(1)][Dikirim]  │ ← Horizontal Scrollable Tabs
│                 [Selesai(5)]            │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Order #ORD-001                       │ │
│ │ 2 items • Rp 150.000                 │ │ ← Hanya order Belum Bayar
│ │ [Menunggu Pembayaran] [Bayar]       │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Order #ORD-004                       │ │
│ │ 1 item • Rp 85.000                   │ │
│ │ [Menunggu Pembayaran] [Bayar]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 Tab Definitions

| Tab       | Label       | Filter Logic                                                                        | Badge Count                |
| --------- | ----------- | ----------------------------------------------------------------------------------- | -------------------------- |
| **Tab 1** | Belum Bayar | `payment_status === 'pending'`                                                      | Count of pending payments  |
| **Tab 2** | Dikemas     | `status IN ('processing', 'awaiting_shipment') AND payment_status === 'settlement'` | Count of paid & processing |
| **Tab 3** | Dikirim     | `status === 'shipped'`                                                              | Count of shipped           |
| **Tab 4** | Selesai     | `status === 'delivered'`                                                            | Count of delivered         |

### 3.3 Behavior Requirements

**Ketika Tab Belum Bayar dipilih:**

1. Tampilkan hanya order dengan `payment_status === 'pending'`
2. Badge count menunjukkan jumlah order yang belum dibayar
3. Setiap order card menampilkan tombol "Bayar" untuk navigasi ke payment
4. Pull-to-refresh memuat ulang data untuk tab aktif

**Ketika Tab Dikemas dipilih:**

1. Tampilkan order yang sudah dibayar tapi belum dikirim
2. Status yang masuk: `processing`, `awaiting_shipment`
3. Order dalam tab ini sudah tidak bisa dibatalkan oleh customer

**Ketika Tab Dikirim dipilih:**

1. Tampilkan order dalam perjalanan
2. Tampilkan informasi kurir dan tracking number
3. Tombol "Lacak" untuk melihat detail tracking

**Ketika Tab Selesai dipilih:**

1. Tampilkan order yang sudah diterima
2. Tombol "Beli Lagi" untuk reorder

---

## 4. Implementation Roadmap

### Phase 1: Core Components (Priority: HIGH)

#### 4.1 OrderStatusTabs Component (NEW)

**File:** `components/elements/OrderStatusTabs/OrderStatusTabs.tsx`

```typescript
interface OrderStatusTabsProps {
  activeTab: 'unpaid' | 'packing' | 'shipped' | 'completed';
  counts: {
    unpaid: number;
    packing: number;
    shipped: number;
    completed: number;
  };
  onTabChange: (tab: 'unpaid' | 'packing' | 'shipped' | 'completed') => void;
}

// Usage in Orders.tsx:
<OrderStatusTabs
  activeTab={activeTab}
  counts={{
    unpaid: orders.filter(o => o.payment_status === 'pending').length,
    packing: orders.filter(o => ['processing', 'awaiting_shipment'].includes(o.status)).length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'delivered').length,
  }}
  onTabChange={setActiveTab}
/>
```

**Design Specs:**

- Height: 80px (including badge)
- Background: `$surface` theme color
- Active Tab: Bold text + underline indicator
- Badge: Red circle with white text (max 99+)
- Scroll: Horizontal dengan snap to tab

#### 4.2 Filter Logic (ADD TO Orders.tsx)

```typescript
// Add to Orders.tsx
const [activeTab, setActiveTab] = useState<'unpaid' | 'packing' | 'shipped' | 'completed'>(
  'unpaid',
);

const filteredOrders = useMemo(() => {
  if (!orders) return [];

  switch (activeTab) {
    case 'unpaid':
      // Tab Belum Bayar: payment_status = 'pending'
      return orders.filter(o => o.payment_status === 'pending');

    case 'packing':
      // Tab Dikemas: sudah dibayar, sedang diproses
      return orders.filter(
        o =>
          ['processing', 'awaiting_shipment'].includes(o.status) &&
          o.payment_status === 'settlement',
      );

    case 'shipped':
      // Tab Dikirim: status = 'shipped'
      return orders.filter(o => o.status === 'shipped');

    case 'completed':
      // Tab Selesai: status = 'delivered'
      return orders.filter(o => o.status === 'delivered');

    default:
      return orders;
  }
}, [orders, activeTab]);

// Calculate counts
const counts = useMemo(
  () => ({
    unpaid: orders.filter(o => o.payment_status === 'pending').length,
    packing: orders.filter(
      o =>
        ['processing', 'awaiting_shipment'].includes(o.status) && o.payment_status === 'settlement',
    ).length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'delivered').length,
  }),
  [orders],
);
```

#### 4.3 StatusBadge Component (NEW)

**File:** `components/elements/StatusBadge/StatusBadge.tsx`

```typescript
interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus;
  type: 'order' | 'payment';
}

// Extract from current inline implementation
// Move getStatusColor() logic to this component
```

#### 4.4 OrderCard Component (EXTRACT)

**File:** `components/elements/OrderCard/OrderCard.tsx`

**Current:** Inline di Orders.tsx (lines 50-143)
**Target:** Extract ke component terpisah

```typescript
interface OrderCardProps {
  order: OrderListItem;
  onPress: () => void;
}
```

### Phase 2: OrderDetail Scene (Priority: HIGH)

#### 4.5 OrderDetail Scene (NEW)

**File:** `scenes/orders/OrderDetail.tsx`

**Layout:**

```
┌─────────────────────────────────────────┐
│ ← Order #ORD-001                        │
├─────────────────────────────────────────┤
│ Status: Menunggu Pembayaran            │ ← Status Badge
│ Order Date: 6 Apr 2026                  │
├─────────────────────────────────────────┤
│ 📦 Produk                               │
│ ┌─────────────────────────────────────┐ │
│ │ [IMG] Paracetamol 500mg             │ │
│ │     Rp 25.000 x 2                   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 🚚 Pengiriman                           │
│ JNE Regular                             │
│ Estimasi: 2-3 hari                      │
├─────────────────────────────────────────┤
│ 💳 Pembayaran                           │
│ Metode: GoPay                           │
│ Status: Menunggu Pembayaran             │
├─────────────────────────────────────────┤
│         [Bayar Sekarang]               │ ← Action Button
└─────────────────────────────────────────┘
```

**Action Buttons by Status:**

| Status                  | Primary Action   | Secondary Action |
| ----------------------- | ---------------- | ---------------- |
| `pending` (Belum Bayar) | Bayar Sekarang   | Batalkan         |
| `processing` (Dikemas)  | Hubungi Admin    | -                |
| `shipped` (Dikirim)     | Lacak Pengiriman | -                |
| `delivered` (Selesai)   | Beli Lagi        | -                |

**Route:**

```typescript
// Add to navigation
OrderDetail: {
  orderId: string;
}

// app/orders/[orderId].tsx
export { default } from '@/scenes/orders/OrderDetail';
```

### Phase 3: Additional Features (Priority: MEDIUM)

#### 4.6 TrackShipment Screen (NEW)

**File:** `scenes/orders/TrackShipment.tsx`

**Features:**

- Display courier info (JNE, J&T, etc.)
- Show waybill number
- Tracking timeline from Biteship
- Link to external tracking (if available)

#### 4.7 Route Updates

**Update:** `types/routes.types.ts`

```typescript
export type OrdersStackParamList = {
  index: undefined;
  success: { orderId: string };
  'order-detail': { orderId: string }; // NEW
  'track-shipment': { orderId: string; waybillNumber: string }; // NEW
};
```

---

## 5. State Management Updates

### 5.1 Current: useOrdersPaginated

**File:** `hooks/useOrdersPaginated.ts` ✅ EXISTS

Current implementation fetches all orders without filtering.

### 5.2 Target: useOrdersByTab (NEW)

**File:** `hooks/useOrdersByTab.ts`

```typescript
interface UseOrdersByTabOptions {
  tab: 'unpaid' | 'packing' | 'shipped' | 'completed';
  userId: string;
  page?: number;
  limit?: number;
}

// This hook will:
// 1. Fetch orders from cache or API
// 2. Filter by tab criteria
// 3. Return filtered orders + counts
export const useOrdersByTab = (options: UseOrdersByTabOptions) => {
  const { tab, userId } = options;

  // Reuse useOrdersPaginated for fetching
  const { orders, ...rest } = useOrdersPaginated(userId);

  // Filter by tab
  const filteredOrders = useMemo(() => {
    return filterOrdersByTab(orders, tab);
  }, [orders, tab]);

  // Calculate counts for all tabs
  const counts = useMemo(
    () => ({
      unpaid: orders.filter(o => o.payment_status === 'pending').length,
      packing: orders.filter(
        o =>
          ['processing', 'awaiting_shipment'].includes(o.status) &&
          o.payment_status === 'settlement',
      ).length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      completed: orders.filter(o => o.status === 'delivered').length,
    }),
    [orders],
  );

  return {
    orders: filteredOrders,
    counts,
    ...rest,
  };
};
```

---

## 6. Service Layer (No Changes Needed)

Services sudah lengkap dan tidak perlu perubahan:

- ✅ `order.service.ts` - getOrdersOptimized sudah mendukung pagination
- ✅ `checkout.service.ts` - createCheckoutOrder, createSnapToken, polling
- ✅ `shipping.service.ts` - getShippingRatesForAddress

---

## 7. Implementation Checklist

### Week 1: Components

- [ ] Create `OrderStatusTabs` component
- [ ] Create `StatusBadge` component
- [ ] Extract `OrderCard` from Orders.tsx
- [ ] Add filter logic ke Orders.tsx
- [ ] Test tab switching dan filtering

### Week 2: OrderDetail

- [ ] Create `OrderDetail.tsx` scene
- [ ] Add navigation route
- [ ] Implement action buttons by status
- [ ] Connect ke order service

### Week 3: Polish & Testing

- [ ] Create `useOrdersByTab` hook
- [ ] Add TrackShipment screen
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Performance optimization (memoization)

---

## 8. Testing Requirements

### 8.1 Unit Tests

```typescript
// OrderStatusTabs.test.tsx
describe('OrderStatusTabs', () => {
  it('renders 4 tabs with correct labels', () => {
    render(<OrderStatusTabs {...props} />);
    expect(screen.getByText('Belum Bayar')).toBeTruthy();
    expect(screen.getByText('Dikemas')).toBeTruthy();
    expect(screen.getByText('Dikirim')).toBeTruthy();
    expect(screen.getByText('Selesai')).toBeTruthy();
  });

  it('shows badge counts correctly', () => {
    render(<OrderStatusTabs counts={{ unpaid: 5, packing: 3, shipped: 2, completed: 10 }} />);
    expect(screen.getByText('5')).toBeTruthy(); // Belum Bayar badge
  });

  it('calls onTabChange when tab pressed', () => {
    const onTabChange = jest.fn();
    render(<OrderStatusTabs {...props} onTabChange={onTabChange} />);
    fireEvent.press(screen.getByText('Dikirim'));
    expect(onTabChange).toHaveBeenCalledWith('shipped');
  });
});

// Filter logic test
describe('Order Filtering', () => {
  it('filters unpaid orders correctly', () => {
    const orders = [
      { id: '1', payment_status: 'pending', status: 'pending' },
      { id: '2', payment_status: 'settlement', status: 'processing' },
    ];
    const filtered = filterOrdersByTab(orders, 'unpaid');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });
});
```

### 8.2 Integration Tests

```typescript
// Orders flow test
describe('Orders Tab Flow', () => {
  it('shows only unpaid orders when Belum Bayar tab selected', async () => {
    // 1. Render Orders screen
    // 2. Mock orders with mixed statuses
    // 3. Tap "Belum Bayar" tab
    // 4. Verify only unpaid orders displayed
  });

  it('navigates to OrderDetail when order card pressed', async () => {
    // 1. Render Orders screen
    // 2. Tap order card
    // 3. Verify navigation to OrderDetail with correct orderId
  });
});
```

---

## 9. Performance Considerations

### 9.1 Optimization Strategy

1. **Client-side Filtering**: Filter dilakukan di client setelah fetch (karena data tidak terlalu besar)
2. **Memoization**: Gunakan `useMemo` untuk filtered orders dan counts
3. **Tab Switching**: Instant (no loading) karena data sudah di cache
4. **Badge Counts**: Calculate dari cached orders, tidak perlu API call terpisah

### 9.2 Code Example

```typescript
// Orders.tsx - optimized
const Orders = () => {
  const { orders, isLoading } = useOrdersPaginated(user?.id);
  const [activeTab, setActiveTab] = useState('unpaid');

  // Memoized filtered orders
  const filteredOrders = useMemo(() =>
    filterOrdersByTab(orders, activeTab),
    [orders, activeTab]
  );

  // Memoized counts
  const counts = useMemo(() => ({
    unpaid: orders.filter(o => o.payment_status === 'pending').length,
    packing: orders.filter(o =>
      ['processing', 'awaiting_shipment'].includes(o.status)
    ).length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'delivered').length,
  }), [orders]);

  return (
    <YStack>
      <OrderStatusTabs
        activeTab={activeTab}
        counts={counts}
        onTabChange={setActiveTab}
      />
      <FlatList
        data={filteredOrders}
        // ... rest of FlatList config
      />
    </YStack>
  );
};
```

---

## 10. Acceptance Criteria

### AC-001: Tab Belum Bayar

**Given:** Customer memiliki 2 order belum dibayar dan 3 order lainnya  
**When:** Customer membuka tab "Belum Bayar"  
**Then:**

- Hanya 2 order dengan `payment_status = 'pending'` yang ditampilkan
- Badge count "Belum Bayar" menunjukkan angka 2
- Setiap order menampilkan tombol "Bayar"

### AC-002: Tab Dikemas

**Given:** Customer memiliki 1 order sedang diproses  
**When:** Customer membuka tab "Dikemas"  
**Then:**

- Hanya order dengan `status IN ('processing', 'awaiting_shipment')` yang ditampilkan
- Badge count menunjukkan angka yang sesuai
- Order menampilkan status "Sedang Diproses"

### AC-003: Tab Switching

**Given:** Customer berada di tab "Belum Bayar"  
**When:** Customer tap tab "Dikirim"  
**Then:**

- Tab "Dikirim" menjadi active
- List order langsung update (tanpa loading)
- Hanya order dengan `status = 'shipped'` yang ditampilkan

### AC-004: Navigation ke OrderDetail

**Given:** Customer melihat list order di tab manapun  
**When:** Customer tap OrderCard  
**Then:**

- Aplikasi navigate ke OrderDetail screen
- OrderDetail menampilkan informasi lengkap order
- Action buttons sesuai dengan status order

---

## 11. Related Documents

- [spec-checkout-order-flow.md](./spec-checkout-order-flow.md) - Dokumen utama
- [spec-admin-panel-checkout-order.md](./spec-admin-panel-checkout-order.md) - Admin panel spec
- [services/AGENTS.md](../services/AGENTS.md) - Service layer patterns
- [components/AGENTS.md](../components/AGENTS.md) - Component patterns

---

_Spec ini adalah implementation guide untuk pengembangan fitur 4 tabs. Untuk context lengkap, lihat dokumen utama._
