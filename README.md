# Apotek Ecommerce

Ini adalah aplikasi *e-commerce* apotek multi-platform yang dibangun dengan
React Native (Expo SDK 54). Aplikasi ini mendukung platform iOS, Android, dan Web.
Proyek ini menggunakan Supabase untuk autentikasi dan layanan *backend*, serta
EAS untuk jalur CI/CD.

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license." />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome!" />
</p>

## Fitur

Aplikasi ini mencakup fitur dan teknologi berikut:

- **Expo SDK 54** dengan React 19.1 dan React Native 0.81.4.
- **New Architecture** diaktifkan secara default.
- **Expo Router v6** untuk *routing* berbasis file dengan navigasi *drawer*
  dan tab.
- **Tema terang dan gelap** dengan deteksi sistem otomatis.
- **Redux Toolkit** untuk manajemen *state* global.
- **Supabase** untuk autentikasi dan layanan *backend*.
- **Manajemen environment** menggunakan dotenvx (dev, preview, prod).
- **Jalur CI/CD** menggunakan EAS Build dan GitHub Actions (*preview channels*).
- **Linting dan pengujian** menggunakan ESLint 9, Prettier, dan Jest.
- **Mode strict** diaktifkan untuk TypeScript.

## Persyaratan

Pastikan Anda memenuhi persyaratan berikut sebelum memulai:

