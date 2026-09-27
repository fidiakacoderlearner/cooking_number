# Product Requirements Document (PRD)
## Game Edukasi Matematika — "Cooking Number"
 
**Untuk:** THE 2ND INTERNATIONAL DIGITAL MATHEMATICS GAME COMPETITION 2026 — Universitas Syiah Kuala
**Deadline submission:** 18–24 Oktober 2026
**Tim:** 2 orang
**Versi dokumen:** 2.0 — Revisi besar setelah fase prototipe
 
> **Perubahan utama dari versi 1.0:** metafora satu pelanggan satu pesanan diganti
> menjadi **dapur dengan pelanggan berdatangan berkala**. Nyawa dihapus total;
> kegagalan diwujudkan sebagai **pelanggan pergi tanpa reward**. Nama game
> dikunci menjadi **Cooking Number**. Rincian di §5.6, §5.8, dan §14.
 
---
 
## 1. Ringkasan Eksekutif
 
Game ini adalah game edukasi matematika berbasis web (mobile-first) yang mengambil metafora dapur ala *Cooking Mama*: pelanggan-pelanggan datang bergantian ke satu stand dapur, lalu pemain harus menyusun angka-angka yang tersedia dengan operator matematika untuk mencapai angka yang dipesan, dan menyajikannya sebelum kesabarannya habis. Game menyasar siswa **SMP (kelas 7–9)**, dengan tiga mode kesulitan (Easy/Medium/Hard) yang kompleksitas matematikanya mengikuti urutan kurikulum SMP.
 
**Nama proyek:** **Cooking Number** (sudah final, lihat §14).
---
 
## 2. Latar Belakang & Tujuan
 
Sesuai *purpose* resmi lomba: *"To increase students motivation and creativity through an exciting English and mathematics game competition."* Game ini dirancang untuk:
 
1. Melatih **number sense** dan fleksibilitas berpikir siswa SMP — bahwa satu angka bisa dicapai lewat banyak jalur berbeda (bukan cuma satu cara "benar").
2. Melatih penerapan operasi hitung campuran (bilangan bulat, pecahan, pangkat, akar) secara aktif dan menyenangkan, bukan sekadar hafalan.
3. Memenuhi kriteria resmi lomba: **freely accessible** dan **memberi manfaat belajar sesuai learning objectives** untuk siswa SMP.
---
 
## 3. Target Pengguna
 
- **Primer:** Siswa SMP kelas 7–9 (usia ±12–15 tahun).
- **Konteks penggunaan:** Individual, kemungkinan besar diakses lewat HP/tablet pribadi (karena itu game dirancang **mobile-first**), bisa juga di sekolah/lab komputer.
- **Asumsi:** Pemain sudah familiar dengan operasi hitung dasar (SD), sehingga game ini berfungsi sebagai *reinforcement* dan pendalaman, bukan pengenalan konsep dari nol.
---
 
## 4. Konsep Game
 
**Genre:** Puzzle edukasi bertema simulasi dapur (time-management ringan, terinspirasi Cooking Mama).
 
**Dasar:** satu stand dapur, satu hidangan yang sedang dimasak pada satu waktu,
beberapa pelanggan yang menunggu bergantian. Berbeda dengan permainan masak
tradisional yang menumpuk pesanan diam-diam, **pelanggan datang dari luar
layar** secara berkala — jadi tekanan terbangun dari seberapa cepat pemain
bekerja, bukan dari berapa yang ditimpa sekaligus di frame pertama.
 
**Siklus level:**
1. Level dimulai dengan **tidak ada pelanggan**. Roster level punya N pelanggan
   (§5.7) yang datang **satu per satu** pada interval yang ditentukan level.
   Hitung mundur pelanggan berikutnya selalu terlihat (§5.5).
2. Pelanggan yang datang membawa **angka target** (misal: 28) dan **kesabaran**
   sendiri, yang mulai berkurang begitu dia sampai.
3. Pemain **memilih** pelanggan tersebut. Stand masih kosong, jadi memilih
   tidak merusak apa pun.
4. Pemain menekan **"Masak untuk dia"** → stand dimuat dengan angka-angka yang
   dibutuhkan pesanan itu (§5.8).
5. Pemain menyusun ekspresi di stand dengan mengetuk kartu angka dan operator
   (misal: 4 × 7), atau drag-and-drop. Tersedia juga tombol Sajikan sebagai
   fallback mobile.
