# Cooking Number

Game edukasi matematika untuk siswa SMP, bertema restoran: pelanggan memesan
sebuah angka, pemain menyusun angka-angka yang tersedia dengan operator
matematika sampai angkanya cocok, lalu saji.

Rujukan kebutuhan lengkap ada di [PRD.md](PRD.md).

> Status: **Fase 3 hampir selesai** — logika inti, generator soal, dan UI
> multi-pelanggan sudah selesai dan terverifikasi otomatis di kelima belas
> kombinasi mode x level. Sisa pekerjaan yang menentukan adalah playtest di HP
> asli untuk mengkalibrasi angka spawner dan kesabaran.
> Lihat [Roadmap](#roadmap) untuk apa yang belum selesai.

## Cara menjalankan

Butuh Node.js 20+ (hanya untuk test runner, bukan untuk build).

```bash
npm test           # unit test core dan UI
npm run smoke      # main Easy L1, Medium L1, Hard L1, dan Hard L3 di Chrome sungguhan
npm run smoke:all  # kelima belas kombinasi mode x level
npm run inspect    # cetak contoh soal per mode untuk diperiksa manual
npm run assets     # buat ulang placeholder WebP (butuh Python + Pillow)
npm run check:imports
npm run check:styles   # variabel CSS yang dipakai tapi tidak didefinisikan
npm run check          # keduanya
```

`npm run smoke` menerima `--only <mode>` dan `--level <n>` untuk mempersempit
run, misal `npm run smoke -- --only easy` untuk loop cepat sekitar 90 detik.
Butuh `puppeteer-core` dan Chrome/Edge yang sudah terpasang:

```bash
npm install --no-save puppeteer-core@23
npm run smoke
```

Untuk memainkan, sediakan statis saja tanpa build step:

```bash
python -m http.server 8099
# buka http://127.0.0.1:8099/
# dari HP di WiFi yang sama: python -m http.server 8099 --bind 0.0.0.0
```

Harus lewat HTTP, bukan `file://`, karena modul ES akan diblokir CORS. Protokol
run di perangkat asli ada di `PLAYTEST.md`.

## Struktur

```
index.html              markup dan titik mount
styles/                 base, layout, theme, animations
src/core/               logika murni, tanpa DOM
  rational.js           aritmetika pecahan eksak (tanpa floating point)
  operators.js          registry operator biner (+ - x /) dan unary (^ sqrt)
  evaluate.js           evaluator kaidah operasi (shunting-yard) + trailingTerm
  difficulty.js         konfigurasi tiap mode dan level
  generator.js          backward generation soal + jaminan solvable
src/ui/                 view, state, controller
  i18n.js               semua string UI, default English
  assets.js             path aset + definisi operator
  state.js              state permainan, ekspresi, dan formula skor
  progress.js           progres level di localStorage, tanpa DOM
  view.js               seluruh render DOM
  drag.js               interact.js + tap-to-place
  controller.js         loop permainan, timer, transisi
  app.js                titik masuk
assets/placeholder/     WebP datar, siap diganti aset tim
vendor/                 interact.js 1.10.27
scripts/                alat development
test/                   unit test (node:test, tanpa dependency)
PLAYTEST.md             formulir playtest HP dan protocol menjalankan game di HP
SUBMISSION.md           bahan deskripsi proyek dan checklist rubrik lomba
```

## Keputusan desain yang sudah dikunci

| Topik | Keputusan |
|---|---|
| Bentuk ekspresi | Chaining bertahap, hasil operator kembali dipakai di langkah berikutnya |
| Aturan hitung | **Kaidah operasi**: `x` dan `:` mengikat lebih kuat dari `+` dan `-`, jadi `2 + 3 x 4 = 14`. Unary menempel pada operand: `2 + 3^2 = 11`. Playtest kedua=left-to-right membingungkan (`-5 + -2 x -1` terbaca 7) dan kaidah itulah yang diajarikan di SMP |
| Sisi numerik | Aritmetika pecahan eksak, `0.1 + 0.2` harus `0.3` |
| Substansi | Subset bebas, ada distractor sehingga pemain harus memilih |
| Jumlah solusi | Single hiding, satu jawaban rahasia ditambah pengalihan |
| Akar dan pangkat | Bilangan bulat, akar hanya kuadrat sempurna |
| Target | Bulat dan positif, karena pelanggan memesan "8 porsi" |
| Pelanggan | Datang **berkala satu per satu**, menumpuk kalau pemain lambat |
| Kesabaran | **Per pelanggan**, semua jalan bersamaan. Easy 55–46s, Medium 48–37s, Hard 42–31s (level 1 → 5) |
| Spawner | Interval dasar 15/12/10 detik, dengan jitter dan decay. Layar penuh = spawner berhenti |
| Batas layar | Maksimal 3 pelanggan menunggu sekaligus |
| Syarat gagal | **Walkout tanpa reward**. Tidak ada nyawa, tidak ada pelanggan pengganti |
| Level gagal | Tidak ada. Level selesai saat roster habis, yang beda cuma skor |
| Skor | Base per pelanggan per mode, plus bonus kecepatan dari sisa kesabaran. Tidak pernah berkurang |
| Dapur | Satu stand, satu hidangan. Bahan stand milik pelanggan yang sedang dimasak |
| Alur | Ketuk pelanggan → Masak → Sajikan |
| Operator | Progresif **per level**, Easy mulai dari `+ -` saja |
| Input | Ketuk tile, atau seret tile ke stand. Menyajikan lewat tombol Sajian atau ketuk piring |
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

- `npm test` — test core dan UI, termasuk stress test 10.000 soal per mode dan
  pemutaran ulang solusi rahasia Medium/Hard melalui `pushTile`, yang memaksa
  stand menepati jaminan solvability yang sama dengan core.
- `npm run smoke` — menjalankan game di Chrome sungguhan dan **memainkannya
  sampai overlay level-complete muncul** untuk Easy L1, Medium L1, Hard L1, dan
  Hard L3. Solver di dalamnya membaca target dari chip dan bahan dari rak, jadi
  level yang tidak bisa diselesaikan hanya dari yang terlihat di layar akan
  gagal di sini, bukan di tangan pemain.
- `npm run smoke:all` — hal yang sama untuk kelima belas kombinasi mode x
  level. Butuh sekitar 25 menit nyata, jadi bukan quality gate setiap commit.
- `npm run inspect` — mencetak contoh soal untuk diperiksa ulang secara
  pedagogis dengan mata.
- `npm run check:imports` — mendeteksi import yang tidak terpakai di `src/core`
  dan `src/ui`.
- `npm run check:styles` — mendeteksi `var(--nama)` yang tidak pernah
  didefinisikan. Karena variabel yang hilang hilang diam-diam, sebuah bar
  kesabaran pernah berubah jadi abu karena itu.

## Roadmap

- [x] **Fase 1** — logika inti, generator, unit test
- [x] **Fase 2** — UI mobile-first dengan satu pelanggan satu pesanan
- [x] **Fase 2.5** — redesign ke pelanggan berdatangan berkala
- [~] **Fase 3** — polish dan kalibrasi spawner dan kesabaran di HP asli
- [ ] **Fase 4** — materi submission

Rencana kerja yang sedang berjalan ada di `PLAN.md`. Masih terbuka: rubrik
lomba, aset visual final dari tim, hasil playtest di perangkat asli, dan
keputusan apakah roster pelanggan per mode mengikuti PRD §5.7 atau satu tangga
bersama.

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
  logika permainan, dan protocol pengukurannya ada di `PLAYTEST.md`.
- `.opencode/` diabaikan git karena berisi catatan internal.
