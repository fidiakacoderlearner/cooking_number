# Formulir Playtest HP

Angka spawner dan kesabaran di `src/core/difficulty.js` **belum angka final**.
Semuanya titik awal yang belum pernah dilihat pemain sungguhan. Formulir ini
adalah satu-satunya cara mengukurnya, dan isian di sini yang menentukan angka
mana yang diputar.

Isi satu file ini, lalu kirim balik. Tidak perlu rapi.

**Status:** playtest pertama dan kedua sudah selesai, hasilnya di bagian 6.
Yang di bawah adalah formulir untuk playtest **ketiga**, di build yang sekarang
berisi kaidah operasi, kesabaran +10%, antrean beranimasi, dan suara.

> **Yang harus Anda tahu sebelum playtest ketiga:** ini run pertama di build
> kaidah operasi. Semua hitungan lama (`2 + 3 x 4` = 20) sudah tidak berlaku —
> sekarang 14. Kalau angka di layar terasa "salah", itu mungkin bukan bug tapi
> kaidah operasi yang belum biasa. Catat di formulir kalau ini mengganggu.

---

## 1. Menjalankan game di HP

Game ini statis tanpa build step, tapi **harus lewat HTTP**. ES module akan
diblokir CORS kalau dibuka langsung dari `file://`.

Di PC:

```bash
cd C:\Users\ASUS\Documents\cooking_number
python -m http.server 8099 --bind 0.0.0.0 -d .
```

**Penting:** harus ada flag `-d .` di akhir. Tanpa itu, server presenting dari
folder tempat perintah dijalankan, dan kalau bukan root repo, browser menampilkan
*directory listing* (daftar file) alih-alih game. Kalau yang muncul daftar file,
itu artinya flag `-d` hilang atau path-nya salah.

Di HP, terhubung ke WiFi yang sama, buka:

```
http://192.168.1.6:8099/
```

Kalau halaman tidak terbuka, izinkan Python di **Windows Defender Firewall**
(jaringan privat).

Alternatif yang lebih berguna: deploy sekali ke GitHub Pages atau Netlify Drop,
lalu dapat link yang bisa dibuka siapa pun. Link itu juga yang dipakai untuk
submission, jadi dua kebutuhan satu kerja.

**Membuka level yang belum terbuka** (supaya tidak harus menyelesaikan level
sebelumnya hanya demi sampai ke level 5):

```js
// di DevTools HP atau di desktop
localStorage.setItem('cn.progress', '{"easy":5,"medium":5,"hard":5}');
location.reload();
```

Menutup tab atau membersihkan data situs mengembalikan progres ke level 1.

---

## 2. Apa yang berubah sejak playtest pertama

Bagian ini supaya kamu tahu persis apa yang perlu dicermati.

**Alur berubah jadi empat langkah, bukan lima**

Dulu: ketuk chip, **lalu** tekan "Masak untuk dia". Sekarang **menekan chip
sudah langsung memuat stand** dan chipnya jadi hijau. Teks "Building a dish
for 7" dan potret di stand ikut hilang karena hijau sudah menunjuk pelanggan itu.
Tidak ada lagi tombol "Masak untuk dia" sama sekali.

**Pindah pelanggan bisa meminta konfirmasi**

Kalau stand sudah berisi lebih dari 2 kartu lalu kamu mengetuk chip lain, muncul
dialog: lanjut masak, atau ganti saja. **Jam berhenti selama dialog terbuka**,
jadi tidak ada yang walkout karena kamu sedang membaca. Kalau baru 1-2 kartu,
pindah bebas tanpa dialog.

**Menyeret hidangan ke pelanggan dihapus.** Tile masih bisa diseret ke stand.
Menyajikan lewat tombol Sajian atau mengetuk piring.

**Yang diperbaiki dari laporan playtest pertama**

