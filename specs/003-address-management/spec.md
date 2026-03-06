# Feature Specification: Manajemen Alamat Pengiriman

**Feature Branch**: `003-address-management`  
**Created**: 2026-03-07  
**Status**: Implemented  
**Input**: Manajemen alamat pengiriman pelanggan dengan CRUD, set default, cascading location picker, dan validasi

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Melihat Daftar Alamat (Priority: P1)

Sebagai pelanggan, saya ingin melihat semua alamat pengiriman saya sehingga saya bisa mengelola alamat mana yang aktif digunakan.

**Why this priority**: Daftar alamat adalah entry point ke seluruh manajemen alamat dan menampilkan alamat mana yang default.

**Independent Test**: Login → tab Profil → ketuk "Alamat" → lihat daftar alamat dengan label default, swipe untuk hapus, tombol tambah alamat baru.

**Acceptance Scenarios**:

1. **Given** pelanggan membuka halaman Alamat, **When** data dimuat, **Then** semua alamat ditampilkan dalam FlatList, diurutkan default terlebih dahulu lalu terbaru
2. **Given** pelanggan memiliki alamat default, **When** daftar ditampilkan, **Then** alamat default ditandai dengan badge/indikator
3. **Given** pelanggan belum memiliki alamat, **When** halaman dimuat, **Then** state kosong ditampilkan dengan ajakan menambah alamat baru
4. **Given** pelanggan menarik layar ke bawah (pull-to-refresh), **When** data di-refresh, **Then** daftar diperbarui dari server

---

### User Story 2 - Menambah Alamat Baru (Priority: P1)

Sebagai pelanggan, saya ingin menambah alamat pengiriman baru dengan informasi lengkap sehingga saya bisa menggunakannya saat checkout.

**Why this priority**: Menambah alamat adalah prasyarat dasar untuk checkout — tanpa alamat, pengiriman tidak bisa dilakukan.

**Independent Test**: Buka daftar alamat → ketuk "Tambah Alamat" → isi form lengkap (nama, telepon, provinsi, kota, kecamatan, alamat, kode pos) → simpan → alamat muncul di daftar.

**Acceptance Scenarios**:

1. **Given** pelanggan mengetuk "Tambah Alamat", **When** form dimuat, **Then** form kosong ditampilkan dengan semua field wajib
2. **Given** pelanggan mengisi form, **When** memilih provinsi, **Then** dropdown kota diisi berdasarkan provinsi yang dipilih (cascading)
3. **Given** pelanggan memilih kota, **When** kecamatan tersedia, **Then** dropdown kecamatan diisi berdasarkan kota yang dipilih (cascading)
4. **Given** semua field wajib terisi valid, **When** mengetuk "Simpan", **Then** alamat tersimpan di database dan muncul di daftar
5. **Given** pelanggan mencentang "Jadikan Default", **When** alamat disimpan, **Then** alamat ini menjadi default dan alamat default sebelumnya di-unset
6. **Given** field wajib tidak terisi, **When** mengetuk simpan, **Then** validasi error ditampilkan pada field yang bermasalah
7. **Given** nomor telepon tidak valid, **When** validasi berjalan, **Then** pesan error format telepon ditampilkan

---

### User Story 3 - Mengedit Alamat (Priority: P2)

Sebagai pelanggan, saya ingin mengedit alamat yang sudah ada sehingga saya bisa memperbarui informasi yang berubah tanpa harus membuat alamat baru.

**Why this priority**: Edit menghindari duplikasi alamat dan menjaga data tetap akurat.

**Independent Test**: Buka daftar alamat → ketuk alamat yang ingin diedit → form terisi data sebelumnya → ubah field → simpan → data diperbarui.

**Acceptance Scenarios**:

1. **Given** pelanggan mengetuk alamat dari daftar, **When** form edit dimuat, **Then** semua field terisi data alamat sebelumnya
2. **Given** pelanggan mengubah field dan mengetuk simpan, **When** request berhasil, **Then** alamat diperbarui dan daftar di-refresh
3. **Given** pelanggan mengubah status default saat edit, **When** disimpan, **Then** default address logic berjalan (unset yang lain)

---

### User Story 4 - Menghapus Alamat (Priority: P2)

Sebagai pelanggan, saya ingin menghapus alamat yang tidak saya gunakan lagi sehingga daftar alamat saya tetap rapi.

**Why this priority**: Kebersihan data — pelanggan tidak ingin melihat alamat lama yang tidak relevan.

