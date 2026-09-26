import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rat,
  add,
  sub,
  mul,
  div,
  neg,
  abs,
  equals,
  compare,
  isZero,
  isInteger,
  isNegative,
  isDisplayNice,
  isFiniteValue,
  pow,
  sqrt,
  toFractionString,
  toDecimalString,
  toDisplayString,
  hasTerminatingDecimal,
  format,
  toKey,
  DivisionByZeroError,
  NotPerfectSquareError,
  NotIntegerError,
  OutOfRangeError,
} from '../src/core/rational.js';

test('rat() normalises sign and gcd', () => {
  assert.deepEqual(rat(2, 4), { n: 1, d: 2 });
  assert.deepEqual(rat(6, 3), { n: 2, d: 1 });
  assert.deepEqual(rat(1, -2), { n: -1, d: 2 });
  assert.deepEqual(rat(-6, -3), { n: 2, d: 1 });
  assert.deepEqual(rat(0, 5), { n: 0, d: 1 });
  assert.deepEqual(rat(7), { n: 7, d: 1 });
});

test('rat() rejects non-integer parts and zero denominators', () => {
  assert.throws(() => rat(1.5, 2), NotIntegerError);
  assert.throws(() => rat(1, 2.5), NotIntegerError);
  assert.throws(() => rat(3, 0), DivisionByZeroError);
});

test('rat() guards against unsafe integers', () => {
  assert.throws(() => rat(Number.MAX_SAFE_INTEGER + 10, 1), OutOfRangeError);
  assert.throws(() => pow(rat(2), 64), OutOfRangeError);
});

test('rat() returns frozen values', () => {
  const value = rat(3, 4);
  assert.throws(() => {
    'use strict';
    value.n = 5;
  });
  assert.deepEqual(value, { n: 3, d: 4 });
});

test('addition and subtraction stay reduced', () => {
  assert.deepEqual(add(rat(1, 2), rat(1, 3)), rat(5, 6));
  assert.deepEqual(add(rat(1, 2), rat(1, 2)), rat(1));
  assert.deepEqual(sub(rat(1, 2), rat(1, 2)), rat(0));
  assert.deepEqual(sub(rat(1, 3), rat(2, 3)), rat(-1, 3));
  assert.deepEqual(sub(rat(5, 4), rat(1, 2)), rat(3, 4));
});

test('multiplication and division stay reduced', () => {
  assert.deepEqual(mul(rat(2, 3), rat(3, 4)), rat(1, 2));
  assert.deepEqual(mul(rat(4, 5), rat(5, 4)), rat(1));
  assert.deepEqual(div(rat(1, 2), rat(1, 4)), rat(2));
  assert.deepEqual(div(rat(6), rat(3)), rat(2));
  assert.deepEqual(div(rat(1, 3), rat(2)), rat(1, 6));
});

test('division by zero throws', () => {
  assert.throws(() => div(rat(1), rat(0)), DivisionByZeroError);
  assert.throws(() => div(rat(0), rat(0)), DivisionByZeroError);
});

test('neg, abs, compare and predicates', () => {
  assert.deepEqual(neg(rat(3, 4)), rat(-3, 4));
  assert.deepEqual(abs(rat(-3, 4)), rat(3, 4));
  assert.deepEqual(abs(rat(3, 4)), rat(3, 4));
  assert.equal(compare(rat(1, 2), rat(2, 3)), -1);
  assert.equal(compare(rat(2, 3), rat(1, 2)), 1);
  assert.equal(compare(rat(1, 2), rat(2, 4)), 0);
  assert.equal(equals(rat(1, 2), rat(2, 4)), true);
  assert.ok(isZero(rat(0)));
  assert.ok(isZero(rat(0, 7)), '0/7 normalises to 0/1 and is still zero');
  assert.ok(!isZero(rat(1, 2)));
  assert.ok(isInteger(rat(-4)));
  assert.ok(isInteger(rat(4, 2)), '4/2 normalises to 2/1 and is an integer');
  assert.ok(!isInteger(rat(3, 4)));
  assert.ok(isNegative(rat(-1, 2)));
  assert.ok(!isNegative(rat(0)));
});

test('exact decimals do not drift', () => {
  // The classic float failure: 0.1 + 0.2 === 0.30000000000000004
  const tenth = rat(1, 10);
  const fifth = rat(1, 5);
  assert.deepEqual(add(tenth, fifth), rat(3, 10));
  assert.equal(toDecimalString(add(tenth, fifth)), '0.3');

  const third = rat(1, 3);
  const sum = add(third, third);
  assert.deepEqual(sum, rat(2, 3));
  assert.equal(toDecimalString(sum), '0.667');
});

test('pow only accepts integer exponents', () => {
  assert.deepEqual(pow(rat(2), 3), rat(8));
  assert.deepEqual(pow(rat(0), 5), rat(0));
  assert.deepEqual(pow(rat(5), 0), rat(1));
  assert.deepEqual(pow(rat(2, 3), 2), rat(4, 9));
  assert.deepEqual(pow(rat(2), -2), rat(1, 4));
  assert.throws(() => pow(rat(2), 1.5), NotIntegerError);
  assert.throws(() => pow(rat(0), -1), DivisionByZeroError);
});

