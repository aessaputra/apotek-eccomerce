---
title: Integrasi Backend Supabase
date: 2026-06-28
tags:
  - backend
  - supabase
  - edge-functions
  - database
  - realtime
aliases:
  - Integrasi Backend Supabase
  - Supabase
---

# Integrasi Backend Supabase

Dokumen ini menjelaskan batas (*boundary*) interaksi antara aplikasi 
*frontend* Apotek E-commerce dengan layanan *backend* Supabase. Untuk 
memastikan kode klien tetap aman dan terstruktur, semua pemanggilan basis data 
(*database*) dan *Edge Functions* harus difokuskan pada lapisan *service* 
serta tunduk pada batasan keamanan yang ketat.

## 1. Titik Akses Tunggal (Single Entry Point)

File `utils/supabase.ts` adalah satu-satunya tempat di mana *client* Supabase 
diinisialisasi. Instansiasi ini dioptimalkan agar dapat bekerja di lintas 
platform (Web, iOS, Android) menggunakan penyimpanan yang dimodifikasi.

- **Dukungan Penyimpanan Lintas Platform**: *Client* ini menggunakan 
  `LargeSecureStore` pada lingkungan seluler (menggabungkan `SecureStore` 
  dengan enkripsi AES-256 untuk mengakomodasi data *token* berukuran besar) 
  serta penjaga *Server-Side Rendering* (SSR) yang aman untuk *AsyncStorage* di 
  lingkungan Web.
- **Pengetesan Tipe Super Ketat**: Modul ini membaca langsung dari tipe hasil 
  generasi (`types/supabase.ts`) guna menghadirkan keamanan tingkat-tipe 
  (*type-safety*) yang presisi di keseluruhan proyek.

<!-- prettier-ignore -->
> [!important] Aturan Impor Polyfill
> Pemanggilan awal `import '@/utils/cryptoPolyfill'` di `utils/supabase.ts` 
> **harus** tetap berada pada baris pertama dokumen. Menurunkan posisinya akan 
> merusak algoritme PKCE S256 pada saat proses masuk otentikasi.

## 2. Pendelegasian ke Lapisan Services

Aplikasi **dilarang keras** mengeksekusi kueri Supabase (misalnya 
`supabase.from('table').select()`) secara langsung dari komponen UI atau rute.

Setiap pemanggilan harus diarahkan ke berkas spesifik sesuai dengan domain 
bisnisnya di folder `services/`.
- **`checkout.service.ts` & `shipping.service.ts`**: Menangani pemanggilan ke 
  *Edge Functions* pihak ketiga (seperti pesanan, Biteship, atau *Snap Token* 
  Midtrans). Domain-domain ini sangat bergantung pada keberadaan *access token* 
  dengan tenggang keamanan (*safety window*) minimum 60 detik.
- **`order.service.ts`**: Layanan paling rumit yang mengimplementasikan 
  normalisasi rantai model baca (*read-model normalization*) beserta mekanisme 
  mencoba ulang pesanan asinkron yang aman (*abort-aware retry behavior*).
- **`notification.service.ts`**: Mengatur siklus hidup token *Push* serta 
  langganan Realtime Supabase; mematuhi siklus hidup Expo di latar belakang.

## 3. Keamanan dan Manajemen Secrets

Batas pemisahan *repository* (*repository boundary*) sangat dihormati. Seluruh 
skema migrasi, kontrol akses baris (*Row Level Security*), serta *Edge 
Functions* yang sesungguhnya dikelola di repositori *admin-panel* 
(`/home/coder/dev/pharma/admin-panel/supabase`).

<!-- prettier-ignore -->
> [!warning] Jangan Sentuh Secrets Server!
> Aplikasi seluler (*frontend*) ini hanya dirancang untuk menggunakan 
> URL publik dan `anon_key` saja. Jangan pernah memindahkan konfigurasi seperti 
> kunci Midtrans, `service_role`, maupun Biteship ke environment ini. Semua itu 
> menjadi wewenang penuh repositori *admin*.

## 4. Regenerasi Tipe Database

Untuk memastikan sinkronisasi antara sisi klien dan perubahaan di sisi server 
(*admin-panel*), struktur tabel telah dipetakan ke dalam `types/supabase.ts`.

<!-- prettier-ignore -->
> [!note] Regenerasi
> **Jangan pernah mencoba merubah atau menyunting** isi dari `types/supabase.ts` 
> secara manual. Jika skema telah dirubah di *backend*, gunakan perintah 
> regenerasi tipe bawaan Supabase CLI untuk menggantinya secara utuh.

## Referensi Terkait

Pemanggilan *backend* ini akan banyak dikonsumsi oleh lapisan orkestrasi 
lainnya di aplikasi ini. Pelajari bagaimana mereka bekerja sama melalui:

- Bagaimana arsitektur *routing* mencegah pengguna tak berizin: 
  [[Architecture dan Routing]]
- Eksekusi layanan asinkron dengan pengait (*hooks*) Zustand dan Redux: 
  [[State Management]]
- Penyimpanan *environment variables* lokal untuk otentikasi Supabase: 
  [[Panduan Setup Lokal]]