| Laporan | Status |
|---|---|
| Gambar piring hilang | Diperbaiki. Nilai akhir jadi pita di tengah piring, piringnya tetap kelihatan |
| Bar kesabaran jadi abu saat kuning | Diperbaiki. Sekarang benar-benar kuning di bawah 2/3, merah di bawah 1/3 |
| Chip berkedip tiap detik | Diperbaiki. Hanya pelanggan yang baru datang yang muncul dengan animasi |
| Kartu level beda tinggi | Diperbaiki |
| Drag tidak kelihatan bergerak | Diperbaiki. Sekarang tile mengikuti jari persis |
| Pelanggan ke-4 terlalu mepet | Diperbaiki. Maksimal 3 pelanggan, tiga chip muat di 320px tanpa digeser |
| Puncak Normal lebih sulit dari dasar Hard | Diperbaiki. Pecahan per kartu di Medium sekarang di bawah Hard |

**Yang diperbaiki sejak playtest kedua**

| Laporan | Status |
|---|---|
| Kaidah operasi (`-5 + -2 x -1` = 7, bukan -3) | **Sudah diganti.** `x` dan `:` dihitung lebih dulu dari `+` dan `-`, dan pangkat/akar menempel pada angka di depannya. Ini perubahan terbesar, dan sengaja: versi lama mengajarkan aturan yang salah |
| `2^3 = 8` tidak bisa disajikan | Diperbaiki. Rantai 2 tile bisa di-serve sekarang |
| Pangkat beruntun (`2 2 2`) tampil sebagai 3 langkah | Diperbaiki. Sekarang tampil sebagai `2^4` |
| Kesabaran terasa terlalu sempit | Dinaikkan 10% di ketiga mode |
| Antrean terasa seperti banner | Diperbaiki. Chip lebar tetap 1/3 layar, pelanggan masuk dari kanan dengan animasi 350ms, dan bergeser ke kiri kalau ada yang selesai |
| Musik dan suara | Ditambahkan. Ada tombol mute di HUD |

**Yang perlu dicermati di playtest ketiga**

| Hal | Kenapa |
|---|---|
| Kaidah operasi terasa natural atau membingungkan? | Ini run pertama di build kaidah operasi. Kalau membingungkan, catat di mana — mungkin perlu penyederhanaan (misal: mulai dengan 2 operator saja di Easy) |
| Musik terlalu keras / mengganggu? | Loop per level, ada tombol mute di HUD |
| Antrean beranimasi mengganggu atau membantu? | Kalau membantu, tahu bahwa animasi itu disengaja dan bukan kebetulan |
| Chip yang sedang slide masih bisa diketuk? | Seharusnya tidak. Kalau bisa, itu bug |
| Hitung mundur chip yang baru datang mulai dari mana? | Seharusnya mulai setelah chip berhenti di slotnya, bukan saat spawn |
| Geser-ke-kiri antrean mulus? | Kalau chip terasa meloncat-loncat saat ada yang selesai, itu bug FLIP |
| `2^3 = 8` masih tidak bisa di-serve? | Bug lama, harusnya sudah tidak ada |

---

## 3. Urutan run

Lima run, urutan ini, sekitar 90 detik per level.

| # | Run | Kenapa run ini |
|---|---|---|
| 1 | Easy L1 | Baseline. Hanya ada dua operator, `+` dan `-` |
| 2 | Easy L5 | Level termudah yang penuh: 8 pelanggan, angka besar, `÷` aktif |
| 3 | **Hard L1** | Pindah ke sini. Kalau keluhan "terlalu gampang" ada, di sini |
| 4 | Medium L1 | Pecahan masuk, sekarang lebih jarang dari pada playtest pertama |
| 5 | Hard L3 | `√` masuk dan rantai bisa beruntun, paling mungkin bug |

**Rekam layar 30-60 detik tiap run.** Sekaligus bahan playtest *dan* footage
video demo untuk submission.

---

## 4. Yang dicatat per run

Satu blok per run. Tulis saja apa adanya.

