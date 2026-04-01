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
- **Environment** dotenvx (dev/staging/prod)
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
2. Salin `.env.dev.example` ke `.env.dev`, isi `EXPO_PROJECT_ID`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, dan `API_URL` jika perlu
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

- Template: `.env.dev.example`, `.env.staging.example`, `.env.prod.example`
- Konfigurasi: [app.config.ts](./app.config.ts), [utils/config.ts](./utils/config.ts)
- Set `owner` di [app.json](./app.json) sesuai username Expo
- Variabel baru: tambah di `app.config.ts` (extra) dan `utils/config.ts`

Verifikasi: tampilan bottom sheet saat app jalan, atau `npm run dev:config:public`.

## Build & deploy

- **Mobile (dev):** `npm run dev:build:mobile`
- **Web:** `npm run dev:build:web` → `npm run dev:serve:web` (uji lokal) → `npm run dev:deploy:web` (EAS Hosting)

## Preview channel (PR)

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
| `npm run dev:build:mobile` | Build iOS/Android (EAS) |
| `npm run dev:build:web` | Export web statis |
| `npm run dev:deploy:web` | Build + deploy web ke EAS Hosting |
| `npm run dev:secret:push` | Upload env ke EAS secrets |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Jest |

## Lisensi

MIT. Lihat [LICENSE](./LICENSE).
