# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di berkas ini.

Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Kartu mode di layar pilih mode lebih sempit dan tidak segaris dengan tombol
  Back di layar lebar.** `.menu__modes` dibatasi `min(100%, 30rem)` (480px)
  sementara `.screen__footer .btn` memakai `width: 100%`, jadi di layar 1280px+
  tombol Back membentang sampai tepi layar sementara kartu berhenti di 480px.
  `.screen--modes` juga tidak punya `align-items`, jadi kartu menempel di kiri
  saat tombol melebar penuh. Sekarang `.menu__modes` dan
  `.screen--modes .screen__footer` berbagi `--menu-width` (30rem) dan di-rata
  tengah. Level select sengaja dibiarkan full-width karena grid-nya memang
  mengisi layar. Smoke test mengukur lebar dan posisi keduanya di viewport
  1280px, di mana bug-nya kelihatan (di lebar HP, `min(100%, 30rem)` kolaps ke
  100% dan tidak ada yang bisa diukur).

### Added
- **Rasio pelanggan terlayani terbaik di kartu level.** Setiap level yang sudah
  diselesaikan menampilkan `{served}/{total} served` (EN) atau `{served}/{total}
  terlayani` (ID) di atas baris skor. Rasio ini adalah ukuran yang jujur tentang
  sebuah level: skor bisa tinggi dari tiga pelanggan yang dilayani cepat,
  sementara `6/7` mengatakan seberapa dekat pemain dengan mengosongkan ruangan.
- **Skor tertinggi per level di kartu level.** Setiap level yang sudah
  diselesaikan menampilkan "Tertinggi: N" di bawah jumlah pelanggan. Disimpan di
  key terpisah `cn.scores` (bentuk `{ "easy:1": { score: 180, served: 6, total: 7 } }`),
  bukan dicampur ke `cn.progress`, supaya satu tidak bisa merusak yang lain.
  **Dihitung per level**, tidak pernah dibandingkan antar level: `SCORE_BASE` beda
  per mode (10/15/20) dan roster tumbuh dari 4 ke 8 pelanggan, jadi skor Hard
  level 5 selalu lebih besar dari Easy level 1. Satu "best global" akan
  dimenangkan Hard level 5 di percobaan pertama dan tidak akan pernah bisa
  dikalahkan. New Game ikut menghapus `cn.scores`, karena skor tertinggi di level
  yang terkunci lagi adalah pencapaian yang tidak bisa dijangkau pemain.
- **Skor dan rasio terbaik dipertahankan secara independen.** Keduanya berasal
  dari dua pertanyaan berbeda — skor menghargai kecepatan, rasio menghargai
  kejujuran menyelesaikan semua pelanggan. Jika hanya menyimpan run dengan skor
  tertinggi, pemain yang sudah mengosongkan ruangan akan melihat rasio dari run
  lain yang kebetulan skornya bagus, yang bertentangan dengan makna "hasil
  terbaik di sini".
- **Menu dalam level: satu tombol hamburger.** Dua tombol di HUD (hamburger quit
  dan tombol musik) digabung jadi satu. Ditekan, muncul panel kecil berisi
  tombol musik (label menyebut aksinya: "Musik: Menyala" saat mati, "Musik: Mati"
  saat menyala, plus `aria-pressed` untuk statusnya) dan tombol Keluar. Tombol
  keluar **langsung ke layar level select**, bukan menu, karena pemain yang
  keluar di tengah level biasanya ingin pilih level lain di mode yang sama.
- **Konfirmasi sebelum keluar dari level.** "Keluar dari level ini?" dengan
  jawaban aman "Lanjut bermain" yang mendapat fokus keyboard, dan jam berhenti
  selama dialog terbuka. Ini aturan 11: hidangan di stand adalah pekerjaan yang
  tidak bisa dikembalikan, jadi keluar harus disengaja. Dialog ini memakai
  dialog konfirmasi yang sama dengan dua pertanyaan lain.

### Changed
- **Tombol yang mati sekarang terlihat mati.** `.btn:disabled` diberi latar abu
  (`--plate-shade`), teks abu (`--ink-soft`), tanpa bayangan, tanpa animasi
  tekan. Sebelumnya hanya `cursor: not-allowed`, jadi Continue yang mati tetap
  tampak putih seperti tombol hidup — pemain menekannya, tidak terjadi apa-apa,
  dan tidak tahu apakah tombolnya atau gamenya yang rusak.