6. Begitu rantai utuh, hidangan **jadi** dan nilai ujungnya terlihat di piring
   (misal `= 28`). Tombol Sajikan menyala.
7. Pemain menyajikan:
   - **Benar** → pelanggan senang, mendapat skor, pergi dengan senang hati.
     Skor mendapat bonus kecepatan berdasarkan sisa kesabaran pelanggan itu.
   - **Salah** → pelanggan **walkout**, **tanpa reward**, tanpa kesempatan
     kedua (§5.6).
8. Jika kesabaran habis → pelanggan **walkout tanpa reward** (§5.6).
9. Level selesai setelah seluruh N pelanggan selesai — tersaji atau walkout.
   Tidak ada level yang gagal; yang membedakan level adalah skor (§5.7).
 
**Karena hidangan bisa disajikan dalam keadaan salah, nilai akhir piring wajib
terbaca jelas sebelum tombol Sajian ditekan** (lihat §6.3). Walkout karena salah
klik tidak boleh menjadi kemungkinan yang menekan pemain anak SMP.
 
**Menyelesaikan level dengan 0 walkout adalah posisi terbaik dan tidak wajib —
pemain tetap boleh menyelesaikan level sambil kehilangan pelanggan.**
---
---
 
## 5. Fitur & Mekanik Inti
 
### 5.1 Operator Matematika (progresif per mode, dan per level)
 
| Mode | Kelas target | Materi & operator |
|---|---|---|
| **Easy** | 7 | Bilangan bulat (termasuk negatif); operator biner +, −, ×, ÷ |
| **Medium** | 8 | Menambahkan pecahan/desimal ke campuran angka; opsional bilangan berpangkat sederhana |
| **Hard** | 9 | Bilangan berpangkat & bentuk akar via operator **unary** (lihat §5.3); kombinasi ekspresi lebih panjang |
 
**Tangga operator per level.** Di dalam satu mode, operator tersedia bertambah
perlahan seiring level naik, sehingga level 1 menjadi tutorial alami:

| | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
|---|---|---|---|---|---|
| **Easy** | `+ −` | `+ − ×` | `+ − ×` | `+ − × ÷` | `+ − × ÷` |
| **Medium** | `+ − ×` | `+ − × ÷` | `+ − × ÷` | `+ − × ÷ ²` | `+ − × ÷ ²` |
| **Hard** | `+ − × ÷ ²` | `+ − × ÷ ² ³` | `+ − × ÷ ² ³ √` | `+ − × ÷ ² ³ √` | `+ − × ÷ ² ³ √` |
 
Konsekuensi yang harus dihormati: **pembatasan operator juga membatasi bahan.**
Generator memakai himpunan operator yang sama persis dengan yang ditawarkan ke
pemain, jadi setiap tier yang dibatasi tetap dijamin solvable (§5.2).
 
### 5.2 Generator Angka & Jaminan "Solvable"
 
**Masalah yang harus dihindari:** angka acak murni bisa menghasilkan target yang mustahil dicapai dari bahan yang diberikan.
 
**Solusi (backward generation):**
1. Sistem menentukan dulu solusi rahasia (misal `4 × 7 = 28`, atau untuk Hard: `3² + √16 = 13`).
2. Angka-angka komponen dari solusi itu (4 dan 7; atau hasil pemecahan lebih lanjut) ditampilkan sebagai "bahan" ke pemain, dicampur dengan beberapa angka pengecoh (*distractor*) yang tidak diperlukan — supaya tetap ada tantangan memilih, bukan cuma menyusun ulang semua yang diberikan.
3. Level kesulitan generator (rentang angka, jumlah langkah operasi dalam solusi rahasia) disesuaikan per mode.
*Catatan implementasi:* ini adalah bagian logika game yang paling kritis untuk diuji — bug di sini (soal tidak solvable) akan merusak keseluruhan pengalaman bermain.
 
### 5.3 Jenis Operator: Biner vs Unary
 
- **Operator biner** (+, −, ×, ÷): butuh dua angka, di-drag ke slot kiri dan kanan operator, menghasilkan satu angka baru.
- **Operator unary** (pangkat `^`, akar `√` — khusus mode Hard): butuh satu angka, di-drag ke slot operator tersebut, langsung menghasilkan angka baru yang bisa dipakai lagi dalam kombinasi lanjutan.
Kedua jenis slot ini digambar dengan visual yang berbeda supaya pemain tidak bingung mana yang butuh satu vs dua angka.
 
