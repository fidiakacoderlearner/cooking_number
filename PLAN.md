# Plan

Status rencana kerja Number Kitchen. Diperbarui setiap ada perubahan status.

## Legenda

- `[x]` selesai
- `[ ]` belum
- `[~]` sedang dikerjakan

---

## Fase 0 - Keputusan dan klarifikasi - [x]

- [x] Baca dan pahami PRD
- [x] Kunci keputusan: chaining bertahap, left-to-right, drag dan tap-to-place,
      i18n ID/EN dengan default English, subset bebas, single hiding, pecahan
      eksak, akar kuadrat sempurna, 2/3/4/4/5 pesanan per level
- [x] Timer final: **Easy 30s, Medium 20s, Hard 15s**
- [x] Nama game sementara: **Number Kitchen**
- [x] Formula skor disepakati
- [x] Gaya visual: **toon-toon** (flat cartoon)
- [x] Keputusan aset: placeholder WebP dulu, siap swap ke aset tim
- [x] Varian pelanggan: **3**

## Fase 1 - Core logic dan generator - [x]

- [x] Scaffold project: git, `package.json` ESM, `.gitignore`, `README.md`
- [x] `rational.js` - aritmetika pecahan eksak
- [x] `operators.js` - registry operator biner dan unary
- [x] `evaluate.js` - evaluator left-to-right
- [x] `difficulty.js` - konfigurasi mode dan level
- [x] `generator.js` - backward generation dengan jaminan solvable
- [x] Unit test: 68 test, stress 10.000 soal per mode, hijau
- [x] Inspeksi manual soal dan perbaikan kualitas
- [x] Dokumentasi: `AGENTS.md`, `CHANGELOG.md`, `PLAN.md`

### Ringkasan Fase 1

Solvability dijamin secara konstruksi: generator yang membuat jalurnya sendiri,
lalu `evaluate(secretRecipe) === target` diverifikasi sebelum soal dikirim ke
pemain. Tidak ada pencarian jalur, sehingga tidak ada risiko soal buntu.

---

## Fase 2 - UI mobile-first - [~]

Target: permainan yang bisa dimainkan penuh di HP untuk mode Easy.

### Tahap 1 - Scaffold dan layout - [x]
- [x] `index.html`
- [x] `styles/`: `base.css`, `layout.css`, `theme.css`, `animations.css`
- [x] `vendor/interact.min.js` (vendor lokal sekitar 98 KB, bukan CDN)
- [x] Layout HUD: tombol keluar, order, timer, nyawa, skor
- [x] Target order, rak bahan, area kerja chaining
- [x] Integrasi dasar `generatePuzzle()` per pesanan

### Tahap 2 - Interaksi - [x]
- [x] `src/ui/drag.js` - drag-and-drop plus tap-to-place sebagai fallback HP
- [x] `src/ui/assets.js` - pemuat placeholder WebP dan palet operator
- [x] Area kerja chaining bertahap sesuai desain core
- [x] Validasi lewat `evaluate()`, feedback visual saat cocok (CSS-only)
- [x] Ketuk kartu langsung menambah ke area kerja, tanpa perlu ketuk ulang

### Tahap 3 - Game loop - [x]
- [x] `src/ui/state.js` - state permainan
- [x] `src/ui/controller.js` - loop generate, main, serve, lanjut order
- [x] Timer 30/20/15 detik
- [x] Nyawa 3 per level
- [x] Skor sesuai formula yang disepakati
- [x] Transisi order dan level, penanganan nyawa habis
- [x] Tombol keluar supaya pemain tidak terjebak di level

### Tahap 4 - Tema toon dan placeholder - [x]
- [x] `src/ui/i18n.js` - string EN dan ID, default `en`, toggle
- [x] Palet dan komponen CSS bergaya toon-toon
- [x] `assets/placeholder/` - 3 varian pelanggan, meja, piring, latar (WebP)
- [x] Struktur siap swap aset tim tanpa mengubah logika
- [x] `favicon.ico` dan `manifest.webmanifest`

### Tahap 5 - Playtesting - [~]
- [x] `scripts/smoke-ui.js` - alur-ui diuji di Chrome sungguhan
- [ ] Uji touch manual di HP asli, pastikan drag tidak mengganggu scroll
- [ ] Kalibrasi rasa timer 30/20/15 dan bobot skor
- [ ] Perbaikan bug minor dari playtest manual

### Ringkasan Fase 2
Alur-ui sudah bisa dimainkan penuh di browser: menu, pilih level, mengerjakan
pesanan, menyusun ekspresi, menyajikan, dan lanjut ke order berikutnya.
`smoke-ui.js` memverifikasi ini dengan menyelesaikan soal hanya dari yang
terlihat di layar, jadi kebocoran `secretRecipe` akan langsung terdeteksi.

---

## Fase 3 - Mode Medium dan Hard di UI - [~]

- [x] Mode Medium dengan pecahan tampil dan bisa dimainkan
- [x] Mode Hard dengan pangkat dan akar tampil dan bisa dimainkan
- [x] Slot unary dibedakan dengan biner secara visual
- [ ] Styling akhir dan polish
- [ ] Uji keypad emulator untuk tes sentuh

## Fase 4 - Polish dan submission - [ ]

- [ ] Nice-to-have bila waktu cukup: suara, animasi karakter, leaderboard lokal
- [ ] Materi submission: video demo dan deskripsi
- [ ] Checklist rubrik lomba

---

## Keputusan yang masih ditunggu tim

- [ ] Rubrik dan buku panduan lomba: format submission, bobot penilaian
- [ ] Aset visual final dari tim (SVG/PNG/WebP) plus style reference
- [ ] Konfirmasi nama final game

## Di luar scope

- Tanpa backend. Progres lokal via `localStorage` sebagai nice-to-have.
- Tanpa service worker pada fase ini.
- Bahasa tambahan selain English dan Indonesia.