- **Tombol Back di layar pilih mode dan level select pindah ke bawah, selebar
  layar.** Sebelumnya tombol kecil di header, di samping judul. Sekarang di
  footer yang menempel ke tepi bawah layar, tempat jempol mengharapkannya.
- **Kartu level mengisi tinggi layar.** Grid level sekarang mengambil sisa
  tinggi setelah judul dan tombol Back, dengan tiga baris sama tinggi untuk lima
  level (baris terakhir satu kartu). Sebelumnya kartu menumpuk di atas dan
  menyisakan ruang kosong di bawah. Di layar lebar jadi 3 kolom x 2 baris.
- **Kartu level terkunci sekarang benar-benar terlihat terkunci.** Kelas
  `is-locked` sudah dipasang view sejak dulu tapi **tidak punya aturan CSS sama
  sekali**, jadi level terkunci digambar persis seperti level terbuka kecuali
  glyph gemboknya. Sekarang latar abu, teks abu, tanpa bayangan.
- **Tombol "Menu" di overlay level selesai jadi "Pilih level"** dan menuju layar
  level select, bukan menu. Level selesai adalah momen memilih mau main apa
  berikutnya, dan layar pilih mode satu ketukan lebih jauh.
- **Tiga pertanyaan konfirmasi berbagi satu dialog dengan satu objek
  `pendingConfirm`.** Sebelumnya `pendingOrderId` dan `pendingReset` adalah dua
  variabel terpisah; menambah pertanyaan ketiga (keluar level) sebagai boolean
  ketiga adalah tempat bug bersembunyi.
- **Tombol New Game dan Continue di menu utama.** Menu sekarang punya empat
  tombol: New Game, Continue, How to play, dan toggle bahasa. New Game menghapus
  progress lalu masuk ke layar pilih mode. Continue melewati penghapusan dan
  langsung ke layar yang sama, sehingga level yang sudah terbuka tetap terlihat
  di layar level select. Satu tombol "Play" sebelumnya tidak bisa membedakan
  kedua niat itu.
- **Konfirmasi sebelum menghapus progress.** New Game menampilkan dialog
  "Mulai ulang?" yang menjelaskan apa yang akan dihapus, dengan jawaban aman
  ("Pertahankan progress") yang mendapat fokus keyboard. Ini mengikuti aturan 11
  AGENTS.md: menghapus semua level yang sudah selesai adalah tindakan yang tidak
  bisa diurungkan, jadi harus berupa tombol yang ditekan dengan sengaja, bukan
  efek samping dari mengetuk yang salah. Kalau belum ada progress, tidak ada yang
  dihapus sehingga tidak ada dialog yang muncul.
- **Continue mati kalau belum ada progress.** Tombol tetap terlihat (abu-abu,
  `aria-disabled`), bukan disembunyikan, supaya tata letak menu tidak bergeser
  saat progress bertambah.
- **`hasProgress()` di `src/ui/progress.js`.** Mengembalikan `true` kalau
  pemain sudah menyelesaikan minimal satu level di mode mana pun.
- **Tombol Play diganti New Game dan Continue.** Alur: `menu → New Game / Continue
  → pilih mode → pilih level → main`. `action.start` di i18n diganti jadi
  `action.newGame` dan `action.continue`.
- **`showResetConfirm()` dan `showSwitchConfirm()` berbagi satu dialog.** Keduanya
  menulis ulang judul, isi, dan label kedua tombol setiap kali dipanggil, supaya
  label "Hapus" dari dialog reset tidak tertinggal di dialog berikutnya yang
  menanyakan hal berbeda.
- **Tombol Back di layar level select kembali ke layar pilih mode**
  (`back-to-modes`), bukan langsung ke menu.
- **Menu utama: kartu mode dipindah ke layar sendiri.** Menu utama sekarang
  hanya berisi topi koki, judul, tagline, dan empat tombol di atas. Alurnya
  `menu → pilih mode → pilih level → main`. Ditemukan lewat inspeksi visual di HP:
  menu utama terasa penuh dan membingungkan saat ketiga kartu mode tampil
  bersamaan dengan tombol.
