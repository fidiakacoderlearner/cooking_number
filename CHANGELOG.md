# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di berkas ini.

Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Redesign inti: pelanggan berdatangan berkala.** Level tidak lagi berisi
  satu pelanggan dengan satu pesanan. Pelanggan datang satu per satu pada
  interval yang ditentukan mode dan level, dan menumpuk kalau pemain lambat.
  Tekanan dibangun dari kecepatan kerja pemain, bukan dari berapa pesanan yang
  ditumpuk sekaligus di awal.
- **Nyawa dihapus total.** Tidak ada lagi `lives`, penalti, atau state
  game-over. Kegagalan diwujudkan sebagai **walkout**: pelanggan pergi tanpa
  reward, tanpa pelanggan pengganti, dan tanpa kesempatan kedua. Level selalu
  selesai; yang membedakan level adalah skor.
- **Tidak ada lagi pengurangan skor.** Walkout tidak mengurangi apa pun.
- **Kesabaran per pelanggan** menggantikan satu timer per level. Setiap
  pelanggan punya timer sendiri yang berjalan bersamaan dengan yang lain.
- **Spawner berkala dengan tiga sifat:** interval dasar per mode dan level,
  jitter supaya tidak terasa seperti metronom, dan decay supaya pelanggan
  berikutnya makin cepat. Ada batas jumlah pelanggan di layar; saat penuh
  spawner berhenti, bukan menolak pelanggan.
- **Hitung mundur pelanggan berikutnya wajib terlihat**, agar tekanan terasa
  seperti memburu waktu, bukan seperti kejutan acak.
- **Satu stand, satu hidangan.** Dapur hanya bisa memasak untuk satu pelanggan
  pada satu waktu, dan bahannya adalah milik pesanan itu. Inilah yang membuat
  "pembatasan bahan" bekerja sebagai difficulty lever tanpa merusak jaminan
  solvability.
- **Alur served jadi lima langkah eksplisit:** pilih pelanggan, masak untuk
  dia, masak, hidangan jadi, sajikan. Memindahkan pelanggan tidak pernah
  menghapus pekerjaan yang sedang berjalan.
- **Menyajikan dalam keadaan salah itu mungkin dan itu memang mekaniknya.**
  Pemisahan `hasDish()` dan `isCorrect()` membuat tombol Sajian menyala begitu
  rantai utuh, bukan hanya ketika hasilnya benar.
- **Operator progresif per level**, bukan hanya per mode. Easy mulai dari
  `+ -` saja, dan operator baru muncul seiring level naik.
- **Nama game: Number Kitchen menjadi Cooking Number.**
- Tagline: "Cook the number the customer ordered." menjadi
  "Cook the number. Serve the customer.".

### Removed
- `TIMER_SECONDS`, `LIVES_PER_LEVEL`, `ORDERS_PER_LEVEL`, `ordersForLevel()`
  dari `src/core/difficulty.js`.
- `generateLevel()` dari `src/core/generator.js`. Roster pelanggan di-spawn
  satu per satu, jadi tidak perlu lagi membuat seluruh level sekaligus.
- `applyWrong()`, `PENALTY_TIMEOUT`, `PENALTY_WRONG`, dan `PHASES.IDLE` serta
  `PHASES.SERVED` yang tidak pernah dibaca.
- Sel nyawa dari HUD, dan seluruh string `hud.lives`.

### Fixed

Ditemukan lewat review, `scripts/smoke-ui.js`, dan test regresi baru — bukan
oleh unit test yang sudah ada. Test sebelumnya hanya mencakup core plus
Easy level 1, yang kebetulan merupakan satu-satunya level tanpa operator
unary dan dengan roster tepat 4, jadi tidak satu pun dari bug di bawah
mungkin terlihat dari sana. Jaminan solvability di `src/core` sendiri benar
sepanjang waktu; yang belum pernah diuji adalah apakah stand bisa
**disusun** mengikuti solusi itu.

- **12 dari 15 level tidak pernah bisa diselesaikan.** Batas `MAX_ON_SCREEN`
  dihitung dari `state.orders.length`, yaitu seluruh pelanggan yang pernah
  dibuat. Pelanggan yang sudah tersaji tetap tinggal di array itu untuk
  keperluan skor dan rekap, jadi hitungannya tidak pernah turun lagi dan
  spawner berhenti permanen setelah pelanggan keempat. Semua level dengan
  roster di atas 4 — yaitu level 2 sampai 5 di ketiga mode — menggantung di
  `phase: playing` selamanya dan overlay level-complete tidak pernah muncul.
  Sekarang batas itu dihitung dari pelanggan yang benar-benar masih di layar
  (`activeOrders`), sama seperti yang dibaca `view.js` untuk barisan antrean.
  Test lama ("the spawner holds instead of overflowing the screen") justru
  mengunci bug ini, karena ia memeriksa `orders.length <= MAX_ON_SCREEN`,
  yang memang selalu terpenuhi pada kode yang salah.
