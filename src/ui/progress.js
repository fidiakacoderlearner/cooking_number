/**
 * Level progression, kept in localStorage.
 *
 * This is deliberately a pure module with no DOM and no imports from the rest
 * of the UI, so the rules can be tested directly.
 *
 * The stored value is the highest level the player has *unlocked*, which is why
 * a level is written only once it has been completed. Storing the level being
 * played instead would mean the stored value can never go up: the player could
 * not reach level 2 in order to unlock it.
 */

import { LEVELS_PER_MODE, isValidLevel } from '../core/difficulty.js';

const STORAGE_KEY = 'cn.progress';

function defaultStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function sanitize(raw) {
  const out = {};
  for (const [mode, value] of Object.entries(raw)) {
    const level = Number(value);
    if (Number.isInteger(level) && level >= 1) out[mode] = Math.min(LEVELS_PER_MODE, level);
  }
  return out;
}

export function readProgress(storage = defaultStorage()) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return sanitize(parsed);
  } catch {
    // Corrupt or unavailable storage must never stop the game from starting.
    return {};
  }
}

/** Record that `level` is now unlocked. Never moves the high-water mark back. */
export function writeProgress(mode, level, storage = defaultStorage()) {
  if (!storage || !isValidLevel(level)) return;
  const all = readProgress(storage);
  const next = Math.max(all[mode] ?? 1, level);
  if (next === all[mode]) return;
  all[mode] = next;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked: progress simply will not persist.
  }
}

/** Record a completed level by unlocking the one after it. */
export function completeLevel(mode, level, storage = defaultStorage()) {
  if (!isValidLevel(level)) return;
  writeProgress(mode, Math.min(LEVELS_PER_MODE, level + 1), storage);
}

export function unlockedFor(mode, storage = defaultStorage()) {
  const all = readProgress(storage);
  return Math.min(LEVELS_PER_MODE, Math.max(1, Number(all[mode] ?? 1)));
}

export function clearProgress(storage = defaultStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; a cleared flag is not worth interrupting play for.
  }
}

export { STORAGE_KEY };

export const PROGRESS = {
  readProgress,
  writeProgress,
  completeLevel,
  unlockedFor,
  clearProgress,
  STORAGE_KEY,
};
