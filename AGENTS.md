# AGENTS.md
- [ ] Perubahan tercatat di `CHANGELOG.md` dan `PLAN.md` terupdate
- [ ] Sesuai PRD (kaidah operasi, chaining bertahap, subset bebas, single hiding)
11. **Walkout adalah konsekuensi yang disengaja, bukan efek samping**
    Pelanggan walkout berarti pemain gagal. Tapi hal yang merusak hanya boleh
    dipicu oleh aksi yang jelas dan terlihat. Dilarang membuat walkout bisa
    terjadi karena salah klik, tabrakan hit-testing, atau state yang tidak
    sengaja terpicu. Nilai akhir hidangan harus selalu terbaca di layar
    sebelum pemain disajikan.
## Tujuan

- Menjaga konsistensi kode, gaya, dan arsitektur.
- Memastikan keputusan teknis sesuai PRD dan kesepakatan tim.
- Mencegah rework dan menjaga kualitas produk.

## Aturan Umum (Wajib)

1. **Dilarang mengubah core tanpa alasan kuat**
   `src/core/*` bersifat kritis. Ubah hanya bila ada test yang gagal atau bug
   yang terverifikasi.

2. **Unit test adalah gatekeeper**
   Semua perubahan wajib lolos `npm test`. Jangan menurunkan coverage.

3. **Kaidah operasi dan aritmetika eksak adalah aturan tetap**
   Evaluator memakai kaidah operasi: `×` dan `÷` mengikat lebih kuat dari `+`
   dan `−`, dan unary (`²`, `³`, `√`) menempel pada angka di depannya. Ini
   menggantikan left-to-right yang berlaku sampai 28 September 2026, karena
   playtest kedua membuktikan `-5 + -2 × -1` dibaca 7 padahal kaidah bilang -3,
   dan kaidah itulah yang diajarikan di SMP. Dilarang mengembalikan evaluator ke
   left-to-right. Dilarang mengganti `rational.js` ke floating point.
   Sumber kebenaran precedence adalah `PRECEDENCE` di `src/core/operators.js`;
   `evaluate.js` dan `generator.js` harus membacanya, tidak boleh menuliskannya
   sendiri, supaya soal tidak pernah dibuat dengan satu aturan dan dinilai
   dengan aturan lain.

4. **UI terpisah dari core**
   Core tidak boleh bergantung pada DOM atau `interact.js`. UI hanya memanggil
   API publik core.

5. **Tidak generate AI-slop massal**
   Prioritaskan CSS/SVG minimal atau aset tim. Placeholder harus bersih dan
   terkontrol, bukan hasil generate massal.

6. **`secretRecipe` tidak boleh bocor**
   Hanya untuk pembuktian di test. Jangan pernah kirim ke pemain.

7. **Mobile-first dan ringan**
   Mulai dari layar HP. Hindari dependency berat. Vendor `interact.js` lokal.

8. **Bahasa dan i18n**
   Default UI **English**. Toggle ID/EN tersedia. Semua string UI wajib
   berada di `src/ui/i18n.js`, tidak boleh hardcoded di tempat lain.

9. **Jangan commit tanpa izin eksplisit**
   Perubahan hanya di-commit bila pengguna memintanya secara langsung.

10. **Dokumentasi selalu terbarui**
    Perubahan signifikan dicatat di `CHANGELOG.md`, rencana kerja di `PLAN.md`.

11. **Walkout adalah konsekuensi yang disengaja, bukan efek samping**
    Pelanggan walkout berarti pemain gagal. Tapi hal yang merusak hanya boleh
    dipicu oleh aksi yang jelas dan terlihat. Dilarang membuat walkout bisa
    terjadi karena salah klik, tabrakan hit-testing, atau state yang tidak
    sengaja terpicu. Nilai akhir hidangan harus selalu terbaca di layar
    sebelum pemain disajikan.

12. **Bahan tidak boleh bercampur antar-pelanggan**
   Angka dan operator di stand adalah milik pelanggan yang sedang dimasak.
   Dilarang memakai satu pool bahan gabungan untuk beberapa pelanggan, karena
   itu membuat pemain bisa menghabiskan bahan milik satu pesanan dan membuat
   level mustahil diselesaikan.

