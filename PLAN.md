# Plan

Status rencana kerja **Cooking Number**. Diperbarui setiap ada perubahan status.

## Legenda

- `[x]` selesai
- `[ ]` belum
- `[~]` sedang dikerjakan

---

## ⚠️ Sesi berikutnya - mulai dari sini

Status saat plan ini ditulis (**29 September 2026**, sisa ±19 hari ke deadline):
Fase 1, 2, 2.5 selesai dan terverifikasi. Fase 3 secara teknis selesai —
**kelima belas kombinasi mode x level sudah bisa dimainkan sampai tamat secara
otomatis.** Kita ~3 minggu lebih maju dari jadwal PRD di §10.

**Semua commit code sudah landed** — kaidah operasi, `2³` bisa disajikan,
`2 ² ²` tampil sebagai `2⁴`, kesabaran +10%, tombol Mulai + Aturan Main,
animasi antrean, musik dan efek suara. Yang tersisa **hanya playtest ketiga**,
kalibrasi spawner/kesabaran, rubrik lomba, dan video demo.

### Keputusan 28 September 2026

Semua ini sudah diputuskan. Kalau besok ada yang terdengar seperti ide baru,
cek dulu daftar ini supaya tidak dibahas ulang.

| Keputusan | Alasan |
|---|---|
| Aturan hitung jadi **kaidah operasi**, bukan kiri-ke-kanan | Playtest: `-5 + -2 x -1` terbaca 7 padahal kaidah bilang -3. Kaidah diajarikan di SMP, jadi versi lama mengajarkan aturan yang salah |
| Unary mengikat ke **operand**, bukan ke running total | `2 + 3²` harus 11, bukan 25. Kaidah operasi mengikat ke operandnya, bukan ke running total |
| Drag tile **dipertahankan** | Diperbaiki di playtest pertama, dan setelah diperbaiki tile benar-benar mengikuti jari |
| Drag-serve **dihapus** | Playtest selalu memakai tombol Sajian. Tiga cara menyajikan lebih sulit dipelajari dari satu |
| Menekan chip = memuat stand, tombol "Masak untuk dia" **dihapus** | Playtest minta elemen lebih sedikit di satu layar |
| Pindah pelanggan: ≤2 tile bebas, >2 tile **popup konfirmasi**, jam berhenti | Karena satu ketukan kini bisa menghapus hidangan, aturan 11 meminta aksi merusak yang disengaja. Jam berhenti supaya membaca dialog tidak jadi walkout |
| Kesabaran **+10%** (sudah dikerjakan) | Anda bilang "kesulitan normal aja dikurangi". Ini satu-satunya angka yang diubah, supaya playtest ketiga mengukur satu hal, bukan dua |
| Tombol "Mulai" → **level select** untuk mode terakhir, bukan level langsung | Keputusan B supaya tetap ada satu langkah (*mode → level → main*) |
| Chip **lebar tetap 1/3**, animasi slide dari kanan 350ms | Chip yang meregang membuat antrean terlihat seperti banner. Lebar tetap + animasi lebih informatif |
| Kesabaran **dimulai setelah chip tiba** (+1 detik/pelanggan) | Aturan 11: walkout tidak boleh dipicu chip yang masih slide, belum bisa diketuk |
| `queue__next` teks tetap di bawah strip | Ditunda — belum ada yang memutuskan isi slot kosong |
| Roster per mode | Belum diputuskan, menunggu playtest |
| Mode tetap 3, bukan 15 level datar | Sudah ditinjau: 3 x 5 = 15 level juga, mode memetakan ke kelas 7/8/9, dan tangga operator per mode adalah alat keamanan solvability |

**Yang terbukti berasal dari playtest, bukan dari mekanik game:**

- 14 bug ditemukan dan diperbaiki, **tidak ada satu pun dari unit test**
- 12 dari 15 level ternyata tidak pernah bisa tamat
- 42-66% soal Hard tidak bisa diselesaikan
- ~~Rata-rata 43-100% soal punya jalan pintas~~ → **diukur ulang: 0-25%**
  (lihat bagian 4 dan `CHANGELOG.md` bagian Measured). Angka lama terlalu
  tinggi karena pengukuran lama tidak ekshaustif