```
RUN:            ____________________  (contoh: Easy L1)
Tanggal:        ____________________

[ ] Mengetuk chip untuk mulai masak terasa jelas tanpa tombol?
    ->       ______________________________________________________

[ ] Chip hijau cukup jelas menunjuk pelanggan yang sedang dimasak?
    ->       ______________________________________________________

[ ] Nilai akhir di piring sekarang terbaca? Terlalu besar atau pas?
    ->       ______________________________________________________

[ ] Warna bar kesabaran: kuning lalu merah. Terlihat? Berapa saat mulai berubah?
    ->       ______________________________________________________

[ ] Dialog konfirmasi pindah pelanggan: muncul di saat yang tepat?
    ->       ______________________________________________________

[ ] Walkout terjadi meski kamu tahu cara dan tidak lambat?
    ->       ______________________________________________________

[ ] Berapa chip yang terlihat sekaligus?
    ->       ______________________________________________________

[ ] Level selesai sebelum pelanggan terakhir datang? Terlalu lama?
    ->       ______________________________________________________

[ ] Waktu nyata satu puzzle: chip muncul -> tersaji
    ->       ____ detik   (ini angka kalibrasi sesungguhnya, bukan konstanta)

[ ] Tile pecahan (0.5, 1/3) masih membingungkan?
    ->       ______________________________________________________

[ ] Saat drag tile ke stand, halaman ikut ter-scroll?
    ->       ______________________________________________________

[ ] Catatan lain:
    ->       ______________________________________________________
```

### Dua pertanyaan yang paling penting

1. **Nilai akhir selalu terbaca sebelum menyajikan?** Kalau hidangan sudah
   salah tapi kamu tidak sempat membaca piring, itu **bug**, bukan angka yang
   salah setel. Lihat aturan 11.
2. **Kaidah operasi terasa natural atau membingungkan?** Ini run pertama di
   build kaidah operasi. Angka di layar harusnya cocok dengan cara kamu biasa
   menghitung di sekolah (misal: `2 + 3 x 4` = 14). Kalau tidak cocok,
   catat di mana — mungkin perlu penyederhanaan.

---

## 5. Yang harus dihentikan, bukan disetel

Segera laporkan, jangan setel angka, kalau salah satu ini terjadi:

- [ ] Walkout terjadi tanpa kamu menyadarinya.
- [ ] Nilai akhir tidak terbaca sebelum kamu menyajikan.
- [ ] Ada langkah yang diterima tapi hasilnya tidak masuk akal.
- [ ] Tombol Sajian tidak menyala padahal rantainya sudah lengkap.
- [ ] Pelanggan hilang tanpa ada yang berubah di layar.
- [ ] Dialog konfirmasi tidak muncul padahal sudah lebih dari 2 kartu.
- [ ] Dialog muncul padahal stand baru berisi 1-2 kartu.
- [ ] Angka di piring tidak sama dengan yang kamu hitung manual (misal: piring
      bilang 20, kamu hitung 14). Ini bukan "kebiasaan" — kaidah operasi
      adalah aturannya, kalau berbeda itu bug.
- [ ] Chip yang masih slide masuk ke slot bisa diketuk (harusnya tidak).
- [ ] Musik atau efek suara terdengar lebih keras dari yang nyaman, atau
      tidak ada sama sekali padahal tidak di-mute.
- [ ] `2^3 = 8` masih tidak bisa di-serve (bug lama, seharusnya sudah beres).

Semuanya itu bug logika, dan perbaikannya di kode, bukan di konstanta.

---

## 6. Hasil playtest pertama (27 September 2026)

Disimpan supaya tidak hilang, dan supaya bisa dibandingkan dengan playtest
kedua. Device: Infinix Note 30 Pro. Run: semua level Easy dan Medium, serta
Hard level 1 dan 2.

