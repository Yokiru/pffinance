# PRD Dashboard Admin Parlin Finance

Status: Draft v1  
Tanggal: 26 Juni 2026  
Produk: Web Admin Parlin Finance  
Sumber acuan: Fondasi app terbaru `pjfinance_mobile` + database Supabase baru

## 1. Visi Produk

Membangun dashboard admin simpan pinjam yang profesional, bisa dipercaya, dan langsung berguna untuk keputusan harian bisnis Parlin Finance.

Dashboard ini harus menjawab dengan cepat:

- uang masuk hari ini dari mana saja
- uang keluar hari ini ke mana saja
- sumber dana keluar itu dari cash atau bank
- performa tagihan hari ini sehat atau tidak
- nasabah mana yang harus diprioritaskan
- modal yang masih aman diputar berapa
- poin, hadiah, dan loyalitas nasabah bergerak ke arah yang benar atau tidak

Tujuan akhirnya bukan sekadar melihat data, tetapi membantu admin menjaga:

- arus kas sehat
- penagihan kuat
- modal berputar
- risiko macet terlihat lebih cepat
- profit lebih mudah dikontrol

## 2. Latar Belakang

Parlin Finance sekarang sudah punya fondasi app baru yang lebih matang:

- satu `customer_profile` untuk satu orang
- satu profile bisa punya banyak pinjaman aktif
- satu profile bisa punya banyak akun tabungan aktif
- transaksi pinjaman dan tabungan sudah dipisah
- sistem poin dan hadiah sudah mulai dibangun
- web admin sudah dipindahkan ke database baru

Masalah yang ingin diselesaikan dashboard admin:

- admin belum punya satu layar pusat untuk membaca cashflow bisnis secara utuh
- uang keluar pinjaman belum selalu terlihat jelas berdasarkan sumber cash vs bank
- tabungan belum dibaca sebagai bagian dari likuiditas usaha secara utuh
- prioritas nasabah belum cukup mudah dipantau dari sudut pandang bisnis
- poin dan hadiah belum ditampilkan sebagai alat retensi nasabah
- angka operasional berisiko tidak sinkron bila dashboard memakai logika yang berbeda dari app mobile

## 3. Prinsip Dasar

1. Dashboard harus mengikuti kebenaran data dari sistem app terbaru, bukan logika lama.
2. Semua angka penting harus bisa diaudit kembali ke transaksi sumber.
3. Cash dan bank wajib dipisah jelas.
4. Outflow riil dan outflow administratif tidak boleh dicampur.
5. Satu profile bisa punya banyak pinjaman dan banyak tabungan, dan dashboard harus mendukung itu secara natural.
6. Angka ringkasan harus cepat dibaca, tetapi detail tetap bisa ditelusuri sampai level nasabah dan transaksi.
7. Fokus utama dashboard adalah profitabilitas, likuiditas, penagihan, dan risiko.

## 4. Arah Produk

Dashboard admin akan menjadi `business cockpit` untuk pemilik/admin, sementara app mobile tetap menjadi alat operasional lapangan.

Pembagian peran:

- App mobile: input transaksi cepat, aktivitas lapangan, detail nasabah, reminder, operasional harian
- Web admin: analisis, pemantauan cashflow, kontrol portofolio, audit, loyalitas, dan keputusan bisnis

## 5. Fondasi yang Sudah Ada di App Terbaru

Dashboard baru wajib berdiri di atas fitur yang sudah ada, bukan membuat aturan baru yang bertabrakan.

Fondasi data yang sudah tersedia:

- `customer_profiles`
- `loans`
- `loan_transactions`
- `savings_accounts`
- `savings_transactions`
- `business_cash_ledger`
- `profile_point_ledger`
- `reward_catalog`
- `profile_share_links`

Fondasi bisnis yang sudah hidup:

- multi-pinjaman aktif per profile
- multi-tabungan aktif per profile
- status pinjaman aktif, lunas, arsip
- repayment frequency harian dan mingguan
- reminder mingguan untuk pinjaman mingguan
- histori transaksi pinjaman dan tabungan
- tracking poin profile dan poin pinjaman aktif
- katalog hadiah
- share link status profile
- logika pembayaran dengan metode `cash`, `transfer`, `bill_offset`, `cash_pickup`

