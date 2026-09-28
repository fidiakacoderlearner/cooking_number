# Deskripsi Proyek - Cooking Number

Bahan untuk formulir dan berkas submission. Semua angka di bagian "Bukti
kualitas" diambil dari kode dan dari hasil menjalankan test, bukan klaim.

---

## 1. Ringkasan siap tempel

**Satu kalimat**

> Cooking Number adalah game edukasi matematika untuk siswa SMP kelas 7-9.
> Pelanggan restoran memesan sebuah angka, pemain menyusun angka-angka yang
> tersedia dengan operator matematika sampai angkanya cocok, lalu saji sebelum
> kesabaran pelanggan habis.

**Satu paragraf**

> Cooking Number adalah game web edukasi matematika untuk siswa SMP yang
> mengubah operasi hitung menjadi pekerjaan dapur dengan tenggat waktu. Setiap
> pelanggan yang datang memesan sebuah angka, dan pemain harus menyusun
> angka-angka yang tersedia di rak menjadi satu rangkaian operasi yang
> menghasilkan angka itu. Pelanggan berikutnya sudah berjalan masuk sebelum
> yang sebelumnya selesai, sehingga tekanan datang dari kecepatan kerja pemain,
> bukan dari satu teka-teki yang dibiarkan menggantung. Operasi hitung dibaca
> kaidah operasi yang sama dengan yang diajarikan di sekolah, dan nilai
> berjalan selalu terlihat di layar, sehingga pemain bisa memeriksa
> langkahnya sendiri. Kegagalan diwujudkan
> sebagai walkout: pelanggan pergi tanpa poin, tanpa nyawa, dan tanpa pelanggan
> pengganti. Tidak ada level yang gagal. Yang membedakan level adalah berapa
> pelanggan yang berhasil dilayani. Game berjalan langsung di browser, tanpa
> instalasi, tanpa akun, dan tanpa server, dengan pilihan bahasa Inggris dan
> Indonesia.

---

## 2. Masalah yang diselesaikan

| Masalah | Bagaimana game ini menjawabnya |
|---|---|
| Latihan operasi hitung terasa seperti lembar kerja | Setiap soal punya tenggat nyata. Pelanggan menunggu, dan kalau dia pergi itu terasa |
| Siswa sering salah karena lupa urutan hitung | Aturan hitung memakai kaidah operasi yang sama dengan pelajaran di sekolah, dan nilai berjalan selalu ditampilkan di piring. Tidak ada aturan khusus game yang harus dipelajari ulang |
| Materi baru muncul mendadak tanpa persiapan | Operator bertambah satu per satu, jadi game dimulai dari dua operator saja lalu membuka yang baru seiring level naik. Easy tidak pernah memakai pangkat maupun akar, Medium mendapat pangkat dua di level 4, Hard mendapat akar kuadrat di level 3 |
| Sering diminta jawaban benar, padahal prosesnya yang perlu dilatih | Memasukkan hidangan yang salah itu mungkin dan walkout adalah konsekuensi yang sah. Tapi nilai akhir selalu terlihat di piring sebelum disajikan, dan tidak ada aksi merusak tanpa disengaja |
| Tidak bisa dipakai di perangkat sekolah | Jalur masuknya browser. Ada yang bisa dipakai tanpa internet setelah halaman terbuka, dan tidak ada yang diambil dari server pihak ketiga saat permainan berjalan |
| Drag kurang responsif di layar kecil | Mengetuk tile langsung menambahkannya ke stand selalu tersedia dan selalu berhasil, jadi tidak ada tugas yang mustahil dikerjakan hanya dengan mengetuk |

---

## 3. Yang membedakannya dari game hitung biasa

1. **Chaining, bukan kolom ketik.** Pemain menyusun rantai di stand, bukan
   mengetik `2 + 3 x 4`. Nilai berjalan selalu terlihat, jadi kesalahan bisa
   dilacak di titik salahnya.
2. **Dimulai dari dua operator.** Easy level 1 hanya menawarkan tambah dan
   kurang, dan operator baru terbuka seiring level naik. Layar pertama tidak
   pernah dipenuhi keypad penuh.
3. **Tidak ada jawaban yang dihafal.** Soal dibuat dengan cara berjalan mundur
   dari target. Sistem menentukan dulu satu solusi rahasia, lalu memilih
   angka-angka yang menjadi bahan. Setiap soal punya rute yang benar dan
   beberapa angka pengecoh yang tidak dipakai, jadi pemain harus memilih bahan.
4. **Jaminan solvability dibuktikan, bukan diharapkan.** Sebelum soal dikirim ke
   pemain, resep solusinya dievaluasi ulang oleh evaluator yang sama dengan yang
   dipakai pemain. Kalau tidak cocok, target dibuang dan soal lain dibuat.
