import test from 'node:test';
import assert from 'node:assert/strict';

import { rat, equals, DivisionByZeroError, NotPerfectSquareError, NotIntegerError, RationalError } from '../src/core/rational.js';
import {
  recipe,
  evaluate,
  tryEvaluate,
  ingredientCount,
  operatorKeys,
  unaryOperatorKeys,
  hasUnary,
  traceValues,
  formatRecipe,
} from '../src/core/evaluate.js';
import { applyOperator, opArity, opSymbol, consumesOperand, canApply } from '../src/core/operators.js';

/* ------------------------------------------------------------------ *
 * Left-to-right is the headline rule
 * ------------------------------------------------------------------ */

test('evaluation is strictly left to right, not operator precedence', () => {
  // The whole point of the agreed rule: 2 + 3 * 4 === 20, not 14.
  assert.ok(equals(evaluate(recipe(rat(2), [{ op: 'add', operand: rat(3) }, { op: 'mul', operand: rat(4) }])), rat(20)));

  // And the reverse order really is a different answer.
  assert.ok(equals(evaluate(recipe(rat(3), [{ op: 'mul', operand: rat(4) }, { op: 'add', operand: rat(2) }])), rat(14)));
  assert.ok(equals(evaluate(recipe(rat(1), [{ op: 'div', operand: rat(2) }, { op: 'mul', operand: rat(10) }])), rat(5)));

  // Left to right gives -7 / 2 = -3.5. A player who read 2 - 9 / 2 would get
  // -2.5 instead, which is exactly the confusion this rule removes.
  assert.ok(equals(evaluate(recipe(rat(2), [{ op: 'sub', operand: rat(9) }, { op: 'div', operand: rat(2) }])), rat(-7, 2)));
});

test('a recipe with no steps returns its start value', () => {
  assert.ok(equals(evaluate(recipe(rat(7))), rat(7)));
  assert.equal(ingredientCount(recipe(rat(7))), 1);
});

test('unary operators act on the running value mid-chain', () => {
  // 9 * 9 -> 81, root -> 9, + 4 -> 13
  const r = recipe(rat(9), [
    { op: 'mul', operand: rat(9) },
    { op: 'sqrt' },
    { op: 'add', operand: rat(4) },
  ]);
  assert.ok(equals(evaluate(r), rat(13)));
  assert.deepEqual(traceValues(r), [rat(9), rat(81), rat(9), rat(13)]);
  assert.equal(ingredientCount(r), 3);
});

test('pow is unary and takes its exponent from the step', () => {
  const squared = recipe(rat(3), [{ op: 'pow', exponent: 2 }]);
  assert.ok(equals(evaluate(squared), rat(9)));
  assert.equal(ingredientCount(squared), 1, 'pow must not consume an ingredient');

  const cubed = recipe(rat(2), [{ op: 'pow', exponent: 3 }]);
  assert.ok(equals(evaluate(cubed), rat(8)));

  // Trap: left to right squares the *accumulator*, so 2^3 + 3 becomes 11 first
  // and 11^2 = 121. Squaring only the trailing 3 would need parentheses, which
  // the left-to-right rule deliberately does not offer.
  const mixed = recipe(rat(2), [{ op: 'pow', exponent: 3 }, { op: 'add', operand: rat(3) }, { op: 'pow', exponent: 2 }]);
  assert.ok(equals(evaluate(mixed), rat(121)), 'left to right squares the accumulator, not the operand');
  assert.ok(equals(traceValues(mixed), [rat(2), rat(8), rat(11), rat(121)]));
});

test('pow exponent is validated against the mode limit', () => {
  const r = recipe(rat(2), [{ op: 'pow', exponent: 4 }]);
  assert.throws(() => evaluate(r, { maxPowExponent: 3 }), RationalError);
  assert.ok(equals(evaluate(r, { maxPowExponent: 4 }), rat(16)));
});

test('fractions flow through the chain exactly', () => {
  const r = recipe(rat(1, 2), [{ op: 'add', operand: rat(1, 3) }, { op: 'mul', operand: rat(2) }]);
  assert.ok(equals(evaluate(r), rat(5, 3)), '0.5 + 0.333.. * 2 must be 5/3, not 1.6666');
});

/* ------------------------------------------------------------------ *
 * Invalid input must be rejected loudly
 * ------------------------------------------------------------------ */

