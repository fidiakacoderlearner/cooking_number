# Plan

Status rencana kerja **Cooking Number**. Diperbarui setiap ada perubahan status.

## Legenda

- `[x]` selesai
- `[ ]` belum
- `[~]` sedang dikerjakan

---

## ⚠️ Sesi berikutnya - mulai dari sini

Status saat plan ini ditulis (27 September 2026, sisa ±21 hari ke deadline):
Fase 1, 2, dan 2.5 selesai dan terverifikasi. Fase 3 baru ~10%, Fase 4 belum
mulai. Kita ~3 minggu lebih maju dari jadwal PRD di §10.

**Yang paling penting untuk diketahui sebelum mulai:**

1. **28 file belum di-commit.** Seluruh redesign masih di working tree. Kalau
   ada yang rusak, kerja ini hilang. Commit lebih dulu.
2. **Angka spawner dan kesabaran adalah tebakan.** Semuanya di
   `src/core/difficulty.js` dan ditandai sebagai titik awal. Tidak ada satu pun
   angka yang sudah pernah dilihat pemain sungguhan.
3. **Medium dan Hard belum pernah dimainkan sampai tamat** oleh test apa pun.
   Yang sudah terbukti otomatis hanya Easy level 1.
4. **Rubrik lomba belum didapat.** Ini yang paling lambat dan paling di luar
   kendali. Sudah diminta ke panitia? Kalau belum, hari ini juga.

Urutan pekerjaan:

### 1. Commit redesign - 15 menit

- [ ] Rename folder repo (perlu dilakukan manual, folder sedang dikunci proses):
      `Rename-Item "C:\Users\ASUS\Documents\number_kitchen" "cooking_number"`
- [ ] Commit 24 file modified + 4 baru (`src/ui/progress.js`,
      `test/state.test.js`, `test/progress.test.js`, `test/difficulty.test.js`)
      **sebagai satu unit.** Jangan pecah jadi commit kecil: logikanya saling
      terkait dan separuh commit akan tidak jalan.

### 2. Tutup celah test Medium dan Hard - 1-2 jam (prioritas tertinggi)

- [ ] Pecah loop "main sampai level selesai" di `scripts/smoke-ui.js` menjadi
      fungsi yang menerima mode dan level
- [ ] Mainkan **Medium** sampai overlay muncul. Yang belum terbukti: tile
      pecahan tampil sebagai desimal (`0.5`) — apakah `drag.js` masih membaca
      nilainya dengan benar dari `dataset.tileKey`?
- [ ] Mainkan **Hard** sampai overlay muncul. Yang belum terbukti: slot unary
      (`² ³ √`) di tengah rantai, dan operator yang lebih sempit di level 3+
- [ ] Pastikan ketiga mode tetap hijau di `npm run smoke`

Kenapa ini yang paling tinggi nilai: jaminan solvability sudah terbukti di
tingkat matematika (10.000 soal x 15 kombinasi), tapi jalur **UI**-nya belum.
Bug di sini tidak akan ketahuan tanpa memainkannya.

### 3. Playtest di HP asli - 1-2 jam (waktu manusia, bisa dilakukan offline)

Blocker tunggal untuk semua angka di `src/core/difficulty.js`. Mainkan Easy L1,
Easy L5, Medium L1, Hard L1, lalu catat:

| Yang dicatat | Untuk memvalidasi |
|---|---|
| Pelanggan tersaji vs walkout | `PATIENCE_SECONDS` |
| Lama level dari mulai sampai overlay | `ARRIVAL_SECONDS` |
| Pernah 3-4 chip sekaligus? Terasa penuh? | `MAX_ON_SCREEN` |
| Lama satu puzzle dari chip muncul sampai tersaji | Angka kalibrasi sebenarnya |
| Tile `0.5` di Medium, membingungkan? | Potensi masalah UX terbesar |
| Sadar harus tekan "Masak untuk dia", atau baru setelah salah ketuk? | Alur 5 langkah |
| Saat drag, apakah halaman ikut ter-scroll? | Satu-satunya yang tak bisa dites otomatis |

