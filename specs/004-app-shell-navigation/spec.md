# Feature Specification: App Shell & Navigasi

**Feature Branch**: `004-app-shell-navigation`  
**Created**: 2026-03-07  
**Status**: Implemented  
**Input**: Navigasi aplikasi dan app shell dengan tab bar, auth guard untuk route protection, dark/light mode theming, dan welcome bottom sheet onboarding

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigasi Tab Utama (Priority: P1)

Sebagai pelanggan yang sudah login, saya ingin menavigasi antar bagian utama aplikasi (Beranda, Pesanan, Akun) menggunakan tab bar di bagian bawah layar sehingga saya bisa mengakses semua fitur dengan cepat.

**Why this priority**: Tab bar adalah kerangka navigasi utama aplikasi. Tanpa navigasi yang jelas, pengguna tidak bisa mengakses fitur apapun secara intuitif.

**Independent Test**: Login → lihat tab bar di bawah layar → ketuk setiap tab → pastikan perpindahan halaman sesuai → pastikan tab aktif ditandai secara visual.

**Acceptance Scenarios**:

1. **Given** pelanggan sudah login, **When** halaman utama dimuat, **Then** tab bar ditampilkan di bawah layar dengan 3 tab: Beranda, Pesanan, Akun
2. **Given** pelanggan melihat tab bar, **When** mengetuk tab "Beranda", **Then** halaman Beranda ditampilkan dan ikon tab Beranda ditandai aktif dengan pill indicator
3. **Given** pelanggan melihat tab bar, **When** mengetuk tab "Pesanan", **Then** halaman Pesanan ditampilkan dan ikon tab Pesanan ditandai aktif
4. **Given** pelanggan melihat tab bar, **When** mengetuk tab "Akun", **Then** halaman Akun/Profil ditampilkan dan ikon tab Akun ditandai aktif
5. **Given** pelanggan berada di halaman edit-profile/addresses/address-form, **When** halaman sub-profil terbuka, **Then** tab bar disembunyikan untuk memberikan ruang layar penuh
6. **Given** pelanggan kembali ke halaman profil utama, **When** halaman dimuat, **Then** tab bar ditampilkan kembali

---

### User Story 2 - Auth Guard & Route Protection (Priority: P1)

Sebagai pelanggan yang belum login, saya ingin diarahkan ke halaman login saat mencoba mengakses halaman yang dilindungi sehingga data saya aman dan hanya bisa diakses oleh saya.

**Why this priority**: Route protection adalah fondasi keamanan — tanpa auth guard, pengguna yang tidak terautentikasi bisa mengakses konten pribadi.

**Independent Test**: Buka aplikasi tanpa login → coba akses halaman utama → otomatis diarahkan ke login → login berhasil → diarahkan ke halaman utama.

**Acceptance Scenarios**:

1. **Given** pengguna belum login dan membuka aplikasi, **When** aplikasi mendeteksi tidak ada sesi aktif, **Then** pengguna diarahkan ke halaman login
2. **Given** pengguna sudah login dan masih di halaman auth, **When** auth guard mendeteksi sesi aktif, **Then** pengguna diarahkan ke halaman utama (tabs)
3. **Given** pengguna sudah login dan sedang di proses Google OAuth callback, **When** token exchange selesai, **Then** pengguna diarahkan ke halaman utama
4. **Given** pengguna belum login dan mencoba mengakses rute (main), **When** auth guard berjalan, **Then** pengguna diarahkan ke halaman login tanpa melihat konten yang dilindungi
5. **Given** pengguna sedang di halaman Google OAuth callback, **When** auth guard berjalan, **Then** proses callback tidak diganggu (diizinkan menyelesaikan token exchange)

---

### User Story 3 - Dark/Light Mode Theming (Priority: P2)

Sebagai pelanggan, saya ingin aplikasi secara otomatis menyesuaikan tampilannya (terang/gelap) mengikuti pengaturan sistem perangkat saya sehingga saya nyaman menggunakan aplikasi di berbagai kondisi pencahayaan.

