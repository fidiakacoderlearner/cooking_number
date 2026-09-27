# Formulir Playtest HP

Angka spawner dan kesabaran di `src/core/difficulty.js` **bukan angka final**.
Semuanya titik awal yang belum pernah dilihat pemain sungguhan. Formulir ini
adalah satu-satunya cara mengukurnya, dan isian di sini yang akan menentukan
angka mana yang diputar.

Isi satu file ini, lalu kirim balik. Tidak perlu rapi.

---

## 1. Menjalankan game di HP

Game ini statis tanpa build step, tapi **harus lewat HTTP** — ES module akan
diblokir CORS kalau dibuka langsung dari `file://`.

Di PC:

```bash
ipconfig                                    # cari IPv4, contoh 192.168.1.7
python -m http.server 8099 --bind 0.0.0.0
```

Di HP, terhubung ke WiFi yang sama, buka:

```
http://192.168.1.7:8099/
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

## 2. Urutan run

Lima run, urutan ini, sekitar 90 detik per level.

| # | Run | Kenapa run ini |
|---|---|---|
| 1 | Easy L1 | Baseline. Hanya ada dua operator, `+` dan `-`. Kalau ini tidak terasa jelas, yang lain tidak akan terasa |
| 2 | Easy L5 | Level termudah yang penuh: 8 pelanggan, angka besar, `÷` aktif. |
| 3 | Medium L1 | Pecahan masuk. Tile `0.5` dan `1/3` pertama kali muncul. |
| 4 | Hard L1 | Pangkat `²` dan `³` masuk, plus spawner paling cepat. |
| 5 | Hard L3 | `√` masuk dan rantai bisa beruntun. Ini yang paling mungkin rusak. |

**Rekam layar 30-60 detik tiap run.** Sekaligus bahan playtest *dan* footage
video demo untuk submission.

---

## 3. Yang dicatat per run

Satu blok per run. Tulis saja apa adanya.

```
RUN:            Level pada mode Normal dan Hard  (contoh: Easy L1)
HP:             Infinix Note 30 Pro  (contoh: Redmi 12, 360x800)
Tanggal:        27 September 2026

[ ] Walkout terjadi meski kamu tahu cara dan tidak lambat?
    ->       iya

[ ] Bar kesabaran pernah turun ke bawah 1/3 sebelum hidangan jadi?
    ->       sering

[ ] Berapa chip yang terlihat sekaligus?
    ->       bisa sampai 4

[ ] Pelanggan ke-4 datang: apakah kamu SADAR dia muncul? (lihat catatan di bawah)
    ->       sadar, tapi saya tidak tau apakah di hp lain juga begitu atau tidak, hanya saja keliatannya sudah sangat mepet sekali, mungkin 3 pelanggan saja sudah cukup

[ ] Level selesai sebelum pelanggan terakhir datang? Terlalu lama?
    ->       tidak

[ ] Waktu nyata satu puzzle: chip muncul -> tersaji
    ->       25 detik sampai walkout   (ini angka kalibrasi sesungguhnya, bukan konstanta)

[ ] Tile pecahan (0.5, 1/3) membingungkan?
    ->       cukup membuat kewalahan untuk kelas anak kuliahan seperti saya

[ ] Tau harus tekan "Masak untuk dia", atau baru setelah salah ketuk?
    ->       karena saya yang buat jadi saya tau, tapi mungkin menurut saya sebaiknya langsung saja, gausah ada tombol "masak untuk dia", dan untuk servenya itu tergantung pelanggan mana yang kita klik

[ ] Saat drag tile, halaman ikut ter-scroll?
    ->       tidak

[ ] Sadar harus tekan "Sajian" setelah hidangan jadi?
    ->       sadar

