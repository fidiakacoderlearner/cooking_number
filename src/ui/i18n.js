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

    'hud.level': 'Level',
    'hud.score': 'Score',
    'hud.served': 'Served',

    'queue.label': 'Customers',
    'queue.nextIn': 'Next in {seconds}s',
    'queue.nextSoon': 'Next one is due',
    'queue.nextLast': 'Last customer of this level',
    'queue.full': 'The stand is full, they will wait',
    'queue.empty': 'Waiting for the first customer...',

    'customer.wants': 'wants {target}',
    'customer.cooking': 'Cooking for {target}',
    'customer.served': 'Served!',
    'customer.walkedWrong': '{target} was ordered, not {value}',
    'customer.walkedSlow': 'Ran out of patience',
    'customer.select': 'Select this customer',
    'customer.cookFor': 'Cook',
  'customer.cookForTarget': 'Cook the dish for {target}',
    'customer.serveTo': 'Serve to {target}',
    'customer.timeLeft': '{seconds} seconds left',

    'stand.empty': 'The stand is empty',
    'stand.pickCustomer': 'Tap a customer, then cook for them.',
    'stand.building': 'Building a dish for {target}',
    'stand.ready': 'Dish ready: {value}',
    'stand.dropHere': 'Drag the dish to a customer',
    'stand.running': 'Running total',

    'op.add': 'plus',
    'op.sub': 'minus',
    'op.mul': 'times',
    'op.div': 'divide',
    'op.pow2': 'squared',
    'op.pow3': 'cubed',
    'op.sqrt': 'square root',

    'work.dragHint': 'Tap number and operator tiles to build a dish.',
    'work.noCustomer': 'Cook for a customer first.',
    'work.standBusy': 'Finish or clear the dish on the stand first.',
    'work.notReady': 'The dish is not finished yet.',
    'work.nextNumber': 'Now pick a number tile.',
    'work.nextOperator': 'Now pick an operator tile.',
    'work.unaryFirst': 'Start with a number, then you can use this.',
    'work.invalidDivision': 'Cannot divide by zero.',
    'work.invalidRoot': 'That number has no clean square root.',
    'work.invalidExponent': 'Powers only go up to a small whole number.',
    'work.badStep': 'That step does not work here.',
    'work.keepGoing': 'Good step, keep cooking.',
    'work.wrong': 'That is {value}, they wanted {target}. They walked out.',

    'action.serve': 'Serve',
    'action.undo': 'Undo',
    'action.clear': 'Clear',
    'action.toggleLang': 'Change language',
    'action.backToMenu': 'Back to menu',

    'result.served': 'Right on! +{points} points ({pace}).',
    'result.lost': 'That customer walked out. No points.',
    'result.points': '+{points}',
    'result.pace.blazing': 'blazing',
    'result.pace.fast': 'fast',
    'result.pace.steady': 'steady',
    'result.pace.slow': 'slow',

    'overlay.levelDone': 'Level complete!',
    'overlay.nextLevel': 'Next level',
    'overlay.menu': 'Menu',
    'overlay.retry': 'Try again',
    'overlay.summary': 'You served {served} of {total} customers.',
    'overlay.levelScore': 'You scored {score} points in this level.',
    'overlay.totalScore': 'Total score: {score}.',
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

    'hud.level': 'Level',
    'hud.score': 'Skor',
    'hud.served': 'Tersaji',

    'queue.label': 'Pelanggan',
    'queue.nextIn': 'Berikutnya {seconds} detik',
    'queue.nextSoon': 'Pelanggan berikutnya sebentar lagi',
    'queue.nextLast': 'Pelanggan terakhir level ini',
    'queue.full': 'Stand penuh, mereka menunggu',
    'queue.empty': 'Menunggu pelanggan pertama...',

    'customer.wants': 'mau {target}',
    'customer.cooking': 'Sedang dimasak untuk {target}',
    'customer.served': 'Tersaji!',
    'customer.walkedWrong': 'Pesanannya {target}, bukan {value}',
    'customer.walkedSlow': 'Kesabarannya habis',
    'customer.select': 'Pilih pelanggan ini',
    'customer.cookFor': 'Masak',
  'customer.cookForTarget': 'Masak hidangan untuk {target}',
    'customer.serveTo': 'Sajikan ke {target}',
    'customer.timeLeft': 'Sisa {seconds} detik',

    'stand.empty': 'Stand masih kosong',
    'stand.pickCustomer': 'Ketuk pelanggan, lalu masak untuk dia.',
    'stand.building': 'Sedang membangun hidangan untuk {target}',
    'stand.ready': 'Hidian siap: {value}',
    'stand.dropHere': 'Seret hidangan ke pelanggan',
    'stand.running': 'Total berjalan',

    'op.add': 'tambah',
    'op.sub': 'kurang',
    'op.mul': 'kali',
    'op.div': 'bagi',
    'op.pow2': 'pangkat dua',
    'op.pow3': 'pangkat tiga',
    'op.sqrt': 'akar kuadrat',

    'work.dragHint': 'Ketuk kartu angka dan operator untuk membangun hidangan.',
    'work.noCustomer': 'Masak dulu untuk salah satu pelanggan.',
    'work.standBusy': 'Selesaikan atau bersihkan hidangan di stand dulu.',
    'work.notReady': 'Hidingannya belum jadi.',
    'work.nextNumber': 'Sekarang pilih kartu angka.',
    'work.nextOperator': 'Sekarang pilih kartu operator.',
    'work.unaryFirst': 'Mulai dari angka, baru operator ini bisa dipakai.',
    'work.invalidDivision': 'Tidak bisa membagi dengan nol.',
    'work.invalidRoot': 'Angka itu tidak punya akar kuadrat bulat.',
    'work.invalidExponent': 'Pangkat hanya sampai bilangan bulat kecil.',
    'work.badStep': 'Langkah itu tidak bisa dipakai di sini.',
    'work.keepGoing': 'Bagus, lanjut masak.',
    'work.wrong': 'Itu {value}, mereka mau {target}. Mereka pergi.',

    'action.serve': 'Sajikan',
    'action.undo': 'Urungkan',
    'action.clear': 'Bersihkan',
    'action.toggleLang': 'Ganti bahasa',
    'action.backToMenu': 'Kembali ke menu',

    'result.served': 'Tepat sekali! +{points} poin ({pace}).',
    'result.lost': 'Pelanggan itu pergi. Tidak dapat poin.',
    'result.points': '+{points}',
    'result.pace.blazing': 'ngebut',
    'result.pace.fast': 'cepat',
    'result.pace.steady': 'mantap',
    'result.pace.slow': 'lambat',

    'overlay.levelDone': 'Level selesai!',
    'overlay.nextLevel': 'Level berikutnya',
    'overlay.menu': 'Menu',
    'overlay.retry': 'Coba lagi',
    'overlay.summary': 'Kamu melayani {served} dari {total} pelanggan.',
    'overlay.levelScore': 'Kamu mendapat {score} poin di level ini.',
    'overlay.totalScore': 'Skor total: {score}.',
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

export const I18N = {
  t,
  getLanguage,
  setLanguage,
  toggleLanguage,
  restoreLanguage,
  LANGUAGES,
  DEFAULT_LANGUAGE,
};