Aturan keputusan: Easy L1 sering walkout -> naikkan `PATIENCE_SECONDS.easy`.
Easy L5 selalu cuma 1 chip -> turunkan `ARRIVAL_SECONDS.easy[4]`. Tiga chip
sudah terasa penuh -> `MAX_ON_SCREEN = 3`. Semuanya di satu file, jadi aman
diubah tanpa menyentuh logika.

### 4. Polish dari hasil playtest - 2-3 jam

- [ ] Setel ulang angka di `src/core/difficulty.js` berdasarkan data playtest
- [ ] Perpendek alur lima langkah kalau playtest menunjukkan PLAYER sering
      salah ketuk di langkah pertama
- [ ] Perbaiki teks i18n yang belum natural saat dibaca

### 5. Submission - 3-4 jam (bisa paralel dengan langkah 3-4)

- [ ] Video demo 1-2 menit, screen recording gameplay
- [ ] Deskripsi proyek
- [ ] Checklist rubrik lomba

### Kalau hanya sempat satu sesi

Langkah 2. Playable di tiga mode dan terbukti otomatis, dengan 1-2 jam.

---

## Fase 0 - Keputusan dan klarifikasi - [x]

- [x] Baca dan pahami PRD
- [x] Kunci keputusan: chaining bertahap, left-to-right, drag dan tap-to-place,
      i18n ID/EN dengan default English, subset bebas, single hiding, pecahan
      eksak, akar kuadrat sempurna
- [x] Nama game: **Cooking Number** (sudah final, lihat PRD §13)
- [x] Formula skor disepakati
- [x] Gaya visual: **toon-toon** (flat cartoon)
- [x] Keputusan aset: placeholder WebP dulu, siap swap ke aset tim
- [x] Varian pelanggan: **3**
- [x] Gagal = **walkout tanpa nyawa**; tidak ada level gagal, tidak ada pelanggan
      pengganti
- [x] Pelanggan datang **berkala satu per satu**, bukan sekaligus
- [x] Kesabaran **per pelanggan**, semua berjalan bersamaan
- [x] Spawner **jeda** saat layar penuh, bukan menolak pelanggan
- [x] Hitung mundur pelanggan berikutnya **wajib terlihat**
- [x] **Satu stand**, satu hidangan, tombol "Masak untuk dia" dua langkah

## Fase 1 - Core logic dan generator - [x]

- [x] Scaffold project: git, `package.json` ESM, `.gitignore`, `README.md`
- [x] `rational.js` - aritmetika pecahan eksak
- [x] `operators.js` - registry operator biner dan unary
- [x] `evaluate.js` - evaluator left-to-right
- [x] `difficulty.js` - konfigurasi mode dan level
- [x] `generator.js` - backward generation dengan jaminan solvable
- [x] Unit test, stress 10.000 soal per mode, hijau
- [x] Inspeksi manual soal dan perbaikan kualitas
- [x] Dokumentasi: `AGENTS.md`, `CHANGELOG.md`, `PLAN.md`

### Ringkasan Fase 1

Solvability dijamin secara konstruksi: generator yang membuat jalurnya sendiri,
lalu `evaluate(secretRecipe) === target` diverifikasi sebelum soal dikirim ke
pemain. Tidak ada pencarian jalur, sehingga tidak ada risiko soal buntu.

---

## Fase 2 - UI mobile-first (satu pelanggan satu pesanan) - [x]

Sudah selesai dan **diganti seluruhnya** oleh Fase 2.5. Dicatat di sini karena
menjelaskan mengapa `smoke-ui.js` lama tidak lagi relevan.