- **Volume musik diturunkan ke 35%.** `MUSIC_VOLUME = 0.35` di `audio.js`
  diterapkan ke elemen `<audio>` di `init()`. Volume penuh di speaker HP
  langsung startling ketika musik mulai di ketukan pertama, dan loop yang
  tidak berhenti selama level berjalan itu paparan panjang, bukan satu
  ketukan. Tiga efek suara (datang/sajikan/walkout) tidak diubah — peak-nya
  sudah 0.06-0.09, relatif pelan, dan mereka feedback yang dibutuhkan pemain.
- **Aturan hitung diganti ke kaidah operasi.** `×` dan `÷` mengikat lebih kuat
  dari `+` dan `−`, dan unary (`²`, `³`, `√`) menempel pada angka di depannya,
  bukan pada running total. `2 + 3 × 4` kini bernilai 14, bukan 20. Alasan:
  playtest kedua melaporkan `-5 + -2 × -1` terbaca 7, padahal kaidah operasi
  yang diajarikan di SMP bilang -3. Aturan lama mengajarkan ketaksamaan yang
  justru membuat siswa salah.
  - `evaluate.js` diimplementasikan ulang sebagai shunting-yard, dengan
    `PRECEDENCE` di `operators.js` sebagai satu-satunya sumber kebenaran.
    `trailingTerm()` dan `unaryOperands()` ditambahkan; `traceValues()` dan
    `formatRecipe()` mengikuti definisi baru.
  - `generator.js`: backward peel sekarang sadar precedens. Semua `+`/`−` harus
    muncul sebelum `×`/`÷` di dalam satu rantai, yang persis aturan yang membuat
    peel backward tetap menghasilkan rantai yang benar saat dinilai.
  - `state.js`: validasi unary memakai nilai yang akan benar-benar diberi unary
    (`pendingOperand`), penjaga bagi-dari-nol memakai ruas kiri yang sebenarnya
    (`trailingTerm`), dan pembagi nol ditolak saat tile-nya ditaruh.
  - Test regresi: `2 + 3 × 4 = 14`, `2 + 3² = 11`, `5 − 5 ÷ 2 = 2.5`.

### Fixed
- **Akar yang tampil di stand berbohong soal aritmetikanya.** `renderWorkspace`
  menulis `√` mengelilingi angka (`√16`), sementara evaluator lama menghitung
  dari kiri ke kanan. Akibatnya `√(2³ + 17)` tampil sebagai `2³ + √17`: bentuk
  precedence untuk nilai yang dihitung left-to-right. Pada 47% soal Hard yang
  punya `√`, bentuk yang tampil menghasilkan angka yang berbeda dari yang
  dihitung, sehingga rantai yang salah baca tidak pernah bisa di-serve. Di bawah
  kaidah operasi bentuk yang sama menjadi benar, jadi tidak ada perubahan render.
- **`2³ = 8` tidak bisa di-serve.** `hasDish()` mensyaratkan minimal tiga tile,
  sehingga rantai unary dua tile ditolak meski sudah menghasilkan jawaban yang
  benar. Ditemukan playtest kedua. Sekarang syaratnya "ada operator", bukan
  "panjang cukup": angka telanjang tetap bukan hidangan, tapi satu langkah unary
  sudah hidangan lengkap.
- **Pangkat beruntun disajikan sebagai langkah terpisah.** `2 ² ²` tampil
  sebagai tiga slot sehingga piring menunjukkan 16 sementara stand
  menampilkan 2, kuadrat, kuadrat. Sekarang dilipat jadi satu pangkat: `2⁴`.

### Added
- `scripts/measure-shortcuts.js` — mengukur berapa persen soal yang bisa
  diselesaikan dengan lebih sedikit tile daripada rantai yang dirancang.
  Script ini yang jadi angka sebelum/sesudah untuk perubahan aturan hitung.
- **Sistem suara lengkap:** `src/ui/audio.js` dengan musik loop per level,
  tombol mute persisten, dan tiga efek suara (datang, sajikan, walkout)
  yang disintesis oleh Web Audio API — tanpa file tambahan. Tombol mute
  di HUD, status persisten di `localStorage`, dan `play()` yang aman dari
  pemblokiran autoplay browser.
- `scripts/smoke-ui.js`: assertion baru untuk musik (loop, preload="none")
  dan tombol mute (ada, aria-label, aria-pressed).
