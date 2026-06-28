---
title: Struktur Proyek
date: 2026-06-28
tags:
  - architecture
  - structure
  - directory
aliases:
  - Struktur Proyek
  - Project Structure
  - Direktori
---

# Struktur Proyek

Dokumen ini memetakan tata letak direktori tingkat atas (*top-level directory*) 
dari keseluruhan basis kode Apotek E-commerce. Desain struktur ini sengaja 
dibuat sangat modular untuk mencegah komponen UI, logika bisnis, dan konfigurasi 
rute tercampur menjadi satu.

## Peta Direktori Utama

Berikut adalah diagram pohon direktori utama beserta cakupan tanggung jawab 
(*separation of concerns*) masing-masing folder:

```text
/
├── app/                # 🧭 Pembungkus rute Expo Router & Auth Guards
├── scenes/             # 🖼️ Orkestrasi layar penuh & implementasi fitur UI
├── components/         # 🎨 Elemen UI Tamagui & tata letak yang dapat digunakan ulang
├── services/           # 📡 Batas pemanggilan Backend, Supabase, dan Edge Functions
├── hooks/              # 🧠 Orkestrasi status asinkron & aliran (workflow) lokal
├── providers/          # 🏗️ Tumpukan penyedia global (Redux, Tamagui, QueryClient)
├── slices/             # 🍰 Logika State Management Global (Redux Toolkit)
├── stores/             # 📦 Logika State Management Lokal/Spesifik (Zustand)
├── constants/          # 📌 Konstanta domain, ukuran Fitts' Law, dan fallback tema
├── utils/              # 🛠️ Helper infrastruktur (Storage, Formatters, dll)
├── types/              # 🏷️ Kontrak domain, parameter rute, tipe tabel Supabase
├── __tests__/          # 🧪 Pengujian Jest terpusat yang mereplikasi struktur sumber
├── .github/workflows/  # 🤖 Otomatisasi CI GitHub Actions dan rilis OTA EAS Update
├── .eas/workflows/     # ☁️ Alur kerja pembangunan biner Native APK dari server EAS
└── android/            # 🤖 Berkas konfigurasi Native Android (Gradle, Hermes)
```

## Penjelasan Lapisan Penting

Agar tidak terjadi tumpang tindih (*overlap*) peran saat Anda mengembangkan 
fitur baru, pahami batas tegas dari empat area paling penting di bawah ini:

1. **Routing vs Tampilan (`app/` dan `scenes/`)**: Folder `app/` dilarang keras 
   menyimpan logika bisnis maupun komponen UI; ia murni bertindak sebagai 
   pengatur URL/jalur. Keseluruhan tampilan fisik halaman diprogram secara 
   eksklusif di folder `scenes/`.
2. **Lapisan Asinkron (`hooks/` dan `services/`)**: Kapanpun komponen visual 
   di `scenes/` butuh memanggil Supabase, komponen tersebut tidak boleh 
   memanggil `supabase.from(...)` secara langsung. Komponen memanggil *Hooks*, 
   kemudian *Hooks* akan mengorkestrasi pemanggilan ke *Services*.
3. **Katalog Visual (`components/`)**: Dibagi menjadi dua sub-folder utama, 
   yaitu `elements/` untuk komponen berukuran atomik (Tombol, Input), dan 
   `layouts/` untuk komponen pembentuk kerangka navigasi utama (Bottom Tab Bar, 
   Header Utama).
4. **Sentralisasi Tipe (`types/`)**: Segala bentuk kontrak antar-data harus 
   didefinisikan di sini. Secara khusus, file `types/supabase.ts` adalah hasil 
   *auto-generate* dari *backend* Supabase yang sama sekali dilarang untuk 
   diedit secara manual oleh pengembang *frontend*.

## Referensi Terkait

Untuk mendalami aturan main spesifik di tiap direktori utama di atas, silakan 
baca tautan-tautan mendalam berikut:

- Aturan tata letak URL dan *Auth Guard*: [[Architecture dan Routing]]
- Aturan penulisan *Service API* dan akses DB: [[Integrasi Backend Supabase]]
- Pemahaman manajemen global (Redux/Zustand): [[State Management]]
- Panduan menggunakan komponen *Tamagui*: [[Sistem Desain UI]]
- Praktik terbaik untuk uji Jest terpusat: [[Strategi Testing]]
- Alur *deployment* dan beda Git/EAS: [[Deployment]]
