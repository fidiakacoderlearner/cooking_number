/**
 * All user-facing strings live here, per AGENTS.md rule 8.
 * Default language is English; Indonesian is available through the toggle.
 */

const STRINGS = {
  en: {
    'app.title': 'Cooking Number',
    'app.tagline': 'Cook the number. Serve the customer.',

    'common.back': 'Back',
    'common.close': 'Close',

    'menu.chooseMode': 'Choose a mode',
    'menu.language': 'Language',
    'mode.easy': 'Easy',
    'mode.medium': 'Medium',
    'mode.hard': 'Hard',
    'mode.easyDetail': 'Integers, including negatives',
    'mode.mediumDetail': 'Fractions join the menu',
    'mode.hardDetail': 'Powers and square roots',
    'mode.grade7': 'Grade 7',
    'mode.grade8': 'Grade 8',
    'mode.grade9': 'Grade 9',

    'levels.customers': '{count} customers',
    'levels.lockedHint': 'Locked',
    'levels.served': '{served}/{total} served',
    'levels.best': 'Best: {score}',

    'hud.level': 'Level',
    'hud.score': 'Score',
    'hud.served': 'Served',

    'queue.label': 'Customers',
    'queue.nextIn': 'Next in {seconds}s',
    'queue.nextSoon': 'Next one is due',
    'queue.nextLast': 'Last customer of this level',
    'queue.full': 'The stand is full, they will wait',

    'stand.pickCustomer': 'Tap a customer to start cooking.',
    'stand.dropHere': 'Tap to serve',

    'op.add': 'plus',
    'op.sub': 'minus',
    'op.mul': 'times',
    'op.div': 'divide',
    'op.pow2': 'squared',
    'op.pow3': 'cubed',
    'op.sqrt': 'square root',

    'work.dragHint': 'Tap a customer, then build their number.',
    'work.noCustomer': 'Cook for a customer first.',
    'work.standBusy': 'Finish or clear the dish on the stand first.',
    'work.notReady': 'The dish is not finished yet.',
    'work.nextOperator': 'Now pick an operator tile.',
    'work.unaryFirst': 'Start with a number, then you can use this.',
    'work.invalidDivision': 'Cannot divide by zero.',
    'work.invalidRoot': 'That number has no clean square root.',
    'work.invalidExponent': 'Powers only go up to a small whole number.',
    'work.badStep': 'That step does not work here.',
    'work.keepGoing': 'Good step, keep cooking.',
    'work.wrong': 'That is {value}, they wanted {target}. They walked out.',

    // Asked when a customer is swapped out from under a half-built dish, past the
    // point where the work is small enough to discard without asking.
    'confirm.switchTitle': 'Leave this dish?',
    'confirm.switchBody': 'Cooking for the customer who wants {target} puts these {tiles} tiles in the bin.',
    'confirm.stay': 'Keep cooking',
    'confirm.leave': 'Switch anyway',

    // Asked before New Game throws away finished levels. Same dialog as the
    // switch question, different words, because the thing being destroyed is the
    // player's progress rather than a half-built dish.
    'confirm.resetTitle': 'Start over?',
    'confirm.resetBody': 'This clears every level you have finished in all three modes. It cannot be undone.',
    'confirm.keep': 'Keep my progress',
    'confirm.lose': 'Erase it',

    // Asked before the in-level menu abandons a level in progress. Rule 11: the
    // customers still standing there are not punished, but the dish on the stand
    // is thrown away, and that work is not coming back.
    'confirm.leaveTitle': 'Leave this level?',
    'confirm.leaveBody': 'The dish on the stand is thrown away, and the customers still waiting go home.',
    'confirm.keepPlaying': 'Keep playing',
    'confirm.leaveAnyway': 'Leave anyway',

    'action.serve': 'Serve',
    'action.undo': 'Undo',
    'action.clear': 'Clear',
    'action.newGame': 'New Game',
    'action.continue': 'Continue',
    'action.continueLocked': 'Continue, once you finish a level',
    'action.howToPlay': 'How to play',
    'action.toggleLang': 'Change language',
    'action.toggleMute': 'Mute sound',
    'action.unmute': 'Unmute sound',

    // The game menu, opened from the hamburger mid-level.
    'gameMenu.open': 'Game menu',
    'gameMenu.musicOn': 'Music: On',
    'gameMenu.musicOff': 'Music: Off',
    'gameMenu.leave': 'Leave',

    'rules.title': 'How to play',
    'rules.goal': 'A customer orders a number. Cook it and serve it before they lose patience.',
    'rules.pick': 'Tap the customer you want to cook for. Their tiles load onto the stand.',
    'rules.build': 'Tap number and operator tiles to build the dish. Drag works too.',
    'rules.orderTitle': 'Order of operations',
    'rules.order1': '× and ÷ are worked out first: 2 + 3 × 4 = 14.',
    'rules.order2': 'Powers and roots apply to the number right before them: 2 + 3² = 11.',
    'rules.serve': 'When the plate shows their number, tap Serve. The finished value is always visible before you serve.',
    'rules.wrong': 'Serve the wrong dish and the customer walks out. No points, no second chance.',
    'rules.score': 'Score grows with speed: a customer served with patience left pays more.',

    'result.served': 'Right on! +{points} points ({pace}).',
    'result.lost': 'That customer walked out. No points.',
    'result.pace.blazing': 'blazing',
    'result.pace.fast': 'fast',
    'result.pace.steady': 'steady',
    'result.pace.slow': 'slow',

    'overlay.levelDone': 'Level complete!',
    'overlay.nextLevel': 'Next level',
    'overlay.chooseLevel': 'Choose level',
    'overlay.summary': 'You served {served} of {total} customers.',
    'overlay.levelScore': 'You scored {score} points in this level.',
    'overlay.allDone': 'Every customer served!',

    'toast.nothingToUndo': 'Nothing to undo.',
  },

  id: {
    'app.title': 'Cooking Number',
    'app.tagline': 'Masak angkanya. Layani pelanggan.',

    'common.back': 'Kembali',
    'common.close': 'Tutup',

    'menu.chooseMode': 'Pilih mode',
    'menu.language': 'Bahasa',
    'mode.easy': 'Mudah',
    'mode.medium': 'Sedang',
    'mode.hard': 'Sulit',
    'mode.easyDetail': 'Bilangan bulat, termasuk negatif',
    'mode.mediumDetail': 'Pecahan mulai digunakan',
    'mode.hardDetail': 'Pangkat dan akar kuadrat',
    'mode.grade7': 'Kelas 7',
    'mode.grade8': 'Kelas 8',
    'mode.grade9': 'Kelas 9',

    'levels.customers': '{count} pelanggan',
    'levels.lockedHint': 'Terkunci',
    'levels.served': '{served}/{total} terlayani',
    'levels.best': 'Tertinggi: {score}',

    'hud.level': 'Level',
    'hud.score': 'Skor',
    'hud.served': 'Tersaji',

    'queue.label': 'Pelanggan',
    'queue.nextIn': 'Berikutnya {seconds} detik',
    'queue.nextSoon': 'Pelanggan berikutnya sebentar lagi',
    'queue.nextLast': 'Pelanggan terakhir level ini',
    'queue.full': 'Stand penuh, mereka menunggu',

    'stand.pickCustomer': 'Ketuk pelanggan untuk mulai memasak.',
    'stand.dropHere': 'Ketuk untuk sajikan',

    'op.add': 'tambah',
    'op.sub': 'kurang',
    'op.mul': 'kali',
    'op.div': 'bagi',
    'op.pow2': 'pangkat dua',
    'op.pow3': 'pangkat tiga',
    'op.sqrt': 'akar kuadrat',

    'work.dragHint': 'Ketuk pelanggan, lalu bangun angkanya.',
    'work.noCustomer': 'Masak dulu untuk salah satu pelanggan.',
    'work.standBusy': 'Selesaikan atau bersihkan hidangan di stand dulu.',
    'work.notReady': 'Hidingannya belum jadi.',
    'work.nextOperator': 'Sekarang pilih kartu operator.',
    'work.unaryFirst': 'Mulai dari angka, baru operator ini bisa dipakai.',
    'work.invalidDivision': 'Tidak bisa membagi dengan nol.',
    'work.invalidRoot': 'Angka itu tidak punya akar kuadrat bulat.',
    'work.invalidExponent': 'Pangkat hanya sampai bilangan bulat kecil.',
    'work.badStep': 'Langkah itu tidak bisa dipakai di sini.',
    'work.keepGoing': 'Bagus, lanjut masak.',
    'work.wrong': 'Itu {value}, mereka mau {target}. Mereka pergi.',

  'confirm.switchTitle': 'Pakai hidangan ini?',
  'confirm.switchBody': 'Memasak untuk pelanggan yang mau {target} membuang {tiles} kartu yang sudah kamu susun.',
  'confirm.stay': 'Lanjut masak',
  'confirm.leave': 'Ganti saja',

  // Asked before New Game throws away finished levels.
  'confirm.resetTitle': 'Mulai ulang?',
  'confirm.resetBody': 'Ini menghapus semua level yang sudah kamu selesaikan di ketiga mode. Tidak bisa diurungkan.',
  'confirm.keep': 'Pertahankan progress',
  'confirm.lose': 'Hapus',

  // Ditanya sebelum menu dalam level meninggalkan level yang sedang dimainkan.
  'confirm.leaveTitle': 'Keluar dari level ini?',
  'confirm.leaveBody': 'Hidangan di stand dibuang, dan pelanggan yang masih menunggu pulang.',
  'confirm.keepPlaying': 'Lanjut bermain',
  'confirm.leaveAnyway': 'Keluar saja',

    'action.serve': 'Sajikan',
    'action.undo': 'Urungkan',
    'action.clear': 'Bersihkan',
    'action.newGame': 'Permainan Baru',
    'action.continue': 'Lanjutkan',
    'action.continueLocked': 'Lanjutkan, setelah selesai satu level',
    'action.howToPlay': 'Aturan Main',
    'action.toggleLang': 'Ganti bahasa',
    'action.toggleMute': 'Matikan suara',
    'action.unmute': 'Nyalakan suara',

    'gameMenu.open': 'Menu permainan',
    'gameMenu.musicOn': 'Musik: Menyala',
    'gameMenu.musicOff': 'Musik: Mati',
    'gameMenu.leave': 'Keluar',

    'rules.title': 'Aturan Main',
    'rules.goal': 'Pelanggan memesan sebuah angka. Masak dan sajikan sebelum kesabarannya habis.',
    'rules.pick': 'Ketuk pelanggan yang mau kamu masak. Kartu angka mereka dimuat ke stand.',
    'rules.build': 'Ketuk kartu angka dan operator untuk membangun hidangan. Seret juga bisa.',
    'rules.orderTitle': 'Kaidah operasi',
    'rules.order1': '× dan ÷ dihitung lebih dulu: 2 + 3 × 4 = 14.',
    'rules.order2': 'Pangkat dan akar berlaku pada angka di depannya: 2 + 3² = 11.',
    'rules.serve': 'Kalau piring sudah menunjukkan angkanya, tekan Sajikan. Nilai akhir selalu terbaca sebelum kamu menyajikan.',
    'rules.wrong': 'Menyajikan hidangan salah bikin pelanggan pergi. Tanpa poin, tanpa kesempatan kedua.',
    'rules.score': 'Semakin cepat menyajikan, semakin besar poinnya.',

    'result.served': 'Tepat sekali! +{points} poin ({pace}).',
    'result.lost': 'Pelanggan itu pergi. Tidak dapat poin.',
    'result.pace.blazing': 'ngebut',
    'result.pace.fast': 'cepat',
    'result.pace.steady': 'mantap',
    'result.pace.slow': 'lambat',

    'overlay.levelDone': 'Level selesai!',
    'overlay.nextLevel': 'Level berikutnya',
    'overlay.chooseLevel': 'Pilih level',
    'overlay.summary': 'Kamu melayani {served} dari {total} pelanggan.',
    'overlay.levelScore': 'Kamu mendapat {score} poin di level ini.',
    'overlay.allDone': 'Semua pelanggan tersaji!',

    'toast.nothingToUndo': 'Tidak ada yang bisa diurutkan.',
  },
};

export const LANGUAGES = Object.keys(STRINGS);
export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'cn.language';

let current = DEFAULT_LANGUAGE;

/** Replace {placeholders} from a params object. */
function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(params, key) ? String(params[key]) : match,
  );
}

export function getLanguage() {
  return current;
}

export function setLanguage(lang) {
  if (!Object.hasOwn(STRINGS, lang)) return current;
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode or storage disabled: the toggle still works for this session.
  }
  return current;
}

export function toggleLanguage() {
  return setLanguage(current === 'en' ? 'id' : 'en');
}

export function restoreLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && Object.hasOwn(STRINGS, stored)) return setLanguage(stored);
  } catch {
    // ignore
  }
  return setLanguage(DEFAULT_LANGUAGE);
}

/** Look up a key, falling back to English then to the key itself. */
export function t(key, params) {
  const value = STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
  return interpolate(value, params);
}