- **Tombol "Mulai" dan overlay "Aturan Main" di menu.** Aturan main dulu hanya
  ada di kepala pemain yang membuatnya; sekarang tertulis di game, dengan
  kaidah operasi, urutan operator, dan apa yang terjadi kalau hidangan salah
  disajikan. Tombol "Mulai" membuka level select untuk mode terakhir, bukan
  untuk level langsung, supaya tetap ada satu langkahsadapan. Dialog Aturan
  Main punya `role="dialog"`, `aria-modal`, dan mengembalikan fokus ke tombol
  pemanggil saat ditutup.

### Changed
- **Chip pelanggan punya lebar tetap 1/3 layar, bukan meregang.** Sebelumnya
  `flex: 1 1` membuat satu pelanggan mengambil seluruh baris, dan barisan
  terlihat seperti banner, bukan antrean. Sekarang tiga slot dengan lebar tetap
  (`calc((100% - 12px) / 3)`), `max-width: 160px` untuk desktop, dan
  `overflow: hidden` di strip.
- **Chip pelanggan bergeser masuk dari kanan, lalu bergeser ke kiri saat slot
  depan kosong.** `slideIntoPlace()` mengukur posisi chip sebelum dan sesudah
  render, lalu menganimasikan selisihnya dengan FLIP. Chip yang baru datang
  mendapat animasi `chip-arrive` 350ms (dari kanan 105% ke 0), dan
  `pointer-events: none` selama animasi agar tidak bisa diketuk sebelum tiba.
- **Kesabaran pelanggan dimulai setelah chip tiba.** `tick()` melewati decrement
  `timeLeft` pada tick pertama untuk order yang baru datang. Ini mencegah
  walkout yang dipicu chip yang masih sedang slide, sesuai aturan 11 AGENTS.md.
  Efeknya: satu detik tambahan per pelanggan, level ~7% lebih panjang.
- **Bar dan countdown di chip disembunyikan selama animasi arrival** supaya
  pemain tidak melihat bar yang sudah bergerak tapi belum bisa acted upon.

### Measured
- Shortcut rate turun, bukan naik seperti yang diasumsikan: 0–25%
  (left-to-right) menjadi 0–15% (kaidah operasi). Rantai yang dirancang jadi
  lebih panjang (rata-rata 3.0 → 3.6 tile di Medium, 3.5 → 4.6 di Hard), dan
  precedence justru menambah cara mencapai target secara tidak seragam.
- `fractionChance` Hard dinaikkan 0.3 → 0.45 supaya Hard tetap punya setidaknya
  sebanyak kartu pecahan milik Medium. Tanpa itu urutan mode terbalik di
  level 1, 2, dan 4.
- Pohon backward-peel Hard jadi lebih ketat di bawah kaidah operasi, jadi
  anggaran attempt di test efisiensi dinaikkan dari 5 ke 10 (floor 0.95).
- Chip 89px di layar 320px (3 chip = 278px), masih jauh di atas minimum tap
  44px. Smoke test probe diperbarui: karena chip sekarang fixed-width, probe
  harus menghapus chip asli sebelum mengukur, bukan menambahnya.

### Changed
- Kesabaran pelanggan dinaikkan 10% di ketiga mode (Easy 50→55, Medium 44→48,
  Hard 38→42). Playtest kedua melaporkan selesai dengan bar kesabaran sudah
  merah di Medium; angka spawner dan kesabaran tidak diubah lagi supaya tidak
  ada dua hal yang berubah sekaligus.
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
- **Menekan chip pelanggan adalah satu-satunya komitmen.** Tombol "Masak untuk
  dia" dihapus, dan teks "Building a dish for 7" beserta salinan potret di stand
  ikut hilang karena chip yang hijau sudah keduanya. Lima langkah jadi empat.
  Playtest meminta elemen lebih sedikit di satu layar.
- **Pindah pelanggan bertanya dulu kalau hidangannya sudah jadi.** Di bawah dua
  kartu, pindah bebas. Di atas itu muncul dialog karena satu ketukan sekarang
  bisa menghapus pekerjaan. **Jam berhenti selama dialog terbuka**, jadi membaca
  dialog tidak pernah menjadi alasan seorang pelanggan pergi, dan dibutuhkan
  supaya konfirmasi ini memenuhi aturan 11 alih-alih melanggarnya. Fokus
  keyboard masuk ke jawaban yang aman.
- **Menyeret hidangan ke pelanggan dihapus.** Playtest selalu memakai tombol
  Sajian dan menyebut drag tidak perlu; satu cara menyajikan lebih mudah dipelajari
  dari tiga. Tile masih bisa diseret ke stand.