| Yang ditanyakan | Jawaban |
|---|---|
| Walkout meski tahu cara dan tidak lambat | **iya** |
| Bar kesabaran pernah di bawah 1/3 | **sering** |
| Berapa chip sekaligus | bisa sampai 4 |
| Pelanggan ke-4 | sadar, tapi sangat mepet, dan usulannya 3 sudah cukup |
| Level selesai sebelum pelanggan terakhir datang | tidak |
| Waktu satu puzzle | 25 detik sampai walkout |
| Tile pecahan membingungkan | "cukup membuat kewalahan untuk kelas anak kuliah seperti saya" |
| Kapan tahu harus tekan "Masak untuk dia" | "saya yang buat jadi saya tau", jadi tidak bisa dipakai sebagai bukti |
| Drag merebut scroll | **tidak** |
| Sadar harus tekan Sajian | sadar |

**Kesimpulan yang diambil dari sini**

- Walkout terjadi karena beban aritmetiknya, bukan karena angka kesabaran yang
  salah setel
- Pecahan Medium melebihi Hard, 0.34 lawan 0.23 per kartu, jadi mode untuk kelas 8
  lebih sulit dari mode untuk kelas 9. Sudah diperbaiki
- Alur lima langkah tidak bisa dinilai, karena yang mengisi juga yang membuat.
  Aturan hitung kiri-ke-kanan juga ketahuan dari catatan yang sama. Keduanya
  sudah diputuskan untuk diubah

**Yang sudah diperbaiki**

14 bug, semuanya dari playtest dan smoke test, tidak ada satu pun dari unit test.
`npm test` 145 hijau, dan kelima belas kombinasi mode x level bisa dimainkan
sampai overlay di browser sungguhan.

---

## 6b. Hasil playtest kedua (28 September 2026)

Device: Infinix Note 30 Pro. Run: Hard level 1 dan 2.

| Yang ditanyakan | Jawaban |
|---|---|
| Yang paling pusing | "udah agak sedikit aman sekarang" |
| Yang paling enak | "udah lumayan lebih mudah sekarang" |
| Walkout | ya, level 2 Hard, "saya tidak tau jawabannya" |
| Dialog konfirmasi | "muncul di saat yang tepat" |
| Nilai akhir piring | terbaca |
| Warna bar patience | "kuning lalu merah, kelihatan" |
| Drag vs scroll | tidak |
| Rekaman layar | tidak ada |

**Kesimpulan yang diambil dari sini**

- Kesulitan Medium turun setelah `fractionChance` diperbaiki. Tidak ada lagi
  keluhan soal pecahan atau desimal yang berlebihan — keluhan itu hilang
  sepenuhnya antara playtest pertama dan kedua.
- Walkout di Hard L2 terjadi karena "saya tidak tau jawabannya", bukan karena
  animasi atau input. Ini konsisten dengan beban aritmetikanya, bukan dengan
  bug di UI.
- `2^3 = 8` ditemukan sebagai bug saat sesi kedua: pelanggan minta 8, pemain
  buat `2^3`, tapi tidak bisa di-serve karena `hasDish` mensyaratkan 3 tile
  sementara rantai unary hanya 2. Sudah diperbaiki.
- Kesabaran dinaikkan 10% (satu-satunya angka yang diubah). `ARRIVAL_SECONDS`
  dan `MAX_ON_SCREEN` sengaja tidak disentuh supaya playtest ketiga hanya
  mengukur satu perubahan.

**Yang sudah diperbaiki dari playtest kedua**

Kaidah operasi, bug `hasDish`, `2^2^2` → `2^4`, antresentasi, tombol Mulai
+ Aturan Main, musik dan efek suara. `npm test` 149 hijau, smoke test 15 level
finishable.

---

## 7. Bagian yang diisi saya

Kalau playtest sudah selesai, bagian ini diisi sebagai hasil analisis, bukan
oleh pemain.

