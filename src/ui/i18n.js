/**
 * All user-facing strings live here, per AGENTS.md rule 8.
 * Default language is English; Indonesian is available through the toggle.
 */

const STRINGS = {
  en: {
    'app.title': 'Number Kitchen',
    'app.tagline': 'Cook the number the customer ordered.',

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

    'levels.orders': '{count} orders',
    'levels.lockedHint': 'Finish the level before this one first.',

    'hud.level': 'Level',
    'hud.lives': 'Lives',
    'hud.score': 'Score',
    'hud.time': 'Time',

    'order.bubble': 'I want',
    'order.yourTarget': 'Your target',
    'order.dropHere': 'Drop here to serve',

    'work.dragHint': 'Drag a number tile up here to start.',
    'work.running': 'Running total',
    'work.nextNumber': 'Now pick a number tile.',
    'work.nextOperator': 'Now pick an operator tile.',
    'work.unaryFirst': 'Start with a number, then you can use this.',
    'work.invalidDivision': 'Cannot divide by zero.',
    'work.invalidRoot': 'That number has no clean square root.',
    'work.invalidExponent': 'Powers only go up to a small whole number.',
    'work.badStep': 'That step does not work here.',
    'work.targetHit': 'That is the target! Serve it.',
    'work.keepGoing': 'Good step, keep cooking.',

    'action.serve': 'Serve',
    'action.undo': 'Undo',
    'action.clear': 'Clear',

    'result.correct': 'Perfect! Served in {seconds}s.',
    'result.tooSlow': 'Out of time.',
    'result.wrong': 'That is {value}, not {target}.',
    'result.served': '+{points} points',

    'overlay.levelDone': 'Level complete!',
    'overlay.gameOver': 'Out of lives',
    'overlay.nextLevel': 'Next level',
    'overlay.menu': 'Menu',
    'overlay.retry': 'Try again',
    'overlay.levelScore': 'You scored {score} points in this level.',
    'overlay.finalScore': 'Final score: {score}.',
    'overlay.allDone': 'All levels cleared!',

    'toast.tapToSelect': 'Tile picked. Tap where it goes.',
    'toast.tapToPick': 'Tap a tile first.',
    'toast.nothingToUndo': 'Nothing to undo.',
    'toast.dragHint': 'Drag the tile, or tap it then tap the target.',
  },

  id: {
    'app.title': 'Number Kitchen',
    'app.tagline': 'Masak angka yang dipesan pelanggan.',

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

    'levels.orders': '{count} pesanan',
    'levels.lockedHint': 'Selesaikan level sebelumnya dulu.',

    'hud.level': 'Level',
    'hud.lives': 'Nyawa',
    'hud.score': 'Skor',
    'hud.time': 'Waktu',

    'order.bubble': 'Saya mau',
    'order.yourTarget': 'Targetmu',
    'order.dropHere': 'Jatuhkan di sini untuk sajikan',

    'work.dragHint': 'Seret kartu angka ke sini untuk mulai.',
    'work.running': 'Total berjalan',
    'work.nextNumber': 'Sekarang pilih kartu angka.',
    'work.nextOperator': 'Sekarang pilih kartu operator.',
    'work.unaryFirst': 'Mulai dari angka, baru operator ini bisa dipakai.',
    'work.invalidDivision': 'Tidak bisa membagi dengan nol.',
    'work.invalidRoot': 'Angka itu tidak punya akar kuadrat bulat.',
    'work.invalidExponent': 'Pangkat hanya sampai bilangan bulat kecil.',
    'work.badStep': 'Langkah itu tidak bisa dipakai di sini.',
    'work.targetHit': 'Sudah dapat targetnya! Sajikan.',
    'work.keepGoing': 'Bagus, lanjut masak.',

    'action.serve': 'Sajikan',
    'action.undo': 'Urungkan',
    'action.clear': 'Bersihkan',

    'result.correct': 'Tepat sekali! Disajikan dalam {seconds} detik.',
    'result.tooSlow': 'Waktu habis.',
    'result.wrong': 'Itu {value}, bukan {target}.',
    'result.served': '+{points} poin',

    'overlay.levelDone': 'Level selesai!',
    'overlay.gameOver': 'Nyawa habis',
    'overlay.nextLevel': 'Level berikutnya',
    'overlay.menu': 'Menu',
    'overlay.retry': 'Coba lagi',
    'overlay.levelScore': 'Kamu mendapat {score} poin di level ini.',
    'overlay.finalScore': 'Skor akhir: {score}.',
    'overlay.allDone': 'Semua level selesai!',

    'toast.tapToSelect': 'Kartu dipilih. Ketuk tempat tujuan.',
    'toast.tapToPick': 'Ketuk kartu dulu.',
    'toast.nothingToUndo': 'Tidak ada yang bisa diurutkan.',
    'toast.dragHint': 'Seret kartunya, atau ketuk kartu lalu ketuk tujuan.',
  },
};

export const LANGUAGES = Object.keys(STRINGS);
export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'nk.language';

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

export const I18N = {
  t,
  getLanguage,
  setLanguage,
  toggleLanguage,
  restoreLanguage,
  LANGUAGES,
  DEFAULT_LANGUAGE,
};
