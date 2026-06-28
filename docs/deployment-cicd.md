---
title: Deployment dan CI/CD
date: 2026-06-28
tags:
  - ci-cd
  - deployment
  - eas
  - github-actions
  - devops
aliases:
  - Deployment
  - CI/CD
  - EAS
  - Build
---

# Deployment dan CI/CD

Dokumen ini menguraikan infrastruktur pengiriman berkelanjutan 
(*Continuous Integration & Deployment*) pada proyek Apotek E-commerce. Untuk 
menghindari penumpukan beban pada satu sistem, kami memisahkan tanggung jawab 
otomatisasi secara ketat antara **GitHub Actions** dan **Expo Application 
Services (EAS)**. 

Pemahaman akan batas wewenang kedua layanan ini sangat penting untuk mencegah 
kesalahan distribusi ke tangan pengguna.

## 1. Pemisahan Wewenang Otomatisasi

Kedua penyedia layanan ini (*GitHub* dan *EAS*) memiliki direktori dan 
tanggung jawab masing-masing yang tidak boleh tumpang tindih.

- **GitHub Actions (`.github/workflows/`)**: Bertanggung jawab penuh sebagai 
  *Quality Gate* (penjaga kualitas). Layanan ini mengeksekusi format pratinjau, 
  pemeriksaan *lint*, dan tes Jest melalui berkas `test.yml`. Selain itu, 
  melalui berkas `preview.yml`, GitHub menangani distribusi pembaruan kecil 
  langsung ke perangkat (*Over-The-Air / OTA Updates*) menggunakan perintah 
  `eas update`.
- **EAS Workflows (`.eas/workflows/`)**: Area ini khusus menangani pembangunan 
  biner aplikasi *Native* (Android APK) yang memakan waktu lama serta *deploy* 
  ke *Web Hosting* EAS. Alur kerja ini tidak berjalan otomatis pada setiap 
  *push*, melainkan dipicu (*triggered*) melalui Dasbor EAS.

<!-- prettier-ignore -->
> [!warning] Larangan Penggabungan
> **Jangan pernah** menempatkan perintah kompilasi biner *Native* Android (`eas 
> build`) di dalam konfigurasi GitHub Actions. Biarkan EAS melakukan tugas berat 
> tersebut di servernya sendiri.

## 2. Pemetaan Lingkungan (Environment Mapping)

Kompilasi OTA maupun kompilasi *Native* beroperasi di bawah pemetaan cabang 
Git (*branch mapping*) yang seragam untuk mencegah kebocoran data lingkungan 
*staging* ke *production*.

| Cabang Git (Branch)  | Profil EAS  | Contoh Env Acuan        | Keterangan               |
| -------------------- | ----------- | ----------------------- | ------------------------ |
| `dev`                | `preview`   | `.env.preview.example`  | Pembaruan harian PR      |
| `main`, `release/**` | `production`| `.env.prod.example`     | Rilis ke klien/toko aplikasi |
| cabang lainnya       | `preview`   | `.env.preview.example`  | Pengujian fitur terisolasi|

## 3. Manajemen Rahasia (Secrets)

Proses otomatisasi memerlukan autentikasi tingkat tinggi baik untuk GitHub 
maupun lingkungan EAS.

Beberapa nilai variabel wajib yang harus disuntikkan (*injected*) secara manual 
di *Settings* GitHub Secrets meliputi: `EXPO_TOKEN` (milik pemegang proyek), 
serta `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_KEY` (karena *app 
config* mewajibkan ketersediaan variabel ini di tahap *bundling* awal).

<!-- prettier-ignore -->
> [!important]
> **Dilarang keras** memasukkan data sensitif apa pun ke dalam catatan 
> *commit* atau berkas contoh seperti `.env.preview.example`. Kelola seluruhnya 
> hanya melalui panel rahasia penyedia layanan (*Secrets Dashboard*).

## 4. Solusi Masalah Khusus (Quirks)

Karena mesin integrasi berkelanjutan (*CI runner*) GitHub biasanya berbasis 
Linux, Anda akan menemukan baris instalasi `lightningcss-linux-x64-gnu 
--save-optional` di `.github/workflows/preview.yml`.

Trik ini harus dibiarkan karena kerangka kerja Tamagui memerlukan perpustakaan 
C++ *native* ini untuk memecah *style* saat proses *bundling* (*tamagui-
compiler*) berlangsung di lingkungan operasi Linux.

## Referensi Terkait

Pelajari bagaimana pengaturan operasi CI/CD ini berdampingan dengan proses 
pengembangan dan pengujian standar Anda:

- Bagaimana GitHub Actions menjalankan eksekusi *lint-staged*: 
  [[Strategi Testing]]
- Apa saja lingkungan variabel yang disimulasikan saat *CI build*: 
  [[Panduan Setup Lokal]]
- Parameter rilis batas layanan backend yang digunakan: 
  [[Integrasi Backend Supabase]]
