/**
 * Level unlocking, kept DOM-free so the rules can be checked directly.
 *
 * The regression here is the bug that made the game unplayable past level 1:
 * the stored value used to be the level being played, so it could never rise.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS_PER_MODE } from '../src/core/difficulty.js';
import {
  readProgress,
  writeProgress,
  completeLevel,
  unlockedFor,
  hasProgress,
  recordScore,
  bestResult,
  clearProgress,
  STORAGE_KEY,
} from '../src/ui/progress.js';

/** A minimal in-memory stand-in for localStorage. */
function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
  };
}

test('a fresh player has only level 1', () => {
  const storage = fakeStorage();
  assert.deepEqual(readProgress(storage), {});
  assert.equal(unlockedFor('easy', storage), 1);
  assert.equal(unlockedFor('hard', storage), 1);
});

test('completing a level unlocks the next one (regression)', () => {
  const storage = fakeStorage();
  completeLevel('easy', 1, storage);
  assert.equal(unlockedFor('easy', storage), 2, 'finishing level 1 must open level 2');

  completeLevel('easy', 2, storage);
  assert.equal(unlockedFor('easy', storage), 3);

  completeLevel('easy', 3, storage);
  completeLevel('easy', 4, storage);
  assert.equal(unlockedFor('easy', storage), 5);
});

test('finishing the last level does not unlock anything past the end', () => {
  const storage = fakeStorage();
  completeLevel('easy', LEVELS_PER_MODE, storage);
  assert.equal(unlockedFor('easy', storage), LEVELS_PER_MODE);
});

test('the high-water mark never moves backwards', () => {
  const storage = fakeStorage();
  completeLevel('easy', 3, storage);
  completeLevel('easy', 1, storage);
  assert.equal(unlockedFor('easy', storage), 4);
});

test('each mode tracks its own progress', () => {
  const storage = fakeStorage();
  completeLevel('easy', 3, storage);
  assert.equal(unlockedFor('easy', storage), 4);
  assert.equal(unlockedFor('medium', storage), 1);
  assert.equal(unlockedFor('hard', storage), 1);

  completeLevel('hard', 2, storage);
  assert.equal(unlockedFor('hard', storage), 3);
  assert.equal(unlockedFor('easy', storage), 4);
});

test('corrupt storage falls back to level 1 instead of throwing', () => {
  for (const junk of ['not json', '[]', '"a string"', 'null', '{"easy":"two"}', '{"easy":-4}']) {
    const storage = fakeStorage({ [STORAGE_KEY]: junk });
    assert.deepEqual(readProgress(storage), {}, `junk: ${junk}`);
    assert.equal(unlockedFor('easy', storage), 1, `junk: ${junk}`);
  }
});

test('an absurd stored level is clamped to the real level count', () => {
  const storage = fakeStorage({ [STORAGE_KEY]: '{"easy":9999,"hard":3}' });
  const all = readProgress(storage);
  assert.equal(all.easy, LEVELS_PER_MODE);
  assert.equal(all.hard, 3);
});

test('storage that throws on every call never stops the game', () => {
  const hostile = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.deepEqual(readProgress(hostile), {});
  assert.equal(unlockedFor('easy', hostile), 1);
  assert.doesNotThrow(() => writeProgress('easy', 3, hostile));
  assert.doesNotThrow(() => completeLevel('easy', 1, hostile));
  assert.doesNotThrow(() => clearProgress(hostile));
});

test('a missing storage object is treated as a fresh player', () => {
  assert.deepEqual(readProgress(null), {});
  assert.equal(unlockedFor('easy', null), 1);
  assert.doesNotThrow(() => writeProgress('easy', 2, null));
});

test('out-of-range levels are rejected instead of stored', () => {
  const storage = fakeStorage();
  writeProgress('easy', 0, storage);
  writeProgress('easy', -1, storage);
  writeProgress('easy', LEVELS_PER_MODE + 1, storage);
  writeProgress('easy', 1.5, storage);
  assert.deepEqual(readProgress(storage), {});
});

test('clearing progress puts the player back at level 1', () => {
  const storage = fakeStorage();
  completeLevel('easy', 4, storage);
  clearProgress(storage);
  assert.equal(unlockedFor('easy', storage), 1);
});

