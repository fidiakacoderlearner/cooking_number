/**
 * Rules for the difficulty config: the three dials have to line up, and the
 * arrival interval must never collapse (AGENTS.md quality gate).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MODES,
  MODE_LIST,
  LEVELS_PER_MODE,
  CUSTOMERS_PER_LEVEL,
  MAX_ON_SCREEN,
  ARRIVAL_FLOOR,
  getBand,
  customersForLevel,
  baseArrivalSeconds,
  patienceSeconds,
  arrivalGapSeconds,
  minArrivalGapSeconds,
  isValidMode,
  isValidLevel,
} from '../src/core/difficulty.js';

const EVERY_LEVEL = Array.from({ length: LEVELS_PER_MODE }, (_, i) => i + 1);

test('roster grows with the level, for every mode', () => {
  for (let level = 1; level < LEVELS_PER_MODE; level += 1) {
    assert.ok(
      customersForLevel(level + 1) > customersForLevel(level),
      `level ${level + 1} should owe more customers than level ${level}`,
    );
  }
  assert.equal(LEVELS_PER_MODE, CUSTOMERS_PER_LEVEL.length);
});

test('the stand is never asked to hold more customers than the roster', () => {
  for (const mode of MODE_LIST) {
    for (const level of EVERY_LEVEL) {
      assert.ok(
        customersForLevel(level) >= MAX_ON_SCREEN,
        `${mode} level ${level} roster of ${customersForLevel(level)} is smaller than MAX_ON_SCREEN ${MAX_ON_SCREEN}`,
      );
    }
  }
});

test('arrivals get faster as the level rises, in every mode', () => {
  for (const mode of MODE_LIST) {
    for (let level = 1; level < LEVELS_PER_MODE; level += 1) {
      assert.ok(
        baseArrivalSeconds(mode, level + 1) <= baseArrivalSeconds(mode, level),
        `${mode}: level ${level + 1} base arrival should not be slower than level ${level}`,
      );
    }
  }
});

test('a harder mode brings customers in sooner at the same level', () => {
  for (const level of EVERY_LEVEL) {
    const easy = baseArrivalSeconds(MODES.easy, level);
    const medium = baseArrivalSeconds(MODES.medium, level);
    const hard = baseArrivalSeconds(MODES.hard, level);
    assert.ok(easy >= medium, `level ${level}: medium should not beat easy`);
    assert.ok(medium >= hard, `level ${level}: hard should not beat medium`);
  }
});

test('patience shrinks as the level rises and as the mode gets harder', () => {
  for (const mode of MODE_LIST) {
    for (let level = 1; level < LEVELS_PER_MODE; level += 1) {
      assert.ok(
        patienceSeconds(mode, level + 1) <= patienceSeconds(mode, level),
        `${mode} level ${level + 1} patience should not exceed level ${level}`,
      );
    }
  }
  for (const level of EVERY_LEVEL) {
    assert.ok(patienceSeconds(MODES.easy, level) > patienceSeconds(MODES.hard, level));
  }
});

test('patience is always longer than one arrival gap, by a clear margin', () => {
  for (const mode of MODE_LIST) {
    for (const level of EVERY_LEVEL) {
      const ratio = patienceSeconds(mode, level) / baseArrivalSeconds(mode, level);
      assert.ok(
        ratio > 2.5,
        `${mode} level ${level}: patience is only ${ratio.toFixed(2)} gaps, too tight to be fair`,
      );
    }
  }
});

test('the interval is not a constant: it varies and it speeds up', () => {
  const shortest = () => 0;
  const middle = () => 0.5;
  const longest = () => 1;

  const atZero = arrivalGapSeconds(MODES.easy, 1, 0, middle);
  const atFirst = arrivalGapSeconds(MODES.easy, 1, 0, shortest);
  const atLast = arrivalGapSeconds(MODES.easy, 1, 0, longest);
  assert.ok(atFirst < atZero && atZero < atLast, 'the gap must vary between customers');

  assert.ok(
    arrivalGapSeconds(MODES.easy, 1, 0, middle) > arrivalGapSeconds(MODES.easy, 1, 4, middle),
    'a later customer should arrive sooner than the first',
  );
});

test('the arrival interval never falls below its floor (AGENTS.md gate)', () => {
  for (const mode of MODE_LIST) {
    for (const level of EVERY_LEVEL) {
      const floor = baseArrivalSeconds(mode, level) * ARRIVAL_FLOOR;
      // Sample the extremes of the jitter, and every step of the decay.
      for (const draw of [0, 0.5, 1]) {
        for (let index = 0; index < LEVELS_PER_MODE + 2; index += 1) {
          const gap = arrivalGapSeconds(mode, level, index, () => draw);
          assert.ok(
            gap >= floor - 1e-9,
            `${mode} level ${level} index ${index}: gap ${gap} under floor ${floor}`,
          );
        }
      }
      assert.ok(minArrivalGapSeconds(mode, level) >= floor - 1e-9);
    }
  }
});

test('a gap is always positive and never longer than a little over the base', () => {
  for (const mode of MODE_LIST) {
    for (const level of EVERY_LEVEL) {
      const base = baseArrivalSeconds(mode, level);
      for (const draw of [0, 0.5, 1]) {
        const gap = arrivalGapSeconds(mode, level, 0, () => draw);
        assert.ok(gap > 0, 'a customer may never arrive in zero seconds');
        assert.ok(gap <= base * 1.15, `gap ${gap} overshot base ${base} too far`);
      }
    }
  }
});

test('the operator ladder only ever grows within a mode', () => {
  for (const mode of MODE_LIST) {
    for (let level = 1; level < LEVELS_PER_MODE; level += 1) {
      const previous = getBand(mode, level);
      const current = getBand(mode, level + 1);
      for (const op of previous.binaryOps) {
        assert.ok(current.binaryOps.includes(op), `${mode} L${level + 1} dropped binary op ${op}`);
      }
      for (const op of previous.unaryOps) {
        assert.ok(current.unaryOps.includes(op), `${mode} L${level + 1} dropped unary op ${op}`);
      }
    }
  }
});

test('a level never demands a unary step it has not unlocked', () => {
  for (const mode of MODE_LIST) {
    for (const level of EVERY_LEVEL) {
      const band = getBand(mode, level);
      if (band.minUnarySteps > 0) {
        assert.ok(band.unaryOps.length > 0, `${mode} L${level} demands a unary step with none unlocked`);
      }
    }
  }
});

test('level 1 of every mode is a narrow band, so early levels stay calm', () => {
  for (const mode of MODE_LIST) {
    const first = getBand(mode, 1);
    const last = getBand(mode, LEVELS_PER_MODE);
    assert.ok(first.maxAbsIngredient <= last.maxAbsIngredient);
  }
});

test('bands are frozen and valid inputs are rejected loudly', () => {
  const band = getBand(MODES.easy, 1);
  assert.throws(() => { 'use strict'; band.binaryOps.push('div'); });
  assert.ok(isValidMode(MODES.easy));
  assert.ok(!isValidMode('nightmare'));
  assert.ok(isValidLevel(1));
  assert.ok(!isValidLevel(0));
  assert.ok(!isValidLevel(LEVELS_PER_MODE + 1));
  assert.throws(() => getBand('nightmare', 1), /unknown mode/);
  assert.throws(() => getBand(MODES.easy, 99), /level must be/);
  assert.throws(() => customersForLevel(0), /level must be/);
});