**Why this priority**: Dukungan dark mode meningkatkan kenyamanan pengguna dan aksesibilitas, terutama di malam hari, tetapi bukan blocker untuk fungsionalitas inti.

**Independent Test**: Ubah pengaturan tema perangkat ke mode gelap → buka aplikasi → pastikan seluruh UI menggunakan warna gelap → ubah kembali ke mode terang → pastikan UI berubah.

**Acceptance Scenarios**:

1. **Given** perangkat pengguna menggunakan mode terang, **When** aplikasi dibuka, **Then** seluruh UI ditampilkan dengan tema terang (background putih, teks gelap)
2. **Given** perangkat pengguna menggunakan mode gelap, **When** aplikasi dibuka, **Then** seluruh UI ditampilkan dengan tema gelap (background gelap, teks terang)
3. **Given** pengguna mengubah pengaturan tema perangkat saat aplikasi berjalan, **When** perubahan terdeteksi, **Then** UI secara otomatis beralih ke tema yang sesuai
4. **Given** aplikasi berjalan di web, **When** halaman pertama kali dimuat (hydration), **Then** tema default terang digunakan untuk menghindari FOUC (flash of unstyled content) sebelum hydration selesai
5. **Given** tema aktif (terang/gelap), **When** status bar ditampilkan, **Then** warna status bar menyesuaikan tema (style light di dark mode, dark di light mode)

---

### User Story 4 - Splash Screen & Asset Loading (Priority: P2)

Sebagai pelanggan, saya ingin melihat splash screen yang menarik saat aplikasi memuat data awal sehingga saya tahu aplikasi sedang mempersiapkan diri dan tidak menampilkan halaman kosong.

**Why this priority**: Splash screen memberikan kesan profesional dan menutupi waktu loading aset (font, gambar). Tanpanya, pengguna mungkin melihat layout yang rusak.

**Independent Test**: Buka aplikasi → lihat splash screen → tunggu hingga font & gambar dimuat → splash screen hilang → aplikasi tampil sempurna.

**Acceptance Scenarios**:

1. **Given** pengguna membuka aplikasi, **When** proses inisialisasi dimulai, **Then** splash screen native ditampilkan dan dipertahankan hingga aset siap
2. **Given** font dan gambar sedang dimuat, **When** proses loading berlangsung, **Then** splash screen tetap ditampilkan
3. **Given** semua aset berhasil dimuat dan status auth sudah dicek, **When** keduanya selesai, **Then** splash screen disembunyikan dan konten utama ditampilkan
4. **Given** proses loading aset gagal, **When** error terjadi, **Then** aplikasi tetap melanjutkan (graceful degradation) dan splash screen tetap disembunyikan

---

### User Story 5 - Welcome Bottom Sheet (Priority: P3)

Sebagai pelanggan baru, saya ingin melihat informasi selamat datang saat pertama kali membuka aplikasi sehingga saya tahu aplikasi berfungsi dengan benar dan siap digunakan.

**Why this priority**: Welcome sheet memberikan konfirmasi bahwa setup berhasil dan memberikan informasi environment, tetapi bukan kebutuhan fungsional inti.

**Independent Test**: Buka aplikasi setelah login → bottom sheet "Selamat datang!" muncul → baca informasi → ketuk "OK" → sheet tertutup.

**Acceptance Scenarios**:

1. **Given** pelanggan membuka aplikasi dan auth check selesai, **When** semua aset siap, **Then** welcome bottom sheet muncul dari bawah layar
2. **Given** welcome bottom sheet terbuka, **When** pelanggan membaca informasi, **Then** informasi environment dan variabel konfigurasi yang dimuat ditampilkan
3. **Given** pelanggan mengetuk tombol "OK", **When** tombol ditekan, **Then** bottom sheet tertutup dan pelanggan bisa mulai menggunakan aplikasi

---

### Edge Cases