### Removed
- `TIMER_SECONDS`, `LIVES_PER_LEVEL`, `ORDERS_PER_LEVEL`, `ordersForLevel()`
  dari `src/core/difficulty.js`.
- `generateLevel()` dari `src/core/generator.js`. Roster pelanggan di-spawn
  satu per satu, jadi tidak perlu lagi membuat seluruh level sekaligus.
- `applyWrong()`, `PENALTY_TIMEOUT`, `PENALTY_WRONG`, dan `PHASES.IDLE` serta
  `PHASES.SERVED` yang tidak pernah dibaca.
- Sel nyawa dari HUD, dan seluruh string `hud.lives`.

### Fixed

- **Gambar piring tertutup nilai.** Nilai akhir diberi `inset: 0` dengan latar
  hijau pekat, jadi ia menutupi `plate.webp` sepanjang 128px. Playtest melaporkannya
  sebagai "gambar piringnya kok hilang". Nilainya kini jadi pita di tengah piring
  dan ukurannya mengikuti isinya, jadi piring tetap terlihat di atas dan bawahnya
  apa pun nilainya. Smoke test mengukur ulang jarak nilai terhadap gambar piring,
  karena regresi ini berasal dari perbaikan sebelumnya.
- **Bar kesabaran jadi abu, bukan kuning.** `var(--butter-deep)` dipakai di dua
  tempat tapi tidak pernah didefinisikan; yang ada `butter-dark`. Properti yang
  memakai variabel tak dikenal hilang begitu saja, jadi fill jadi transparan dan
  yang terlihat adalah jalur abu. Salah satunya sudah rusak sejak awal: garis chip
  yang dipilih tidak pernah kuning.
- **Dua pelanggan sekaligus berstatus "dimasak".** `startCooking` hanya
  menurunkan status `SELECTED`, tidak pernah status `COOKING` sebelumnya. Itu
  aman selama stand harus dikosongkan dulu untuk berpindah, dan tidak lagi
  begitu satu ketukan bisa langsung memindah. Pelanggan yang ditinggalkan tetap
  hijau, jadi layar menunjukkan dua pelanggan yang sedang dimasak.
- **Medium lebih padat pecahan dari Hard.** `fractionChance` Medium 0.40 di atas
  Hard 0.30, jadi mode untuk kelas 8 memberi lebih banyak pecahan daripada mode
  untuk kelas 9. Playtest melaporkan pecahan membuat kewalahan, level 5 Medium
  hanya setengah selesai, dan puncak Medium terasa lebih sulit daripada dasar
  Hard. Sekarang 0.26, diukur ulang: 0.19-0.24 per kartu di Medium melawan
  0.18-0.24 di Hard, dan pecahan per soal justru lebih banyak di Hard karena
  rantainya lebih panjang. Test regresi menahan urutan itu.
- **Kelas `is-ready` di piring tidak pernah punya CSS.** Diterapkan ke DOM tanpa
  aturan yang memakainya.
- **Drag tidak pernah terlihat bergerak, dan drop-nya diam-diam gagal.** Dua
  bug yang saling menutupi. `drag.js` menulis `translate(dx / 2, dy / 2)` ke
  `transform` setiap event, padahal `event.dx` adalah delta sejak event
  sebelumnya, bukan jarak total — jadi tile melompat satu langkah lalu kembali,
  berulang. Offscreen-nya juga dibagi dua tanpa alasan, dan `.tile` punya
  `transition: transform 90ms` yang membuat tile selalu tertinggal di belakang
  jari. Offset sekarang dijumlahkan, `/ 2` dihapus, dan transisi dimatikan saat
  sedang di-drag. Playtest di HP melaporkan "saya tidak melihat bahwa ini sedang
  di-drag", dan itu sebabnya.
- **Begitu drag-nya benar, drop-nya ikut terbongkar.** `end` memulihkan
  `pointer-events` sebelum membaca drop zone, sehingga hit test diambil oleh tile
  itu sendiri yang sedang persis di bawah jari — dan tile berada di rak, bukan
  di drop zone, jadi drop tidak terjadi tanpa tanda apa pun. Bug ini tersembunyi
  selama drag-nya rusak, karena tile yang tidak bergerak tidak pernah ada di
  bawah jari. Zone sekarang dibaca sebelum gaya dipulihkan.
