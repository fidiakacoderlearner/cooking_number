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
