---
title: Sistem Desain UI
date: 2026-06-28
tags:
  - ui
  - design-system
  - tamagui
  - components
  - accessibility
aliases:
  - Sistem Desain UI
  - Tamagui
  - UI Components
---

# Sistem Desain UI

Dokumen ini mendefinisikan standar pembuatan dan pengelolaan komponen antarmuka 
(*User Interface*) pada aplikasi Apotek E-commerce. Kami secara eksklusif 
mengandalkan ekosistem **Tamagui** untuk seluruh primitif tata letak dan desain 
visual demi menjamin performa (*styling* optimal) serta sinkronisasi tema yang 
aman.

## 1. Arsitektur Komponen

Semua elemen presentasional (*presentation-first*) yang dapat digunakan ulang 
wajib berada di dalam folder `components/`. Komponen di sini bertugas menerima 
data yang sudah disiapkan (*prepared data*) via *props*; mereka tidak boleh 
mengambil data langsung dari Supabase.

Direktori `components/` dibagi menjadi sub-lapisan logis berikut:
- **`elements/`**: Katalog antarmuka atomik seperti `FormInput`, 
  `ProductCard`, dan `DotIndicators`. Setiap blok bangunan terkecil harus 
  berada di sini.
- **`layouts/`**: Elemen perancah navigasi (*scaffolding*) seperti 
  `HeaderCartIcon` dan `BottomActionBar`. Komponen `BottomActionBar` ini 
  secara eksklusif mengelola bantalan area aman (*safe-area padding*) dan 
  penahan papan ketik Android (*keyboard anchoring*).
- **Komposit Spesifik**: Fitur kompleks lintas layar seperti `AddressForm/` 
  dan `MapPin/` dikelompokkan ke dalam direktori khusus apabila membutuhkan 
  banyak *sub-file* pendukung.

<!-- prettier-ignore -->
> [!important] Aturan Pengambilan Data
> **Dilarang keras** memanggil [[Integrasi Backend Supabase|layanan Supabase]] 
> atau melakukan *fetching* (*misalnya Google Places*) langsung dari dalam 
> sebuah elemen komponen. Data dan *callback* aksi harus selalu didelegasikan 
> atau diteruskan dari layar induk (atau kaitan /*hooks* terkait).

## 2. Penggunaan Tamagui dan Tema

Aplikasi ini sangat melarang penggunaan pendekatan penataan gaya lawas. Sebagai 
gantinya, Anda dituntut memanfaatkan primitif dari Tamagui (seperti `XStack`, 
`YStack`, `Text`, `Button`, `Card`, dan metode `styled()`).

- **Sikronisasi *Fallbacks***: Apabila Anda menambahkan token baru ke dalam 
  `themes.ts`, Anda **wajib** menyelaraskannya dengan konstanta 
  `THEME_FALLBACKS` dan `DARK_THEME_FALLBACKS` di dalam `constants/ui.ts`.
- **Fungsi Escape Hatch**: Jangan gunakan fungsi pembantu `getThemeColor()` 
  untuk *props* yang sebenarnya sudah didukung token Tamagui. Fungsi ini hanya 
  disediakan sebagai jalur keluar (*escape hatch*) untuk *API* khusus-*native* 
  yang benar-benar tidak mendukung objek bergaya.

<!-- prettier-ignore -->
> [!warning] Larangan Keras
> **Jangan pernah** menggunakan `StyleSheet.create()` dari *React Native* murni 
> ataupun mencoba menginstal pustaka eksternal seperti *NativeWind* / *Tailwind* 
> untuk membangun komponen UI utama.

## 3. Aksesibilitas dan Skeleton State

Karena ini adalah aplikasi berkelas produksi, *Screen Readers* dan navigasi 
alternatif harus diperhatikan secara detail.

1. **Komponen Interaktif**: Kartu (*Cards*) atau tombol yang bisa disentuh wajib 
   menentukan atribut `role` atau `accessibilityRole`, lengkap dengan terjemahan 
   bahasa Indonesia yang sopan pada `accessibilityLabel` atau *hint*.
2. **Status Pemuatan (*Skeleton State*)**: Jika komponen sedang menampilkan 
   *placeholder* pemuatan abu-abu, selalu amankan penampilannya dari narator 
   layar. Komponen bentuk *Skeleton* wajib memakai properti pelindung seperti 
   `accessible={false}`, `aria-hidden`, dan `pointerEvents="none"`.

## Referensi Terkait

Elemen-elemen visual ini diorkestrasi oleh layar utama yang menghubungkan 
komponen murni ini ke siklus logika bisnis aplikasi:

- Bagaimana layar (*scenes*) membungkus komponen antarmuka ini: 
  [[Architecture dan Routing]]
- Mengalirkan pembaruan *state* seperti pemuatan dari *store* global ke UI: 
  [[State Management]]
- Bagaimana menjalankan server lokal untuk menguji komponen visual: 
  [[Panduan Setup Lokal]]
