# Feature Specification: Pustaka Komponen UI Bersama

**Feature Branch**: `005-shared-ui-components`  
**Created**: 2026-03-07  
**Status**: Implemented  
**Input**: Pustaka komponen UI bersama yang digunakan di seluruh aplikasi termasuk tombol, input form, avatar, bottom sheet, dialog, image loader, dan layout header

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interaksi Tombol & Aksi (Priority: P1)

Sebagai pelanggan, saya ingin tombol yang responsif dan menarik secara visual di seluruh aplikasi sehingga saya tahu elemen mana yang bisa diklik dan mendapatkan feedback instan saat berinteraksi.

**Why this priority**: Tombol adalah elemen interaksi paling dasar. Tanpa tombol yang konsisten dan responsif, seluruh alur pengguna terganggu.

**Independent Test**: Buka halaman login → lihat tombol "Masuk" dengan gradient → ketuk → lihat efek tekan → lihat loading state saat proses berjalan.

**Acceptance Scenarios**:

1. **Given** pelanggan melihat tombol utama (primary), **When** tombol ditampilkan, **Then** tombol memiliki gradien warna yang menarik dan teks yang jelas
2. **Given** pelanggan mengetuk tombol, **When** jari menyentuh tombol, **Then** efek visual "press" ditampilkan (opacity berubah atau skala berubah)
3. **Given** proses sedang berjalan setelah tombol ditekan, **When** loading aktif, **Then** tombol menampilkan indikator loading dan tidak bisa ditekan ulang
4. **Given** pelanggan melihat tombol OAuth (Google), **When** tombol ditampilkan, **Then** tombol memiliki ikon provider dan teks yang sesuai ("Masuk dengan Google")

---

### User Story 2 - Input Form yang Aman & Informatif (Priority: P1)

Sebagai pelanggan, saya ingin field input yang memberikan panduan jelas (placeholder, label) dan feedback validasi real-time sehingga saya bisa mengisi form dengan benar tanpa frustasi.

**Why this priority**: Input form digunakan di seluruh aplikasi (login, signup, profil, alamat). Kualitas input menentukan seluruh pengalaman pengisian data.

**Independent Test**: Buka halaman signup → lihat field email dengan ikon → isi email salah → lihat pesan error → kosongkan → lihat validasi "wajib diisi".

**Acceptance Scenarios**:

1. **Given** pelanggan melihat field input, **When** field ditampilkan, **Then** placeholder teks dan label yang jelas terlihat
2. **Given** pelanggan mengisi field email, **When** mengetik karakter, **Then** input menerima dan menampilkan teks dengan format yang sesuai
3. **Given** pelanggan mengisi field password, **When** field ditampilkan, **Then** teks disamarkan (dots) dengan tombol toggle visibilitas
4. **Given** pelanggan mengetuk tombol toggle password, **When** ditekan, **Then** teks password ditampilkan/disamarkan secara bergantian
5. **Given** validasi form gagal, **When** field memiliki error, **Then** pesan error ditampilkan di bawah field yang bermasalah dengan warna merah/danger
6. **Given** pelanggan mengisi password di form signup, **When** mengetik karakter, **Then** indikator kekuatan password diperbarui secara real-time (Lemah/Sedang/Kuat)

---

### User Story 3 - Avatar Pengguna (Priority: P2)

Sebagai pelanggan, saya ingin melihat representasi visual identitas saya (foto atau inisial nama) di seluruh aplikasi sehingga saya bisa mengenali akun saya dengan cepat.

**Why this priority**: Avatar meningkatkan personalisasi dan membantu pengguna mengenali akun mereka. Digunakan di halaman profil dan edit profil.

**Independent Test**: Buka halaman profil → lihat avatar dengan foto (jika ada) atau inisial nama → buka edit profil → ketuk avatar → pilih foto baru.

**Acceptance Scenarios**:

