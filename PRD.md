# Product Requirements Document (PRD)
## Game Edukasi Matematika — "Restoran Angka" (working title)
 
**Untuk:** THE 2ND INTERNATIONAL DIGITAL MATHEMATICS GAME COMPETITION 2026 — Universitas Syiah Kuala
**Deadline submission:** 18–24 Oktober 2026
**Tim:** 2 orang
**Versi dokumen:** 1.0 — Draft awal hasil diskusi
 
---
 
## 1. Ringkasan Eksekutif
 
Game ini adalah game edukasi matematika berbasis web (mobile-first) yang mengambil metafora restoran ala *Cooking Mama*: pelanggan memesan "angka target", dan pemain harus menyusun angka-angka yang tersedia dengan operator matematika untuk mencapai angka tersebut, lalu menyajikannya kepada pelanggan. Game menyasar siswa **SMP (kelas 7–9)**, dengan tiga mode kesulitan (Easy/Medium/Hard) yang kompleksitas matematikanya mengikuti urutan kurikulum SMP.
 
**Nama proyek:** belum ditentukan. Beberapa usulan working title untuk didiskusikan dengan rekan satu tim:
- **Number Kitchen**
- **Resto Angka**
- **MathChef**
- **Angka Delivery**
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
 
**Genre:** Puzzle edukasi bertema simulasi restoran (time-management ringan, terinspirasi Cooking Mama).
 
**Core loop per pesanan ("order"):**
1. Pelanggan datang membawa **angka target** (misal: 28).
2. Sistem menampilkan sejumlah **angka "bahan"** yang di-generate secara acak namun *dijamin bisa mencapai target* (lihat §5.2).
3. Pemain men-**drag-and-drop** angka dan operator ke area kerja untuk menyusun ekspresi (misal: 4 × 7).
4. Begitu ekspresi menghasilkan angka target, pesanan otomatis "selesai" dan disajikan ke pelanggan — mendapat skor.
5. Jika waktu habis atau pemain salah menyusun tanpa mencapai target → nyawa berkurang, skor berkurang.
6. Setelah semua pesanan di level tersebut selesai → naik ke level berikutnya.
---
 
## 5. Fitur & Mekanik Inti
 
### 5.1 Operator Matematika (progresif per mode)
 
| Mode | Kelas target | Materi & operator |
|---|---|---|
| **Easy** | 7 | Bilangan bulat (termasuk negatif); operator biner +, −, ×, ÷ |
| **Medium** | 8 | Menambahkan pecahan/desimal ke campuran angka; opsional bilangan berpangkat sederhana |
| **Hard** | 9 | Bilangan berpangkat & bentuk akar via operator **unary** (lihat §5.3); kombinasi ekspresi lebih panjang |
 
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
### 5.5 Timer
 
- Setiap pesanan memiliki batas waktu, durasi disesuaikan per mode (Easy lebih longgar, Hard lebih ketat).
- Durasi pasti perlu ditentukan lewat *playtesting* — direkomendasikan draft awal: Easy 60 detik, Medium 45 detik, Hard 30–40 detik per pesanan, untuk dikalibrasi ulang setelah uji coba dengan target usia.
### 5.6 Sistem Skor & Nyawa
 
- **Nyawa:** 3 per level. Salah/waktu habis → nyawa −1. Nyawa habis → kembali ke menu pilih level (progres level tersebut tidak hangus permanen, bisa dicoba ulang).
- **Skor:** didapat dari menyelesaikan pesanan; berkurang saat gagal. Formula detail (bonus kecepatan, dsb.) — *masih perlu didiskusikan lebih lanjut, lihat §10 Open Items.*
### 5.7 Struktur Progres
 
- Setiap mode terdiri dari **5 level**.
- Kesulitan di-scale dengan **menambah jumlah pesanan per level** seiring level naik (bukan menambah kompleksitas target angka dalam satu mode) — kompleksitas matematika sendiri sudah naik lewat perbedaan antar-*mode*, bukan antar-*level* dalam satu mode.
---
 
## 6. Kebutuhan Non-Fungsional
 