### 5.4 Interaksi: Drag-and-Drop
 
- Seluruh interaksi utama (memasukkan angka & operator ke area kerja) menggunakan drag-and-drop yang mendukung **touch dan mouse** secara native (lihat §7 Tech Stack).
- Target ukuran elemen draggable harus cukup besar untuk jari (bukan kursor mouse presisi) — mengikuti prinsip *touch target minimum* (umumnya direkomendasikan ±44×44px sebagai acuan aksesibilitas touch UI).
### 5.5 Timer: Kesabaran Pelanggan & Spawner
 
Ada **dua** jenis waktu, dan keduanya wajib feel-nya diuji di perangkat
sungguhan, bukan di meja:
 
**1. Kesabaran pelanggan.** Setiap pelanggan punya timer sendiri yang mulai
berjalan begitu dia sampai di stand, dan tidak bergantung pada pelanggan lain.
Pelanggan yang kesabarannya habis walkout tanpa reward (§5.6).
 
**2. Spawner.** Pelanggan datang **berkala satu per satu**, bukan sekaligus.
Interval antar-kedatangan:
- **Bervariasi antar-pelanggan** dalam satu level, dan **makin pendek** di
  level yang lebih tinggi, di mode yang lebih sulit. Jeda tetap (misal selalu
  16 detik) akan terasa seperti metronom dan tidak seperti restoran.
- Turunnya nilai **dibatasi**, supaya interval tidak pernah jatuh terlalu jauh
  di bawah nilai dasarnya dan level tidak mustahil.
 
**Hitung mundur pelanggan berikutnya wajib terlihat** ("berikutnya 4 detik").
Pemain dapat merencanakan ritmenya, dan tekanan terasa sebagai glutathione
memburu waktu, bukan sebagai kejutan acak.
 
**Batas layar.** Kalau semua slot di layar masih terisi, spawner **berhenti
sejenak** dan lanjut begitu ada yang pergi. Pelanggan baru yang ditolak
karena layar penuh **bukan** walkout — itu bukan salah pemain, dan menghukum
mereka karena itu tidak adil.
 
Nilai awal (wajib dikalibrasi ulang lewat playtest di HP asli):
 
| Mode | Roster | Interval dasar (L1→L5) | Kesabaran (L1→L5) |
|---|---|---|---|
| **Easy** | 4→6 | 15→11 detik | 50→42 detik |
| **Medium** | 5→7 | 12→9 detik | 44→34 detik |
| **Hard** | 6→8 | 10→8 detik | 38→28 detik |
 
Rasio kesabaran terhadap interval dasar ada di kisaran 3,5. Rasio ini panduan
rasa, bukan batas keras; yang membatasi sebenarnya adalah batas jumlah pelanggan
yang boleh ada di layar sekaligus.
 
### 5.6 Walkout & Skor
 
**Tidak ada nyawa.** Ini perubahan paling mendasar dari versi 1.0, dan
disengaja: pada desain multi-pelanggan, "3 nyawa" tidak punya makna karena
pelanggan datang dan pergi dengan ritmenya sendiri. Yang tersisa adalah
konsekuensi yang bisa dibaca pemain seketika.
 
- **Walkout** = pelanggan pergi tanpa reward. Terjadi karena dua hal saja:
  1. presented salah (§4 langkah 7), atau
  2. kesabarannya habis (§5.5).
- **Tidak ada kesempatan kedua.** Tidak ada pelanggan pengganti yang datang
  untuk menggantikan yang walkout, dan tidak ada pengulangan. Walkout permanen.
- **Tidak ada level gagal.** Level selalu selesai setelah seluruh roster habis
  (§5.7). Pelanggan yang hilang tidak membatalkan level, hanya mengurangi
  skor yang bisa didapat.
- **Skor** hanya bertambah, tidak pernah berkurang. Base per pelanggan berbeda
  per mode, ditambah bonus kecepatan dari sisa kesabaran pelanggan itu.
  Progres level ditentukan oleh level selesai, bukan oleh nyawa, jadi level
  berikutnya tetap terbuka setelah level ini tuntas.
- **Pelanggan yang tersaji lebih cepat dihitung lebih mahal.** Ini yang membuat
  keputusan "kerjakan siapa dulu" terasa nyata.
 