### Tahap 1 - Scaffold dan layout - [x]
- [x] `index.html`
- [x] `styles/`: `base.css`, `layout.css`, `theme.css`, `animations.css`
- [x] `vendor/interact.min.js` (vendor lokal sekitar 96 KB, bukan CDN)
- [x] Layout HUD, target order, rak bahan, area kerja chaining

### Tahap 2 - Interaksi - [x]
- [x] `src/ui/drag.js` - drag-and-drop plus tap-to-place sebagai fallback HP
- [x] `src/ui/assets.js` - pemuat placeholder WebP dan palet operator
- [x] Validasi lewat `evaluate()`, feedback visual saat cocok (CSS-only)
- [x] Ketuk kartu langsung menambah ke area kerja

### Tahap 3 - Game loop - [x]
- [x] `src/ui/state.js`, `src/ui/view.js`, `src/ui/controller.js`
- [x] Timer per pesanan, nyawa 3 per level, skor, transisi order dan level
- [x] Tombol keluar supaya pemain tidak terjebak di level

### Tahap 4 - Tema toon, i18n, placeholder - [x]
- [x] `src/ui/i18n.js` - string EN dan ID, default `en`, toggle
- [x] Palet dan komponen CSS bergaya toon-toon
- [x] `assets/placeholder/` - 3 varian pelanggan, meja, piring, latar (WebP)
- [x] `favicon.ico` dan `manifest.webmanifest`

### Tahap 5 - Playtesting - [x]
- [x] `scripts/smoke-ui.js` - alur-ui diuji di Chrome sungguhan (versi 1)
- [x] Uji touch manual di HP asli, kalibrasi timer 30/20/15
- [x] Perbaikan bug minor dari playtest manual

### Ringkasan Fase 2

Versi 1 bisa dimainkan penuh di browser, tapi hanya sampai **level 1**: progres
level tidak pernah naik karena `writeProgress` menyimpan level yang sedang
dimain, bukan level yang selesai. Beberapa bug lain ditemukan saat review dan
sudah tidak relevan karena arsitekturnya diganti:

- `applyTimeout` dipanggil dua kali, sehingga satu timeout menghabiskan tiga
  nyawa dan skor `lives` jadi negatif
- `handleServe` tidak punya penjaga fase, sehingga menyajikan dua kali
  melewati satu pesanan
- `setTimeout` yang tertunda tidak pernah dibersihkan, sehingga keluar dari
  level di tengah transisi melempar `TypeError`

---

## Fase 2.5 - Redesign multi-pelanggan berkala - [x]

Target: satu level berisi beberapa pelanggan yang datang bergantian, dan gagal
berarti walkout tanpa reward. PRD §4, §5.5, §5.6, §5.7, §5.8 adalah
rujukan untuk semua butir di bawah.

### Tahap 1 - Config dan core - [x]
- [x] `difficulty.js`: `CUSTOMERS_PER_LEVEL`, interval dasar + jitter + decay,
      kesabaran per pelanggan, batas pelanggan di layar, tangga operator per
      level
- [x] `generator.js`: logika backward generation **tidak diubah** — jaminan
      solvability tetap berlaku per-puzzle dan tidak terpengaruh jumlah
      pelanggan
- [x] `generator.js`: `generateLevel` dihapus, roster di-spawn satu per satu
- [x] Stress test seluruh kombinasi mode x level (10.000 soal x 15) untuk
      memastikan tangga operator yang dibatasi tidak membuat generator gagal

### Tahap 2 - State model - [x]
- [x] `src/ui/progress.js` - progres level yang bisa diuji tanpa DOM
- [x] `src/ui/state.js` rewrite: `orders[]`, pelanggan yang sedang dimasak,
      satu ekspresi global
- [x] `tick()` menangani spawner, kesabaran setiap pelanggan, walkout, dan
      akhir level, dan hanya melaporkan kejadian pada tick itu supaya pesan
      walkout tidak diulang tiap detik
- [x] `hasDish()` dan `isCorrect()` dipisah supaya menyajikan dalam keadaan
      salah tetap mungkin terjadi, sesuai mekanik walkout
