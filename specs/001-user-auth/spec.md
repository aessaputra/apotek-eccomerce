# Feature Specification: Autentikasi Pengguna

**Feature Branch**: `001-user-auth`  
**Created**: 2026-03-07  
**Status**: Implemented  
**Input**: Autentikasi pengguna apotek e-commerce dengan login email/password, registrasi, dan Google OAuth

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login dengan Email/Password (Priority: P1)

Sebagai pelanggan apotek yang sudah punya akun, saya ingin login menggunakan email dan password sehingga saya bisa mengakses keranjang, pesanan, dan profil saya.

**Why this priority**: Login adalah gerbang utama ke seluruh fitur aplikasi. Tanpa login, pelanggan tidak bisa mengakses fitur apapun yang memerlukan autentikasi.

**Independent Test**: Buka aplikasi → diarahkan ke halaman login → isi email dan password → tekan "Masuk" → berhasil masuk ke halaman utama.

**Acceptance Scenarios**:

1. **Given** pelanggan membuka aplikasi tanpa sesi aktif, **When** halaman dimuat, **Then** pelanggan diarahkan ke halaman login
2. **Given** pelanggan mengisi email dan password yang benar, **When** mengetuk "Masuk", **Then** sesi dibuat dan pelanggan diarahkan ke halaman utama
3. **Given** pelanggan mengisi email/password kosong, **When** mengetuk "Masuk", **Then** pesan error "Email dan password wajib diisi" ditampilkan
4. **Given** pelanggan mengisi email tidak valid, **When** mengetuk "Masuk", **Then** pesan error "Format email tidak valid" ditampilkan dan field email ditandai error
5. **Given** pelanggan mengisi password salah, **When** mengetuk "Masuk", **Then** pesan error dari server ditampilkan (misal "Invalid login credentials")
6. **Given** akun pengguna berstatus banned, **When** login berhasil, **Then** sesi di-logout, dialog "Akun Dinonaktifkan" ditampilkan
7. **Given** akun pengguna berole admin, **When** login berhasil, **Then** sesi di-logout, dialog "Akses Ditolak" ditampilkan (admin tidak boleh masuk via app mobile)

---

### User Story 2 - Registrasi Akun Baru (Priority: P1)

Sebagai pengunjung baru, saya ingin mendaftar menggunakan email dan password sehingga saya bisa mulai berbelanja obat.

**Why this priority**: Registrasi adalah entry point bagi pengguna baru. Tanpa fitur ini, basis pengguna tidak bisa berkembang.

**Independent Test**: Buka halaman login → ketuk "Daftar" → isi form signup → tekan "Buat Akun" → akun terbuat → login otomatis atau diminta verifikasi email.

**Acceptance Scenarios**:

1. **Given** pengunjung membuka halaman signup, **When** mengisi email valid dan password kuat (STRONG), **Then** akun berhasil dibuat
2. **Given** pengunjung mengisi password lemah, **When** indikator kekuatan password ditampilkan, **Then** menunjukkan WEAK (merah), MEDIUM (kuning), atau STRONG (hijau) secara real-time
3. **Given** email sudah terdaftar, **When** mengetuk "Buat Akun", **Then** pesan error yang relevan ditampilkan
4. **Given** registrasi berhasil dengan email confirmation enabled, **When** akun dibuat, **Then** pesan "Periksa email Anda untuk tautan konfirmasi" ditampilkan
5. **Given** registrasi berhasil tanpa email confirmation, **When** akun dibuat, **Then** sesi langsung aktif dan profil otomatis dibuat (role: customer, nama dari email prefix)

---

### User Story 3 - Login dengan Google OAuth (Priority: P1)

Sebagai pelanggan yang ingin proses cepat, saya ingin login/daftar menggunakan akun Google saya sehingga tidak perlu mengingat password terpisah.

**Why this priority**: Google OAuth mengurangi friction registrasi secara signifikan, meningkatkan konversi pengguna baru.

**Independent Test**: Buka halaman login → ketuk "Login dengan Google" → alur OAuth terbuka → pilih akun Google → berhasil login/daftar.

**Acceptance Scenarios**:

