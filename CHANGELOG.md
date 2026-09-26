# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di berkas ini.

Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Ditambahkan
- Struktur dokumen proyek: `AGENTS.md`, `CHANGELOG.md`, `PLAN.md`.
- **UI playable** (`index.html`, `styles/`, `src/ui/`)
  - `i18n.js` - semua string UI, English sebagai default, toggle ID/EN.
  - `assets.js` - path placeholder WebP dan definisi palet operator.
  - `state.js` - state permainan, pengelolaan ekspresi, dan formula skor.
  - `view.js` - seluruh render DOM, tanpa aritmetika.
  - `drag.js` - drag-and-drop `interact.js` plus tap-to-place.
  - `controller.js` - loop permainan, timer, dan transisi order/level.
  - `app.js` - titik masuk.
- **Gaya toon-toon** (`styles/base.css`, `layout.css`, `theme.css`,
  `animations.css`): warna solid, satu warna outline, tanpa gradien,
  menghormati `prefers-reduced-motion`.
- **Aset placeholder WebP** (`assets/placeholder/`): latar, meja, piring,
  topi koki, dan 3 varian pelanggan, dibuat datar dan geometris oleh
  `scripts/make-placeholder-assets.py` agar mudah diganti aset tim.
- `vendor/interact.min.js` (interact.js 1.10.27, sekitar 98 KB) divendor lokal.
- `favicon.ico`, `manifest.webmanifest`, dan ikon 192 px.
- Tombol keluar di HUD, supaya pemain tidak terjebak di dalam level.
- `scripts/smoke-ui.js` - mengendarai game sungguhan di Chrome untuk memastikan
  alur-ui benar-benar bekerja.
- `scripts/check-imports.js` - mendeteksi unused import.

### Diperbaiki
Ditemukan oleh `scripts/smoke-ui.js`, bukan oleh unit test.

- Escape sequence tidak valid pada `view.js` (huruf `b` yang tidak lengkap)
  membuat seluruh modul gagal dimuat, sehingga game tidak bisa dimulai.
- `consumesOperand` diimpor dari modul yang salah, yaitu `evaluate.js`
  alih-alih `operators.js`.
- `ordersForLevel` dipanggil sebagai anggota dari namespace modul `state.js`,
  padahal fungsi itu berasal dari `difficulty.js`.
- `dom` pada `view.js` tidak diekspor sebagai named export, sehingga
  `view.dom.hudScore` melempar error dan **game membeku setelah pesanan
  servem selesai**.
- Kartu operator biner tidak pernah dirender karena `arity` dari core bernilai
  `binary`, sementara kelas CSS mengharapkan `operator`.
- `expectedKind` salah urutan: setelah operator biner, kartu angka justru
  dinonaktifkan, sehingga rantai panjang tidak bisa diselesaikan.
- Operator unary bisa dipakai setelah operator biner; sekarang hanya boleh
  setelah sebuah nilai.
- Mengganti bahasa saat tidak ada permainan aktif melompat dari menu ke layar
  pemilihan level.
- Timer masih memakai angka draf lama, bukan 30/20/15 yang telah disepakati.
- Ketuk kartu beruntun tidak pernah menutupi ekspresi, sehingga tombol Sajikan
  tetap nonaktif. Sekarang setiap ketukan langsung menambahkan kartu.

### Keputusan Teknis
- Timer final: Easy 30 detik, Medium 20 detik, Hard 15 detik.
- Skor: base 10/15/20 per pesanan, plus bonus kecepatan maksimum 50% dari base.
  Waktu habis dikurangi 10 poin, jawaban salah dikurangi 5 poin, skor tidak
  pernah turun di bawah nol.
- Ketuk kartu langsung menambahkan kartu tersebut ke area kerja, sehingga
  `4`, `x`, `7` cukup tiga ketukan dan tombol Sajikan langsung aktif.
- Placeholder WebP dipilih daripada ilustrasi hasil generate AI, sesuai aturan
  anti-AI-slop.

## [0.1.0] - 2026-09-26

### Ditambahkan
- **Core logika matematika** (`src/core/`)
  - `rational.js` - aritmetika pecahan eksak: normalisasi gcd, guard bagi nol,
    guard unsafe integer, format display, `isDisplayNice`, `toDisplayString`,
    `hasTerminatingDecimal`.
  - `operators.js` - registry operator biner (`+`, `-`, `x`, `/`) dan unary
    (`^`, `sqrt`), dengan `UnknownOperatorError` dan `consumesOperand`.
  - `evaluate.js` - evaluator **left-to-right** untuk rantai langkah
    (chaining), plus `traceValues` dan `formatRecipe`.
  - `difficulty.js` - konfigurasi Easy/Medium/Hard kali lima level, pesanan per
    level 2/3/4/4/5, timer, dan nyawa.
  - `generator.js` - backward generation soal dengan jaminan solvable, secret
    recipe, dan distractor.
- **Unit test** (`test/`) - 72 test memakai `node:test` tanpa dependency,
  termasuk stress test 10.000 soal per mode.
- **Alat development** (`scripts/`)
  - `inspect-puzzles.js` - mencetak contoh soal per mode dan level.
  - `check-imports.js` - mendeteksi unused import.
- **Scaffold** - `package.json` (ESM, tanpa dependency), `.gitignore`,
  `README.md`, dan git repo.

### Keputusan Teknis
- Bentuk ekspresi: **chaining bertahap**, hasil operator kembali ke rak bahan.
- Aturan hitung: **left-to-right**, semua operator sama bobot (`2 + 3 x 4 = 20`).
- Numerik: **aritmetika pecahan eksak**, tanpa floating point.
- Substansi: **subset bebas**, pemain memakai sebagian bahan.
- Jumlah solusi: **single hiding**, satu jawaban rahasia ditambah pengalihan.
- Akar: **kuadrat sempurna bilangan bulat**. Pangkat: bilangan bulat kecil 2-3.
- Target: **bulat dan positif**.

### Diperbaiki
Ditemukan lewat inspeksi manual soal memakai `npm run inspect`, bukan lewat
kegagalan test.

- Langkah no-op yang tidak mengubah nilai ditolak (`x + 0`, `x x 1`, `sqrt(1)`).
- Pecahan bising ditolak: pecahan dengan pembilang besar seperti `97/6`, dan
  penyebut yang jarang dijumpai seperti 7, 9, 11, 12, 15.
- Nilai berjalan bernilai nol di tengah rantai ditolak.
- Perulangan nilai dalam rantai ditolak (`3 -> 9 -> 3`), dan target tidak boleh
  tercapai sebelum langkah terakhir.
- Target negatif, target pecahan, dan target nol ditolak.
- `toDisplayString()` menampilkan `2/3` sebagai `2/3`, bukan `0.667`, agar tidak
  mengajari siswa pembagian yang salah.
- Akar dibatasi pada bilangan bulat, jadi `sqrt(16) = 4` bukan `sqrt(9/4)`.
- `pow` diperlakukan sebagai unary berparameter agar cukup satu slot di UI.
- `UnknownOperatorError` diperluas dari `RationalError` agar konsisten.
- `pow` dengan eksponen negatif tidak lagi memanggil metode yang tidak ada.
- `maxTargetAttempts: 0` kini melempar `GenerationError` alih-alih gagal diam-diam.
- `negativeChance` diterapkan ke semua sampling bahan, bukan hanya distractor.
 - Skrip `npm test` memakai `node --test` tanpa argumen direktori, karena
  argumen direktori tidak didukung pada versi Node yang dipakai.
- Dua unused import dibersihkan dari `evaluate.js` dan `generator.js`.