- **Sekitar 42% soal Hard level 1 dan 66% soal Hard level 3 tidak bisa
  diportion.** `isPlayable` mensyaratkan rantai berakhir dengan angka, padahal
  generator secara rutin membuat langkah terakhir puzzle berupa unary, misalnya
  `2³ − 7 × 3 + 1`. Pemain menyusun hidangan yang benar, tombol Sajian tidak
  pernah menyala, dan stand hanya bisa dikosongkan. Rantai yang berakhir pada
  pangkat atau akar sekarang dianggap selesai.
- **Operator setelah unary ditolak padahal sudah diterima.** `canAccept`
  mengizinkan operator biner sesudah `²`, tapi `isPlayable` menolaknya, jadi
  langkahnya masuk ke stand lalu stand itu dinyatakan tidak bisa diportion.
  Aturan alternasi angka/operator sekarang sama persis di keduanya: sebuah
  langkah unary tidak memutus alternasi, hanya mengikuti nilai.
- **Langkah unary dinilai terhadap nilai yang salah.** `pushTile` memvalidasi
  `√` dan `²` terhadap nilai tile di depannya, padahal `evaluate` menerapkannya
  ke running total. Pada `1 + 3 ²` yang dikuadratkan adalah 4, bukan 3.
  Akibatnya langkah yang legal ditolak (pemain tersesat dan tidak punya jalan
  lain) dan langkah yang salah diterima (stand berisi rantai yang tidak akan
  pernah bisa disajikan). Validasi sekarang memakai nilai rantai berjalan.
- **Dua unary beruntun tidak bisa disusun.** Generator memproduksinya pada 18%
  soal Hard level 3 dan 19% level 5, sementara stand menolak unary setelah
  unary. Karena bahan stand adalah subset dari solusi, ada pelanggan yang
  kehilangan seluruh rutenya: level yang secara matematika solvable tetapi
  mustahil dimainkan. Sekarang `2 ² ²` boleh disusun, sama seperti yang sudah
  diperlakukan `evaluate` di core.
- **Jam tidak pernah bergerak sama sekali.** `lastTick` di-update *sebelum* cek
  "sudah lewat satu detik belum", sehingga tiap frame 250 ms membuang pecahan
  detik yang sudah terkumpul dan `elapsed` tidak pernah mencapai 1000 ms.
  Akibatnya tidak ada pelanggan yang pernah datang dan kesabaran tidak pernah
  berkurang. Bug ini sudah ada di versi 1.0 dan lolos karena tidak ada satu pun
  test yang menunggu waktu lewat di browser.
- **Level 2 dan seterusnya tidak pernah terbuka.** `writeProgress` menyimpan
  level yang sedang dimainkan, bukan level yang selesai, sehingga nilai tertinggi
  yang tersimpan tidak pernah naik dari 1 dan level berikutnya selalu terkunci.
  Progres dipindah ke modul pure `src/ui/progress.js`.
- **Bagi nol tidak pernah dicegat.** Generator tidak pernah menaruh nol di rak
  sebagai bahan, jadi penjaga yang lama ("bagi dengan kartu nol") tidak pernah
  bisa terpicu. Yang bisa terjadi di permainan nyata adalah total berjalan yang
  jadi nol sendiri (`5 - 5`), dan itu sekarang ditolak dengan
  `work.invalidDivision`.
- **Pesan "mulai dari angka dulu" tidak pernah muncul.** Pemeriksaan urutan
  menutup jalan ke pesan yang lebih spesifik sebelum pesan yang lebih spesifik itu dicek, sehingga
  pemain hanya pernah melihat "langkah itu tidak bisa dipakai di sini".
- **Mengetuk chip pelanggan akan langsung menyajikan.** Chip adalah drop zone
  serve, jadi penangan ketuk di `drag.js` salah membacanya sebagai "sajikan yang
  ada di stand". Sekarang hanya piringnya sendiri yang memicu serve.
- Keluar dari level di tengah transisi melempar `TypeError` pada versi 1.0.
  Jalur serve yang ditunda dihapus seluruhnya, sehingga kelas bug ini tidak ada
  lagi.
- Dua import mati di layer UI: `toDisplayString` di `controller.js` dan `t` di
  `drag.js`. `scripts/check-imports.js` tidak pernah memindai `src/ui`, jadi
  keduanya lolos tanpa terdeteksi. Checker sekarang memindai kedua layer.
- Solver di dalam `smoke-ui.js` pernah membawa salinan aritmetik pecahan sendiri
  yang membuang tanda setiap angka negatif, sehingga ia mengembalikan rantai
  yang tidak sampai target dan menyalahkan game. Sekarang solver memakai
  `applyOperator` dan `equals` dari core asli, jadi hanya bisa berbeda dari game
  kalau game berbeda dari dirinya sendiri.


