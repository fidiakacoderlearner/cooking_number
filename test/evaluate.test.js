import test from 'node:test';
import assert from 'node:assert/strict';

import { rat, equals, DivisionByZeroError, NotPerfectSquareError, NotIntegerError, RationalError } from '../src/core/rational.js';
import {
  recipe,
  evaluate,
  tryEvaluate,
  trailingTerm,
  ingredientCount,
  operatorKeys,
  unaryOperatorKeys,
  hasUnary,
  traceValues,
  formatRecipe,
} from '../src/core/evaluate.js';
import { applyOperator, opArity, opSymbol, consumesOperand, canApply } from '../src/core/operators.js';

/* ------------------------------------------------------------------ *
 * Operator precedence is the headline rule
 * ------------------------------------------------------------------ */

test('evaluation follows kaidah operasi: times and divide bind tighter', () => {
  // 2 + 3 * 4 = 2 + 12 = 14. This is the school rule and the reason the
  // left-to-right evaluator was replaced: it read this as 20.
  assert.ok(equals(evaluate(recipe(rat(2), [{ op: 'add', operand: rat(3) }, { op: 'mul', operand: rat(4) }])), rat(14)));

  // The other order is still 14, but for a different reason, and that difference
  // is the whole point of the rule.
  assert.ok(equals(evaluate(recipe(rat(3), [{ op: 'mul', operand: rat(4) }, { op: 'add', operand: rat(2) }])), rat(14)));
  assert.ok(equals(evaluate(recipe(rat(1), [{ op: 'div', operand: rat(2) }, { op: 'mul', operand: rat(10) }])), rat(5)));

  // 2 - 9 / 2 = 2 - 4.5 = -2.5. Left to right read this as -3.5, which is the
  // confusion a schoolchild would have had to unlearn.
  assert.ok(equals(evaluate(recipe(rat(2), [{ op: 'sub', operand: rat(9) }, { op: 'div', operand: rat(2) }])), rat(-5, 2)));

  // A minus running total of zero does not make a division illegal. 5 - 5 is 0,
  // but 5 - 5 / 2 divides the trailing term, not the zero, so it is 2.5. The old
  // rule called this a division by zero and refused the move.
  assert.ok(equals(evaluate(recipe(rat(5), [{ op: 'sub', operand: rat(5) }, { op: 'div', operand: rat(2) }])), rat(5, 2)));
});

test('equal precedence runs left to right', () => {
  // 10 - 4 - 3 = 3, not 9. Subtraction is left-associative.
  assert.ok(equals(evaluate(recipe(rat(10), [{ op: 'sub', operand: rat(4) }, { op: 'sub', operand: rat(3) }])), rat(3)));
  // 100 / 5 / 2 = 10, not 40.
  assert.ok(equals(evaluate(recipe(rat(100), [{ op: 'div', operand: rat(5) }, { op: 'div', operand: rat(2) }])), rat(10)));
});

test('a recipe with no steps returns its start value', () => {
  assert.ok(equals(evaluate(recipe(rat(7))), rat(7)));
  assert.equal(ingredientCount(recipe(rat(7))), 1);
});

test('unary operators bind to the number in front of them, not the whole chain', () => {
  // `9 * √9 + 4`: the root takes the 9, the product is 27, the sum is 31.
  // Under left-to-right the root was applied to 81 and the answer was 13.
  const r = recipe(rat(9), [
    { op: 'mul', operand: rat(9) },
    { op: 'sqrt' },
    { op: 'add', operand: rat(4) },
  ]);
  assert.ok(equals(evaluate(r), rat(31)));
  assert.ok(equals(traceValues(r), [rat(9), rat(3), rat(27), rat(31)]));
  assert.equal(ingredientCount(r), 3);
});

test('pow is unary and takes its exponent from the step', () => {
  const squared = recipe(rat(3), [{ op: 'pow', exponent: 2 }]);
  assert.ok(equals(evaluate(squared), rat(9)));
  assert.equal(ingredientCount(squared), 1, 'pow must not consume an ingredient');

  const cubed = recipe(rat(2), [{ op: 'pow', exponent: 3 }]);
  assert.ok(equals(evaluate(cubed), rat(8)));

  // 2³ + 3² = 8 + 9 = 17. The left-to-right rule read this as 121, squaring the
  // running total instead of the trailing 3.
  const mixed = recipe(rat(2), [{ op: 'pow', exponent: 3 }, { op: 'add', operand: rat(3) }, { op: 'pow', exponent: 2 }]);
  assert.ok(equals(evaluate(mixed), rat(17)), 'the square belongs to the 3, not to the running total');
  assert.ok(equals(traceValues(mixed), [rat(2), rat(8), rat(3), rat(9), rat(17)]));
});

test('pow exponent is validated against the mode limit', () => {
  const r = recipe(rat(2), [{ op: 'pow', exponent: 4 }]);
  assert.throws(() => evaluate(r, { maxPowExponent: 3 }), RationalError);
  assert.ok(equals(evaluate(r, { maxPowExponent: 4 }), rat(16)));
});

test('fractions flow through the chain exactly', () => {
  // 1/2 + 1/3 * 2 = 1/2 + 2/3 = 7/6. Left to right gave 5/3.
  const r = recipe(rat(1, 2), [{ op: 'add', operand: rat(1, 3) }, { op: 'mul', operand: rat(2) }]);
  assert.ok(equals(evaluate(r), rat(7, 6)), 'the product binds tighter than the sum');
});

test('trailingTerm reports the left side of a pending times or divide', () => {
  // What a ÷ tile would actually divide: the trailing term, not the whole chain.
  const r = recipe(rat(2), [{ op: 'add', operand: rat(3) }, { op: 'mul', operand: rat(4) }]);
  assert.ok(equals(trailingTerm(r), rat(12)), '3 * 4 is the trailing term of 2 + 3 * 4');

  // The whole chain is one term, so it is its own trailing term.
  assert.ok(equals(trailingTerm(recipe(rat(3), [{ op: 'mul', operand: rat(4) }])), rat(12)));

  // With only low-precedence operators the last operand is the trailing term.
  assert.ok(equals(trailingTerm(recipe(rat(2), [{ op: 'add', operand: rat(3) }])), rat(3)));

  // A trailing zero is the case the stand's divide guard has to notice.
  const zero = recipe(rat(5), [{ op: 'sub', operand: rat(5) }]);
  assert.ok(equals(trailingTerm(zero), rat(5)), 'the trailing term is 5 even though the sum is 0');
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
  // The root wraps the number it acts on, which is what the arithmetic means now
  // and what the stand shows. It used to be printed as √(9 × 9), a form that
  // reads as 9 but computes 31.
  assert.equal(formatRecipe(r, opSymbol), '9 × √9 + 4');
});

test('applyOperator is callable directly for a single step', () => {
  assert.ok(equals(applyOperator('add', rat(2), rat(3)), rat(5)));
  assert.ok(equals(applyOperator('sqrt', rat(25)), rat(5)));
  assert.ok(equals(applyOperator('pow', rat(3), undefined, { exponent: 3 }), rat(27)));
  assert.throws(() => applyOperator('add', rat(2)), RationalError);
  assert.throws(() => applyOperator('bogus', rat(2), rat(3)), /unknown operator/);
});