- Drag tidak pernah terlihat bergerak, dan drop-nya diam-diam gagal
- `2³ = 8` tidak bisa disajikan, padahal jawabannya sudah benar di piring

### Urutan besok

1. **Anda playtest** dengan build kaidah operasi, isi `PLAYTEST.md`, kirim.
2. **Paralel: saya perbarui dokumentasi** — sudah ditulis, tinggal review
   akhir sebelum submit.
3. Setelah data playtest masuk: kalibrasi angka (bagian 2).

### Yang paling penting untuk diketahui sebelum mulai

1. **Rubrik lomba belum didapat.** Ini yang paling lambat dan paling di luar
   kendali. Sudah diminta ke panitia? Kalau belum, hari ini juga.
2. **Materi submission belum dimulai.** Deskripsi dan checklist sudah ada di
   `SUBMISSION.md`, tapi video demo butuh rekaman layar dari playtest.
3. **Jangan percaya test yang hanya main Easy level 1.** Kalau sebuah level
   belum pernah dimainkan dari menu sampai overlay, ia belum terbukti.
4. **Dialog konfirmasi belum pernah diuji di 320px.** Smoke test membukanya di
   390px. Kalau playtest pakai HP kecil, perhatikan itu.

Urutan pekerjaan:

### 1. Playtest di HP asli - 1-2 jam (waktu manusia, blocker utama)

Ikuti **`PLAYTEST.md`**: lima run (Easy L1, Easy L5, **Hard L1**, Medium L1,
Hard L3), isi formulirnya, kirim balik. Sekalian rekam layar 30-60 detik per run
untuk video demo.

**Cara membuka game di HP:** `python -m http.server 8099 --bind 0.0.0.0` di
`C:\Users\ASUS\Documents\cooking_number`, lalu buka `http://192.168.1.6:8099/`
dari HP pada WiFi yang sama. Harus lewat HTTP, `file://` diblokir CORS. Untuk
membuka semua level sekaligus: `localStorage.setItem('cn.progress',
'{"easy":5,"medium":5,"hard":5}')` lalu reload.

Yang sudah otomatis terukur dan tidak perlu dicatat lagi: semua 15 level
solvable dari bahan yang tampil di layar, dan tidak ada walkout yang terjadi
karena salah klik.

### 2. Kalibrasi dari hasil playtest - 1 jam

- [ ] Setel ulang angka di `src/core/difficulty.js` berdasarkan data playtest.
      Semuanya di satu file, jadi tidak ada logika yang tersentuh.
- [ ] Putuskan roster per mode atau satu tangga bersama (lihat open item di
      bawah).
- [ ] Perbaiki teks i18n yang belum natural saat dibaca.
- [ ] Kalau playtest menunjukkan mengetuk chip masih membingungkan tanpa
      tombol, pertimbangkan penanda tambahan di stand. Jangan kembalikan
      tombolnya sebelum jelas apa yang kurang.

### 3. Mockup alur - [x] selesai

- [x] Tombol "Masak untuk dia" dihapus: ketuk chip langsung memuat stand
- [x] Teks "Building a dish for X" dan salinan potret di stand dihapus
- [x] Popup konfirmasi pindah pelanggan kalau stand berisi lebih dari 2 tile,
      dan jam berhenti selama popup terbuka
- [x] Drag-serve dihapus; tile masih bisa diseret ke stand
- [ ] **Putuskan setelah playtest**: apakah menyajikan cukup lewat tombol
      Sajian saja (satu jalur, tidak mungkin salah), atau mengetuk piring
      ditegaskan sebagai jalur kedua (lebih cepat di layar kecil, tapi dua
      tempat untuk dipelajari). Playtest kedua yang memutuskan.

### 4. Kaidah operasi - [x] selesai

Sudah dikerjakan 28 September 2026. PR D §4 ternyata **tidak pernah** mengunci
left-to-right — hanya AGENTS.md aturan 3 yang melakukannya, jadi hanya satu
dokumen yang perlu direvisi di sana, bukan tiga.