1. **Given** pelanggan memiliki foto profil, **When** avatar ditampilkan, **Then** foto profil ditampilkan dalam bentuk lingkaran
2. **Given** pelanggan tidak memiliki foto profil, **When** avatar ditampilkan, **Then** inisial nama ditampilkan dengan background warna
3. **Given** avatar dalam mode editable (di edit profil), **When** pelanggan mengetuk avatar, **Then** image picker terbuka untuk memilih foto baru
4. **Given** avatar dalam mode non-editable (di halaman profil), **When** pelanggan mengetuk avatar, **Then** tidak ada aksi (display only)
5. **Given** ukuran avatar berbeda di berbagai halaman, **When** komponen di-render, **Then** ukuran menyesuaikan parameter yang diberikan

---

### User Story 4 - Bottom Sheet & Dialog (Priority: P2)

Sebagai pelanggan, saya ingin panel informasi dan dialog konfirmasi yang muncul dengan animasi halus sehingga saya bisa membuat keputusan tanpa meninggalkan konteks halaman saat ini.

**Why this priority**: Bottom sheet dan dialog digunakan untuk interaksi kritis seperti konfirmasi hapus, konfirmasi logout, dan informasi selamat datang.

**Independent Test**: Buka halaman profil → ketuk "Keluar" → dialog konfirmasi muncul → pilih "Batal" → dialog tertutup tanpa aksi.

**Acceptance Scenarios**:

1. **Given** aksi membutuhkan konfirmasi (hapus, logout), **When** pelanggan memicu aksi, **Then** dialog konfirmasi muncul dengan judul, deskripsi, dan tombol aksi (konfirmasi + batal)
2. **Given** dialog konfirmasi terbuka, **When** pelanggan mengetuk "Batal", **Then** dialog tertutup tanpa melakukan aksi apapun
3. **Given** dialog konfirmasi terbuka, **When** pelanggan mengetuk tombol konfirmasi, **Then** aksi dijalankan dan dialog tertutup
4. **Given** bottom sheet perlu menampilkan konten, **When** sheet terbuka, **Then** panel muncul dari bawah layar dengan animasi slide-up yang halus
5. **Given** bottom sheet terbuka, **When** pelanggan menekan di luar area sheet, **Then** sheet tertutup (dismiss on outside tap)

---

### User Story 5 - Pemuatan Gambar & Penanganan Error (Priority: P3)

Sebagai pelanggan, saya ingin gambar yang dimuat dengan lancar dan menampilkan placeholder yang informatif saat loading atau gagal sehingga halaman tidak terlihat rusak.

**Why this priority**: Penanganan gambar yang baik meningkatkan kesan profesional tetapi bukan blocker fungsional.

**Independent Test**: Buka halaman dengan gambar → lihat placeholder saat loading → gambar dimuat → putuskan koneksi → buka halaman dengan gambar → lihat fallback.

**Acceptance Scenarios**:

1. **Given** gambar sedang dimuat, **When** proses loading berlangsung, **Then** placeholder atau loading indicator ditampilkan
2. **Given** gambar berhasil dimuat, **When** data tersedia, **Then** gambar ditampilkan dengan transisi yang halus
3. **Given** gambar gagal dimuat, **When** error terjadi, **Then** fallback image atau placeholder ditampilkan (tidak menampilkan broken image icon)

---

### Edge Cases

