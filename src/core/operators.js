/**
 * Operator registry.
 *
 * Two families, matching PRD section 5.3:
 *   - binary (+, -, *, /) consumes the running value plus one ingredient
 *   - unary  (pow, sqrt) consumes only the running value
 *
 * Every `apply` throws on invalid input (divide by zero, root that is not a
 * perfect square, non-integer exponent) so callers can simply retry generation
 * instead of validating by hand. `ctx` carries the per-mode limits that a given
 * difficulty band is allowed to use.
 */

import * as R from './rational.js';

export class UnknownOperatorError extends R.RationalError {
  constructor(key) {
    super(`unknown operator: ${key}`);
    this.name = 'UnknownOperatorError';
  }
}

export const BINARY_OPS = Object.freeze({
  add: { symbol: '+', arity: 'binary' },
  sub: { symbol: '\u2212', arity: 'binary' },
  mul: { symbol: '\u00d7', arity: 'binary' },
  div: { symbol: '\u00f7', arity: 'binary' },
});

export const UNARY_OPS = Object.freeze({
  pow: { symbol: '^', arity: 'unary' },
  sqrt: { symbol: '\u221a', arity: 'unary' },
});

export const ALL_OPS = Object.freeze({ ...BINARY_OPS, ...UNARY_OPS });

export function opSymbol(key) {
  const op = ALL_OPS[key];
  if (!op) throw new UnknownOperatorError(key);
  return op.symbol;
}

export function opArity(key) {
  const op = ALL_OPS[key];
  if (!op) throw new UnknownOperatorError(key);
  return op.arity;
}

/**
 * Apply `key` to the running value.
 *
 * Binary operators need an `operand`. Unary operators only touch the running
 * value: `sqrt` is a bare root, while `pow` takes its exponent from `ctx` so the
 * UI can render it as a single "squared" / "cubed" slot (PRD 5.3).
 *
 * @param {string} key operator key
 * @param {{n:number,d:number}} acc running value
 * @param {{n:number,d:number}} [operand] required for binary operators
 * @param {{maxPowExponent?:number, exponent?:number}} [ctx] difficulty limits
 */
export function applyOperator(key, acc, operand, ctx = {}) {
  switch (key) {
    case 'add':
      return R.add(acc, requireOperand(operand));
    case 'sub':
      return R.sub(acc, requireOperand(operand));
    case 'mul':
      return R.mul(acc, requireOperand(operand));
    case 'div':
      return R.div(acc, requireOperand(operand));
    case 'pow': {
      const maxExp = ctx.maxPowExponent ?? 3;
      const exp = ctx.exponent ?? 2;
      if (!Number.isInteger(exp)) throw new R.NotIntegerError(`exponent ${exp}`);
      if (exp < 2 || exp > maxExp) {
        throw new R.RationalError(`exponent ${exp} outside allowed 2..${maxExp}`);
      }
      return R.pow(acc, exp);
    }
    case 'sqrt':
      return R.sqrt(acc);
    default:
      throw new UnknownOperatorError(key);
  }
}

function requireOperand(operand) {
  if (!R.isRational(operand)) {
    throw new R.RationalError(`missing operand (got ${operand})`);
  }
  return operand;
}

/**
 * Convenience wrapper: can this operator legally be applied? Used by the
 * generator to prune branches without try/catch noise.
 */
export function canApply(key, acc, operand, ctx = {}) {
  try {
    applyOperator(key, acc, operand, ctx);
    return true;
  } catch {
    return false;
  }
}

/** Unary operators never consume an ingredient tile. */
export function consumesOperand(key) {
  return opArity(key) === 'binary';
}
