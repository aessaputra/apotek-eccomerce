---
title: Strategi Testing
date: 2026-06-28
tags:
  - testing
  - jest
  - ci-cd
  - tamagui
aliases:
  - Strategi Testing
  - Testing Strategy
---

# Strategi Testing

Dokumen ini memaparkan pendekatan terpusat (*centralized approach*) untuk 
menguji kebenaran basis kode di Apotek E-commerce. Kami menggunakan **Jest** 
bersama dengan utilitas kustom untuk menjamin UI dan logika bisnis (terutama 
kaitan asinkron dan layanan basis data) tidak mengalami kemunduran (*regression*) 
selama pengembangan.

## 1. Tata Letak Terpusat (Centralized Testing)

Berbeda dengan beberapa arsitektur React modern yang meletakkan berkas tes 
bersebelahan dengan berkas kode sumber (di dalam folder fitur), proyek ini 
secara tegas menempatkan seluruh tes ke dalam satu ruang kendali khusus, yaitu 
direktori `__tests__/`.

Struktur di dalam direktori ini merepresentasikan bayangan cermin (*mirror*) 
dari direktori kode sumber yang ada:
- `__tests__/components/` untuk render UI visual Tamagui.
- `__tests__/scenes/` untuk pengujian aliran UI yang sudah dibungkus lengkap.
- `__tests__/services/` untuk menguji abstraksi respons Supabase.

<!-- prettier-ignore -->
> [!warning] Larangan Pembuatan Folder Mocks
> Tim pengembang **dilarang keras** membuat folder *co-located* tes baru 
> maupun menambahkan direktori `__mocks__/` di mana pun. Seluruh *mocking* 
> (*pemalsuan dependensi*) harus dilakukan secara internal (*inline*) menggunakan 
> `jest.mock()` di dalam masing-masing berkas tes.

## 2. Pengerenderan Komponen & Tamagui

Sebagian besar komponen presentasi akan rusak (*crash*) jika diuji murni karena 
ketergantungan mereka terhadap Penyedia Tema dan Area Aman.

Oleh karena itu, setiap kali Anda menguji komponen visual dari folder 
`components/` ataupun menguji layar utuh di `scenes/`, Anda wajib merendernya 
melalui utilitas bungkus khusus: `@/test-utils/renderWithTheme`. Fungsi ini 
bertugas menyuntikkan *Tamagui context* dan abstraksi perangkat seluler yang 
tepat.

## 3. Eksekusi dan Lingkungan Pengaturan

Beberapa konfigurasi lingkungan (seperti *timer* palsu, fungsi-fungsi murni 
perangkat seluler, atau peringatan ikon yang ditahan) sudah diinisialisasi 
sekali untuk selamanya di `jest.setup.js`. Jangan membebani fail utama ini 
dengan *mock* khusus yang hanya dibutuhkan sekali; tempatkan konfigurasi yang 
sangat spesifik langsung di tes terkait.

- **Menjalankan Tes**: Perintah standar `npm run test` akan memvalidasi semua 
  skenario, sementara `npm run test:watch` berguna saat proses penulisan kode.
- **Validasi Berkelanjutan (CI/CD)**: Pengujian Jest merupakan penjaga gawang 
  mutlak. Pada fase prapengiriman kode (*pre-commit*), Husky akan menjalankan 
  `lint-staged` yang kemudian memanggil *suite* Jest secara penuh.

## Referensi Terkait

Dengan memiliki sistem *testing* yang ketat, pengembang lebih percaya diri 
untuk mengubah lapisan-lapisan di bawah ini:

- Menjamin interaksi ke Edge Functions dan Database tetap aman: 
  [[Integrasi Backend Supabase]]
- Memvalidasi pembungkusan rute yang terproteksi: 
  [[Architecture dan Routing]]
- Menguji *state machine* yang rumit seperti Redux / Zustand: 
  [[State Management]]
- Memastikan visual tombol dan formulir ter-render tepat: 
  [[Sistem Desain UI]]
