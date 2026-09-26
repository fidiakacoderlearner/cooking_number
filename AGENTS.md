# AGENTS.md

Panduan kerja untuk proyek **Number Kitchen**. Semua agen dan perintah harus
mematuhi aturan di dokumen ini.

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

3. **Left-to-right dan aritmetika eksak adalah aturan tetap**
   Dilarang mengganti evaluator ke operator precedence. Dilarang mengganti
   `rational.js` ke floating point.

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
2. Patuhi todo di `PLAN.md`, perbarui status secara real-time.
3. Ikuti konvensi kode yang sudah ada di berkas sekitar.
4. Jalankan `npm test`, pastikan hijau.
5. Catat perubahan di `CHANGELOG.md`.
6. Laporkan hasil secara ringkas.

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

- [ ] `npm test` lulus 100% (68+ test)
- [ ] `node scripts/check-imports.js` melaporkan bersih
- [ ] Quality invariants puzzle terpenuhi (no-op, target tidak tercapai dini,
      tidak ada round-trip sia-sia, nilai tidak nol di tengah, display bersih)
- [ ] Sesuai PRD (left-to-right, chaining bertahap, subset bebas, single hiding)
- [ ] Perubahan tercatat di `CHANGELOG.md` dan `PLAN.md` terupdate
