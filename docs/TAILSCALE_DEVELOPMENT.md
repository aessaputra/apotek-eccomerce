# Tailscale Development Setup

Panduan menggunakan Tailscale untuk remote development dengan Expo.

## Prasyarat

1. Install Tailscale di machine development:

   ```bash
   # macOS
   brew install tailscale

   # Linux
   curl -fsSL https://tailscale.com/install.sh | sh

   # Windows: Download dari https://tailscale.com/download
   ```

2. Login ke Tailscale:

   ```bash
   tailscale up
   ```

3. Pastikan development build sudah terinstall di device target

## Cara Penggunaan

### 1. Dapatkan IP Tailscale

```bash
tailscale ip -4
# Output: 100.x.x.x
```

### 2. Start Development Server

**Opsi A: Pakai Script (Otomatis)**

```bash
npm run dev:tailscale
```

**Opsi B: Dengan IP Manual**

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=100.x.x.x npx expo start --lan
```

**Output yang diharapkan:**

```
› Metro waiting on exp+apotek-ecommerce://expo-development-client/?url=http%3A%2F%2F100.x.x.x%3A8081
› Scan the QR code above to open the project in a development build
› Using development build
› Press w │ open web
```

### 3. Connect dari Device

**Untuk device di jaringan Tailscale yang sama:**

1. Buka **Tailscale app** di device → pastikan connected
2. Buka **development build** app
3. Scan QR code yang muncul di terminal
4. Atau masukkan URL manual: `exp+apotek-ecommerce://expo-development-client/?url=http://100.x.x.x:8081`

## Scripts yang Tersedia

| Script                          | Fungsi                                          |
| ------------------------------- | ----------------------------------------------- |
| `npm run dev:tailscale`         | Start Expo dengan Tailscale IP (semua platform) |
| `npm run dev:tailscale:android` | Start Expo dengan Tailscale (Android only)      |
| `npm run dev:tailscale:ios`     | Start Expo dengan Tailscale (iOS only)          |

## Troubleshooting

### QR Code muncul tapi device tidak connect

```bash
# Cek status Tailscale
tailscale status

# Pastikan device target online
tailscale ping nama-device

# Cek firewall port 8081
sudo ufw status
sudo ufw allow 8081/tcp  # Jika perlu
```

### Hot reload tidak berfungsi

```bash
# Tambah timeout lebih lama
REACT_NATIVE_PACKAGER_TIMEOUT=60000 npm run dev:tailscale

# Atau clear cache
npm run dev:tailscale -- --clear
```

### Android tidak bisa connect

Konfigurasi network security sudah disetup di `android/app/src/debug/res/xml/network_security_config.xml`. Pastikan:

1. Development build menggunakan profile `development` (bukan production)
2. Build ulang development build setelah pull latest changes:
   ```bash
   npm run dev:build:mobile
   ```

### iOS tidak bisa connect

Konfigurasi ATS (App Transport Security) sudah ditambahkan di `app.config.ts`. Pastikan:

1. Prebuild iOS project (jika belum ada):
   ```bash
   npx expo prebuild --platform ios
   # atau
   npm run ios
   ```
2. Build ulang development build setelah changes

### Hot reload tidak berfungsi

```bash
# Tambah timeout lebih lama
REACT_NATIVE_PACKAGER_TIMEOUT=60000 npm run dev:tailscale

# Atau clear cache
npm run dev:tailscale -- --clear

# Cek koneksi Tailscale
tailscale status
tailscale ping <device-name>
```

## Tips

1. **Static IP**: Gunakan Tailscale's "disable key expiry" untuk IP yang tidak berubah
2. **Magic DNS**: Bisa juga pakai hostname Magic DNS:
   ```bash
   REACT_NATIVE_PACKAGER_HOSTNAME=mydevice.tailscale.net npm run dev:tailscale
   ```
3. **Team Development**: Share QR code via screenshot atau copy URL untuk tim

## Perbandingan Mode

| Mode                      | Use Case                                           |
| ------------------------- | -------------------------------------------------- |
| `npm run dev`             | Semua device di WiFi yang sama                     |
| `npm run dev:tailscale`   | Device beda network/VPN (internet berbeda)         |
| `npx expo start --tunnel` | Fallback jika Tailscale tidak jalan (lebih lambat) |

## Keuntungan Menggunakan Tailscale

- ✅ **Aman**: Tidak expose port ke public internet
- ✅ **Cepat**: Direct peer-to-peer (bypass relay jika memungkinkan)
- ✅ **Mudah**: Tidak perlu konfigurasi port forwarding
- ✅ **Team-friendly**: Tim bisa akses dev server dari mana saja
- ✅ **Hot reload works**: WebSocket HMR berfungsi normal