13. **Tampilan stand harus jujur soal aritmetikanya**
   Yang tampil di stand harus dibaca sebagai ekspresi yang sama dengan yang
   dihitung core. Di bawah kaidah operasi, `√` ditulis mengelilingi angka dan
   pangkat sebagai superscript, jadi bentuk keduanya benar hanya kalau unary
   memang menempel pada operand. Dilarang menampilkan bentuk yang terlihat
   seperti operator lain: `2 + 3 × 4` yang tampil sebagai 20-adalah contoh
   kegagalan yang lolos ke pemain.

## Peran

| Peran | Fokus | Tanggung jawab |
|---|---|---|
| `core-guardian` | Logika matematika dan generator | Integritas rational, evaluator, backward generation. Stress test wajib setiap kali generator diubah. |
| `ui-engineer` | UI/UX dan interaksi | Layout mobile-first, drag dan tap-to-place, integrasi core, tema toon. Tidak mengubah core. |
| `test-keeper` | Quality assurance | Test tetap hijau, menambah test regresi, memverifikasi kualitas pedagogis soal. |
| `asset-curator` | Aset dan visual | Placeholder bersih, siap swap ke aset tim. Mencegah AI-slop. |
| `docs-maintainer` | Dokumentasi | Memelihara `AGENTS.md`, `CHANGELOG.md`, `PLAN.md`, dan `README.md`. |

## Workflow

1. Baca `PLAN.md`, `PRD.md`, dan `AGENTS.md` sebelum mulai.
2. **Baca bagian "Sesi berikutnya" di paling atas `PLAN.md` lebih dulu.** Di
   situ tertulis urutan kerja yang sudah disepakati, termasuk hal-hal yang
   hanya bisa scooped oleh manusia dan tidak bisaPutuskan dari atas meja.
   Konteks tidak bertahan antar sesi, jadi `PLAN.md` adalah satu-satunya
   sumber apa yang sedang dikerjakan dan berikutnya apa.
3. Patuhi todo di `PLAN.md`, perbarui status secara real-time.
4. Ikuti konvensi kode yang sudah ada di berkas sekitar.
5. Jalankan `npm test`, pastikan hijau.
6. Catat perubahan di `CHANGELOG.md`.
7. Laporkan hasil secara ringkas.

## Konvensi Kode

- ES Modules (`type: module`), Vanilla JS.
- Tanpa build step.
- Error terkategori, bukan `Error` generik: `RationalError`,
  `DivisionByZeroError`, `NotPerfectSquareError`, `NotIntegerError`,
  `OutOfRangeError`, `UnknownOperatorError`, `GenerationError`.
- Nilai Rational immutable (`Object.freeze`), setiap operasi mengembalikan
  instance baru.
- Pemisahan tanggung jawab: `src/core` (pure dan deterministik),
  `src/ui` (view, state, controller), `assets`, `vendor`.

## Aturan Perubahan

| Jenis | Persetujuan | Catatan |
|---|---|---|
| Bug fix core | Boleh, plus test regresi | Wajib ada test yang mereproduksi bug. |
| Fitur core | Review trade-off dahulu | Jangan korbankan jaminan solvability. |
| UI/UX | Fleksibel sesuai rencana | Tetap mobile-first, hindari AI-slop. |
| Refactor | Boleh | Behavior tidak berubah dan test tetap hijau. |
| Aset | Fleksibel | SVG/CSS/WebP bersih, siap swap. |

## Quality Gates

- [ ] `npm test` lulus 100%
- [ ] `node scripts/check-imports.js` melaporkan bersih untuk `src/core` **dan**
      `src/ui`
- [ ] Quality invariants puzzle terpenuhi (no-op, target tidak tercapai dini,
      tidak ada round-trip sia-sia, nilai tidak nol di tengah, display bersih)
- [ ] Sesuai PRD (kaidah operasi, chaining bertahap, subset bebas, single hiding)
- [ ] Tidak ada nyawa, penalti skor, atau pelanggan pengganti yang tersisa
- [ ] Interval spawner tidak pernah jatuh di bawah 60% nilai dasarnya
- [ ] Target sentuh tidak ada yang lebih kecil dari 44x44px
- [ ] Semua string UI, termasuk `aria-label`, ada di `src/ui/i18n.js`
- [ ] Perubahan tercatat di `CHANGELOG.md` dan `PLAN.md` terupdate