- [x] `evaluate.js` parse rantai dengan kaidah operasi (shunting-yard). Piring
      tetap menampilkan nilai sebenarnya, cuma melompat, bukan rusak
- [x] `generator.js` backward peel sadar precedens. `x` dan `:` tidak boleh
      diikuti `+` atau `-` dalam satu rantai, supaya peel backward tetap valid
- [x] Solver smoke test ikut kaidah, plus test regresi `2 + 3 x 4` = 14
- [x] Semua teks "left-to-right" diganti jadi kaidah operasi di README,
      AGENTS.md aturan 3, SUBMISSION.md, dan CHANGELOG
- [x] **Jalan pintas soal diukur ulang sebelum dan sesudah.** Hasilnya berbalik
      dari dugaan awal: shortcut rate justru turun dari 0-25% jadi 0-15%. Rantai
      yang dirancang jadi lebih panjang, jadi tidak ada operator ladder yang
      perlu diketatkan

### 5. Musik latar dan efek suara - [x] selesai

`theme.mp3` sudah ada dan sudah dipasang. Tiga pertanyaan sudah dijawab: musik
hanya saat main, loop per level, efek suara perlu.

- [x] `theme.mp3` dipindahkan ke `assets/placeholder/`
- [x] `src/ui/audio.js` baru: musik loop per level, mulai setelah interaksi
      pertama (browser memblokir autoplay), pause saat `visibilitychange` ke
      hidden, status mute di `localStorage` (`cn.muted`), `try/catch` di sekitar
      `play()` supaya game tetap jalan tanpa file
- [x] `index.html`: `<audio data-audio-music loop preload="none">` + tombol
      mute di HUD
- [x] `i18n.js`: `action.toggleMute` + `action.unmute`, EN dan ID
- [x] `styles/`: tombol mute 44x44px, slash saat mute, tidak menggeser layout
- [x] Efek suara: `playArrive` (saat chip mulai masuk), `playServe` (saat
      hidangan disajikan), `playWalkout` (saat pelanggan pergi) — disintesis
      dengan Web Audio API, bukan file. Efeknya instan dan tidak menambah aset
      biner
- [x] Smoke test: assertion baru untuk mute button (ada, aria-label, aria-pressed,
      loop, preload="none")

**Catatan:** efek suara masih placeholder (tone oscillator, bukan desain suara
beneran). Kalau tim punya file SFX, cukup ganti isi `playArrive`/`playServe`/
`playWalkout` di `audio.js` — titik panggilnya tidak berubah.

### 6. Submission - 3-4 jam (bisa paralel dengan langkah 1-4)

- [ ] Video demo 1-2 menit, dari rekaman playtest
- [ ] Deskripsi proyek, sudah ada di `SUBMISSION.md`
- [ ] Checklist rubrik lomba, sudah ada di `SUBMISSION.md`

### Kalau hanya sempat satu sesi

Langkah 1. Playtest yang sudah tercatat, dengan angka yang sudah diukur
manusia, bukan lagi tebakan.

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
      bagian yang tidak bisa diputuskan dari atas meja. Formulir: `PLAYTEST.md`.
- [x] Tutup celah test Medium dan Hard
- [x] Kelima belas kombinasi mode x level bisa dimainkan dari menu sampai
      overlay, dan setiap pelanggan punya rute dari bahan yang tampil di layar
- [x] Test regresi yang memutar ulang solusi rahasia Medium dan Hard melalui
      `pushTile`, jadi stand dipaksa menepati jaminan solvability yang sama
      dengan core
- [x] Lebar 320px dan 1280px diperiksa otomatis di smoke test
- [x] Barisan pelanggan muat di layar 320px. `MAX_ON_SCREEN` 3, dan chip
      bisa menyusut: tiga chip butuh 278px dari 320px, jadi tidak ada lagi yang
      tersembunyi
- [x] Sinyal kesabaran hidup: kuning di bawah 2/3, merah di bawah 1/3
- [x] Nilai akhir jadi pita di tengah piring, dan piringnya tetap terlihat
- [x] Akar kuadrat ditulis `√16` dalam satu slot
- [x] Drag tile terlihat mengikuti jari (ditemukan lewat playtest)
- [x] Urutan operator biner per level benar-benar diterapkan di rak
- [x] Kepadatan pecahan Medium di bawah Hard, jadi urutan mode berlaku pada
      materi dan bukan cuma pada operator