5. **Kegagalan yang adil.** Walkout mengurangi skor yang bisa didapat, tidak
   menghapus apa pun. Tidak ada nyawa, penalti, atau level gagal. Salah ketuk
   tidak pernah menghapus hidangan yang sedang dibangun. Aturan ini ditulis
   eksplisit di `AGENTS.md` dan diuji otomatis.
6. **Pintu masuk sesuai kelas.** Tiga mode dipetakan ke kelas target 7, 8, dan
   9, dan operator yang ditawarkan mode itu dibatasi oleh generator soal. Siswa
   kelas 7 tidak akan pernah melihat pangkat maupun akar kuadrat, karena tidak
   ada soal Easy yang memakainya.

---

## 4. Pembaitan dengan materi kurikulum

| Mode | Kelas | Yang benar-benar ditawarkan ke pemain | Kapan materi baru masuk |
|---|---|---|---|
| Easy | 7 | Level 1 `+ -`, level 2 sampai 5 tambah kali, lalu bagi. Bilangan bulat termasuk negatif | Pangkat dan akar tidak pernah muncul di mode ini |
| Medium | 8 | Level 1 `+ - x`, level 2 tambah bagi, level 4 tambah pangkat dua. Pecahan desimal sejak level 1 | Pangkat dua mulai level 4 |
| Hard | 9 | Semua operator biner sejak level 1, pangkat dua dan tiga sejak level 1 | Akar kuadrat mulai level 3 |

Operator bertambah satu per satu seiring level naik, sehingga level 1 menjadi
tutorial alami: game dimulai dari dua operator saja. Pembatasan ini juga yang
menjamin setiap mode selalu solvable, karena generator soal dan rak memakai
himpunan operator yang sama, jadi tidak mungkin ada soal yang meminta pemain
memakai operator yang tidak ada di tangannya.

Pemetaan kelas di atas mengikuti urutan materi bilangan di SMP. Sebaiknya
dikonfirmasi ke guru atau pembimbing tim sebelum submission, karena tim bisa
mengikuti Kurikulum yang berbeda.

---

## 5. Mekanik inti

- **Satu stand, satu hidangan.** Dapur dipakai untuk satu pelanggan pada satu
  waktu, dan bahannya milik pesanan itu saja. Kalau bahan semua pelanggan
  bercampur, pemain bisa menghabiskan bahan milik satu pesanan untuk pesanan
  lain dan membuat level mustahil diselesaikan.
- **Empat langkah, eksplisit.** Ketuk pelanggan untuk mulai masak, susun
  rantainya, sajikan. Kalau sudah menyusun beberapa kartu lalu mengetuk
  pelanggan lain, game menanyakan dulu, dan jam berhenti selama pertanyaan itu
  sehingga tidak ada yang walkout karena sedang membaca.
- **Kesabaran per pelanggan.** Semua timer berjalan bersamaan, dan hitung
  mundur pelanggan berikutnya selalu terlihat di layar.
- **Spawner berhenti, bukan menolak.** Kalau layar penuh, pelanggan berikutnya
  menunggu. Pelanggan yang tidak sempat masuk bukan walkout, karena itu bukan
  salah pemain.
- **Subset bebas.** Pemain memakai sebagian bahan, sisanya pengecoh.
- **Skor** adalah poin dasar per pelanggan per mode, ditambah bonus kecepatan
  dari sisa kesabaran. Skor tidak pernah berkurang.

Angka kesabaran dan interval kedatangan masih dalam tahap playtest di HP asli
dan akan disetel berdasarkan pengukuran manusia, bukan tebakan. Semuanya ada
di satu file konfigurasi, sehingga tidak ada penyetelan yang menyentuh logika
permainan.

---

## 6. Bukti kualitas

| Yang diuji | Bagaimana | Hasil |
|---|---|---|
| Jaminan solvable di semua 15 kombinasi mode x level | 10.000 soal per kombinasi, tiap soal dievaluasi ulang oleh evaluator milik pemain | **150.000 soal, semua terbukti solvable** |
| Test otomatis | `node:test` tanpa dependency | **136 test, semua hijau** |
| Level bisa dimainkan sampai selesai | Smoke test menjalankan game sungguhan di Chrome dan memainkannya, bukan hanya memeriksa halaman | **15 dari 15 kombinasi mode x level tamat, seluruh pelanggan tersaji** |
| Stand bisa disusun mengikuti solusi yang dijamin | Solusi rahasia 720 soal Medium dan Hard diputar ulang satu per satu melalui fungsi yang sama dengan yang dipakai saat mengetuk tile | **720 dari 720 bisa disusun dan disajikan** |
| Walkout tidak bisa terjadi karena salah klik | Diuji otomatis di unit test: memilih pelanggan lain tidak menghapus hidangan, serve yang ditolak tidak membebaskan pelanggan, dan stand hanya bisa dikosongkan lewat tombol Clear | Tidak ada aksi merusak tanpa disengaja |
| Target sentuh | Diukur di dua lebar layar, seluruh elemen yang bisa disentuh | **Semua minimal 44x44px** |
| Aritmetika | Pecahan eksak tanpa floating point | `0.1 + 0.2` tampil `0.3`, bukan `0.30000000000000004` |
| Import mati di seluruh lapisan | Pengecek statis | Bersih |
| Ukuran | Tanpa build step, tanpa backend, tanpa dependency saat runtime | Kode 2.929 baris, total aset 45 KB, repo 495 KB termasuk vendor |

