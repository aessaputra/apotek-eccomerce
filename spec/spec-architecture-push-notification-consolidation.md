---
title: E-Commerce Push Notification Consolidation
version: 1.0
date_created: 2026-07-19
owner: Pharmacy App Team
tags: [architecture, design, app, backend]
---

# Introduction

Spesifikasi ini mendefinisikan rencana penggabungan (*consolidation*) sistem push notifikasi transaksional pada aplikasi e-commerce farmasi. Tujuannya adalah mengurangi jumlah notifikasi per transaksi dari 7 notifikasi menjadi **4 notifikasi utama saja** untuk meningkatkan kenyamanan pengguna, dengan tetap menjaga keamanan (*safety*) dan kompatibilitas dengan data historis.

---

## 1. Purpose & Scope

### Tujuan
Mengeliminasi notifikasi transaksional yang redudan dan menggabungkan status pengiriman agar pelanggan tidak menerima terlalu banyak pesan instan (*notification fatigue*).

### Cakupan
1. **Edge Functions (`admin-panel/supabase`)**:
   - Menonaktifkan pembuatan notifikasi saat pesanan mulai diproses (`order_processing`).
   - Menonaktifkan pembuatan notifikasi saat pesanan selesai (`order_completed`).
   - Menyatukan status `shipped` dan `in_transit` ke dalam satu notifikasi `order_shipped` menggunakan format kunci event (`sourceEventKey`) yang seragam untuk mengandalkan batasan unik database (*database unique constraint*).
2. **Frontend App (`frontend`)**:
   - Mempertahankan deklarasi tipe historis di `types/notification.ts` untuk memastikan pembacaan notifikasi lama di inbox tidak rusak (*backward compatibility*).
   - Memperbarui file pengujian terkait.

---

## 2. Definitions

* **CX Notifications**: *Customer Experience Notifications*, notifikasi transaksional terkait pemrosesan dan pengiriman pesanan.
* **Notification Fatigue**: Kejenuhan pengguna akibat terlalu banyak menerima notifikasi yang tidak terlalu penting dalam waktu dekat.
* **sourceEventKey**: Kolom kunci unik di database `notifications` (berbasis indeks `notifications_user_source_event_key_uidx`) untuk mencegah duplikasi notifikasi.

---

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: Sistem **tidak boleh** memicu push notifikasi untuk status `processing` (`order_processing`).
- **REQ-002**: Sistem **tidak boleh** memicu push notifikasi untuk status `completed` (`order_completed`) saat kurir atau pembeli menyelesaikan pesanan.
- **REQ-003**: Sistem **hanya boleh** mengirimkan maksimal satu notifikasi pengiriman (`order_shipped`) untuk rentang status `shipped` dan `in_transit`.
- **REQ-004**: Penggabungan notifikasi pengiriman harus menggunakan `sourceEventKey` yang sama, yaitu `order_shipped_delivery:${orderId}` baik di Biteship webhook maupun di manual order-manager transition.
- **REQ-005**: Notifikasi `payment_settlement`, `payment_failed_or_expired`, `order_awaiting_shipment`, dan `order_delivered_action_required` harus tetap dipertahankan seperti semula.
- **CON-001**: Skema dan tipe data historis di frontend (`types/notification.ts`) harus tetap mendukung jenis `order_processing` dan `order_completed` agar riwayat notifikasi lama di perangkat pengguna tidak mengalami crash saat dibaca.

---

## 4. Interfaces & Data Contracts

### Perubahan Format Kunci Event (`sourceEventKey`)

| Status Sebelumnya | Kunci Event Sebelumnya | Status Baru | Kunci Event Baru |
| :--- | :--- | :--- | :--- |
| `shipped` (manual) | `order_shipped:manual:${orderId}` | `shipped` (manual/webhook) | **`order_shipped_delivery:${orderId}`** |
| `in_transit` (manual) | `order_shipped:in_transit:${orderId}` | `in_transit` (manual/webhook) | **`order_shipped_delivery:${orderId}`** |
| `shipped` (webhook) | `order_shipped:webhook:${orderId}` | | |
| `in_transit` (webhook) | `order_shipped:webhook_in_transit:${orderId}` | | |

Dengan menyamakan kunci event baru menjadi `order_shipped_delivery:${orderId}`, upaya pengiriman notifikasi kedua (misal: transisi dari `shipped` ke `in_transit`) otomatis akan diabaikan oleh database (`insertNotificationOrThrow` akan mendeteksi `duplicate` dan melewatinya secara aman).

---

## 5. Acceptance Criteria