- **Chip pelanggan berkedip sekali per detik.** `.chip` punya animasi
  `pop-in`, tapi `renderChips` membangun ulang node chip setiap render dan
  controller merender setiap detik, jadi animasi "pelanggan datang" diputar
  ulang terus-menerus. Akibatnya sinyal kedatangan kehilangan artinya: semua chip
  berdenyut sama. Animasi sekarang hanya untuk chip yang benar-benar baru.
- **Sinyal "kesabaran hampir habis" tidak pernah muncul.** Kelas `is-urgent`
  sudah ada di CSS sejak awal tapi tidak pernah dipasang oleh kode mana pun, jadi
  tidak ada peringatan visual selain bar yang menyusut. Sekarang dippasang, dan
  dibuat dua ambang: kuning di bawah dua pertiga kesabaran, merah di bawah
  pertiga.
- **Akar kuadrat ditulis terbalik.** `16` lalu `√` tampil sebagai dua kotak,
  terbaca "16 lalu akar", padahal bentuknya `√16`. Akar sekarang membungkus
  nilainya dalam satu slot. Pangkat tidak berubah karena `16²` memang sudah
  benar. Rantai contoh yang diputar balik oleh test: `7 − 3` lalu akar terbaca
  `7 − √3`.
- **Nilai akhir di piring kecil dan melayang di atas piring**, padahal
  komentarnya mengklaim "larger than any other text on the play screen" dan
  `font-size`-nya sama persis dengan target di chip. Nilai kini mengisi piring
  dengan ukuran terbesar di layar. Blok CSS-nya juga terduplikasi dan salah satu
  sudah dihapus.
- **Kartu level dengan tinggi berbeda.** Natural height terkunci 77px dan terbuka
  60px, hanya disamarkan `min-height: 84px` dengan sisa 7px, jadi pada perangkat
  dengan skala font sedikit lebih besar kartu terkunci ikut meninggi. Teks kunci
  dipersingkat.
- **`MAX_ON_SCREEN` 4 -> 3.** Empat chip butuh 414px pada viewport 320px, jadi
  dua di antaranya berada di luar layar dan harus digeser. Playtest di HP juga
  melaporkan tiga chip sudah terasa penuh. Barisannya kini muat 278px.
- **Tombol "Masak" melebar dan mendorong antrean keluar layar.** Labelnya
  dipersingkat karena angka pesanannya sudah tercetak besar di chip yang sama,
  dan kalimat penuhnya dipindah ke `aria-label` supaya pembaca layar tetap
  mendengar pelanggan mana yang dimasak.
- **Tangga operator biner per level tidak pernah diterapkan.** `operatorsForMode`
  menaruh keempat operator biner di setiap level dan tidak pernah membaca
  `band.binaryOps`, jadi Easy level 1 menampilkan `x` dan `/` padahal tidak ada
  satu pun soal Easy level 1 yang memakainya. Generator sudah membatasi dengan
  benar, jadi solvability tidak tersentuh dan tidak ada level yang mustahil —
  tetapi level 1 bukan lagi tutorial alami yang dirancang PRD §5.1, dan komentar
  di `assets.js` maupun `view.js` yang mengklaim keduanya sinkron memang salah.
  Rak sekarang dibangun dari band. Test baru `test/assets.test.js` menahan
  kontrak ini, dan smoke test memeriksa per level bahwa yang di rak persis sama
  dengan yang diizinkan band.

Ditemukan lewat review, `scripts/smoke-ui.js`, dan test regresi baru — bukan
oleh unit test yang sudah ada. Test sebelumnya hanya mencakup core plus
Easy level 1, yang kebetulan merupakan satu-satunya level tanpa operator
unary dan dengan roster tepat 4, jadi tidak satu pun dari bug di bawah
mungkin terlihat dari sana. Jaminan solvability di `src/core` sendiri benar
sepanjang waktu; yang belum pernah diuji adalah apakah stand bisa
**disusun** mengikuti solusi itu, dan apakah yang muncul di layar bisa dibaca
pemain.

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
  diselesaikan.** `isPlayable` mensyaratkan rantai berakhir dengan angka, padahal
  generator secara rutin membuat langkah terakhir puzzle berupa unary, misalnya
  `2³ − 7 × 3 + 1`. Pemain menyusun hidangan yang benar, tombol Sajian tidak
  pernah menyala, dan stand hanya bisa dikosongkan. Rantai yang berakhir pada
  pangkat atau akar sekarang dianggap selesai.