## 6. Problem Statement

Admin butuh jawaban yang sangat cepat untuk pertanyaan ini:

- Berapa uang cash yang benar-benar ada sekarang?
- Berapa uang bank yang benar-benar tersedia sekarang?
- Berapa uang yang sudah keluar sebagai pinjaman hari ini?
- Berapa uang yang kembali sebagai tagihan hari ini?
- Berapa dana masuk dan keluar pada tabungan?
- Berapa modal yang tertahan di outstanding?
- Nasabah mana yang sedang sehat, rawan, atau bermasalah?
- Nasabah mana yang bernilai tinggi karena disiplin, poin tinggi, atau saldo tabungan kuat?

## 7. Tujuan Produk

### Goal Utama

Menyediakan dashboard admin yang akurat, cepat dibaca, dan kuat secara fundamental untuk mengelola profit, arus kas, risiko, dan loyalitas nasabah.

### Goal Operasional

- memisahkan arus cash dan bank dengan jelas
- memisahkan uang masuk, uang keluar, dan dana non-cash administratif
- menampilkan nasabah prioritas dengan cepat
- menampilkan posisi tabungan sebagai komponen likuiditas
- menampilkan poin dan hadiah sebagai alat retensi
- menjaga konsistensi angka dengan app mobile

## 8. Non-Goals V1

- akuntansi penuh seperti software ERP
- laporan pajak formal
- rekonsiliasi bank otomatis
- scoring kredit berbasis machine learning
- forecasting AI kompleks

## 9. Definisi Bisnis Kritis

Dashboard wajib memakai definisi yang konsisten.

### 9.1 Uang Masuk

- `Tagihan Masuk`: transaksi `loan_transactions.type = repayment`
- `Tabungan Masuk`: transaksi `savings_transactions.type = deposit`
- `Kas Masuk Lain`: transaksi `business_cash_ledger.direction = in`

### 9.2 Uang Keluar

- `Pinjaman Keluar Riil`: transaksi `loan_transactions.type = disbursement`
- `Tabungan Keluar`: transaksi `savings_transactions.type = withdrawal`
- `Kas Keluar Lain`: transaksi `business_cash_ledger.direction = out`

### 9.3 Sumber Dana

Dashboard wajib memecah transaksi berdasarkan metode:

- `cash`: uang fisik diterima
- `transfer`: uang bergerak via bank
- `cash_pickup`: uang fisik keluar dari kas
- `bill_offset`: transaksi administratif/non-cash yang mengurangi kewajiban tetapi bukan arus kas riil

### 9.4 Outstanding

Outstanding pinjaman aktif dihitung dari:

- `total_target_amount - total_repaid_amount`

dan bukan dari angka manual.

### 9.5 Cashflow Riil

Cashflow riil harus memisahkan:

- `cash movement`
- `bank movement`
- `non-cash movement`

agar admin tidak merasa kas sehat padahal sebagian angka berasal dari `bill_offset`.

## 10. Persona Utama

### Pemilik / Admin Utama

Butuh:

- melihat kondisi bisnis hari ini dalam 1 layar
- tahu apakah modal aman
- tahu apakah penagihan sehat
- tahu siapa nasabah terbaik dan terburuk
- tahu apakah profit sedang naik atau turun

### Admin Operasional

Butuh:

- daftar prioritas tagihan
- daftar nasabah yang perlu dicek
- histori transaksi yang mudah ditelusuri
- kejelasan sumber dana cash vs bank

## 11. Prinsip Desain Dashboard

1. Ringkasan bisnis di atas, detail di bawah.
2. Selalu tampilkan konteks tanggal dan periode.
3. Semua angka besar harus bisa di-click ke detail.
4. Prioritaskan warna dan label yang membedakan:
   - masuk
   - keluar
   - cash
   - bank
   - non-cash
   - sehat
   - risiko
5. Hindari dashboard yang ramai tetapi tidak bisa dipakai mengambil keputusan.

## 12. Struktur Informasi Dashboard

