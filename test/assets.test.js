/**
 * The operator palette on the rack.
 *
 * The contract that matters: the rack and the generator must read the same
 * operator band. If they drift, a player is offered tiles their puzzle can never
 * use, or worse, a puzzle that needs a tile the rack does not have.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { MODE_LIST, LEVELS_PER_MODE, getBand } from '../src/core/difficulty.js';
import { OPERATORS, operatorsForLevel, operatorsForMode } from '../src/ui/assets.js';

test('the rack offers exactly the operators the band allows (regression)', () => {
  // A previous version handed out all four binary operators at every level and
  // read `band.binaryOps` never, which put times and divide on the Easy level 1
  // rack where no Easy level 1 puzzle ever uses them.
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      const offered = operatorsForMode(band);

      const binary = offered.filter((op) => op.arity === 'binary').map((op) => op.key);
      assert.deepEqual(
        binary,
        [...band.binaryOps],
        `${mode} level ${level} offers the wrong binary operators`,
      );

      const unaryKeys = new Set(offered.filter((op) => op.arity === 'unary').map((op) => op.key));
      for (const key of band.unaryOps) {
        assert.ok(unaryKeys.has(key), `${mode} level ${level} never offers the unlocked ${key}`);
      }
      for (const key of unaryKeys) {
        assert.ok(
          band.unaryOps.includes(key),
          `${mode} level ${level} offers ${key}, which that rung has not unlocked`,
        );
      }
    }
  }
});

test('Easy level 1 is addition and subtraction only (PRD 5.1)', () => {
  const offered = operatorsForMode(getBand('easy', 1));
  assert.deepEqual(offered.map((op) => op.key), ['add', 'sub']);
  assert.equal(
    offered.every((op) => op.arity === 'binary'),
    true,
    'the opening level of the whole game should not need a unary step',
  );
});

test('the ladder only ever grows, never loses an operator', () => {
  for (const mode of MODE_LIST) {
    let previous = [];
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const keys = operatorsForMode(getBand(mode, level)).map((op) => op.key);
      for (const key of previous) {
        assert.ok(keys.includes(key), `${mode} level ${level} dropped ${key}`);
      }
      previous = keys;
    }
  }
});

test('every operator in the palette has a core key, a symbol, a shape and a label', () => {
  const registered = new Set(Object.values(OPERATORS));
  const CORE_KEYS = ['add', 'sub', 'mul', 'div', 'pow', 'sqrt'];

  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      for (const op of operatorsForMode(getBand(mode, level))) {
        // The palette is keyed by tile, so `pow2` and `pow3` are two tiles for
        // one core operator. What has to hold is that the entry is registered
        // and that its core key is one the evaluator knows.
        assert.ok(registered.has(op), `${op.key} is not a registered palette entry`);
        assert.ok(CORE_KEYS.includes(op.key), `${op.key} is not a known core operator`);
        assert.ok(op.symbol && op.symbol.length > 0, `${op.key} has no symbol to show on the tile`);
        assert.ok(['binary', 'unary'].includes(op.arity), `${op.key} has an unknown shape`);
        assert.ok(op.labelKey?.startsWith('op.'), `${op.key} has no i18n label key`);
      }
    }
  }
});

test('the exponent on a power tile stays inside the band limit', () => {
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      for (const op of operatorsForMode(band)) {
        if (op.key !== 'pow') continue;
        assert.ok(
          op.exponent >= 2 && op.exponent <= band.maxPowExponent,
          `${mode} level ${level} offers a power of ${op.exponent}, outside 2..${band.maxPowExponent}`,
        );
      }
    }
  }
});

test('the menu preview shows the widest set a mode ever offers', () => {
  for (const mode of MODE_LIST) {
    const preview = operatorsForLevel(mode, LEVELS_PER_MODE).map((op) => op.key);
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      for (const key of operatorsForMode(getBand(mode, level)).map((op) => op.key)) {
        assert.ok(preview.includes(key), `the ${mode} menu preview hides ${key}, which level ${level} needs`);
      }
    }
  }
});