- **AC-001**: 
  - **Given**: Sebuah pesanan selesai dibayar.
  - **When**: Admin mengubah status pesanan menjadi `processing`.
  - **Then**: Tidak ada entri baru dengan tipe `order_processing` di tabel `notifications` dan tidak ada push notifikasi yang dikirim.

- **AC-002**: 
  - **Given**: Sebuah pesanan siap dikirim (`awaiting_shipment`).
  - **When**: Status pesanan berubah menjadi `shipped` lalu berubah lagi menjadi `in_transit`.
  - **Then**: Hanya satu push notifikasi ("Pesanan dikirim") yang diterima pengguna. Upaya notifikasi kedua harus terdeteksi sebagai `duplicate` dan dilewati tanpa error 500.

- **AC-003**: 
  - **Given**: Pengguna mengonfirmasi penerimaan barang di aplikasi mobile.
  - **When**: Aksi `confirm-order-received` diproses.
  - **Then**: Status pesanan berubah menjadi `completed`, tetapi tidak ada push notifikasi `order_completed` yang dikirim ke perangkat pengguna.

---

## 6. Test Automation Strategy

### Unit & Integration Tests (Backend Edge Functions)
- **`order-manager` tests**:
  - Sesuaikan tes transisi status ke `processing` untuk memastikan tidak ada pemanggilan `insertNotificationOrThrow` untuk `order_processing`.
  - Sesuaikan tes transisi ke `shipped`/`in_transit` untuk memverifikasi penggunaan `order_shipped_delivery:${orderId}`.
- **`confirm-order-received` tests**:
  - Sesuaikan tes penyelesaian pesanan untuk memverifikasi pemanggilan `insertNotificationOrThrow` untuk `order_completed` telah dihapus.
- **`biteship-webhook` tests**:
  - Verifikasi payload status `shipped` dan `in_transit` menggunakan `order_shipped_delivery:${orderId}`.

### CI/CD Integration
- Menjalankan unit test lokal melalui `npm run test` di repositori admin-panel dan frontend untuk memastikan semua mock dan fungsi pembantu tetap valid.

---

## 7. Rationale & Context

- **Mengapa menghapus push notifikasi `order_completed`?**
  Aksi penyelesaian pesanan dilakukan secara sadar oleh pengguna saat mereka menekan tombol di layar aplikasi. Mengirimkan push notifikasi ke perangkat yang sama beberapa detik kemudian tidak memberikan informasi baru dan mengganggu kenyamanan.
- **Mengapa menggunakan Database Constraint daripada State Checking di Memory?**
  Menggunakan `sourceEventKey` yang dibatasi oleh indeks unik `notifications_user_source_event_key_uidx` di level database menjamin integritas data secara absolut (*idempotent*), menghindari kondisi balapan (*race conditions*) tanpa perlu membaca status database terlebih dahulu sebelum melakukan insert.

---

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: Biteship Webhook - Mengirimkan update status logistik pengiriman barang.
- **EXT-002**: Midtrans Webhook - Mengirimkan update status sukses/gagal pembayaran.

### Third-Party Services
- **SVC-001**: Expo Push Notification Service - Pengiriman notifikasi ke Apple APNs & Google FCM.

---

## 9. Examples & Edge Cases

### Contoh Penanganan Duplikasi di Edge Function (`biteship-webhook`):
```typescript
// Di biteship-webhook/events/order-status.ts
if (nextStatus === "shipped" || nextStatus === "in_transit") {
  return {
    type: "order_shipped",
    title: nextStatus === "shipped" ? "Pesanan dikirim" : "Pesanan dalam perjalanan",
    body: nextStatus === "shipped" 
      ? "Pesananmu sudah dikirim. Kamu bisa melacak pengiriman dari aplikasi."
      : "Pesananmu sedang dalam perjalanan. Pantau status terbarunya di aplikasi.",
    ctaRoute: TRACK_SHIPMENT_NOTIFICATION_ROUTE,
    data: { orderId, shipmentStage: nextStatus },
    priority: nextStatus === "shipped" ? "high" : "normal",
    sourceEventKey: `order_shipped_delivery:${orderId}`, // Kunci yang seragam
  };
}
```

---

## 10. Validation Criteria

1. Seluruh pengujian di `admin-panel` (`npm run test`) dan `frontend` lulus tanpa kegagalan.
2. Tidak ada perubahan tipe enum di frontend `types/notification.ts` yang dihapus (hanya penghentian produksi data baru dari backend).
3. Pengujian manual menggunakan skenario transisi pesanan di admin-panel menghasilkan tepat 4 notifikasi transaksional dari awal pembayaran hingga tiba di tujuan.