### 5.7 Struktur Progres
 
- Setiap mode terdiri dari **5 level**.
- Kesulitan di-scale lewat **tiga lever** sekaligus, dan ketiganya naik
  bersamaan dari level 1 ke level 5:
  1. **Roster** — jumlah pelanggan yang harus dilayani (Easy 4→6, Hard 6→8).
  2. **Spawner** — kecepatan kedatangan dan kesabaran pelanggan (§5.5).
  3. **Operator** — tangga operator per level (§5.1).
- **Tidak ada level yang gagal.** Yang membedakan level adalah skor dan berapa
  pelanggan yang berhasil dilayani tanpa walkout.
 
### 5.8 Dapur: Satu Stand, Tiga State
 
Pelanggan tidak pernah menggantung. Tiga state berurutan, dipicu pemain sendiri:
 
| State | Arti | Pemicu masuk |
|---|---|---|
| **Menunggu** | Datang, punya target dan kesabaran, belum dimasak apa pun | Spawner |
| **Terpilih** | Sudah diketuk, stand masih kosong | Ketuk chip pelanggan |
| **Dimasak** | Stand dimuat dengan bahannya, satu hidangan sedang dibangun | Tekan "Masak untuk dia" |
 
Setelah itu: **jadi** (rantai utuh, nilai terlihat di piring) → **sajikan** →
**tersaji** atau **walkout**.
 
**Ciri penting dari “satu stand”:**
- **Hanya satu pelanggan boleh berstatus Dimasak pada satu waktu.** Karena hanya
  ada satu hidangan yang sedang dibangun.
- **Bahan stand milik pelanggan yang sedang Dimasak.** Angka-angka di stand
  adalah milik pesanan itu. Ini yang membuat "pembatasan bahan"
  (§5.7 lever 3) bekerja sebagai difficulty lever, dan ini juga yang menjaga
  jaminan solvable §5.2 tetap utuh: kalau bahan semua pelanggan bercampur,
  pemain bisa menghabiskan bahan milik satu pelanggan untuk pesanan lain dan
  membuat level mustahil diselesaikan.
- **Pindah pelanggan harus disengaja.** Mengetuk chip pelanggan lain saat stand
  sedang berisi hidangan **tidak menghapus apa pun**; stand hanya bisa dilepas
  lewat "Masak untuk dia" untuk pelanggan lain setelah hidangan yang ada
  disajikan atau dikosongkan. Walkout karena salah klik adalah kegagalan
  desain, bukan mechanics (§4).

---
 
## 6. Kebutuhan Non-Fungsional
 
- **Aksesibilitas akses:** web browser, dapat diakses lewat link tanpa instalasi (`freely accessible`, sesuai kriteria lomba).
- **Mobile-first:** desain dan pengembangan dimulai dari layar HP/tablet, baru progressively enhanced ke layar desktop/laptop yang lebih besar — sesuai kebiasaan target usia yang lebih akrab dengan perangkat sentuh.
- **Performa:** ringan, tanpa dependency berat, agar cepat dimuat di jaringan sekolah yang mungkin terbatas.
- **Kompatibilitas:** mendukung browser mobile umum (Chrome/Safari mobile) minimal.
- **Keterbacaan nilai hidangan:** karena hidangan boleh disajikan dalam keadaan
  salah (§4 langkah 7), nilai akhir piring harus terbaca jelas tanpa perlu
  menghitung ulang, dan harus lebih besar dari teks UI lain. Ini safeguard
  terhadap walkout yang caused oleh salah baca, bukan oleh kesalahan
  matematika.
- **Tidak ada walkout akibat salah klik.** Semua aksi yang merusak (walkout)
  harus punya pemicu yang disengaja dan terlihat. presentasi salah memang
  walkout, tapi Apresentasi salah tidak boleh bisa terjadi karena chip yang
  tertimpa atau bug hit-testing.
---
 
## 7. Tech Stack
 
**Rekomendasi:** Vanilla JavaScript + HTML + CSS, dengan library `interact.js` untuk drag-and-drop.
 