| Konstanta | File | Nilai sekarang (setelah +10%) | Usulan baru | Dasar |
|---|---|---|---|---|
| `PATIENCE_SECONDS.easy` | `difficulty.js:173` | 55, 53, 51, 48, 46 | | |
| `PATIENCE_SECONDS.medium` | `difficulty.js:174` | 48, 46, 44, 41, 37 | | |
| `PATIENCE_SECONDS.hard` | `difficulty.js:175` | 42, 40, 36, 33, 31 | | |
| `ARRIVAL_SECONDS.easy` | `difficulty.js:163` | 15, 14, 13, 12, 11 | | |
| `ARRIVAL_SECONDS.medium` | `difficulty.js:164` | 12, 11, 10, 10, 9 | | |
| `ARRIVAL_SECONDS.hard` | `difficulty.js:165` | 10, 9, 9, 8, 8 | | |
| `MAX_ON_SCREEN` | `difficulty.js:43` | 3 | | |

**Perubahan yang sudah terjadi di angka-angka ini sejak playtest kedua:**

- `PATIENCE_SECONDS` naik 10% di ketiga mode. Alasannya playtest kedua melaporkan
  sering selesai dengan bar kesabaran sudah merah di Medium. Yang **tidak**
  berubah: `ARRIVAL_SECONDS` dan `MAX_ON_SCREEN`. Kalau kedua angka ini ikut
  diubah, playtest ketiga akan mengukur dua perubahan sekaligus, dan tidak akan
  bisa diketahui mana yang menyebabkan perbaikan.

**Hitungan yang sudah ada, supaya tidak mengarang angka**

Anggaran waktu per hidangan = (kapan pelanggan terakhir datang + kesabaran) /
jumlah pelanggan. Angka ini turun drastis seiring level naik, sementara bebannya
naik:

| Mode | Level 1 | Level 5 |
|---|---|---|
| Easy | 25,5 detik | **16,2 detik** |
| Medium | 21,2 detik | **12,9 detik** |
| Hard | 18,6 detik | **11,8 detik** |

> **Catatan:** Angka di atas dihitung ulang dari `PATIENCE_SECONDS` + `ARRIVAL_SECONDS`
> yang **sudah diperbarui** (+10% patience, arrival tidak berubah). Angka lama
> (23,8/14,9, 20,0/12,1, 17,0/10,5) dihitung dari angka lama dan sudah tidak
> relevan untuk playtest ketiga.

Jadi penyusutannya sekitar 36-38% di ketiga mode. Playtest
pertama melaporkan Hard L1 terasa pas, playtest kedua bilang tingkat
kesulitannya "normal aja dikurangi" — **patience sudah dinaikkan 10%**.
Kedua angka sengaja tidak disentuh lagi sampai playtest ketiga, supaya tidak
ada dua kali pengujian dengan game yang berbeda.

**Aturan keputusan:**

1. Satu sinyal → ubah satu angka ±10-15%.
2. Dua sinyal searah → ubah.
3. Sinyal saling bertentangan → biarkan, itu noise bukan tuning.
4. **Jangan pernah mengubah dua hal sekaligus**, karena lalu tidak akan
   ketahuan mana yang menyebabkan perbaikan.
5. Setelah mengubah, main ulang run yang sama. Kalau tidak membaik, kembalikan
   dan cari penjelasan yang lain.

Semua angka ini ada di satu file, jadi tidak ada satu pun yang mengubah
logika permainan.

---

## 8. Dikirim balik ke saya

Salin blok ini, isi, kirim. Yang tidak ada jawabannya tidak apa-apa.

```
Main di:             Infinix Note 30 Pro
Level yang dicoba:   Hard L1 - L2
Yang paling pusing:  udah agak sedikit aman sekarang
Yang paling enak:    udah lumayan lebih mudah sekarang
Walkout yg terjadi:  ya, Level 2 Hard, menurutmu kenapa:
                     Saya tidak tau jawabannya
Dialog konfirmasi:   muncul di saat yang tepat 
Nilai akhir piring:  terbaca 
Warna bar patience:  kuning lalu merah, kelihatan 
Drag vs scroll:      tidak
Rekaman layar:       tidak
```