### Tab A. Executive Overview

Tujuan: memberi jawaban tercepat untuk kesehatan bisnis hari ini.

KPI utama:

- Kas Riil Saat Ini
- Bank Riil Saat Ini
- Total Uang Tersedia
- Tagihan Masuk Hari Ini
- Pinjaman Keluar Hari Ini
- Tabungan Masuk Hari Ini
- Tabungan Keluar Hari Ini
- Outstanding Aktif
- Estimasi Untung Kotor Periode

Komponen:

- kartu KPI
- tren 7 hari / 30 hari
- ringkasan target vs realisasi penagihan
- ringkasan cash vs bank vs non-cash

### Tab B. Cashflow Cockpit

Tujuan: menjadi pusat pembacaan arus dana usaha.

Blok:

- Inflow Pinjaman: repayment cash, repayment bank, repayment bill offset
- Outflow Pinjaman: disbursement cash, disbursement bank
- Inflow Tabungan: deposit cash, deposit bank
- Outflow Tabungan: withdrawal cash, withdrawal bank
- Kas Lain: manual cash in/out

Output yang wajib ada:

- net cash movement
- net bank movement
- net total movement
- non-cash adjustment total

### Tab C. Portfolio Pinjaman

Tujuan: melihat kesehatan seluruh portofolio pinjaman.

KPI:

- jumlah pinjaman aktif
- total pokok aktif
- total target aktif
- total outstanding aktif
- total tertagih hari ini
- total tertagih periode
- pinjaman mingguan aktif
- pinjaman bolong aktif

Daftar utama:

- nasabah
- kode pinjaman
- lokasi
- tanggal mulai
- pokok
- total target
- sisa tagihan
- setor hari ini
- status
- frekuensi bayar
- jumlah bolong
- poin pinjaman aktif

### Tab D. Portfolio Tabungan

Tujuan: melihat tabungan sebagai alat likuiditas dan retensi.

KPI:

- jumlah akun tabungan aktif
- total saldo tabungan
- tabungan masuk periode
- tabungan keluar periode
- net flow tabungan

Daftar utama:

- nama nasabah
- akun tabungan
- saldo
- setoran terakhir
- penarikan terakhir
- total setoran periode
- total penarikan periode

### Tab E. Customer Intelligence

Tujuan: memudahkan tracking nasabah.

Per card / row profile:

- nama profile
- lokasi
- jumlah pinjaman aktif
- jumlah pinjaman historis
- total nominal pinjaman aktif
- total outstanding aktif
- jumlah akun tabungan aktif
- total saldo tabungan
- profile points
- active loan points
- level poin
- hadiah yang tersedia / sudah pernah dipakai
- status profile

Segment yang wajib ada:

- nasabah prioritas tagih
- nasabah disiplin terbaik
- nasabah risiko tinggi
- nasabah dengan tabungan tertinggi
- nasabah dengan outstanding tertinggi

### Tab F. Loyalty, Poin, dan Hadiah

Tujuan: menjadikan loyalitas sebagai alat pertumbuhan, bukan sekadar tempelan.

KPI:

- total profile points beredar
- total active loan points beredar
- jumlah hadiah aktif
- hadiah paling sering dipakai
- nasabah dengan poin tertinggi

Komponen:

- leaderboard nasabah
- activity log poin
- daftar reward catalog
- analisis penukaran hadiah
- dampak hadiah ke disiplin bayar

### Tab G. Risk & Exceptions

Tujuan: dashboard tindakan cepat.

Daftar prioritas:

- pinjaman bolong hari ini
- pinjaman mingguan jatuh tempo hari ini
- repayment mengecil dibanding kebiasaan
- profile dengan multi-pinjaman berisiko
- transaksi edit / adjustment terbaru

## 13. Requirement Fungsional Detail

### 13.1 Cashflow Detail

Dashboard harus:

- memecah inflow dan outflow per domain:
  - pinjaman
  - tabungan
  - kas bisnis
- memecah sumber per metode:
  - cash
  - transfer/bank
  - bill offset
  - cash pickup
- menampilkan angka harian, mingguan, bulanan, custom range
- menyediakan drill-down sampai transaksi sumber

