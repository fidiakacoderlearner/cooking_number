# Formulir Playtest HP

Angka spawner dan kesabaran di `src/core/difficulty.js` **belum angka final**.
Semuanya titik awal yang belum pernah dilihat pemain sungguhan. Formulir ini
adalah satu-satunya cara mengukurnya, dan isian di sini yang menentukan angka
mana yang diputar.

Isi satu file ini, lalu kirim balik. Tidak perlu rapi.

**Status:** playtest pertama sudah selesai dan hasilnya ada di bagian 6. Yang di
bawah adalah formulir untuk playtest **kedua**, dengan alur permainan yang sudah
berubah.

---

## 1. Menjalankan game di HP

Game ini statis tanpa build step, tapi **harus lewat HTTP**. ES module akan
diblokir CORS kalau dibuka langsung dari `file://`.

Di PC:

```bash
cd C:\Users\ASUS\Documents\cooking_number
python -m http.server 8099 --bind 0.0.0.0
```

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

| Laporan pertama | Status |
|---|---|
| Gambar piring hilang | Diperbaiki. Nilai akhir jadi pita di tengah piring, piringnya tetap kelihatan |
| Bar kesabaran jadi abu saat kuning | Diperbaiki. Sekarang benar-benar kuning di bawah 2/3, merah di bawah 1/3 |
| Chip berkedip tiap detik | Diperbaiki. Hanya pelanggan yang baru datang yang muncul dengan animasi |
| Kartu level beda tinggi | Diperbaiki |
| Drag tidak kelihatan bergerak | Diperbaiki. Sekarang tile mengikuti jari persis |
| Pelanggan ke-4 terlalu mepet | Diperbaiki. Maksimal 3 pelanggan, tiga chip muat di 320px tanpa digeser |
| Puncak Normal lebih sulit dari dasar Hard | Diperbaiki. Pecahan per kartu di Medium sekarang di bawah Hard |
| Kaidah operasi (`-5 + -2 x -1` = 7, bukan -3) | **Belum diperbaiki.** Sudah diputuskan ganti ke kaidah, dikerjakan setelah playtest ini |

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
2. **Setelah mengetuk chip, apakah jelas stand-nya sudah milik pelanggan itu?**
   Ini yang menggantikan tombol yang dihapus. Kalau masih perlu satu saat untuk
   menyadari, laporkan. Lebih baik daripada membiarkan pemain mengira hidangan
   sudah untuk pelanggan yang salah.

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

## 7. Bagian yang diisi saya

Kalau playtest sudah selesai, bagian ini diisi sebagai hasil analisis, bukan
oleh pemain.

| Konstanta | File | Nilai sekarang | Usulan baru | Dasar |
|---|---|---|---|---|
| `PATIENCE_SECONDS.easy` | `difficulty.js:165` | 50→42 | | |
| `PATIENCE_SECONDS.medium` | `difficulty.js:166` | 44→34 | | |
| `PATIENCE_SECONDS.hard` | `difficulty.js:167` | 38→28 | | |
| `ARRIVAL_SECONDS.easy` | `difficulty.js:155` | 15→11 | | |
| `ARRIVAL_SECONDS.medium` | `difficulty.js:156` | 12→9 | | |
| `ARRIVAL_SECONDS.hard` | `difficulty.js:157` | 10→8 | | |
| `MAX_ON_SCREEN` | `difficulty.js:43` | 3 | | |

**Hitungan yang sudah ada, supaya tidak mengarang angka**

Anggaran waktu per hidangan = (kapan pelanggan terakhir datang + kesabaran) /
jumlah pelanggan. Angka ini turun drastis seiring level naik, sementara bebannya
naik:

| Mode | Level 1 | Level 5 |
|---|---|---|
| Easy | 23,8 detik | **14,9 detik** |
| Medium | 20,0 detik | **12,1 detik** |
| Hard | 17,0 detik | **10,5 detik** |

Jadi penyusutannya sekitar 38% di ketiga mode, bukan hanya di Hard. Playtest
pertama melaporkan Hard L1 terasa pas, 17 detik cocok dengan hitungan, dan
Medium L5 mustahil, 12 detik juga cocok. Playtest kedua bilang tingkat
kesulitannya "normal aja dikurangi" tapi **angka spawner dan kesabaran sengaja
belum disentuh** sampai ada playtest ketiga, supaya tidak ada dua kali
pengujian dengan game yang berbeda.

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
Main di:             ____________________
Level yang dicoba:   ____________________
Yang paling pusing:  ____________________
Yang paling enak:    ____________________
Walkout yg terjadi:  ya/tidak, level mana, menurutmu kenapa:
                     ____________________
Dialog konfirmasi:  muncul di saat yang tepat / tidak
Nilai akhir piring:  terbaca / tidak
Warna bar patience:  kuning lalu merah, kelihatan / tidak
Drag vs scroll:      halaman ikut ter-scroll / tidak
Rekaman layar:       ada / tidak
```