- Apa yang terjadi ketika deep link membawa pengguna ke rute yang tidak ada (not-found)?
- Bagaimana navigasi menangani race condition saat `onAuthStateChange` triggered bersamaan dengan deep link re-mount?
- Apa yang terjadi jika tab bar perlu merespons perubahan segment secara cepat (rapid tab switching)?
- Bagaimana status bar merespons saat tab bar disembunyikan di halaman sub-profil?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Aplikasi HARUS menampilkan tab bar navigasi dengan 3 tab visible: Beranda, Pesanan, dan Akun
- **FR-002**: Setiap tab HARUS memiliki ikon dan label yang jelas, dengan indikator visual (pill) untuk tab yang aktif
- **FR-003**: Tab bar HARUS disembunyikan saat pengguna berada di halaman edit-profile, addresses, atau address-form
- **FR-004**: Aplikasi HARUS mengarahkan pengguna yang belum login ke halaman login saat mencoba mengakses rute yang dilindungi
- **FR-005**: Aplikasi HARUS mengarahkan pengguna yang sudah login dari halaman auth ke halaman utama
- **FR-006**: Auth guard TIDAK BOLEH menginterupsi proses OAuth callback (google-auth)
- **FR-007**: Redirect navigasi HARUS aman terhadap race condition saat deep link re-mount (menggunakan deferred navigation)
- **FR-008**: Aplikasi HARUS secara otomatis mendeteksi dan menerapkan tema terang/gelap sesuai pengaturan sistem perangkat
- **FR-009**: Tema HARUS diterapkan secara konsisten ke seluruh elemen UI termasuk tab bar, status bar, dan background
- **FR-010**: Di web, aplikasi HARUS menggunakan tema default terang selama hydration untuk menghindari FOUC
- **FR-011**: Splash screen HARUS ditampilkan selama proses loading aset (font, gambar) dan pengecekan status auth
- **FR-012**: Splash screen HARUS disembunyikan hanya setelah aset siap DAN status auth sudah dicek
- **FR-013**: Welcome bottom sheet HARUS muncul setelah splash screen ditutup dan menampilkan informasi environment
- **FR-014**: Aplikasi HARUS menampilkan halaman not-found untuk rute yang tidak valid

### Key Entities

- **Tab Bar**: Elemen navigasi utama — berisi 3 tab visible (Beranda, Pesanan, Akun) dengan ikon, label, dan indikator aktif
- **Auth Guard**: Logika proteksi rute — mengarahkan pengguna berdasarkan status autentikasi (login/belum login)
- **Theme**: Pengaturan tampilan visual — mode terang atau gelap yang mengikuti preferensi sistem perangkat
- **Splash Screen**: Layar pembuka — ditampilkan selama inisialisasi aplikasi (loading aset + pengecekan sesi)
- **Welcome Sheet**: Panel informasi selamat datang — ditampilkan sekali setelah aplikasi siap, berisi informasi environment

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pengguna dapat berpindah antar tab dalam waktu kurang dari 500ms (termasuk transisi visual)
- **SC-002**: 100% pengguna yang belum login diarahkan ke halaman login sebelum melihat konten yang dilindungi
- **SC-003**: Tema aplikasi berubah mengikuti pengaturan sistem perangkat dalam waktu kurang dari 1 detik
- **SC-004**: Splash screen ditampilkan selama loading dan tidak pernah menampilkan layout yang rusak atau kosong
- **SC-005**: Welcome bottom sheet dapat ditutup dalam 1 tap

## Assumptions

- Tema mengikuti preferensi sistem perangkat secara otomatis; tidak ada toggle manual di dalam aplikasi
- Welcome bottom sheet ditampilkan setiap kali aplikasi dibuka (tidak ada mekanisme "hanya tampilkan sekali")
- Tab Cart tersembunyi dari tab bar (href: null) dan akan diaktifkan di fitur selanjutnya
- Auth guard menggunakan deferred navigation (setTimeout 0) untuk menghindari konflik dengan deep link re-mount