- [Node 20.x atau lebih baru](https://nodejs.org/en)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- [EAS CLI](https://docs.expo.dev/build/setup/) untuk *build* dan *deployment*.

## Memulai cepat (Quick start)

<!-- prettier-ignore -->
> [!NOTE]
> Jika ini adalah pertama kalinya Anda mengatur proyek ini, bacalah panduan
> [GETTING_STARTED.md](./GETTING_STARTED.md) untuk detail tentang lingkungan,
> konfigurasi Supabase, dan cara menjalankan aplikasi.

Ikuti langkah-langkah berikut untuk menjalankan aplikasi secara lokal:

1. Instal dependensi menggunakan perintah `npm install`.
2. Salin file `.env.dev.example` menjadi `.env.dev`.
3. Perbarui `.env.dev` dengan kredensial `EXPO_PROJECT_ID`,
   `EXPO_PUBLIC_SUPABASE_URL`, dan `EXPO_PUBLIC_SUPABASE_KEY` Anda.
4. Jalankan perintah `npm run dev` untuk memulai server lokal.
5. Tekan tombol `i` untuk iOS, `a` untuk Android, atau `w` untuk Web guna
   membuka aplikasi.

## Struktur navigasi

Aplikasi ini menggunakan hierarki navigasi sebagai berikut:

```
Root (Drawer)
├── Home Tab
│   └── Stack
│       ├── Home Screen
│       └── Details Screen
└── Profile Tab
    └── Stack
        ├── Profile Screen
        └── Details Screen
```

## Manajemen state

Aplikasi ini menggunakan Redux Toolkit untuk manajemen *state* global.

- **Slices:** Berada di dalam direktori [slices](./slices).
- **Contoh penggunaan:** Lihat file [app/_layout.tsx](./app/_layout.tsx).
- **Menambah slice baru:** Salin *slice* yang sudah ada, misalnya
  [slices/app.slice.ts](./slices/app.slice.ts), lalu daftarkan di dalam file
  [utils/store.ts](./utils/store.ts).

<!-- prettier-ignore -->
> [!TIP]
> *Logger* Redux aktif di *environment* pengembangan (development). Untuk
> mematikannya, hapus *middleware logger* dari
> [utils/store.ts](./utils/store.ts).

## Tema dan aset

Aplikasi ini menggunakan Tamagui untuk tata letak dan tema.

- **Warna, font, dan gambar:** Berada di direktori [theme](./theme).
- **Kait tema (Theme hook):** Gunakan fungsi
  [hooks/useColorScheme.ts](./hooks/useColorScheme.ts) untuk mendeteksi skema
  warna yang sedang aktif.

## Environment variables

Aplikasi ini mengelola variabel lingkungan (environment variables) untuk berbagai
tahapan (stages).

- **Template:** Gunakan file `.env.dev.example`, `.env.preview.example`, dan
  `.env.prod.example`.
- **Konfigurasi:** Variabel dipetakan di dalam file
  [app.config.ts](./app.config.ts) dan [utils/config.ts](./utils/config.ts).
- **Pengaturan pemilik (Owner):** Pastikan bidang `owner` di dalam file
  [app.json](./app.json) sesuai dengan nama pengguna (username) Expo Anda.
- **Menambah variabel baru:** Tambahkan variabel baru ke dalam bidang `extra`
  di file `app.config.ts`, lalu publikasikan (expose) di `utils/config.ts`.

Untuk memverifikasi konfigurasi Anda, periksa variabel lingkungan di panel bawah
(bottom sheet) saat aplikasi berjalan, atau jalankan perintah
`npm run dev:config:public`.

## Build dan deploy

Bagian ini menjelaskan cara mengonfigurasi kredensial (secrets) dan melakukan
*deployment* aplikasi.

### Pengaturan environment

Ikuti langkah-langkah berikut untuk mengonfigurasi kredensial *environment* Anda:

1. Salin *template* lingkungan (environment) untuk target *build* Anda:

   ```bash
   cp .env.dev.example .env.dev      # Untuk pengembangan lokal
   cp .env.prod.example .env.prod    # Untuk build produksi
   ```

2. Isi semua kredensial wajib di dalam file `.env.dev` maupun `.env.prod`:
   - `GOOGLE_MAPS_API_KEY`: Kunci SDK Maps untuk Android dan iOS.
   - `EXPO_PUBLIC_GOOGLE_API_KEY`: Kunci Places API dan Geocoding API.
   - `EXPO_PUBLIC_SUPABASE_URL`: URL proyek Supabase Anda.
   - `EXPO_PUBLIC_SUPABASE_KEY`: Kunci publik (publishable key) Supabase Anda.

3. Kirim kredensial tersebut ke EAS:

   ```bash
   # Kirim kredensial pengembangan
   npm run dev:secret:push

   # Kirim kredensial produksi
   dotenvx run -f .env.prod -- eas secret:push --scope project --env-file .env.prod --force
   ```

### Target deploy

Perintah-perintah berikut bertugas membuat (*build*) dan mendistribusikan aplikasi
ke target tertentu:

| Target | Perintah | Hasil (Output) |
| --- | --- | --- |
| **Preview APK** (pengujian) | `npm run build:android:preview` | Unduh APK dari dasbor EAS |
| **Production APK** (distribusi)| `npm run build:android:prod` | Unduh APK dari dasbor EAS |
| **Production Web** | `npm run deploy:web:prod` | Aktif di EAS Hosting |

### Alur kerja (workflows) otomatis

Proyek ini menggunakan GitHub Actions untuk integrasi berkelanjutan (CI).

- **Preview:** Mengirim pembaruan (push) ke *branch* `dev` akan memicu *workflow*
  `.eas/workflows/preview.yml` untuk menghasilkan APK Android dan pratinjau Web.
- **Production:** Mengirim pembaruan ke *branch* `main` atau `release/*` akan
  memicu *workflow* `.eas/workflows/release.yml` untuk menghasilkan APK Android
  produksi dan mendistribusikan aplikasi Web.

### Distribusi APK

Karena proyek ini tidak menggunakan Google Play Store, distribusikan file APK
secara langsung kepada pengguna.

1. Buat APK produksi menggunakan perintah `npm run build:android:prod`.
2. Unduh APK dari dasbor EAS atau gunakan tautan kode QR yang disediakan.
3. Bagikan APK tersebut melalui Google Drive, Firebase App Distribution, atau
   menggunakan tautan unduhan langsung.

### Channel preview

Alur kerja (workflow)
[.github/workflows/preview.yml](./.github/workflows/preview.yml) menggunakan
pengaturan `expo-github-action` untuk mengotomatiskan *build* pratinjau setiap
kali ada *pull request*.

1. Hasilkan kredensial `EXPO_TOKEN` dari pengaturan akun Expo Anda.
2. Tambahkan `EXPO_TOKEN` tersebut sebagai rahasia repositori (repository secret)
   di GitHub di bagian **Settings > Secrets and variables > Actions**.
3. Pastikan bidang `name`, `slug`, `owner`, dan `projectId` di file `app.json`
   serta `app.config.ts` sesuai dengan detail proyek EAS Anda.

## Skrip perintah

Gunakan skrip-skrip berikut untuk mengelola siklus pengembangan aplikasi:

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Mulai server pengembangan (dev server) untuk semua platform. |
| `npm run dev:ios` | Mulai server pengembangan untuk iOS. |
| `npm run dev:android` | Mulai server pengembangan untuk Android. |
| `npm run dev:web` | Mulai server pengembangan untuk Web. |
| `npm run dev:doctor` | Jalankan periksa status proyek (Expo doctor). |
| `npm run dev:build:mobile` | Buat client pengembangan iOS dan Android di EAS. |
| `npm run dev:build:web` | Ekspor bundel web statis. |
| `npm run dev:deploy:web` | Buat dan unggah bundel web ke EAS Hosting. |
| `npm run dev:secret:push` | Unggah variabel environment ke secret EAS. |
| `npm run build:android:preview`| Buat file APK Android preview di EAS. |
| `npm run build:android:prod` | Buat file APK Android produksi di EAS. |
| `npm run deploy:web:prod` | Buat dan distribusikan web ke EAS Hosting produksi. |
| `npm run lint` | Jalankan ESLint untuk mencari masalah kode. |
| `npm run format` | Jalankan Prettier untuk memformat kode sumber proyek. |
| `npm run test` | Jalankan rangkaian pengujian Jest. |

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file [LICENSE](./LICENSE)
untuk mendapatkan detail lengkapnya.
