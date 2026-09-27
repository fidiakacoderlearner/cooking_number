# Cooking Number

Game edukasi matematika untuk siswa SMP, bertema restoran: pelanggan memesan
sebuah angka, pemain menyusun angka-angka yang tersedia dengan operator
matematika sampai angkanya cocok, lalu saji.

Rujukan kebutuhan lengkap ada di [PRD.md](PRD.md).

> Status: **Fase 2.5 sedang dikerjakan** — logika inti dan generator soal selesai;
> UI sedang diubah ke model pelanggan berdatangan berkala.
> Lihat [Roadmap](#roadmap) untuk apa yang belum selesai.

## Cara menjalankan

Butuh Node.js 20+ (hanya untuk test runner, bukan untuk build).

```bash
npm test           # unit test core
npm run smoke      # jalankan game sungguhan di Chrome dan verifikasi alur-ui
npm run inspect    # cetak contoh soal per mode untuk diperiksa manual
npm run assets     # buat ulang placeholder WebP (butuh Python + Pillow)
npm run check:imports
```

Untuk memainkan, sediakan statis saja tanpa build step:

```bash
python -m http.server 8099
# buka http://127.0.0.1:8099/
```

`npm run smoke` membutuhkan `puppeteer-core` dan Chrome/Edge yang sudah terpasang:

```bash
npm install --no-save puppeteer-core@23
npm run smoke
```

## Struktur

```
index.html              markup dan titik mount
styles/                 base, layout, theme, animations
src/core/               logika murni, tanpa DOM
  rational.js           aritmetika pecahan eksak (tanpa floating point)
  operators.js          registry operator biner (+ - x /) dan unary (^ sqrt)
  evaluate.js           evaluator left-to-right untuk rantai langkah
  difficulty.js         konfigurasi tiap mode dan level
  generator.js          backward generation soal + jaminan solvable
src/ui/                 view, state, controller
  i18n.js               semua string UI, default English
  assets.js             path aset + definisi operator
  state.js              state permainan dan formula skor
  view.js               seluruh render DOM
  drag.js               interact.js + tap-to-place
  controller.js         loop permainan, timer, transisi
  app.js                titik masuk
assets/placeholder/     WebP datar, siap diganti aset tim
vendor/                 interact.js 1.10.27
scripts/                alat development
test/                   unit test (node:test, tanpa dependency)
```

## Keputusan desain yang sudah dikunci

| Topik | Keputusan |
|---|---|
| Bentuk ekspresi | Chaining bertahap, hasil operator kembali dipakai di langkah berikutnya |
| Aturan hitung | **Left-to-right**, semua operator sama bobot: `2 + 3 x 4 = 20` |
| Sisi numerik | Aritmetika pecahan eksak, `0.1 + 0.2` harus `0.3` |
| Substansi | Subset bebas, ada distractor sehingga pemain harus memilih |
| Jumlah solusi | Single hiding, satu jawaban rahasia ditambah pengalihan |
| Akar dan pangkat | Bilangan bulat, akar hanya kuadrat sempurna |
| Target | Bulat dan positif, karena pelanggan memesan "8 porsi" |
| Pelanggan | Datang **berkala satu per satu**, menumpuk kalau pemain lambat |
| Kesabaran | **Per pelanggan**, semua jalan bersamaan. Easy 50s, Medium 44s, Hard 38s |
| Spawner | Interval dasar 15/12/10 detik, dengan jitter dan decay. Layar penuh = spawner berhenti |
| Batas layar | Maksimal 4 pelanggan menunggu sekaligus |
| Syarat gagal | **Walkout tanpa reward**. Tidak ada nyawa, tidak ada pelanggan pengganti |
| Level gagal | Tidak ada. Level selesai saat roster habis, yang beda cuma skor |
| Skor | Base per pelanggan per mode, plus bonus kecepatan dari sisa kesabaran. Tidak pernah berkurang |
| Dapur | Satu stand, satu hidangan. Bahan stand milik pelanggan yang sedang dimasak |
| Alur | Pilih pelanggan → Masak untuk dia → masak → jadi → sajikan |
| Operator | Progresif **per level**, Easy mulai dari `+ -` saja |
| Input | Drag-and-drop plus tap-to-place, karena drag merepotkan di layar kecil |
| Bahasa | English sebagai default, toggle ID/EN, pilihan tersimpan di `localStorage` |
| Struktur level | 5 level per mode, roster pelanggan 4/5/6/7/8 |

## Bagaimana generator soal bekerja

PRD 5.2 menuntut jaminan bahwa setiap soal pasti bisa diselesaikan. Pendekatan
di sini: **pilih target dulu, lalu jalan mundur (backward generation)** melalui
solusi rahasia, memilih operand yang membuat setiap langkah invers-nya mendarat
di nilai yang legal.

1. Ambil sebuah target dari rentang mode.
2. Copet satu operasi dari target tersebut:
   - `+`, `−`, `×`, `÷` → pilih operand, lalu hitung nilai sebelumnya
   - `√` → nilai sebelumnya adalah `target²`, harus bilangan bulat
   - `^` → cari akar bulat yang menghasilkan `target`
3. Ulangi sampai jumlah langkah tercapai. Nilai paling akhir menjadi bahan
   pertama, setiap operand yang dipilih menjadi bahan berikutnya.
4. Tambahkan distractor yang tidak dipakai solusi.
5. **Verifikasi ulang** seluruh rantai dengan `evaluate()`.

Karena kita yang membuat jalurnya, solvability dijamin **secara konstruksi**,
bukan dengan mencari jalur. `evaluate(secretRecipe) === target` adalah bukti
langsung dan selalu dicek sebelum soal dikirim ke pemain.

Kalau sebuah target tidak bisa dipecah dalam batas percobaan, target itu
dibuang dan yang baru diambil. Fungsi ini tidak pernah mengembalikan soal
setengah jadi: kalau gagal, ia melempar `GenerationError`.

## Aturan kualitas yang dijaga generator

Hal-hal yang tidak terlihat dari kode, tapi sangat terasa ketika bermain:

- Tidak ada langkah yang tidak mengubah nilai (`x + 0`, `x x 1`, `√1`).
- Nilai berjalan tidak pernah melewati nol, dan tidak pernah negatif di
  Medium atau Hard.
- Perantara tidak pernah meledak ke tiga digit.
- Pecahan selalu enak dibaca: penyebut hanya 1, 2, 3, 4, 5, 6, 8, 10 dan
  pembilang maksimal 12. `97/6` dan `1/15` ditolak.
- Nilai berjalan tidak pernah mengulang dirinya sendiri, jadi tidak ada
  perjalanan sia-sia seperti `3 → 9 → 3`.
- Total tidak pernah tercapai sebelum langkah terakhir.
- Akar selalu atas bilangan bulat, pangkat selalu pangkat bulat kecil.
- Target tidak pernah ikut muncul sebagai pengalihan.

## Tampilan angka

`toDisplayString()` memakai desimal hanya bila ekspansi desimalnya berhingga
(`3/4` → `0.75`). Selain itu pecahan tetap ditampilkan apa adanya (`2/3` →
`2/3`), karena `0.667` akan mengajari siswa bahwa `2/3 = 0.667`.

## Verifikasi

- `npm test` — test core, termasuk stress test 10.000 soal per mode.
- `npm run smoke` — menjalankan game di Chrome sungguhan, menyajikan beberapa
  pelanggan sekaligus hanya dari yang terlihat di layar, lalu memeriksa skor,
  walkout, akhir level, dan toggle bahasa. Kegagalan apa pun pada alur-ui
  tertangkap di sini.
- `npm run inspect` — mencetak contoh soal untuk diperiksa ulang secara
  pedagogis dengan mata.
- `npm run check:imports` — mendeteksi import yang tidak terpakai di `src/core`
  dan `src/ui`.

## Roadmap

- [x] **Fase 1** — logika inti, generator, unit test
- [x] **Fase 2** — UI mobile-first dengan satu pelanggan satu pesanan
- [~] **Fase 2.5** — redesign ke pelanggan berdatangan berkala
- [ ] **Fase 3** — polish, kalibrasi spawner dan kesabaran di HP asli
- [ ] **Fase 4** — playtesting akhir, materi submission

Masih terbuka: rubrik lomba, aset visual final dari tim, hasil kalibrasi
layar di perangkat asli.

## Catatan teknis

- Placeholder WebP dibuat datar dan geometris oleh
  `scripts/make-placeholder-assets.py`, total semua aset di bawah 6 KB per
  berkas. Ganti dengan aset tim cukup lewat `src/ui/assets.js`.
- `interact.js` divendor lokal, bukan diambil dari CDN saat runtime, supaya
  tetap jalan di jaringan sekolah yang terbatas.
- `package.json` memakai `"type": "module"`. Browser mengabaikannya, jadi
  hosting statis tetap jalan tanpa build step.
- `secretRecipe` hanya untuk pembuktian di test. **Jangan** kirim ke pemain.
- Angka spawner dan kesabaran di `src/core/difficulty.js` adalah titik awal,
  bukan angka final. Semuanya bisa diubah dari satu file tanpa menyentuh
  logika permainan.
- `.opencode/` diabaikan git karena berisi catatan internal.
