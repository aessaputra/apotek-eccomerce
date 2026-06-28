---
title: State Management
date: 2026-06-28
tags:
  - state
  - redux
  - zustand
  - react-query
  - hooks
aliases:
  - State Management
  - Manajemen Status
---

# State Management

Dokumen ini menjelaskan strategi manajemen status (*state management*) hibrida 
yang digunakan dalam proyek Apotek E-commerce. Karena aplikasi ini melayani 
berbagai jenis data—mulai dari sesi pengguna, cache server, hingga status alur 
UI (*UI flow state*) yang sempit—kami menggunakan kombinasi Redux Toolkit, 
Zustand, dan TanStack React Query agar masing-masing *library* menangani apa 
yang paling sesuai dengan spesifikasinya.

## 1. Redux Toolkit (Global & Auth State)

Redux Toolkit diposisikan sebagai sumber kebenaran tunggal (*Single Source of 
Truth*) untuk status global yang paling krusial dan digunakan di seluruh 
komponen aplikasi, terutama status otentikasi.

- **Lokasi Utama**: `utils/store.ts` dan *slices* di folder `slices/`.
- **Penggunaan Utama**: Menyimpan profil pengguna, token sesi yang divalidasi, 
  dan *cache* level aplikasi yang membutuhkan ketersediaan sinkron 
  (*synchronous*).
- **Middleware**: Pada *environment* pengembangan (`Env.dev`), *store* 
  diperluas dengan `redux-logger` untuk mempermudah pelacakan mutasi aksi.

<!-- prettier-ignore -->
> [!note] Eksekusi AuthProvider
> Penyedia sesi (`providers/AuthProvider.tsx`) bertugas memvalidasi profil dan 
> mengirim (*dispatch*) status otentikasi ke Redux. Ingatlah bahwa *callbacks* 
> *listener* otentikasi menggunakan `setTimeout(0)` untuk menghindari *deadlock* 
> pada pustaka GoTrue saat proses pertukaran kode OAuth.

## 2. Zustand (Local Workflow State)

Zustand disediakan untuk kebutuhan manajemen status *state-machine* yang sempit 
dan tidak perlu membebani memori global secara konstan.

- **Lokasi Utama**: Direktori `stores/` (contoh: `areaPickerStore.ts`).
- **Penggunaan Utama**: Mengelola alur (*workflow*) multi-langkah yang rumit 
  di mana status tidak bisa hanya disimpan di komponen lokal (*local state*), 
  seperti proses *area-picker* berjenjang (Provinsi → Kota → Kecamatan).

<!-- prettier-ignore -->
> [!warning] Batasan Zustand
> Jangan jadikan Zustand sebagai pengganti Redux untuk data pengguna utama. 
> Gunakan secara taktis hanya untuk komponen yang butuh berbagi status khusus 
> di dalam satu domain fitur (*feature domain*).

## 3. TanStack React Query (Server-State Caching)

React Query secara global membungkus aplikasi untuk mengelola *server-state*, 
*fetching*, asinkronisasi, dan strategi *cache*. Namun, mayoritas operasi masih 
banyak dikoordinasi secara manual oleh kaitan khusus (*hooks*) dan Redux.

- **Lokasi Utama**: `providers/QueryProvider.tsx`.
- **Konfigurasi Default**: 
  Satu klien kueri berumur panjang diinstansiasi dengan opsi ketat:
  - `staleTime`: 1 jam (1000 * 60 * 60)
  - `gcTime`: 24 jam
  - `retry`: 2 kali (dengan logika *exponential backoff delay* maksimal 30 detik).

<!-- prettier-ignore -->
> [!important]
> **Dilarang keras** membuat instansiasi `QueryClient` kedua di dalam kode 
> fitur. Selalu daftarkan pembaruan global di `providers/QueryProvider.tsx`.

## 4. Hooks untuk Orkestrasi Asinkron

Alih-alih memanggil Redux, Zustand, atau layanan (*services*) secara langsung 
di dalam komponen presentasi, interaksi *state* dikoordinasikan melalui Hooks.

- **Lokasi Utama**: Folder `hooks/`.
- **Penggunaan Utama**: Kaitan pembantu seperti `useCartCheckout.ts` menyimpan 
  idempotensi pesanan dan perutean token *Snap*, sementara 
  `useNotifications.ts` bertugas menyinkronkan izin *Push Token* dengan status 
  asinkron Supabase.

<!-- prettier-ignore -->
> [!note] Kontrak Publik Hooks
> Kaitan (*hooks*) yang digunakan bersama secara eksplisit mendefinisikan tipe 
> nilai kembali (*return types*) seperti `UseXReturn`. **Jangan pernah** 
> mengabaikan tipe pengembalian yang diekspor (*exported return types*) ini saat 
> menggunakan kaitan di dalam layar (*scenes*).

## Referensi Terkait

Untuk pemahaman menyeluruh tentang bagaimana status ini dikonsumsi oleh UI, 
pelajari dokumen-dokumen berikut:

- Aturan pembagian layar (*scenes*) dan rute yang terlindungi: 
  [[Architecture dan Routing]]
- Langkah-langkah menjalankan server dan *environment variables*: 
  [[Panduan Setup Lokal]]
- Interaksi Supabase (Edge Functions dan DB) dengan *Hooks*: 
  [[Integrasi Backend Supabase]]
- Pembuatan antarmuka visual yang merespons perubahan *state*: 
  [[Sistem Desain UI]]
