# Apotek Ecommerce

Aplikasi e-commerce apotek berbasis React Native (Expo SDK 54), dengan dukungan multi-platform (iOS, Android, Web), autentikasi Supabase, dan CI/CD EAS.

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license." />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome!" />
</p>

## Fitur

- **Expo SDK 54** dengan React 19.1 dan React Native 0.81.4
- **New Architecture** diaktifkan
- **Expo Router v6** (file-based routing) dengan drawer dan tab
- **Tema terang/gelap** dengan deteksi otomatis
- **Redux Toolkit** untuk state global
- **Supabase** untuk auth dan backend
- **Environment** dotenvx (dev/preview/prod)
- **CI/CD** EAS Build dan Preview channel (GitHub Actions)
- **ESLint 9**, Prettier, Jest
- **TypeScript** strict mode

## Persyaratan

- [Node 20.x+](https://nodejs.org/en)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- [EAS CLI](https://docs.expo.dev/build/setup/) (untuk build & deploy)

## Quick Start

**Pertama kali?** → Baca **[GETTING_STARTED.md](./GETTING_STARTED.md)** (env, Supabase, menjalankan app).

1. `npm install`
2. Salin `.env.dev.example` ke `.env.dev`, isi `EXPO_PROJECT_ID`, `EXPO_PUBLIC_SUPABASE_URL`, dan `EXPO_PUBLIC_SUPABASE_KEY`
3. `npm run dev` → tekan `i` (iOS), `a` (Android), atau `w` (Web)

## Struktur navigasi

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

## State management (Redux Toolkit)

- Slices: [slices](./slices)
- Contoh penggunaan: [app/_layout.tsx](./app/_layout.tsx)
- Menambah slice: salin [slices/app.slice.ts](./slices/app.slice.ts), daftarkan di [utils/store.ts](./utils/store.ts)

Redux logger aktif di development. Untuk mematikan, hapus logger di [utils/store.ts](./utils/store.ts).

## Theme & aset

- Warna, font, gambar: [theme](./theme)
- Hook tema: [hooks/useColorScheme.ts](./hooks/useColorScheme.ts)

## Environment variables

- Template: `.env.dev.example`, `.env.preview.example`, `.env.prod.example`
- Konfigurasi: [app.config.ts](./app.config.ts), [utils/config.ts](./utils/config.ts)
- Set `owner` di [app.json](./app.json) sesuai username Expo
- Variabel baru: tambah di `app.config.ts` (extra) dan `utils/config.ts`

Verifikasi: tampilan bottom sheet saat app jalan, atau `npm run dev:config:public`.

## Build & deploy

### Environment setup

1. Copy template env:
   ```bash
   cp .env.dev.example .env.dev      # For local development
   cp .env.prod.example .env.prod    # For production build
   ```

2. Fill in all secrets in `.env.dev` and `.env.prod`:
   - `GOOGLE_MAPS_API_KEY` — Maps SDK for Android/iOS
   - `EXPO_PUBLIC_GOOGLE_API_KEY` — Places API (New) + Geocoding API
   - `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_KEY` — Supabase publishable key

3. Push secrets to EAS:
   ```bash
   # Development secrets
   npm run dev:secret:push

   # Production secrets
   dotenvx run -f .env.prod -- eas secret:push --scope project --env-file .env.prod --force
   ```

### Deploy targets

| Target | Command | Output |
|--------|---------|--------|
| **Preview APK** (testing) | `npm run build:android:preview` | APK download from EAS dashboard |
| **Production APK** (distribution) | `npm run build:android:prod` | APK download from EAS dashboard |
| **Production Web** | `npm run deploy:web:prod` | Live on EAS Hosting |

### Automatic workflows

- **Preview** — Push to `dev` branch triggers `.eas/workflows/preview.yml` (Android APK + Web preview)
- **Production** — Push to `main` or `release/*` triggers `.eas/workflows/release.yml` (Android APK + Web production)

### APK distribution (no Play Store)

Since this project has no Play Store budget, distribute APK directly:

1. Build production APK:
   ```bash
   npm run build:android:prod
   ```

2. Download APK from EAS dashboard or use the QR code link

3. Share APK via:
   - Google Drive / Dropbox
   - Firebase App Distribution (free)
   - Direct download link

### Preview channel (PR)

Workflow [.github/workflows/preview.yml](./.github/workflows/preview.yml) memakai [expo-github-action](https://github.com/expo/expo-github-action). Setup:

1. Buat `EXPO_TOKEN` di akun Expo
2. Tambah secret `EXPO_TOKEN` di GitHub (Settings → Secrets and variables → Actions)
3. Pastikan `app.json` dan `app.config.ts` (name, slug, owner, projectId) sesuai project EAS Anda

## Scripts

| Perintah | Keterangan |
|----------|------------|
| `npm run dev` | Dev server (semua platform) |
| `npm run dev:ios` / `dev:android` / `dev:web` | Per platform |
| `npm run dev:doctor` | Cek kesehatan project |
| `npm run dev:build:mobile` | Build iOS/Android development client (EAS) |
| `npm run dev:build:web` | Export web statis |
| `npm run dev:deploy:web` | Build + deploy web ke EAS Hosting (development) |
| `npm run dev:secret:push` | Upload env ke EAS secrets (development) |
| `npm run build:android:preview` | Build Android APK preview (EAS) |
| `npm run build:android:prod` | Build Android APK production (EAS) |
| `npm run deploy:web:prod` | Build + deploy web ke EAS Hosting (production) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Jest |

## Lisensi

MIT. Lihat [LICENSE](./LICENSE).