[ ] Catatan lain:
    ->       ini masih tidak mengikuti kabataku, jadi saya pernah buat -5 + -2 * -1, itu hasilnya 7, padahal sesuai kaidah matematika, harusnya kali atau bagi itu dikerjakan duluan (tergantung mana yang di sisi kiri), baru tambah atau kurang, jadi harusnya itu bernilai -3
    ->       kedap kedip saat waktu berkurang detik demi detik pada chip pelanggan, jadi saat waktu mundur, kenapa malah kedap kedip, harusnya dibuat tetap saja, dan cuma waktunya yang berkurang terus
    ->       untuk card level, buatnya konsisten , soalnya begini, apabila teks dalam card level itu masih dalam terkunci yang mana teks ini lebih panjang dari teks isi apabila card level sudah terbuka, itu menyebabkan perbedaan size dari card, dan itu terlihat tidak konsisten, nah saya mau itu konsisten 
    ->       nilai akhir pada piring itu terbaca, tapi sebaiknya dibuat lebih besar dan berada benar benar di piring, karena awalnya saya kurang ngeh ada hasilnya disitu karena ukurannya kecil dan posisinya diatas
    ->       Tambahan catatan, terkadang saya merasa kesulitan untuk bermain di normal level atas daripada di hard di level bawah, karena semakin keatas levelnya semakin banyak desimal dan pecahan yang ada 
    ->       Terakhir, saya sering kali menemukan apabila sudah menggunakan pecahan, itu hasilnya susah sekali untuk ditemukan, untuk saya sebagai anak kuliah saja sudah kewalahan dan di level 5 normal saya cuma dapat 2/3 dari hasil maksimal  
```

### Dua pertanyaan yang paling penting

1. **Nilai akhir selalu terbaca sebelum menyajikan?** Kalau hidangan sudah
   salah tapi kamu tidak sempat membaca piring, itu **bug**, bukan angka yang
   salah setel. Lihat aturan 11.
2. **Saat pelanggan keempat muncul di HP kecil, kamu sadar?** `.queue__strip`
   diukur otomatis membutuhkan **414px** untuk 4 chip, sedangkan viewport
   320px hanya punya 320px. Secara teknis chip-nya bisa di-scroll ke samping,
   tapi kalau kamu tidak sadar pelanggannya datang, itu masalah nyata yang
   tidak bisa dibuktikan dari atas meja.

---

## 4. Yang harus dihentikan, bukan disetel

Segera laporkan, jangan setel angka, kalau salah satu ini terjadi:

- [ ] Walkout terjadi tanpa kamu menyadarinya.
- [ ] Nilai akhir tidak terbaca sebelum kamu menyajikan.
- [ ] Ada langkah yang diterima tapi hasilnya tidak masuk akal.
- [ ] Tombol Sajian tidak menyala padahal rantainya sudah lengkap.
- [ ] Pelanggan hilang tanpa ada yang berubah di layar.

Semuanya itu bug logika, dan perbaikannya di kode, bukan di konstanta.

---

## 5. Bagian yang diisi saya

Kalau playtest sudah selesai, bagian ini diisi sebagai hasil analisis, bukan
oleh pemain.

| Konstanta | File | Nilai sekarang | Usulan baru | Dasar |
|---|---|---|---|---|
| `PATIENCE_SECONDS.easy` | `difficulty.js:161` | 50→42 | | |
| `PATIENCE_SECONDS.medium` | `difficulty.js:162` | 44→34 | | |
| `PATIENCE_SECONDS.hard` | `difficulty.js:163` | 38→28 | | |
| `ARRIVAL_SECONDS.easy` | `difficulty.js:151` | 15→11 | | |
| `ARRIVAL_SECONDS.medium` | `difficulty.js:152` | 12→9 | | |
| `ARRIVAL_SECONDS.hard` | `difficulty.js:153` | 10→8 | | |
| `MAX_ON_SCREEN` | `difficulty.js:39` | 4 | | |

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

## 6. Dikirim balik ke saya

Salin blok ini, isi, kirim. Yang tidak ada jawabannya tidak apa-apa.

```
Main di:             Infinix note 30 pro
Level yang dicoba:   semua level easy dan normal, serta level 1 dan 2 mode hard
Yang paling pusing:  saat bilangan sudah mencakup pecahan
Yang paling enak:    easy saat semuanya masih bilangan bulat
Walkout yg terjadi:  ya/tidak, level mana, menurutmu kenapa:
                     ya, level level normal dan hard, jika jawaban sedikit menyangkut pecahan atau angka desimal
Drag vs scroll:      tidak
Pelanggan ke-4:      sadar 
Rekaman layar:       tidak
```
