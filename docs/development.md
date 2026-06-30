---
title: Panduan Setup Lokal
date: 2026-06-28
tags:
  - setup
  - development
  - expo
  - supabase
  - tailscale
aliases:
  - Local Dev Guide
  - Development Setup
---

# Panduan Setup Lokal

Panduan ini membantu Anda mempersiapkan lingkungan lokal dan menjalankan aplikasi 
Apotek E-commerce (Gemini CLI / SiFarma). Anda akan mempelajari konfigurasi 
variabel lingkungan, eksekusi server pengembangan Expo, dan proses build lokal 
untuk platform native Android dan iOS.

## Prasyarat Lingkungan

Pastikan sistem Anda telah terinstal alat-alat berikut sebelum memulai:

- **Node.js**: Wajib menggunakan versi 20.x (disarankan `20.19.4` agar selaras 
  dengan versi Node.js yang digunakan *base image* EAS di `eas.json`).
- **npm**: Ekosistem proyek ini bergantung pada NPM (bukan Yarn atau pnpm). 
  Proyek menggunakan konfigurasi `legacy-peer-deps=true` yang disetel pada file 
  `.npmrc`.
- **Tailscale** (Opsional): Sangat direkomendasikan jika Anda ingin menguji 
  aplikasi di perangkat fisik yang tidak terhubung pada jaringan Wi-Fi lokal 
  yang sama dengan mesin pengembangan.

## 1. Setup Variabel Lingkungan

Aplikasi ini menggunakan beberapa variabel lingkungan untuk menghubungkan sisi 
klien dengan layanan eksternal (Supabase dan Google Maps).

1. Salin file `.env.dev.example` menjadi `.env.dev` di dalam *root* proyek.
2. Buka `.env.dev` menggunakan editor teks Anda.
3. Lengkapi nilai untuk kredensial utama, meliputi `EXPO_PUBLIC_SUPABASE_URL` 
   dan `EXPO_PUBLIC_SUPABASE_KEY` (dari dasbor Supabase Anda), serta 
   `GOOGLE_MAPS_API_KEY` (untuk sisi native) dan `EXPO_PUBLIC_GOOGLE_API_KEY` 
   (untuk *Places API*).

<!-- prettier-ignore -->
> [!warning] Jangan Bocorkan Kredensial Backend
> Kunci seperti `service_role` Supabase, kredensial Midtrans, Biteship, dan 
> akses *database* langsung **hanya boleh diletakkan di backend**. Jangan 
> pernah memasukkannya ke dalam `.env.dev` klien.

## 2. Menjalankan Server Pengembangan

Proyek ini telah dikonfigurasi dengan *wrapper* perintah menggunakan `dotenvx` 
di dalam `package.json` yang akan selalu memuat `.env.dev` ke dalam memori 
dengan prioritas penuh (`-f .env.dev`).

Pilih salah satu dari perintah berikut di terminal Anda:

- **Pemilihan interaktif (Expo CLI)**:
  ```bash
  npm run dev
  ```

- **Langsung membuka Simulator iOS (Debug Configuration)**:
  ```bash
  npm run dev:ios
  ```

- **Langsung membuka Emulator Android (assembleDebug)**:
  ```bash
  npm run dev:android
  ```

## 3. Remote Development melalui Tailscale

Saat Anda perlu menjalankan aplikasi di *smartphone* fisik tetapi tidak 
menggunakan jaringan internet yang sama, Anda dapat memanfaatkan Tailscale.

1. Nyalakan VPN Tailscale di komputer Anda.
2. Jalankan perintah khusus berikut untuk menyuntikkan *hostname*:
  ```bash
  npm run dev:tailscale
  ```

<!-- prettier-ignore -->
> [!note] Mekanisme Hostname
> Skrip `dev:tailscale` akan memanggil `tailscale ip -4` untuk mendeteksi IP 
> Tailscale Anda, lalu menginjeksinya sebagai nilai dari 
> `REACT_NATIVE_PACKAGER_HOSTNAME` (misalnya `100.x.x.x`). Ini akan memaksa 
> aplikasi Expo di ponsel Anda mencari *bundler* melalui *tunnel* VPN tersebut.

## 4. Melakukan Development Build dengan EAS

Beberapa fitur (seperti notifikasi *Push*, Map SDK sisi native, atau modul 
kamera yang disesuaikan) memerlukan kode native yang tidak tersedia dalam 
aplikasi Expo Go biasa. Untuk menguji fitur-fitur ini, Anda harus membuat 
*Development Build*.

1. Publikasikan konfigurasi variabel lokal Anda ke EAS *secrets*:
  ```bash
  npm run dev:secret:push
  ```

2. Picu pembuatan build pengembangan:
  ```bash
  npm run dev:build:mobile
  ```

<!-- prettier-ignore -->
> [!important]
> Konfigurasi *development* di dalam `eas.json` akan memerintahkan EAS untuk 
> membangun paket `simulator` untuk iOS (Debug) dan menggunakan skrip 
> `:app:assembleDebug` untuk Android. Hasilnya bukan versi *production*.

## Referensi Terkait

Untuk pemahaman lebih dalam tentang cara kerja proyek, Anda dapat merujuk ke 
beberapa catatan berikut:

- Bagaimana kami mengatur pembagian antara *App Router* dan folder fitur: 
  [[Architecture dan Routing]]
- Mengapa kami menggunakan Redux bersama dengan Zustand dan React Query: 
  [[State Management]]
- Penjelasan batasan Edge Functions: [[Integrasi Backend Supabase]]
- Membangun antarmuka modern dengan Tamagui: [[Sistem Desain UI]]