- Apa yang terjadi ketika teks label tombol sangat panjang (overflow)?
- Bagaimana komponen input menangani paste teks yang sangat panjang?
- Apa yang terjadi ketika bottom sheet dibuka saat keyboard masih aktif?
- Bagaimana avatar menangani URL gambar yang expired atau invalid?
- Apa yang terjadi ketika dialog konfirmasi dipicu dua kali secara cepat (double-tap)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem HARUS menyediakan komponen tombol utama (GradientButton) dengan dukungan gradien warna, efek tekan, dan loading state
- **FR-002**: Sistem HARUS menyediakan komponen tombol OAuth dengan ikon provider dan teks yang sesuai
- **FR-003**: Sistem HARUS menyediakan komponen input email dengan validasi format dan ikon yang sesuai
- **FR-004**: Sistem HARUS menyediakan komponen input password dengan toggle visibilitas (show/hide)
- **FR-005**: Sistem HARUS menyediakan komponen input form generik yang mendukung berbagai tipe data
- **FR-006**: Sistem HARUS menyediakan komponen pesan error yang menampilkan pesan validasi di bawah field terkait
- **FR-007**: Sistem HARUS menyediakan komponen avatar yang menampilkan foto profil (jika ada) atau inisial nama sebagai fallback
- **FR-008**: Komponen avatar HARUS mendukung mode editable (dengan aksi tap untuk mengubah foto) dan non-editable (display only)
- **FR-009**: Sistem HARUS menyediakan komponen bottom sheet dengan animasi slide-up dan dismiss pada tap di luar area
- **FR-010**: Sistem HARUS menyediakan komponen dialog konfirmasi (AppAlertDialog) dengan judul, deskripsi, dan tombol aksi yang bisa dikustomisasi
- **FR-011**: Sistem HARUS menyediakan komponen image loader dengan placeholder saat loading dan fallback saat error
- **FR-012**: Sistem HARUS menyediakan komponen kartu alamat (AddressCard) untuk menampilkan ringkasan alamat
- **FR-013**: Semua komponen HARUS mendukung tema terang dan gelap secara otomatis
- **FR-014**: Semua komponen interaktif HARUS memiliki ukuran target sentuhan minimal 44px untuk aksesibilitas
- **FR-015**: Semua komponen interaktif HARUS memiliki accessibility label dan hint yang deskriptif

### Key Entities

- **GradientButton**: Tombol utama — mendukung gradien warna, efek tekan, loading state, dan kustomisasi ukuran
- **OAuthButton**: Tombol login pihak ketiga — menampilkan ikon provider dengan style yang konsisten
- **EmailInput**: Field input email — dengan validasi format dan ikon email
- **PasswordInput**: Field input password — dengan toggle visibilitas dan indikator kekuatan
- **FormInput**: Field input generik — mendukung berbagai tipe data dengan label dan placeholder
- **ErrorMessage**: Pesan error — ditampilkan di bawah field dengan warna danger
- **Avatar**: Representasi visual pengguna — foto profil atau inisial nama, mendukung mode editable
- **BottomSheet**: Panel overlay dari bawah — dengan animasi slide-up dan gesture dismiss
- **AppAlertDialog**: Dialog konfirmasi — judul, deskripsi, tombol batal dan konfirmasi yang bisa dikustomisasi
- **Image**: Image loader — dengan placeholder loading dan fallback error
- **AddressCard**: Kartu ringkasan alamat — menampilkan data alamat dalam format kompak

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Semua komponen merespons interaksi pengguna (tap, toggle) dalam waktu kurang dari 100ms
- **SC-002**: Komponen konsisten secara visual di seluruh halaman yang menggunakannya (warna, ukuran, spacing)
- **SC-003**: 100% komponen interaktif memiliki ukuran target sentuhan ≥44px
- **SC-004**: Bottom sheet dan dialog muncul/hilang dengan animasi halus (tidak ada jank atau frame drop)
- **SC-005**: Fallback avatar (inisial nama) selalu menampilkan karakter yang valid saat foto tidak tersedia

## Assumptions

- Semua komponen dibangun di atas primitif Tamagui untuk konsistensi theming
- Komponen mengikuti pola komposisi (composition pattern) — setiap komponen bertanggung jawab atas satu fungsi
- Accessibility labels menggunakan Bahasa Indonesia sesuai konteks aplikasi
- Komponen tidak memiliki state global — state dikelola oleh halaman yang menggunakannya