### Added
- **`scripts/smoke-ui.js` bisa memainkan level mana pun.** Loop "main sampai
  overlay muncul" dipecah menjadi `playOneLevel(page, { mode, level })`, jadi
  Medium dan Hard sekarang ikut diuji otomatis, bukan hanya dilihat-lihat
  label operatornya.
  - Default: Easy L1, Medium L1, Hard L1, dan Hard L3 — level pertama yang
    membuka `√` sekaligus tempat dua unary beruntun mulai muncul.
  - `npm run smoke -- --only easy` untuk loop cepat, `npm run smoke:all` untuk
    kelima belas kombinasi mode x level.
  - Level di atas 1 dibuka lewat seed `localStorage` yang meniru apa yang
    dilakukan game saat sebuah level selesai, jadi tiap level tidak bergantung
    pada level sebelumnya dalam run yang sama.
  - Solver di dalam test diberi `maxSteps` dari band level tersebut, bukan
    angka tetap, dan cabang mati di-memoize supaya tujuh bahan dan tiga
    operator unary di Hard tidak meledakkan waktu pencarian.
- **Test regresi `every puzzle the stand is offered can actually be built on
  it`** di `test/state.test.js`: memutar ulang solusi rahasia 720 puzzle
  (Medium L1 dan Hard L1-5, 120 seed masing-masing) melalui `pushTile` satu per
  satu. Ini satu-satunya test yang memaksa stand menepati jaminan yang sama
  dengan core, dan test inilah yang menemukan keempat bug unary di atas.
- **`PLAYTEST.md`** — formulir playtest HP: cara membuka game di perangkat,
  lima run yang harus dicatat, apa yang harus dilaporkan balik, dan daftar
  kejadian yang harus dilaporkan sebagai bug dan bukan disetel.
- Smoke test mengukur antrean pada 320px: barisan chip butuh 414px untuk empat
  pelanggan sedangkan viewport-nya 320px, sehingga dua chip berada di luar
  layar. Dicatat sebagai `note` untuk dikonfirmasi di playtest, karena target
  sentuhnya sendiri tetap aman di 66px.
- Struktur dokumen proyek: `AGENTS.md`, `CHANGELOG.md`, `PLAN.md`.
- **UI playable** (`index.html`, `styles/`, `src/ui/`)
  - `i18n.js` - semua string UI, English sebagai default, toggle ID/EN.
  - `assets.js` - path placeholder WebP dan definisi palet operator.
  - `state.js` - state permainan, ekspresi, dan formula skor.
  - `view.js` - seluruh render DOM, tanpa aritmetika.
  - `drag.js` - drag-and-drop `interact.js` plus tap-to-place.
  - `controller.js` - loop permainan, timer, dan transisi.
  - `app.js` - titik masuk.
- **Gaya toon-toon** (`styles/base.css`, `layout.css`, `theme.css`,
  `animations.css`): warna solid, satu warna outline, tanpa gradien,
  menghormati `prefers-reduced-motion`.
- **Aset placeholder WebP** (`assets/placeholder/`): latar, meja, piring,
  topi koki, dan 3 varian pelanggan, dibuat datar dan geometris oleh
  `scripts/make-placeholder-assets.py` agar mudah diganti aset tim.
- `vendor/interact.min.js` (interact.js 1.10.27, sekitar 96 KB) divendor lokal.
- `favicon.ico`, `manifest.webmanifest`, dan ikon 192 px.
- Tombol keluar di HUD, supaya pemain tidak terjebak di dalam level.
- `scripts/smoke-ui.js` - mengendarai game sungguhan di Chrome.
- `scripts/check-imports.js` - mendeteksi unused import.

### Keputusan Teknis
- **Gagal = walkout.** Tidak ada nyawa, tidak ada level gagal, tidak ada
  pelanggan pengganti. Pelanggan yang hilang hanya mengurangi skor yang bisa
  didapat, bukan membatalkan level.
- **Bahan stand milik pelanggan yang sedang dimasak.** Kalau bahan semua
  pelanggan bercampur, pemain bisa menghabiskan bahan milik satu pesanan untuk
  pesanan lain dan membuat level mustahil diselesaikan.
- **Pindah pelanggan tidak menghapus apa pun.** Aksi yang merusak hanya boleh
  dipicu secara sadar; walkout karena salah klik adalah kegagalan desain.
- **Spawner berhenti, bukan menolak**, saat layar penuh. Pelanggan yang tidak
  bisa masuk bukan walkout, karena itu bukan salah pemain. Batas "layar penuh"
  dihitung dari pelanggan yang masih aktif, bukan dari pelanggan yang pernah
  datang, supaya level dengan roster besar tetap bisa diselesaikan.
- **Rantai yang selesai adalah rantai yang tidak menunggu operand lagi**, jadi
  boleh berakhir pada `²`, `³`, atau `√` — bukan hanya pada angka. Stand
  menuntut angka di akhir sebenarnya membuat 42% soal Hard level 1 mustahil
  diportion.
- **Aturan "`canAccept` dan `isPlayable` harus sepakat"** jadi prinsip, bukan
  kebetulan. Langkah yang diterima tapi tidak dianggap sah menghasilkan stand
  yang tidak bisa diportion, dan itu keempat bug unary berasal dari satu
  pemisahan aturan yang tidak sinkron.
- Timer awal: Easy 50 detik, Medium 44 detik, Hard 38 detik kesabaran; interval
  dasar 15, 12, dan 10 detik. Semua angka ini titik awal untuk playtest di HP
  asli, dan formulirnya ada di `PLAYTEST.md`.
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