Angka-angka di atas diambil dari test yang bisa dijalankan ulang kapan saja, dan
15 level di atas benar-benar dimainkan sampai overlay selesai muncul, bukan
hanya ditulis dan diperiksa sekilas.

---

## 7. Aksesibilitas dan inklusivitas

- Tidak perlu instalasi, akun, atau server setelah halaman terbuka.
- Responsif dari lebar 320px sampai desktop, dimulai dari layar HP.
- Setiap tile operator punya nama yang bisa dibaca screen reader, dan namanya
  ikut berubah saat bahasa diganti.
- Semua string antarmuka ada di satu berkas, dengan Inggris sebagai default dan
  Indonesia sebagai pilihan.
- Menghormati `prefers-reduced-motion`.
- Bentuk dan ukuran tile membedakan operator biner dan unary, tidak hanya warna.

---

## 8. Batasan yang kami akui

Sengaja dituliskan karena lebih mudah ditanyakan juri daripada ditemukan sendiri.

- **Angka tingkat kesulitan belum final.** Kesabaran pelanggan dan interval
  kedatangan masih titik awal. Playtest di perangkat sungguhan sedang dilakukan
  dan hasilnya yang menentukan angka akhirnya.
- **Maksimal tiga pelanggan menunggu sekaligus.** Dibatasi karena pada lebar
  320px, empat pelanggan membutuhkan 414px sehingga dua di antaranya berada di
  luar layar.
- **Menyeret hidangan ke pelanggan sudah dihapus.** Dulu ada tiga cara
  menyajikan, dan playtest selalu memakai tombol Sajian. Sekarang menyajikan
  lewat tombol atau mengetuk piring; tile masih bisa diseret ke stand.
- **Aset visual masih placeholder.** Datar dan geometris, dibuat khusus supaya
  bisa diganti ilustrasi tim tanpa menyentuh kode.
- **Tidak ada server dan tidak ada akun.** Progres disimpan di `localStorage`
  per perangkat, jadi tidak ikut pindah antar perangkat.
- **Kurikulum yang dipakai perlu dikonfirmasi** ke pembimbing.

---

## 9. Yang perlu disiapkan

| # | Berkas atau bahan | Status |
|---|---|---|
| 1 | Link yang bisa dibuka tanpa instalasi | Belum. Perlu di-deploy ke GitHub Pages atau Netlify Drop, lalu isi `LINK` di sini |
| 2 | Video demo 1-2 menit | Belum. Bisa diambil dari rekaman layar playtest |
| 3 | Screenshot: menu, satu level sedang dimainkan, overlay level selesai | Belum |
| 4 | Deskripsi proyek | Sudah ada di bagian 1 |
| 5 | Checklist rubrik | Bagian 10, masih kosong sampai rubrik resmi diterima |
| 6 | Nama anggota tim dan pembagian peran | Belum |
| 7 | Konfirmasi pemetaan kelas ke kurikulum | Belum, perlu bertanya ke pembimbing |

---

## 10. Checklist rubrik

Isi setelah rubrik resmi lomba diterima. Kosongkan kolom bukti dengan tautan atau
nomor baris yang bisa ditunjukkan juri.

| Kriteria rubrik | Terpenuhi? | Bukti |
|---|---|---|
| | | |
| | | |
| | | |

**Rubrik resmi sudah diminta ke panitia?** [ ] ya, [ ] belum. Ini yang paling
lambat dan paling di luar kendali tim, jadi harus digesa.

---

## 11. Cara menjalankan

```bash
# hanya test runner, bukan untuk build
npm test

# main game sungguhan di Chrome dan playable sampai level selesai
npm install --no-save puppeteer-core@23
npm run smoke

# sajikan statis
python -m http.server 8099
# buka http://127.0.0.1:8099/
```

Tanpa build step, tanpa backend, tanpa dependency saat runtime. Folder `src/core`
adalah logika murni tanpa DOM, dan `src/ui` hanya memanggil API publik core.

---

## 12. Struktur proyek

```
src/core/   logika murni: aritmetika pecahan eksak, operator,
            evaluator kaidah operasi (shunting-yard), trailingTerm,
            backward generator soal dengan precedens
src/ui/     tampilan, state permainan, drag, i18n
test/       136 test otomatis
scripts/    smoke test browser, inspektor soal, pengecek import
vendor/     interact.js 1.10.27, 96 KB, dilokal
```