/**
 * Drives whether Continue is live, so the two states it must never confuse are
 * pinned down: a fresh player has level 1 to play but nothing to *continue*,
 * while a player who has finished anything has both.
 */
test('there is nothing to continue until a level is actually finished', () => {
  const storage = fakeStorage();
  assert.equal(hasProgress(storage), false, 'a fresh player has nothing to continue');

  // Level 1 being unlocked is not progress; it is the starting point.
  writeProgress('easy', 1, storage);
  assert.equal(hasProgress(storage), false, 'level 1 alone is not a finished level');

  completeLevel('easy', 1, storage);
  assert.equal(hasProgress(storage), true, 'finishing level 1 is something to continue');
  assert.equal(unlockedFor('easy', storage), 2, 'and it opens level 2');
});

test('progress in any one mode makes Continue live', () => {
  const storage = fakeStorage();
  completeLevel('hard', 3, storage);
  assert.equal(hasProgress(storage), true);
  assert.equal(unlockedFor('hard', storage), 4);
  assert.equal(unlockedFor('easy', storage), 1, 'other modes are untouched');
});

test('clearing progress takes Continue away again', () => {
  const storage = fakeStorage();
  completeLevel('medium', 2, storage);
  assert.equal(hasProgress(storage), true);
  clearProgress(storage);
  assert.equal(hasProgress(storage), false);
});

test('unusable storage reads as no progress rather than crashing', () => {
  const hostile = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.equal(hasProgress(hostile), false);
  assert.equal(hasProgress(null), false);
});

/* ------------------------------------------------------------------ *
 * Scores
 * ------------------------------------------------------------------ */

test('recordScore writes the first score and keeps the best', () => {
  const storage = fakeStorage();
  recordScore('easy', 1, { score: 100, served: 4, total: 4 }, storage);
  recordScore('easy', 1, { score: 120, served: 5, total: 5 }, storage);
  recordScore('easy', 1, { score: 90, served: 3, total: 4 }, storage);
  const result = bestResult('easy', 1, storage);
  assert.ok(result, 'bestResult returns an object');
  assert.equal(result.score, 120, 'the best of the three is kept');
});

test('scores are per level and never compared across levels', () => {
  const storage = fakeStorage();
  recordScore('easy', 1, { score: 150, served: 4, total: 4 }, storage);
  recordScore('easy', 2, { score: 100, served: 4, total: 4 }, storage);
  recordScore('medium', 1, { score: 200, served: 4, total: 4 }, storage);
  assert.equal(bestResult('easy', 1, storage).score, 150);
  assert.equal(bestResult('easy', 2, storage).score, 100);
  assert.equal(bestResult('medium', 1, storage).score, 200);
  assert.equal(bestResult('hard', 1, storage), null, 'unfinished levels read null');
});

test('a negative or zero score is ignored', () => {
  const storage = fakeStorage();
  recordScore('easy', 1, { score: 0, served: 4, total: 4 }, storage);
  recordScore('easy', 1, { score: -50, served: 4, total: 4 }, storage);
  recordScore('easy', 1, { score: 75, served: 4, total: 4 }, storage);
  assert.equal(bestResult('easy', 1, storage).score, 75, 'only the positive one counts');
});

test('clearProgress also clears the score book', () => {
  const storage = fakeStorage();
  completeLevel('easy', 2, storage);
  recordScore('easy', 1, { score: 200, served: 4, total: 4 }, storage);
  recordScore('easy', 2, { score: 180, served: 5, total: 5 }, storage);
  clearProgress(storage);
  assert.equal(hasProgress(storage), false, 'progress is gone');
  assert.equal(bestResult('easy', 1, storage), null, 'scores are gone too');
  assert.equal(bestResult('easy', 2, storage), null, 'all scores are gone');
});

test('unusable storage reads as no score rather than crashing', () => {
  const hostile = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.equal(bestResult('easy', 1, hostile), null);
  assert.equal(bestResult('easy', 1, null), null);
  assert.doesNotThrow(() => recordScore('easy', 1, { score: 100, served: 4, total: 4 }, hostile));
});