### 13.2 Visibility Nasabah

Dashboard harus memungkinkan admin:

- mencari profile berdasarkan nama, lokasi, status
- melihat semua pinjaman aktif milik satu profile
- melihat semua tabungan milik satu profile
- melihat ringkasan outstanding, tabungan, poin, hadiah
- membuka histori transaksi gabungan profile

### 13.3 Tracking Profit dan Likuiditas

Dashboard harus menampilkan:

- gross inflow
- gross outflow
- net cash movement
- net bank movement
- dana non-cash
- modal tertahan
- dana siap putar

### 13.4 Hadiah dan Poin

Dashboard harus menampilkan:

- poin profile total
- poin pinjaman aktif
- level poin
- reward aktif per source point
- histori penambahan dan pengurangan poin
- hubungan reward dengan retensi dan disiplin

### 13.5 Audit & Trust

Dashboard harus mendukung:

- filter periode
- filter lokasi
- filter status
- filter payment method
- filter loan frequency
- transaksi yang pernah diedit
- link dari angka ringkasan ke detail sumber

## 14. Requirement Data dan Arsitektur

### 14.1 Single Source of Truth

Dashboard admin harus membaca dari tabel inti yang sama dengan app mobile:

- `customer_profiles`
- `loans`
- `loan_transactions`
- `savings_accounts`
- `savings_transactions`
- `business_cash_ledger`
- `profile_point_ledger`
- `reward_catalog`

### 14.2 Prinsip Perhitungan

Perhitungan wajib berbasis transaksi, bukan hanya snapshot pinjaman.

Aturan:

- outflow pinjaman riil berasal dari `loan_transactions.type = disbursement`
- inflow tagihan berasal dari `loan_transactions.type = repayment`
- saldo tabungan berasal dari penjumlahan transaksi tabungan
- outstanding berasal dari target pinjaman dikurangi total repayment
- poin berasal dari `profile_point_ledger`

### 14.3 Kebutuhan Penguatan Fundamental

Agar dashboard sangat kuat, disarankan menambah lapisan data turunan yang tetap mengikuti tabel sumber:

- `admin_cashflow_daily_view`
- `admin_profile_summary_view`
- `admin_loan_health_view`
- `admin_savings_liquidity_view`
- `admin_rewards_summary_view`

Tujuannya:

- query lebih cepat
- rumus konsisten
- web admin tidak menyalin logika bisnis ke banyak tempat

### 14.4 Field Tambahan yang Disarankan

Untuk profesionalisasi dashboard admin, pertimbangkan penambahan:

- channel pada `business_cash_ledger`: `cash` atau `bank`
- classification pada `business_cash_ledger`: operasional, modal, penyesuaian, lainnya
- risk flag pada view pinjaman
- collection target harian per pinjaman aktif

## 15. Formula KPI yang Wajib Konsisten

### Kas Riil

`repayment cash + savings deposit cash + business cash in - disbursement cash - savings withdrawal cash - business cash out`

### Bank Riil

`repayment transfer + savings deposit transfer + business bank in - disbursement transfer - savings withdrawal transfer - business bank out`

### Non-Cash Adjustment

`repayment bill_offset + transaksi non-cash lain yang relevan`

### Outstanding Aktif

`sum(total_target_amount - total_repaid_amount) untuk semua pinjaman aktif`

### Dana Siap Putar

`kas riil + bank riil - buffer minimum operasional`

### Estimasi Untung Kotor Periode

Versi awal:

`tagihan masuk periode - pinjaman keluar periode yang belum tertutup + pendapatan kas lain - biaya kas keluar lain`

Catatan:

- V1 cukup tampilkan `gross business movement`
- versi akuntansi profit bersih penuh bisa masuk fase lanjutan

## 16. User Stories Kritis