**Independent Test**: Buka daftar alamat → tekan hapus pada alamat → konfirmasi → alamat hilang dari daftar.

**Acceptance Scenarios**:

1. **Given** pelanggan mengetuk tombol hapus pada alamat, **When** dialog konfirmasi muncul, **Then** ada opsi membatalkan atau melanjutkan
2. **Given** pelanggan mengonfirmasi hapus, **When** request berhasil, **Then** alamat dihapus dari database dan daftar diperbarui
3. **Given** alamat yang dihapus adalah alamat default, **When** dihapus, **Then** tidak ada alamat default tersisa (pelanggan perlu menandai default baru)

---

### User Story 5 - Mengatur Alamat Default (Priority: P2)

Sebagai pelanggan, saya ingin menandai satu alamat sebagai default sehingga alamat tersebut otomatis dipilih saat checkout.

**Why this priority**: Mempercepat alur checkout — pelanggan tidak perlu memilih alamat setiap kali.

**Independent Test**: Buka daftar alamat → ketuk "Jadikan Default" pada alamat non-default → alamat berubah menjadi default → alamat default sebelumnya di-unset.

**Acceptance Scenarios**:

1. **Given** pelanggan mengetuk "Jadikan Default" pada alamat, **When** request berhasil, **Then** alamat tersebut ditandai default
2. **Given** ada alamat default sebelumnya, **When** alamat lain dijadikan default, **Then** default sebelumnya otomatis di-unset
3. **Given** hanya ada 1 alamat, **When** alamat dibuat, **Then** otomatis menjadi default

---

### Edge Cases

- Apa yang terjadi ketika API wilayah (provinsi/kota/kecamatan) tidak tersedia?
- Bagaimana form menangani kode pos yang tidak sesuai dengan wilayah yang dipilih?
- Apa yang terjadi jika pelanggan menghapus semua alamat (daftar menjadi kosong)?
- Bagaimana keyboard handling di form alamat yang panjang (scroll ke field yang sedang diisi)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem HARUS menampilkan daftar alamat pengguna, diurutkan default-first lalu terbaru
- **FR-002**: Sistem HARUS mendukung pull-to-refresh pada daftar alamat
- **FR-003**: Pengguna HARUS bisa menambah alamat baru dengan field: nama penerima, nomor telepon, provinsi, kota, kecamatan, alamat lengkap, kode pos
- **FR-004**: Sistem HARUS menyediakan cascading picker untuk provinsi → kota → kecamatan (data dimuat dari API `useAddressData` hook)
- **FR-005**: Sistem HARUS memvalidasi semua field wajib sebelum menyimpan (nama penerima, telepon, provinsi, kota, alamat, kode pos)
- **FR-006**: Pengguna HARUS bisa mengedit alamat yang sudah ada dengan form pre-filled
- **FR-007**: Pengguna HARUS bisa menghapus alamat dengan dialog konfirmasi
- **FR-008**: Pengguna HARUS bisa menetapkan satu alamat sebagai default
- **FR-009**: Saat menetapkan default baru, alamat default sebelumnya HARUS otomatis di-unset
- **FR-010**: Sistem HARUS menampilkan empty state saat daftar alamat kosong
- **FR-011**: Alamat HARUS diproteksi per-pengguna (profile_id matching pada setiap operasi)

### Key Entities

- **Address**: Alamat pengiriman pengguna — nama penerima, nomor telepon, provinsi (id+nama), kota (id+nama), kecamatan (id), alamat lengkap, kode pos, flag default, terkait dengan profile
- **Location Data**: Data wilayah Indonesia — provinsi, kota, kecamatan untuk cascading dropdown (dimuat via external API)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pelanggan dapat menambah alamat baru lengkap dalam waktu kurang dari 2 menit
- **SC-002**: Cascading dropdown provinsi → kota → kecamatan dimuat dalam waktu kurang dari 3 detik per level
- **SC-003**: Pelanggan dapat mengubah alamat default dalam 1 tap dari daftar alamat
- **SC-004**: 100% operasi CRUD alamat terproteksi per-pengguna (tidak bisa akses alamat pengguna lain)

## Assumptions

- Data wilayah Indonesia (provinsi, kota, kecamatan) dimuat dari API eksternal via `useAddressData` hook
- Validasi alamat di sisi client (lengkap dan format); tidak ada geocoding/address verification
- Satu alamat per entry, tidak ada label/tag untuk alamat (misal "Rumah", "Kantor")
