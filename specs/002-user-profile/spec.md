# Feature Specification: Profil Pengguna

**Feature Branch**: `002-user-profile`  
**Created**: 2026-03-07  
**Status**: Implemented  
**Input**: Halaman profil pengguna dengan edit nama, nomor telepon, foto profil, dan logout

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Melihat Profil Saya (Priority: P1)

Sebagai pelanggan yang sudah login, saya ingin melihat informasi profil saya (foto, nama, tanggal bergabung) di tab profil sehingga saya tahu akun saya aktif dan data saya benar.

**Why this priority**: Halaman profil adalah pusat identitas pengguna dan akses ke pengaturan lainnya. Menu navigasi ke fitur profil lainnya berada di sini.

**Independent Test**: Login → ketuk tab "Profil" → lihat foto, nama, tanggal bergabung, dan menu navigasi (Profile Saya, Alamat, Dukungan, Keluar).

**Acceptance Scenarios**:

1. **Given** pelanggan mengetuk tab Profil, **When** halaman dimuat, **Then** avatar, nama lengkap, dan badge "Bergabung [tanggal]" ditampilkan
2. **Given** pelanggan belum memiliki foto profil, **When** halaman dimuat, **Then** avatar menampilkan inisial dari nama
3. **Given** data profil sedang dimuat, **When** halaman dibuka, **Then** loading spinner ditampilkan
4. **Given** pelanggan melihat halaman profil, **When** mengetuk menu item, **Then** navigasi ke halaman tujuan (Edit Profile, Alamat, Dukungan) dengan haptic feedback di native

---

### User Story 2 - Edit Informasi Profil (Priority: P1)

Sebagai pelanggan, saya ingin mengubah nama lengkap dan nomor telepon saya sehingga informasi saya akurat untuk pengiriman dan komunikasi.

**Why this priority**: Informasi profil yang akurat diperlukan untuk pengiriman dan notifikasi. Nama dan telepon adalah data dasar pelanggan.

**Independent Test**: Buka tab Profil → ketuk "Profile Saya" → tap pada field nama → edit di dialog inline → simpan → data diperbarui.

**Acceptance Scenarios**:

1. **Given** pelanggan membuka halaman Edit Profile, **When** halaman dimuat, **Then** data profil saat ini ditampilkan (nama, telepon, email read-only, avatar)
2. **Given** pelanggan mengetuk field nama/telepon, **When** dialog edit inline muncul, **Then** nilai saat ini sudah terisi dan bisa diedit
3. **Given** pelanggan mengubah nama dan mengetuk simpan, **When** request berhasil, **Then** data diperbarui di server dan UI diperbarui secara lokal
4. **Given** email pelanggan, **When** halaman edit ditampilkan, **Then** field email ditampilkan sebagai read-only (tidak bisa diubah)

---

### User Story 3 - Upload Foto Profil (Priority: P2)

Sebagai pelanggan, saya ingin mengubah foto profil saya sehingga identitas saya mudah dikenali.

**Why this priority**: Foto profil meningkatkan personalisasi tetapi bukan blocker untuk transaksi.

**Independent Test**: Buka Edit Profile → ketuk avatar → pilih foto dari galeri → foto diunggah → avatar diperbarui.

**Acceptance Scenarios**:

1. **Given** pelanggan mengetuk avatar di halaman Edit Profile, **When** image picker terbuka, **Then** pelanggan bisa memilih foto dari galeri
2. **Given** pelanggan memilih foto valid (JPG/PNG/WEBP, ≤5MB), **When** upload dimulai, **Then** loading indicator ditampilkan dan foto diunggah ke Supabase Storage bucket 'avatars'
3. **Given** upload berhasil, **When** URL publik didapatkan, **Then** profil diperbarui dengan URL baru dan avatar di UI diperbarui
4. **Given** file tidak valid (format salah/ukuran >5MB), **When** validasi gagal, **Then** pesan error yang spesifik ditampilkan

---

### User Story 4 - Logout (Priority: P1)

Sebagai pelanggan, saya ingin keluar dari akun saya sehingga orang lain tidak bisa mengakses akun saya di perangkat yang sama.

**Why this priority**: Keamanan dasar yang harus ada — pengguna harus bisa menghentikan sesi kapan saja.

**Independent Test**: Buka tab Profil → ketuk "Keluar" → konfirmasi di dialog → diarahkan ke halaman login.

**Acceptance Scenarios**:

1. **Given** pelanggan mengetuk tombol "Keluar", **When** dialog konfirmasi muncul, **Then** ada opsi "Batal" dan "Keluar"
2. **Given** pelanggan mengonfirmasi logout, **When** tombol "Keluar" di dialog ditekan, **Then** data sesi dihapus, data persisten dibersihkan, dan pelanggan diarahkan ke halaman login
3. **Given** pelanggan menekan "Batal", **When** dialog ditutup, **Then** tidak terjadi logout

---

### Edge Cases

- Apa yang terjadi ketika upload foto gagal di tengah proses (jaringan putus)?
- Bagaimana sistem menangani concurrent edit (dua tab/device mengubah profil bersamaan)?
- Apa yang terjadi jika Supabase Storage bucket 'avatars' tidak tersedia?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem HARUS menampilkan halaman profil dengan avatar, nama lengkap, dan badge tanggal bergabung
- **FR-002**: Halaman profil HARUS memiliki menu navigasi ke Edit Profile, Alamat, dan Dukungan dengan haptic feedback
- **FR-003**: Pengguna HARUS bisa mengedit nama lengkap dan nomor telepon melalui dialog inline
- **FR-004**: Field email HARUS ditampilkan sebagai read-only (tidak bisa diubah via profil)
- **FR-005**: Pengguna HARUS bisa mengupload foto profil dari galeri perangkat (JPG/PNG/WEBP, maks 5MB)
- **FR-006**: Sistem HARUS mengupload foto ke Supabase Storage bucket 'avatars' dengan path `{userId}/{timestamp}.{ext}`
- **FR-007**: Avatar HARUS menampilkan inisial nama jika tidak ada foto profil
- **FR-008**: Pengguna HARUS bisa logout dengan dialog konfirmasi
- **FR-009**: Logout HARUS menghapus sesi Supabase dan data persisten lokal, lalu redirect ke login
- **FR-010**: Loading state HARUS ditampilkan saat data profil sedang dimuat

### Key Entities

- **Profile**: Data profil pengguna — nama lengkap, nomor telepon, URL avatar, role, status banned, tanggal bergabung
- **Avatar Storage**: File foto profil — disimpan di bucket 'avatars' di Supabase Storage dengan URL publik

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pelanggan dapat melihat semua info profil dalam waktu kurang dari 2 detik setelah membuka tab
- **SC-002**: Pelanggan dapat mengubah nama/telepon dalam waktu kurang dari 30 detik (ketuk → edit → simpan)
- **SC-003**: Upload foto profil berhasil dalam waktu kurang dari 10 detik untuk file ≤5MB
- **SC-004**: Logout menghapus semua data sesi dan mengarahkan ke halaman login dalam kurang dari 3 detik