- **Operator setelah unary ditolak padahal sudah diterima.** `canAccept`
  mengizinkan operator biner sesudah `²`, tapi `isPlayable` menolaknya, jadi
  langkahnya masuk ke stand lalu stand itu dinyatakan tidak bisa dibuat.
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
- **Tombol "Masak untuk dia" mendeklarasikan `min-height: 32px`,** di bawah
  gerbang 44x44px di `AGENTS.md`. Pada pengukuran sebenarnya tombol ini tetap di
  atas 44px karena isinya, tapi deklarasinya bertentangan dengan aturan
  dan bisa sewaktu-waktu melintasinya. Sekarang memakai `var(--tap-min)`.
- **Smoke test flak karena halaman bertahan terlalu lama.** Satu tab dan satu
  browser hidup hampir satu jam untuk lima belas level, dan di mesin ini
  halamannya kadang mati di tengah level: detached frame, execution context
  yang hilang, atau target yang tertutup. Sekarang setiap level mendapat
  halaman yang baru dimuat, dan level yang mati karena itu dicoba sekali lagi
  dari halaman bersih. Kegagalan game yang sebenarnya tidak pernah berbentuk
  seperti itu, jadi tidak ada yang disembunyikan oleh percobaan ulang.
  `--only <mode> --level <n>` juga sekarang berarti level itu secara literal,
  bukan irisan dari daftar default.
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

- **`scripts/check-styles.js`** — gagal kalau ada `var(--nama)` tanpa definisi.
  Bug bar jadi abu tidak bisa pertahanan apa pun karena tak ada yang membaca
  CSS. Checker ini menemukan rujukan kedua yang saya lewatkan. Terpasang sebagai
  `npm run check:styles` dan `npm run check`.
- Test untuk aturan baru: satu ketukan memuat stand, pekerjaan di atas dua kartu
  tidak hilang tanpa bertanya, perpindahan kecil tetap bebas, dan hanya satu
  pelanggan yang boleh berstatus dimasak.
- **Pesan skor menyebutkan kecepatannya.** Poin untuk pelanggan sudah memuat
  bonus kecepatan sejak awal, tapi dua skor berbeda terbaca sebagai kejadian yang
  sama, jadi pemain tidak tahu bahwa menjawab cepat itu yang dibayar oleh sisa
  angkanya. Sekarang sebutannya menyebut kata: `ngebut`, `cepat`, `mantap`,
  `lambat`. Tanpa animasi baru, sesuai keputusan playtest.
- **Jalur drag-and-drop sekarang diuji otomatis.** Smoke test sebelumnya hanya
  memakai `element.click()`, jadi tidak satu pun listener `interact.js` di
  `drag.js` pernah berjalan. Sekarang satu section menarik tile angka, operator
  biner, dan `²` ke stand dengan pointer event sungguhan, lalu menarik piring ke
  chip pelanggan dan memastikan skor naik. Gerbang 44x44px di `AGENTS.md` juga
  ditegakkan di dua lebar layar pada seluruh elemen yang bisa disentuh, bukan
  hanya tinggi di bawah 32px pada sebagian elemen.
- **Pemulihan smoke test memakai tab baru, dan tiap level dapat tab sendiri.**
  Satu tab yang hidup lama-lama di mesin ini kadang membuat renderer-nya mati, dan
  frame yang sudah lepas tidak bisa di-reload: reload-nya gagal dengan error yang
  justru memicu percobaan ulang. Sekarang tiap level dan tiap section berjalan di
  tab yang baru dibuat, jadi gerbang bisa dipercaya melewati lima belas level.
- **`test/assets.test.js`** — palet operator rak diuji sebagai kontrak: rak harus
  menawarkan persis operator yang diizinkan band, tangga tidak boleh kehilangan
  operator antar level, pratinjau menu harus menampilkan set terlebar, dan
  pangkat yang ditawarkan harus tetap di dalam batas eksponen band.
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
  diselesaikan.
- **Aturan "`canAccept` dan `isPlayable` harus sepakat"** jadi prinsip, bukan
  kebetulan. Langkah yang diterima tapi tidak dianggap sah menghasilkan stand
  yang tidak bisa diselesaikan, dan itu keempat bug unary berasal dari satu
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
