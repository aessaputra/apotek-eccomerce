# Spesifikasi Badge Jumlah Pesanan pada Tab Status Pesanan

## Problem Statement

Sebagai pembeli (customer), saat melihat daftar pesanan saya, saya tidak dapat melihat secara cepat apakah ada tindakan yang harus saya lakukan (seperti membayar pesanan yang belum lunas) atau memantau pesanan aktif saya (yang sedang dikemas atau dikirim) tanpa harus mengetuk/membuka setiap tab status satu per satu.

## Solution

Menampilkan badge berupa lingkaran berwarna merah/primary dengan angka di sudut kanan atas ikon tab pada komponen `OrderStatusTabs` untuk kategori "Belum Bayar", "Dikemas", dan "Dikirim". Badge ini merepresentasikan jumlah pesanan aktif di setiap kategori tersebut, memberikan isyarat visual instan, mendorong tindakan pembayaran, dan meningkatkan kejelasan status pesanan.

## User Stories

1. As a customer, I want to see a numeric badge on the "Belum Bayar" tab icon when I have unpaid orders, so that I am reminded to pay them before they expire.
2. As a customer, I want to see a numeric badge on the "Dikemas" tab icon when I have orders in preparation, so that I can see the seller is actively processing my orders.
3. As a customer, I want to see a numeric badge on the "Dikirim" tab icon when I have orders in transit, so that I know my items are on their way.
4. As a customer, I want the badge counts to remain visible even when I click/focus on the tab, so that I don't lose the context of how many orders are in that state.
5. As a customer, I want the count badges to automatically hide when the count is zero, so that the screen stays clean and uncluttered.
6. As a customer, I want values greater than 99 to be shown as "99+", so that large counts do not overflow or stretch the badge layout.
7. As a customer, I want the badge to have a background color consistent with the app's branding (such as the primary theme color), so that the visual experience feels premium and cohesive.
8. As a developer, I want the tab layout to size naturally and prevent any badge clipping or layout shifts, so that the UI looks highly polished across different screen dimensions.

## Implementation Decisions

- Badge akan diimplementasikan sebagai komponen absolute-positioned pada penampung ikon (`TabIcon`) di subkomponen `OrderStatusTabItem` di dalam tab navigation.
- Desain badge akan menyerupai badge keranjang (`HeaderCartIcon`): berbentuk bulat, warna background `$primary`, warna teks `$onPrimary` (putih bold), berdiameter minimal, dan memiliki border tipis sesuai warna background sekitarnya untuk memberikan efek cutout yang premium.
- Menambahkan visual check di mana jika `count > 0` dan tab bertipe data counters (kategori "Belum Bayar", "Dikemas", "Dikirim" atau secara generik jika prop `count` terdefinisi dan > 0) maka badge akan ditampilkan.
- Membatasi tampilan teks jika `count > 99` menjadi `"99+"` untuk menjaga estetika visual.
- Nilai badge ini akan bersumber langsung dari prop `counts` yang sudah ada pada `OrderStatusTabs`, tanpa memodifikasi hook pengambilan data `useOrderTabCounts` maupun struktur database.

## Testing Decisions

- Pengujian unit akan ditambahkan di dalam file test yang sudah ada untuk komponen ini.
- Kasus pengujian yang akan diuji meliputi:
  - Badge angka ditampilkan dengan benar saat `count > 0`.
  - Badge tidak ditampilkan saat `count` bernilai 0, undefined, atau untuk tab "Semua pesanan".
  - Badge menampilkan string `"99+"` ketika `count > 99`.
  - Layout tab tetap presisi tanpa ada pergeseran posisi teks label ketika badge aktif.

## Out of Scope

- Memodifikasi skema database (tabel `orders`) atau edge functions API.
- Menambahkan badge jumlah pesanan untuk status riwayat historis seperti "Selesai" dan "Dibatalkan", serta tab ringkasan "Semua pesanan" (kecuali jika di kemudian hari diminta secara khusus).

## Further Notes

- Konsep interaksi UX: Jumlah pesanan merupakan indikator status pesanan aktif (true state), sehingga badge **tidak akan menghilang** saat tab diklik. Badge hanya berkurang atau hilang saat status pesanan di database diperbarui (misalnya, pembeli membayar pesanan atau admin mengubah status pesanan).