test('division by zero throws inside a chain', () => {
  const r = recipe(rat(8), [{ op: 'div', operand: rat(0) }]);
  assert.throws(() => evaluate(r), DivisionByZeroError);
  assert.equal(tryEvaluate(r), null);
});

test('a root of a non-square throws inside a chain', () => {
  const r = recipe(rat(8), [{ op: 'sqrt' }]);
  assert.throws(() => evaluate(r), NotPerfectSquareError);
  assert.equal(tryEvaluate(r), null);
});

test('a root of a negative throws', () => {
  assert.throws(() => evaluate(recipe(rat(-9), [{ op: 'sqrt' }])), NotPerfectSquareError);
});

test('intermediate magnitude guard trips when configured', () => {
  const r = recipe(rat(2), [{ op: 'mul', operand: rat(9) }, { op: 'mul', operand: rat(9) }]);
  assert.ok(equals(evaluate(r), rat(162)));
  assert.throws(() => evaluate(r, { maxAbsValue: 50 }), RationalError);
});

test('recipe() validates its own shape', () => {
  assert.throws(() => recipe(5), RationalError, 'start must be a Rational');
  assert.throws(() => recipe(rat(1), [{ op: 'nope' }]), RationalError);
  assert.throws(() => recipe(rat(1), [{ op: 'add' }]), RationalError, 'binary step needs operand');
  assert.throws(() => recipe(rat(1), [{ op: 'add', operand: 3 }]), RationalError);
  assert.throws(() => recipe(rat(1), 'not-an-array'), RationalError);
  assert.throws(() => recipe(rat(1), [{ op: 'pow', exponent: 1.5 }]), NotIntegerError);
  assert.throws(() => evaluate(null), RationalError);
});

test('recipe() strips the exponent off unary non-pow steps', () => {
  const r = recipe(rat(9), [{ op: 'sqrt', exponent: 99 }]);
  assert.deepEqual(r.steps, [{ op: 'sqrt' }]);
});

/* ------------------------------------------------------------------ *
 * Introspection helpers
 * ------------------------------------------------------------------ */

test('operator metadata', () => {
  assert.equal(opArity('add'), 'binary');
  assert.equal(opArity('sqrt'), 'unary');
  assert.equal(opArity('pow'), 'unary');
  assert.equal(consumesOperand('div'), true);
  assert.equal(consumesOperand('sqrt'), false);
  assert.equal(opSymbol('mul'), '\u00d7');
  assert.equal(opSymbol('sub'), '\u2212');
  assert.throws(() => opSymbol('plus'), /unknown operator/);
});

test('canApply answers without throwing', () => {
  assert.ok(canApply('div', rat(8), rat(2)));
  assert.ok(!canApply('div', rat(8), rat(0)));
  assert.ok(!canApply('sqrt', rat(8)));
  assert.ok(canApply('sqrt', rat(16)));
});

test('operatorKeys and unaryOperatorKeys split the chain', () => {
  const r = recipe(rat(2), [
    { op: 'pow', exponent: 2 },
    { op: 'add', operand: rat(3) },
    { op: 'sqrt' },
  ]);
  assert.deepEqual(operatorKeys(r), ['pow', 'add', 'sqrt']);
  assert.deepEqual(unaryOperatorKeys(r), ['pow', 'sqrt']);
  assert.ok(hasUnary(r));
  assert.ok(!hasUnary(recipe(rat(2), [{ op: 'add', operand: rat(1) }])));
});

test('formatRecipe produces readable traces', () => {
  const r = recipe(rat(9), [
    { op: 'mul', operand: rat(9) },
    { op: 'sqrt' },
    { op: 'add', operand: rat(4) },
  ]);
  assert.equal(formatRecipe(r, opSymbol), '\u221a(9 \u00d7 9) + 4');
});

test('applyOperator is callable directly for a single step', () => {
  assert.ok(equals(applyOperator('add', rat(2), rat(3)), rat(5)));
  assert.ok(equals(applyOperator('sqrt', rat(25)), rat(5)));
  assert.ok(equals(applyOperator('pow', rat(3), undefined, { exponent: 3 }), rat(27)));
  assert.throws(() => applyOperator('add', rat(2)), RationalError);
  assert.throws(() => applyOperator('bogus', rat(2), rat(3)), /unknown operator/);
});