**Alasan:**
- Tidak butuh build step/bundler → bisa langsung di-hosting sebagai static site (GitHub Pages/Netlify), memenuhi syarat "freely accessible" dengan sederhana.
- `interact.js` mendukung touch dan mouse dalam satu API yang sama, selaras dengan pendekatan mobile-first.
- Kurva belajar rendah dan risiko teknis rendah — penting mengingat waktu pengerjaan hanya sekitar 3–4 minggu sambil kuliah aktif.
- Untuk animasi ringan (transisi kartu, efek pesanan selesai), CSS transitions/animations sudah cukup tanpa game engine penuh.
**Alternatif yang dipertimbangkan tapi tidak dipilih:** Phaser.js (lebih powerful untuk animasi kompleks, tapi learning curve lebih tinggi), React (baik untuk state management kompleks, tapi overhead build tools tidak sepadan untuk scope game ini).
 
---
 
## 8. Ruang Lingkup: MVP vs Nice-to-Have
 
Mengingat waktu pengerjaan terbatas (±3–4 minggu, tim 2 orang, sambil kuliah), fitur dibagi tegas menjadi wajib dan opsional:
 
### Must-Have (MVP — wajib ada untuk submission)
- 3 mode (Easy/Medium/Hard) dengan operator sesuai §5.1, termasuk tangga
  operator per level
- 5 level per mode, dengan tiga lever kesulitan §5.7: roster, spawner, operator
- Pelanggan datang berkala (§5.5), dengan batas layar dan hitung mundur
  pelanggan berikutnya yang terlihat
- Mekanik walkout tanpa nyawa (§5.6): salah saji atau kesabaran habis
- Satu stand, satu hidangan, dengan tombol "Masak untuk dia" (§5.8)
- Generator angka solvable (backward generation)
- Drag-and-drop **dan** tap-to-place untuk operator biner
- Kesabaran per pelanggan
- Tampilan mobile-first, responsif ke desktop
- Tema visual dapur (sederhana, konsisten) dan siap swap aset
### Nice-to-Have (jika waktu memungkinkan)
- Efek suara & animasi karakter pelanggan
- Papan skor/leaderboard lokal
- Variasi tema visual per mode
*Daftar ini sudah diperbarui: operator unary dipindah dari nice-to-have ke
must-have karena sudah terimplementasi di generator dan inti dari mode Hard.
Rekomendasi tetap sama: MVP selesai dan stabil dulu, baru nice-to-have.*
 
---
 
## 9. Tim & Pembagian Peran
 
Tim terdiri dari 2 orang. Pembagian peran spesifik *masih perlu didiskusikan dengan rekan tim* — beberapa opsi pembagian yang umum untuk proyek sejenis:
 
- Berdasarkan layer: satu orang fokus **logika game & generator soal** (JavaScript inti), satu orang fokus **UI/UX & visual** (HTML/CSS, aset gambar, animasi).
- Atau berdasarkan mode: masing-masing bertanggung jawab menyelesaikan mode tertentu secara end-to-end.
---
 
## 10. Timeline Usulan (3–4 Minggu)
 
Berdasarkan rentang 26 September – 18 Oktober 2026 (±3.5 minggu):
 
| Minggu | Fokus |
|---|---|
| **1** (26 Sep – 2 Okt) | Finalisasi PRD & desain UI, setup project & struktur file, bangun generator soal (logika inti tanpa UI) — **selesai** |
| **2** (3–9 Okt) | Bangun UI drag-and-drop dasar (mode Easy dulu), integrasi dengan generator, timer, skor — **selesai (versi 1: satu pelanggan satu pesanan)** |
| **2.5** (10–14 Okt) | **Redesign ke multi-pelanggan berkala** (§4, §5.5, §5.8): state model `orders[]`, spawner, kesabaran per pelanggan, walkout tanpa nyawa, chip pelanggan, "Masak untuk dia", tombol Sajian eksplisit — **sedang dikerjakan** |
| **3** (15–19 Okt) | Rampungkan redesign di semua mode, styling akhir, smoke test multi-pelanggan, playtest di HP asli untuk kalibrasi spawner & kesabaran |
| **4** (20–24 Okt) | Playtesting akhir, perbaikan bug, siapkan materi submission (video demo, deskripsi, dsb sesuai syarat lomba), submit |

*Catatan: jadwal ini asumsi awal dan perlu disesuaikan dengan jadwal kuliah masing-masing anggota tim. Fase 2.5 adalah perubahan arsitektur, jadi urutan kerjanya berbeda dari rencana awal.*
 
---
 
## 11. Risiko & Mitigasi
 