- **Aksesibilitas akses:** web browser, dapat diakses lewat link tanpa instalasi (`freely accessible`, sesuai kriteria lomba).
- **Mobile-first:** desain dan pengembangan dimulai dari layar HP/tablet, baru progressively enhanced ke layar desktop/laptop yang lebih besar — sesuai kebiasaan target usia yang lebih akrab dengan perangkat sentuh.
- **Performa:** ringan, tanpa dependency berat, agar cepat dimuat di jaringan sekolah yang mungkin terbatas.
- **Kompatibilitas:** mendukung browser mobile umum (Chrome/Safari mobile) minimal.
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
- 3 mode (Easy/Medium/Hard) dengan operator sesuai §5.1
- 5 level per mode dengan sistem nyawa & skor
- Generator angka solvable (backward generation)
- Drag-and-drop untuk operator biner
- Timer per pesanan
- Tampilan mobile-first, responsif ke desktop
- Tema visual restoran (sederhana, konsisten)
### Nice-to-Have (jika waktu memungkinkan)
- Operator unary (pangkat/akar) untuk mode Hard — bisa jadi fallback: jika waktu mepet, mode Hard sementara memakai operator biner saja dengan angka lebih besar/kompleks, sambil unary ditambahkan belakangan
- Efek suara & animasi karakter pelanggan
- Papan skor/leaderboard lokal
- Variasi tema visual per mode
*Rekomendasi: prioritaskan MVP selesai dan stabil dulu di awal, baru masuk ke nice-to-have jika waktu tersisa cukup — jangan mulai dari fitur nice-to-have.*
 
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
| **1** (26 Sep – 2 Okt) | Finalisasi PRD & desain UI (wireframe), setup project & struktur file, mulai bangun generator soal (logika inti tanpa UI) |
| **2** (3–9 Okt) | Bangun UI drag-and-drop dasar (mode Easy dulu), integrasi dengan generator, timer, sistem nyawa/skor |
| **3** (10–16 Okt) | Selesaikan mode Medium & Hard, styling & tema visual, testing lintas perangkat (HP, tablet, desktop), mulai kerjakan nice-to-have jika waktu cukup |
| **4** (17–18/24 Okt) | Playtesting akhir, perbaikan bug, siapkan materi submission (video demo, deskripsi, dsb sesuai syarat lomba), submit |
 
*Catatan: jadwal ini asumsi awal dan perlu disesuaikan dengan jadwal kuliah masing-masing anggota tim.*
 
---
 
## 11. Risiko & Mitigasi
 
| Risiko | Mitigasi |
|---|---|
| Generator soal menghasilkan target yang tidak solvable | Uji otomatis (unit test) untuk memverifikasi tiap soal yang di-generate benar-benar punya solusi sebelum ditampilkan ke pemain |
| Waktu pengerjaan mepet karena kuliah aktif | Scope MVP ketat (§8), nice-to-have dikorbankan lebih dulu jika perlu |
| Drag-and-drop kurang responsif di perangkat low-end | Testing dini di perangkat riil (bukan cuma browser desktop dengan device emulator), sejak minggu pertama pengembangan UI |
| Operator unary (pangkat/akar) menambah kompleksitas UI di luar rencana | Jadikan nice-to-have dengan fallback jelas (§8) |
| Ketidaksesuaian dengan rubrik penilaian resmi (rubrik belum didapat) | Cari/tanyakan buku panduan resmi lomba ke panitia sebelum deadline, untuk memastikan format submission & kriteria penilaian terpenuhi |
 
---
 
## 12. Kesesuaian dengan Kriteria Lomba
 
| Kriteria resmi | Bagaimana dipenuhi |
|---|---|
| *Freely accessible* | Game berupa web statis yang dapat diakses via link, tanpa instalasi atau biaya |
| *Meaningful learning benefits for junior high school students* | Progresi mode mengikuti urutan materi kurikulum SMP kelas 7–9 (§5.1); mekanik game melatih number sense dan penerapan aktif operasi hitung, bukan hafalan pasif |
| *Exciting* (sesuai purpose lomba) | Tema restoran/simulasi dengan elemen skor, nyawa, dan progres level untuk menjaga motivasi bermain |
 
---
 
## 13. Open Items — Perlu Didiskusikan Lebih Lanjut
 
Hal-hal berikut belum final dan sebaiknya dibahas sebelum atau selama tahap desain UI:
 
1. **Formula skor** detail (poin per pesanan, bonus kecepatan, dsb.)
2. **Durasi timer pasti** per mode (perlu playtesting)
3. **Nama proyek/game final**
4. **Tema/gaya visual** spesifik (karakter pelanggan, gaya art, palet warna) — perlu selaras dengan audiens SMP (tidak terlalu kekanak-kanakan)
5. **Buku panduan/rubrik resmi lomba** — belum didapat; sebaiknya dikonfirmasi ke panitia untuk memastikan format submission (video, laporan, dsb.) dan bobot penilaian
6. **Pembagian peran tim** yang konkret
---
 
*Dokumen ini adalah draft awal berdasarkan diskusi tanggal 26 September 2026. Silakan direvisi bersama rekan tim sebelum difinalisasi.*
 