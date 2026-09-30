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
const SCORES_KEY = 'cn.scores';

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

/**
 * Read the whole score book, dropping anything that is not a usable record.
 *
 * Two shapes are accepted on purpose. A record written by this version is
 * `{ score, served, total }`, but a profile that played before the ratio was
 * recorded has a bare number there instead. `Number({...})` is `NaN`, so a
 * reader that only understood objects would silently drop every score an
 * existing player had earned, and the level cards would come back empty right
 * after the update that was supposed to show more on them. A bare number is
 * therefore read as a record with the score and an unknown ratio.
 */
function readScores(storage) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(SCORES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out = {};
    for (const [key, value] of Object.entries(parsed)) {
      const record = toRecord(value);
      if (record) out[key] = record;
    }
    return out;
  } catch {
    // Same contract as `readProgress`: a corrupt book is an empty one, never a
    // reason to stop the level select from rendering.
    return {};
  }
}

/**
 * One level's record, or null when the stored value cannot be a record.
 *
 * `served` and `total` are `null` rather than 0 when unknown, because zero
 * served out of a real roster is a real result and must not be confused with
 * "this was recorded before the ratio existed". The view hides the line for
 * `null` and shows it for a genuine zero.
 */
function toRecord(value) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const score = Math.floor(Number(value.score));
    if (!Number.isFinite(score) || score <= 0) return null;
    const served = Math.floor(Number(value.served));
    const total = Math.floor(Number(value.total));
    const hasRatio = Number.isInteger(served) && Number.isInteger(total)
      && served >= 0 && total > 0 && served <= total;
    return {
      score,
      served: hasRatio ? served : null,
      total: hasRatio ? total : null,
    };
  }
  const score = Math.floor(Number(value));
  if (!Number.isFinite(score) || score <= 0) return null;
  return { score, served: null, total: null };
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

/**
 * Has the player actually finished anything?
 *
 * Drives whether Continue is live. The stored value is the highest *unlocked*
 * level, and level 1 is unlocked on a brand new profile, so a bare `easy: 1`
 * means the starting point rather than a finished level. Anything above 1 is a
 * level the player has completed, and that is what there is to continue.
 */
export function hasProgress(storage = defaultStorage()) {
  const all = readProgress(storage);
  for (const [mode] of Object.entries(all)) {
    if (unlockedFor(mode, storage) > 1) return true;
  }
  return false;
}

export function clearProgress(storage = defaultStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
    // The score book goes with the progress. Leaving a best score on a level
    // that is locked again would show an achievement for something the player
    // can no longer reach, and New Game promises a clean slate.
    storage?.removeItem(SCORES_KEY);
  } catch {
    // Nothing to do; a cleared flag is not worth interrupting play for.
  }
}

/**
 * Keep the best run for one level, or write the first one.
 *
 * Keyed by `mode:level` and never compared across levels. That separation is not
 * tidiness, it is correctness: `SCORE_BASE` is 10/15/20 per mode and the roster
 * grows from four customers to eight, so a Hard level 5 score is always larger
 * than an Easy level 1 score. A single global best would be won by Hard level 5
 * on its first run and could never be beaten by anything else. Scored per level,
 * each number on a card is only ever compared against the player's own history
 * of that exact level, which is the only comparison that means anything.
 *
 * `score` and `served` are kept as separate maxima on purpose. The two come
 * from different questions: the score rewards speed, the ratio rewards clearing
 * everyone, and a run can do well on one and badly on the other. Keeping only
 * the highest-scoring run would mean a player who has already served every
 * customer in the level still sees the ratio of whichever run happened to score
 * well, which is the opposite of what "best result here" is supposed to mean.
 *
 * `result` is an object rather than positional arguments because the fourth
 * parameter is `storage`, which the tests pass a fake in.
 */
export function recordScore(mode, level, result, storage = defaultStorage()) {
  if (!storage || !isValidLevel(level)) return;

  const score = Math.floor(Number(result?.score));
  if (!Number.isFinite(score) || score <= 0) return;

  const all = readScores(storage);
  const key = `${mode}:${level}`;
  const previous = all[key];

  // A first run, or one with no ratio to record, keeps whatever it is given.
  let next = toRecord(result);

  if (previous) {
    // A `null` served means "not recorded yet", and never displaces a real
    // ratio. `-1` is the floor for that comparison, so a genuine zero still
    // beats a missing one.
    const ratioImproved = next.served !== null && next.served > (previous.served ?? -1);
    next = {
      score: Math.max(previous.score, next.score),
      served: ratioImproved ? next.served : previous.served,
      total: ratioImproved ? next.total : previous.total,
    };
    if (next.score === previous.score && next.served === previous.served) return;
  }

  all[key] = next;
  try {
    storage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked: the score simply will not persist.
  }
}

/**
 * The best result for one level: `{ score, served, total }`, or null when the
 * level has never been finished. `served` is null for a record written before
 * the ratio was stored, which is not the same as having served nobody.
 */
export function bestResult(mode, level, storage = defaultStorage()) {
  if (!isValidLevel(level)) return null;
  return readScores(storage)[`${mode}:${level}`] ?? null;
}

export { STORAGE_KEY, SCORES_KEY };