1. **Given** pelanggan di halaman login, **When** mengetuk tombol Google OAuth, **Then** alur autentikasi Google terbuka (in-app browser di native, redirect di web)
2. **Given** pelanggan memilih akun Google, **When** otorisasi berhasil, **Then** kode PKCE ditukar untuk sesi, profil dibuat otomatis (nama & avatar dari Google)
3. **Given** pelanggan membatalkan alur OAuth, **When** browser ditutup, **Then** pesan "Login Google dibatalkan" ditampilkan
4. **Given** pelanggan menggunakan web, **When** diarahkan kembali setelah OAuth, **Then** kode PKCE dari URL diproses dan URL dibersihkan

---

### User Story 4 - Persistensi Sesi (Priority: P2)

Sebagai pelanggan yang sudah login, saya ingin sesi saya tetap aktif saat membuka kembali aplikasi sehingga tidak perlu login berulang.

**Why this priority**: Pengalaman pengguna yang mulus — pelanggan tidak ingin login setiap membuka app.

**Independent Test**: Login → tutup aplikasi → buka kembali → masih dalam keadaan login.

**Acceptance Scenarios**:

1. **Given** pelanggan sudah login dan menutup aplikasi, **When** membuka kembali, **Then** sesi otomatis dipulihkan tanpa perlu login ulang
2. **Given** sesi token mendekati expired, **When** aplikasi menjadi aktif kembali, **Then** token di-refresh secara otomatis (native) 
3. **Given** sesi sudah expired dan tidak bisa di-refresh, **When** aplikasi dibuka, **Then** pelanggan diarahkan kembali ke halaman login

---

### Edge Cases

- Apa yang terjadi ketika jaringan putus saat proses OAuth Google?
- Bagaimana sistem menangani race condition saat `onAuthStateChange` dipanggil bersamaan (in-flight dedup di `ensureProfile`)?
- Apa yang terjadi jika Supabase auth trigger untuk membuat profile gagal (fallback ke `ensureProfile` via client)?
- Bagaimana keyboard handling di iOS vs Android saat mengisi form login/signup?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem HARUS mendukung login dengan email dan password melalui Supabase Auth
- **FR-002**: Sistem HARUS mendukung registrasi akun baru dengan validasi email (RFC 5322) dan password
- **FR-003**: Sistem HARUS menampilkan indikator kekuatan password real-time (WEAK/MEDIUM/STRONG)
- **FR-004**: Sistem HARUS mendukung login/registrasi via Google OAuth dengan alur PKCE
- **FR-005**: Alur OAuth HARUS bekerja di native (in-app browser via expo-web-browser) dan web (full-page redirect)
- **FR-006**: Sistem HARUS menyimpan token autentikasi secara terenkripsi (AES-256 via LargeSecureStore)
- **FR-007**: Sistem HARUS otomatis me-refresh token saat aplikasi menjadi aktif kembali (native)
- **FR-008**: Sistem HARUS menolak akses untuk pengguna dengan role admin (menampilkan dialog "Akses Ditolak")
- **FR-009**: Sistem HARUS menolak akses untuk pengguna yang di-ban (menampilkan dialog "Akun Dinonaktifkan")
- **FR-010**: Sistem HARUS membuat profil otomatis untuk pengguna baru (role: customer, nama dari metadata OAuth atau email prefix)
- **FR-011**: Sistem HARUS menampilkan pesan error yang informatif dalam Bahasa Indonesia
- **FR-012**: Pengguna HARUS bisa navigasi antara halaman login dan signup

### Key Entities

- **Auth Session**: Sesi autentikasi pengguna — token akses dan refresh, provider (email/google)
- **Profile**: Data profil pengguna — dibuat otomatis saat registrasi/OAuth pertama kali, berisi role dan status banned

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pengguna dapat menyelesaikan login email/password dalam waktu kurang dari 30 detik
- **SC-002**: Pengguna baru dapat menyelesaikan registrasi dalam waktu kurang dari 1 menit
- **SC-003**: Login Google OAuth berhasil dalam kurang dari 3 kali tap dari halaman login
- **SC-004**: 100% pengguna banned/admin ditolak akses sebelum melihat konten aplikasi
- **SC-005**: Sesi otomatis dipulihkan tanpa login ulang setelah aplikasi ditutup dan dibuka kembali