- [x] Hapus nyawa, penalti, dan seluruh phase yang tidak terpakai

### Tahap 3 - UI - [x]
- [x] Baris chip pelanggan dengan hitung mundur, bar kesabaran, status, dan
      tombol "Masak untuk dia"
- [x] Header stand yang menunjuk pelanggan yang sedang dimasak
- [x] Piring draggable ke chip mana pun, plus tombol Sajian eksplisit
- [x] Hitung mundur pelanggan berikutnya
- [x] Hapus sel nyawa dari HUD
- [x] Perbaikan rule 8: label operator dan kelas ikut toggle bahasa
- [x] Target sentuh di bawah 44px diperbaiki

### Tahap 4 - Test - [x]
- [x] `test/state.test.js`, `test/progress.test.js`, `test/difficulty.test.js`
- [x] `scripts/smoke-ui.js` ditulis ulang: pelanggan datang seiring waktu,
      seluruh level bisa dimainkan hanya dari layar, walkout karena menyajikan
      salah dan karena kesabaran habis, level 2 terbuka, toggle bahasa, dan
      lebar 1280px serta 320px
- [x] `scripts/check-imports.js` ikut memindai `src/ui`

### Ringkasan Fase 2.5

Pekerjaan ini membongkar sebagian besar layer UI, jadi `smoke-ui.js` lama tidak
bisa dipakai dan ditulis ulang dari nol. Dua hal yang tidak terlihat dari kode,
tapi menentukan apakah game bisa dimainkan sama sekali:

- **Jamnya tidak pernah bergerak.** `lastTick` di-update sebelum cek satu
  detik, jadi tidak ada pelanggan yang pernah datang. Bug warisan versi 1.0,
  lolos karena tidak ada test yang menunggu waktu lewat di browser.
- **Bahan stand milik pelanggan yang sedang dimasak.** Kalau dicampur, pemain
  bisa menghabiskan bahan milik satu pesanan dan membuat level mustahil.

Yang tidak boleh dikorbankan demi kecepatan: jaminan solvability tetap diuji
(10.000 soal x 15 kombinasi), dan walkout tidak bisa terjadi karena salah klik.

---

## Fase 3 - Polish dan kalibrasi - [~]

Detail dan urutan pengerjaannya ada di bagian "Sesi berikutnya" di atas.

- [~] **Kalibrasi spawner dan kesabaran di HP asli.** Angka di
      `src/core/difficulty.js` adalah titik awal, bukan angka final, dan ini
      bagian yang tidak bisa diputuskan dari atas meja.
- [ ] Tutup celah test Medium dan Hard (lihat langkah 2 di atas)
- [x] Lebar 320px dan 1280px diperiksa otomatis di smoke test
- [ ] Uji drag di perangkat asli: apakah drag merebut scroll halaman
- [ ] Styling akhir dan polish

## Fase 4 - Submission - [ ]

- [ ] Materi submission: video demo dan deskripsi
- [ ] Checklist rubrik lomba
- [ ] Nice-to-have hanya kalau benar-benar ada waktu kosong: suara, animasi
      karakter, leaderboard lokal. **Prioritaskan playtest dan video demo dulu.**

---

## Keputusan yang masih ditunggu tim

- [ ] **Rubrik dan buku panduan lomba.** Sudah diminta ke panitia? Ini yang
      paling lambat dan paling di luar kendali kita, jadi harus digesa.
- [ ] Hasil kalibrasi spawner dan kesabaran di HP asli
- [ ] Aset visual final dari tim (SVG/PNG/WebP) plus style reference

## Di luar scope

- Tanpa backend. Progres lokal via `localStorage` sebagai nice-to-have.
- Tanpa service worker pada fase ini.
- Bahasa tambahan selain English dan Indonesia.
- Tanpa papan skor bersama. Tidak ada akun, tidak ada data pemain.