| Risiko | Mitigasi |
|---|---|
| Generator soal menghasilkan target yang tidak solvable | Uji otomatis (unit test) untuk memverifikasi tiap soal yang di-generate benar-benar punya solusi sebelum dikirim ke pemain |
| Pembatasan operator per level menyempitkan ruang solusi sehingga generator gagal membuat soal | Stress test otomatis lintas seluruh kombinasi mode × level (§5.1). Setiap tier wajib punya jalur solusi; kalau sebuah tier tidak bisa, turunkan operatornya, jangan longgarkan jaminan solvability |
| Spawner dan kesabaran terasa salah di perangkat nyata (terlalu cepat, atau menumpuk di layar) | Angka §5.5 adalah titik awal, **bukan** angka final. Wajib playtest di HP asli, dan kedua angka harus bisa diubah dari satu file config tanpa menyentuh logika |
| Walkout terasa tidak adil karena salah presentasi atau salah baca | Nilai piring harus selalu terlihat (§6.3), dan aksi yang merusak hanya boleh dipicu secara sadar (§5.8) |
| Banyak pelanggan menunggu bersamaan membuat antre chips berdesakan di layar kecil | Batas jumlah pelanggan di layar; saat penuh spawner berhenti, bukan menumpuk (§5.5) |
| Waktu pengerjaan mepet karena kuliah aktif | Scope MVP ketat (§8), nice-to-have dikorbankan lebih dulu jika perlu |
| Drag-and-drop kurang responsif di perangkat low-end | Testing dini di perangkat riil (bukan cuma browser desktop dengan device emulator), sejak minggu pertama pengembangan UI |
| Ketidaksesuaian dengan rubrik penilaian resmi (rubrik belum didapat) | Cari/tanyakan buku panduan resmi lomba ke panitia sebelum deadline, untuk memastikan format submission & kriteria penilaian terpenuhi |
 
---
 
## 12. Kesesuaian dengan Kriteria Lomba
 
| Kriteria resmi | Bagaimana dipenuhi |
|---|---|
| *Freely accessible* | Game berupa web statis yang dapat diakses via link, tanpa instalasi atau biaya |
| *Meaningful learning benefits for junior high school students* | Progresi mode mengikuti urutan materi kurikulum SMP kelas 7–9 (§5.1); operator bertambah bertahap per level sehingga materi baru selalu dikenal sebelum dipakai serius; mekanik game melatih number sense dan penerapan aktif operasi hitung, bukan hafalan pasif |
| *Exciting* (sesuai purpose lomba) | Metafora dapur ala game masak populer: pelanggan datang berkala, menumpuk kalau pemain lambat, dan walkout kalau gagal. Skor, bonus kecepatan, dan tiga level kesulitan menjaga motivasi, tanpa perlu mekanisme kooperatif seperti nyawa |
 
---

## 13. Keputusan yang Sudah Final

Hal-hal berikut sudah dikunci dan tidak lagi menjadi bahan diskusi:

1. **Formula skor** — base per pelanggan per mode, plus bonus kecepatan dari sisa
   kesabaran pelanggan itu. Skor tidak pernah berkurang.
2. **Mekanik gagal** — walkout tanpa nyawa (§5.6).
3. **Nama proyek** — **Cooking Number**.
4. **Gaya visual** — toon-toon (warna solid, satu warna outline, tanpa gradien),
   dengan palet yang tidak terlalu kekanak-kanakan untuk audiens SMP.
5. **Struktur input** — drag-and-drop plus tap-to-place, dengan tap-to-place
   sebagai jalur yang selalu tersedia (§5.4).
6. **Bahasa** — English sebagai default, toggle ID/EN.

## 14. Open Items — Masih Menunggu Tim

1. **Kalibrasi angka spawner dan kesabaran** per mode/level — butuh playtest di
   HP asli, tidak bisa diputuskan dari atas meja (§5.5).
2. **Aset visual final dari tim** — sekarang masih placeholder WebP yang datar
   dan geometris, sengaja dibuat mudah diganti.
3. **Buku panduan/rubrik resmi lomba** — belum didapat; sebaiknya dikonfirmasi
   ke panitia untuk memastikan format submission (video, laporan, dsb.) dan
   bobot penilaian.
4. **Pembagian peran tim** yang konkret.
---

*Dokumen ini direvisi ke versi 2.0 setelah fase prototipe, berdasarkan temuan
playtest internal dan keputusan desain tim. Rincian perubahan ada di §14 dan di
`CHANGELOG.md`.*
 