test('sqrt only accepts perfect squares', () => {
  assert.deepEqual(sqrt(rat(16)), rat(4));
  assert.deepEqual(sqrt(rat(0)), rat(0));
  assert.deepEqual(sqrt(rat(9, 4)), rat(3, 2));
  assert.deepEqual(sqrt(rat(1, 25)), rat(1, 5));
  assert.throws(() => sqrt(rat(2)), NotPerfectSquareError);
  assert.throws(() => sqrt(rat(1, 2)), NotPerfectSquareError);
  assert.throws(() => sqrt(rat(-4)), NotPerfectSquareError);
  assert.throws(() => sqrt(rat(1, 3)), NotPerfectSquareError);
});

test('sqrt inverts pow for whole-number squares', () => {
  for (let n = 1; n <= 12; n += 1) {
    assert.deepEqual(sqrt(pow(rat(n), 2)), rat(n), `sqrt(${n}^2) should be ${n}`);
  }
});

test('isDisplayNice rejects noisy denominators and sprawling numerators', () => {
  assert.ok(isDisplayNice(rat(4)));
  assert.ok(isDisplayNice(rat(1, 2)));
  assert.ok(isDisplayNice(rat(3, 4)));
  assert.ok(isDisplayNice(rat(2, 3)));
  assert.ok(isDisplayNice(rat(1, 5)));
  assert.ok(isDisplayNice(rat(1, 10)));
  assert.ok(isDisplayNice(rat(7, 4)));

  // Denominators a student rarely meets in this context.
  assert.ok(!isDisplayNice(rat(1, 7)));
  assert.ok(!isDisplayNice(rat(1, 9)));
  assert.ok(!isDisplayNice(rat(1, 11)));
  assert.ok(!isDisplayNice(rat(1, 13)));
  assert.ok(!isDisplayNice(rat(5, 7)));
  assert.ok(!isDisplayNice(rat(1, 12)));
  assert.ok(!isDisplayNice(rat(1, 15)));

  // A permitted denominator does not excuse an absurd numerator.
  assert.ok(!isDisplayNice(rat(97, 6)));
  assert.ok(!isDisplayNice(rat(127, 10)));
  assert.ok(!isDisplayNice(rat(21, 5)));

  assert.ok(!isDisplayNice(null));
  assert.ok(!isDisplayNice(5));
});

test('formatting helpers', () => {
  assert.equal(toFractionString(rat(4)), '4');
  assert.equal(toFractionString(rat(3, 4)), '3/4');
  assert.equal(toDecimalString(rat(4)), '4');
  assert.equal(toDecimalString(rat(3, 4)), '0.75');
  assert.equal(toDecimalString(rat(-1, 2)), '-0.5');
  assert.equal(toDecimalString(rat(1, 1)), '1');
  assert.equal(format(rat(-6, 3)), '-2');
  assert.equal(toKey(rat(1, 2)), '1/2');
});

test('toDisplayString never rounds a fraction into a lie', () => {
  // Terminating decimals are shown as decimals.
  assert.equal(toDisplayString(rat(3, 4)), '0.75');
  assert.equal(toDisplayString(rat(1, 2)), '0.5');
  assert.equal(toDisplayString(rat(1, 8)), '0.125');
  assert.equal(toDisplayString(rat(5, 2)), '2.5');
  assert.equal(toDisplayString(rat(-3, 4)), '-0.75');
  assert.equal(toDisplayString(rat(7)), '7');

  // Everything else keeps its fraction form, because 2/3 is not 0.667.
  assert.equal(toDisplayString(rat(2, 3)), '2/3');
  assert.equal(toDisplayString(rat(1, 3)), '1/3');
  assert.equal(toDisplayString(rat(5, 3)), '5/3');
  assert.equal(toDisplayString(rat(4, 3)), '4/3');
  assert.equal(toDisplayString(rat(1, 6)), '1/6');
  assert.equal(toDisplayString(rat(7, 6)), '7/6');
});

test('hasTerminatingDecimal separates finite from repeating expansions', () => {
  for (const d of [1, 2, 4, 5, 8, 10, 20, 25, 40]) {
    assert.ok(hasTerminatingDecimal(rat(1, d)), `1/${d} terminates`);
  }
  for (const d of [3, 6, 7, 9, 11, 12, 15, 21]) {
    assert.ok(!hasTerminatingDecimal(rat(1, d)), `1/${d} repeats`);
  }
});

test('isFiniteValue catches foreign non-finite payloads', () => {
  assert.ok(isFiniteValue(rat(3, 4)));
  assert.ok(!isFiniteValue({ n: NaN, d: 1 }));
  assert.ok(!isFiniteValue({ n: Infinity, d: 1 }));
  assert.ok(!isFiniteValue({ n: 1, d: 0 }));
  assert.ok(!isFiniteValue(null));
  assert.ok(!isFiniteValue(5));
});