- [x] `npm run check:styles`: variabel CSS yang hilang tidak bisa lolos diam-diam
- [x] Angka kesabaran +10% di ketiga mode (Easy 55→53→51→48→46, Medium 48→46→44→41→37, Hard 42→40→36→33→31). Playtest kedua melaporkan selesai dengan bar kesabaran merah di Medium; angka sengaja tidak disentuh lagi sampai playtest ketiga.
- [x] **Antrean animasi selesai:** chip lebar tetap 1/3 layar, slide-in 350ms dari kanan, FLIP geser kiri, flag `arriving` +1 detik grace, countdown disembunyikan selama animasi. `queue__next` teks tertunda — tidak diputuskan isi slot kosong.
- [ ] Uji drag di perangkat asli: apakah drag merebut scroll halaman
- [ ] Styling akhir dan polish

## Fase 4 - Submission - [ ]

- [ ] Materi submission: video demo (bisa dari rekaman playtest) dan deskripsi
      yang sudah ada di `SUBMISSION.md`
- [ ] Checklist rubrik lomba, sudah ada di `SUBMISSION.md`
- [ ] Nice-to-have hanya kalau benar-benar ada waktu kosong: suara, animasi
      karakter, leaderboard lokal. **Prioritaskan playtest dan video demo dulu.**

---

## Keputusan yang masih ditunggu tim

- [ ] **Rubrik dan buku panduan lomba.** Sudah diminta ke panitia? Ini yang
      paling lambat dan paling di luar kendali kita, jadi harus digesa.
- [ ] Hasil kalibrasi spawner dan kesabaran di HP asli
- [ ] Aset visual final dari tim (SVG/PNG/WebP) plus style reference
- [ ] **Roster per mode atau satu tangga bersama?** PRD §5.7 menulis
      "Easy 4→6, Hard 6→8", tapi implementasi memakai satu tangga
      `[4,5,6,7,8]` untuk ketiga mode (`difficulty.js:20`), jadi Hard L1
      menyajikan 4 pelanggan, bukan 6. Playtest yang memutuskan: kalau Hard L1
      terasa terlalu tipis atau terlalu singkat, roster per mode adalah dial
      pertama yang diputar.
- [ ] **`queue__next` teks.** Chip yang baru datang sekarang hanya mengisi
      satu slot, jadi ada slot kosong di antrean. Teks "Berikutnya 8 detik"
      bisa dipindahkan ke slot kosong, atau dibiarkan di bawah strip. Belum
      ada yang memutuskan — tunda sampai playtest ketiga.
- [x] **Tangga operator biner per level sudah diterapkan di rak.**
      `assets.js` pernah menaruh keempat operator biner di setiap level dan
      mengabaikan `band.binaryOps`, jadi Easy L1 menampilkan `x` dan `/` padahal
      tidak ada soal Easy L1 yang memakainya. Generator sudah membatasi dengan
      benar, jadi solvability tidak pernah rusak; yang rusak adalah level 1 yang
      tidak sesederhana yang dirancang PRD §5.1. Sudah diperbaiki **sebelum
      playtest**, jadi semua 15 level yang akan diukur adalah game yang
      benar-benar dimaksud. Ditahan oleh `test/assets.test.js` dan assertion
      smoke test per level.
- [ ] **Mode tetap tiga, bukan 15 level datar.** Sudah ditinjau dan
      dipertahankan: 3 x 5 = 15 level juga, mode memetakan ke kelas target
      7/8/9 (PRD §5.1) dan kartu mode sudah menampilkannya, dan tangga operator
      per mode adalah alat keamanan solvability — digabung jadi satu, level 1
      harus `+ -` untuk semua orang dan akar baru muncul di level akhir.

## Di luar scope

- Tanpa backend. Progres lokal via `localStorage` sebagai nice-to-have.
- Tanpa service worker pada fase ini.
- Bahasa tambahan selain English dan Indonesia.
- Tanpa papan skor bersama. Tidak ada akun, tidak ada data pemain.