- Sebagai pemilik, saya ingin melihat cash dan bank secara terpisah agar tidak salah mengira modal tersedia.
- Sebagai admin, saya ingin tahu pinjaman mana yang membuat uang keluar hari ini agar penyaluran lebih terkontrol.
- Sebagai admin, saya ingin tahu repayment hari ini berasal dari cash, bank, atau potong tagihan.
- Sebagai admin, saya ingin melihat tabungan masuk dan keluar agar likuiditas tidak dibaca separuh.
- Sebagai admin, saya ingin membuka satu nasabah dan langsung melihat pinjaman, tabungan, poin, dan hadiah dalam satu tempat.
- Sebagai pemilik, saya ingin melihat nasabah risiko tinggi agar penagihan diprioritaskan.
- Sebagai pemilik, saya ingin tahu hadiah dan poin benar-benar membantu retensi, bukan hanya kosmetik.

## 17. UX Requirement

- default landing adalah overview bisnis
- semua KPI punya state loading, empty, error
- semua kartu angka besar bisa klik ke daftar detail
- tampilan harus nyaman di desktop admin
- mobile web cukup tetap terbaca, tetapi prioritas utama adalah desktop/tablet
- gunakan istilah bisnis yang familiar bagi Parlin Finance:
  - Tagihan Masuk
  - Pinjaman Keluar
  - Tabungan Masuk
  - Tabungan Keluar
  - Kas Riil
  - Bank Riil
  - Outstanding
  - Dana Siap Putar

## 18. Access dan Security

- hanya admin utama yang boleh masuk
- web admin tidak boleh punya logika bypass dari app mobile
- endpoint dan RPC sensitif wajib tetap mengikuti kontrol akses Supabase baru
- semua mutasi sensitif idealnya tercatat dalam audit trail

## 19. Success Metrics

### Product Metrics

- admin bisa membaca posisi kas dan bank dalam < 10 detik
- admin bisa menemukan nasabah prioritas dalam < 15 detik
- admin bisa melacak angka KPI sampai transaksi sumber tanpa kebingungan

### Business Metrics

- penurunan selisih antara kas fisik dan catatan sistem
- peningkatan ketepatan penagihan harian
- penurunan jumlah bolong yang terlambat terdeteksi
- peningkatan kecepatan keputusan penyaluran modal

## 20. Rollout Plan

### Phase 1

- executive overview
- cashflow cockpit
- portfolio pinjaman
- portfolio tabungan
- customer intelligence dasar

### Phase 2

- loyalty, poin, hadiah
- risk & exceptions
- audit dan filter lanjutan

### Phase 3

- view materialized / RPC agregasi
- benchmark mingguan dan bulanan
- forecast likuiditas sederhana

## 21. Open Questions

- apakah `business_cash_ledger` perlu dibedakan eksplisit antara cash dan bank
- apakah admin ingin target penagihan harian dihitung per pinjaman atau per total portofolio
- apakah `bill_offset` harus dianggap koleksi sukses, non-cash success, atau dipisahkan sebagai kategori sendiri
- apakah hadiah tertentu harus memengaruhi status risiko atau prioritas nasabah
- apakah perlu mode “owner summary” dan “operator summary” yang berbeda

## 22. Rekomendasi Implementasi

Untuk menjaga fundamental tetap kuat:

1. Jangan bangun dashboard dari tabel lama.
2. Jangan hitung cashflow pinjaman dari `loans.principal_amount` saja.
3. Jadikan `loan_transactions` dan `savings_transactions` sebagai pusat arus dana.
4. Pisahkan `cash`, `bank`, dan `non-cash` di semua ringkasan.
5. Bangun view atau RPC agregasi agar web admin membaca angka yang sama dengan mobile.
6. Jadikan profile sebagai pusat customer intelligence, tetapi tetap tampilkan pinjaman aktif sebagai unit operasional.

## 23. Kesimpulan

Dashboard admin Parlin Finance yang profesional harus menjadi pusat kendali bisnis, bukan sekadar halaman statistik.

Dashboard ini harus:

- mengikuti fondasi app terbaru
- kuat di arus kas
- kuat di tracking nasabah
- kuat di portofolio pinjaman dan tabungan
- kuat di audit
- kuat di loyalitas dan hadiah

Jika dibangun dengan fondasi ini, admin akan lebih mudah:

- menjaga modal
- memperkuat penagihan
- membaca risiko lebih cepat
- dan pada akhirnya menjaga bisnis tetap untung
