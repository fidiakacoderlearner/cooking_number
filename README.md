# Number Kitchen

Game edukasi matematika untuk siswa SMP, bertema restoran: pelanggan memesan
sebuah angka, pemain menyusun angka-angka yang tersedia dengan operator
matematika sampai angkanya cocok, lalu saji.

Wrkoming title, lihat [PRD.md](PRD.md).

> Status: **Fase 1 selesai** — logika inti + generator soal + unit test.
> Belum ada UI. Lihat [Roadmap](#roadmap).

## Cara menjalankan

Butuh Node.js 20+ (sudah dipakai untuk测试 runner saja, bukan untuk build).

```bash
npm test        # jalankan seluruh unit test
npm run inspect # cetak contoh soal per mode untuk diperiksa secara visual
```

Tidak ada dependency, tidak ada build step, tidak ada `npm install` yang perlu
dijalankan.

## Struktur

```
src/core/
  rational.js    aritmetika pecahan eksak (tanpa floating point)
  operators.js   registry operator biner (+ - x /) dan unary (^ sqrt)
  evaluate.js    evaluator left-to-right untuk rantai langkah
  difficulty.js  konfigurasi tiap mode dan level
  generator.js   backward generation soal + jaminan solvable
scripts/
  inspect-puzzles.js  alat bantu development, tidak dipakai game
  check-imports.js    alat bantu development, tidak dipakai game
test/                 unit test (node:test, tanpa dependency)
```

## Keputusan desain yang sudah dikunci

| Topik | Keputusan | Alasan |
|---|---|---|
| Bentuk ekspresi | Chaining bertahap | Hasil operator kembali ke rak bahan, jadi pemain bebasNUMBER sense |
| Aturan hitung | **Left-to-right**, semua operator sama bobot | `2 + 3 x 4 = 20`. Tidak perlu hafal aturan precedence untuk SMP |
| Sisi numerik | Aritmetika pecahan eksak | `0.1 + 0.2` harus `0.3`, bukan `0.30000000000000004` |
| Substansi | Subset bebas | Ada distractor, jadi pemain harus memilih bukan sekadar memakai semua |
| Jumlah solusi | Single hiding | Satu jawaban rahasia + pengalihan |
| Akar & pangkat | Bilangan bulat, kuadrat sempurna | `sqrt(16) = 4`, bukan `sqrt(2) approx 1.414` |
| Target | Bulat & positif | Pelanggan memesan "8 porsi", bukan "0.333 porsi" |
| Input | Drag-and-drop + tap-to-place | Drag原始 awful di layar kecil; tap adalah jaring pengaman |
| Bahasa UI | i18n ID/EN dengan toggle | Lomba bersifat internasional |
| Struktur level | 5 level per mode, 2/3/4/4/5 pesanan | Kompleksitas naik antar-mode, level hanya menambah pesanan (PRD 5.7) |

## Bagaimana generator soal bekerja

PRD 5.2 menuntut jaminan bahwa setiap soal *pasti* bisa diselesaikan. Pendekatan
di sini: **pilih target dulu, lalu jalan mundur (backward generation)** melalui
solusi rahasia, memilih operand yang membuat setiap langkah invers-nya mendarat
di nilai yang legal.

1. Ambil sebuah target dari rentang mode.
2. Copet satu operasi dari target tersebut:
   - `add`/`sub`/`mul`/`div` → pilih operand, lalu hitung nilai sebelumnya
   - `sqrt` → nilai sebelumnya adalah `target^2` (harus bilangan bulat)
   - `pow` → cari akar bulat yang menghasilkan `target`
3. Ulangi sampai jumlah langkah tercapai. Nilai paling akhir menjadi bahan
   pertama; setiap operand yang dipilih menjadi bahan berikutnya.
4. Tambahkan distractor yang tidak dipakai solusi.
5. **Verifikasi ulang** seluruh rantai dengan `evaluate()`.

Karena kita yang membuat jalurnya, solvability dijamin **secara konstruksi** —
bukan dengan mencari jalur. `evaluate(secretRecipe) === target` adalah bukti
langsung, dan selalu dicek sebelum soalReturned ke pemain.

Kalau sebuah target tidak bisa dipecah dalam batas percobaan, target itu
dibuang dan yang baru diambil. Fungsi ini tidak pernah mengembalikan soal yang
setengah jadi: kalau gagal, ia melempar `GenerationError`.

## Aturan kualitas yang dijaga generator

Unit test menjaga hal-hal yang tidak terlihat dari kode, tapi sangat terasa
ketika bermain:

- Tidak ada langkah yang tidak mengubah nilai (`x + 0`, `x x 1`, `sqrt(1)`).
- Nilai berjalan tidak pernah melewati nol, dan tidak pernah negatif di
  Medium/Hard.
- Angka total tidak pernah keluar dari batas mode, dan perantara tidak pernah
  meledak ke tiga digit.
- Pecahan selalu enak dibaca: penyebut hanya 1, 2, 3, 4, 5, 6, 8, 10 dan
  pembilang maksimal 12. `97/6` dan `1/15` ditolak.
- Nilai total tidak pernah mengulang dirinya sendiri, sehingga tidak ada
  perjalanan sia-sia seperti `3 -> 9 -> 3` (kuadrat lalu akar lagi).
- Total tidak pernah tercapai sebelum langkah terakhir.
- Akar selalu atas bilangan bulat; pangkat selalu pangkat bulat kecil.
- Tidak ada的目标 yang juga muncul sebagai pengalihan.

## Tampilan angka

`toDisplayString()` memakai desimal hanya bila ekspansi desimalnya berhingga
(`3/4` → `0.75`). Selain itu pecahan tetap ditampilkan apa adanya
(`2/3` → `2/3`), karena `0.667` akanZjebak mengajari siswa bahwa `2/3 = 0.667`.

## Roadmap

- [x] **Fase 1** — logika inti + generator + unit test
- [ ] **Fase 2** — UI: drag-and-drop + tap-to-place, area kerja, timer, nyawa
- [ ] **Fase 3** — mode Medium & Hard di UI, styling, i18n ID/EN
- [ ] **Fase 4** — playtesting, perbaikan bug, materi submission

Belum dikerjakan dan masih terbuka: formula skor, durasi timer final, nama
final, tema visual, panduan rubrik lomba, pembagian peran tim.

## Catatan teknis

- `interact.js` v1 berukuran ~98 KB. Untuk jaringan sekolah yang terbatas,
  sebaiknya di-*vendor* ke `vendor/interact.min.js` daripada diambil dari CDN
  saat runtime. Belum dilakukan karena fase ini belum menyentuh UI.
- `package.json` memakai `"type": "module"` supaya `node --test` bisa memuat
  ES modules. Browser mengabaikan berkas ini, jadi hosting statis tetap jalan
  tanpa build step.
- `secretRecipe` pada objek puzzle hanya untuk pembuktian di test. **Jangan**
  kirim ke pemain.
