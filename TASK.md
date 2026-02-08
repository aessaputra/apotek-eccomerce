# TASK — Apotek Eccomerce

Daftar task pengembangan. Centang saat selesai. **Schema database:** gunakan **Supabase MCP** (list_tables, dll.)

**Catatan:** Frontend ini (React Native Expo) **hanya untuk role customer**. Admin panel sudah terpisah (Refine). Jika user dengan role `admin` login di app ini, tolak dan arahkan ke admin panel.

---

## Setup (sekali jalan)

- [ ] `.env.dev` terisi: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PROJECT_ID`
- [ ] `npm install` dan `npm run dev` jalan (i/a/w)

---

## 1. Auth + Profile

- [ ] Session state: `getSession()` + `onAuthStateChange()` (context atau provider)
- [ ] AppState listener: `startAutoRefresh` / `stopAutoRefresh` saat app active/background
- [ ] Service auth: `signInWithPassword`, `signUp`, `signOut` via `@/services`
- [ ] Screen login & sign up (email + password), pakai `@/theme` dan loading/error
- [ ] **Hanya customer:** setelah login, cek `profiles.role` — jika `admin`, sign out + tampilkan pesan (hanya customer boleh login di app ini; admin pakai panel Refine)
- [ ] Route guard: belum login → auth screen; sudah login (dan role customer) → `/(main)/...`
- [ ] Baca/update `profiles` setelah login (sync dengan `auth.users`)
- [ ] Screen profil: edit profil (nama, telepon, avatar), tombol logout (sign out)

---

## 2. Katalog

- [ ] Service: fetch `categories` dan `products` (+ `product_images`)
- [ ] Screen daftar kategori
- [ ] Screen daftar produk (per kategori)
- [ ] Screen detail produk (gambar, deskripsi, harga, stok, tombol tambah ke keranjang)
- [ ] (Opsional) Search / filter produk di katalog

---

## 3. Keranjang

- [ ] Service: get/create `carts` by `user_id`, CRUD `cart_items`
- [ ] Screen keranjang (list item, total)
- [ ] Tambah ke keranjang dari detail produk, ubah jumlah, hapus item

---

## 4. Alamat & Checkout

- [ ] CRUD `addresses` (form + list alamat)
- [ ] Integrasi Raja Ongkir: pilih provinsi/kota (untuk `province_id`, `city_id`)
- [ ] Screen checkout: pilih alamat, pilih kurir, hitung ongkir
- [ ] Buat `orders` + `order_items` dari keranjang, simpan `shipping_address_id`, `shipping_cost`, `courier_*`

---

## 5. Pembayaran

- [ ] Integrasi Midtrans (order, payment URL/redirect)
- [ ] Simpan `midtrans_order_id`, `midtrans_transaction_id`, `payment_type` di `orders`
- [ ] Webhook/callback: update `payment_status` dan `orders.status`

---

## 6. Riwayat pesanan & tracking

- [ ] Service: fetch `orders` by `user_id` (list + detail dengan `order_items`)
- [ ] Screen daftar pesanan saya (status, total, tanggal)
- [ ] Screen detail pesanan (items, alamat, ongkir, status bayar, status kirim)
- [ ] Lacak pengiriman: tampilkan `waybill_number`, `courier_code`/`courier_service`, link lacak (opsional: deep link ke kurir)

---

## 7. Admin

Admin panel **tidak di app ini** — sudah dibangun terpisah dengan **Refine**. App ini hanya untuk customer (belanja, keranjang, checkout).

---

## Referensi

- **Schema database:** Supabase MCP saja (list_tables, generate_typescript_types, dll.)
- **Setup env & jalankan app:** `GETTING_STARTED.md` (jika ada)
- **Konvensi kode:** `AGENT.md`, `.cursor/rules/coding-guidelines.mdc`
- **Types DB:** `@/types/supabase`; client: `@/services` (supabase)
