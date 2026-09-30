/**
 * Operator-precedence expression evaluation (PRD 4).
 *
 * A recipe is a flat chain, which is exactly what the "chaining" UI shows:
 *
 *   { start: Rational, steps: [{ op: 'add', operand: Rational }, { op: 'sqrt' }] }
 *
 * The player sees numbers and operators, one tile at a time. The arithmetic
 * uses kaidah operasi: times and divide bind tighter than plus and minus, and
 * unary operators (sqrt, pow) bind to the number directly in front of them.
 * `2 + 3 * 4` therefore evaluates to 14, not 20.
 *
 * Internally this is a shunting-yard over the step list. Unary operators are
 * postfix and always bind tightest, so they are applied to the values stack
 * top immediately, keeping them separate from the binary-operator precedence
 * logic.
 */

import * as R from './rational.js';
import { applyOperator, consumesOperand, PRECEDENCE } from './operators.js';

/**
 * @typedef {{ op: string, operand?: {n:number,d:number}, exponent?: number }} Step
 * @typedef {{ start: {n:number,d:number}, steps: Step[] }} Recipe
 */

/**
 * Validate and normalise a recipe.
 * @param {{n:number,d:number}} start
 * @param {Step[]} [steps]
 * @returns {Recipe}
 */
export function recipe(start, steps = []) {
  if (!R.isRational(start)) throw new R.RationalError('recipe start must be a Rational');
  if (!Array.isArray(steps)) throw new R.RationalError('recipe steps must be an array');

  const clean = [];
  for (const step of steps) {
    if (step === null || typeof step !== 'object' || typeof step.op !== 'string') {
      throw new R.RationalError(`invalid step: ${JSON.stringify(step)}`);
    }
    if (consumesOperand(step.op)) {
      if (!R.isRational(step.operand)) {
        throw new R.RationalError(`binary step '${step.op}' needs an operand`);
      }
      clean.push({ op: step.op, operand: step.operand });
    } else if (step.op === 'pow') {
      const exponent = step.exponent ?? 2;
      if (!Number.isInteger(exponent) || exponent < 2) {
        throw new R.NotIntegerError(`exponent ${exponent}`);
      }
      clean.push({ op: step.op, exponent });
    } else {
      clean.push({ op: step.op });
    }
  }
  return { start, steps: clean };
}

/* ------------------------------------------------------------------ *
 * Shunting-yard core
 * ------------------------------------------------------------------ */

function exceedsMagnitude(value, limit) {
  return Math.abs(value.n) > limit * value.d;
}

/**
 * Run the shunting-yard over a recipe, optionally flushing the operator stack.
 *
 * Keeping this separate lets `evaluate` flush everything, `trailingTerm` flush
 * only high-precedence ops, and both share one implementation.
 */
function run(recipeObj, ctx, { flush = true } = {}) {
  const maxPow = ctx.maxPowExponent ?? 3;
  const values = [];
  const ops = [];
  const trace = [];
  const unaryOperands = [];

  function flushTop() {
    const op = ops.pop();
    const b = values.pop();
    const a = values.pop();
    const result = applyOperator(op.op, a, b, { maxPowExponent: maxPow });
    if (ctx.maxAbsValue !== undefined && exceedsMagnitude(result, ctx.maxAbsValue)) {
      throw new R.OutOfRangeError(`intermediate ${R.format(result)}`);
    }
    values.push(result);
    trace.push(result);
  }

  values.push(recipeObj.start);
  trace.push(recipeObj.start);

  for (const step of recipeObj.steps ?? []) {
    if (consumesOperand(step.op)) {
      // Flush before the operand lands. Reading `3 * 4 + 2` as (3*4)+2 needs the
      // product closed off while the 2 is still unread: pushing the 2 first would
      // leave the stack as [3, 4, 2] and pair the 4 with the 2.
      while (ops.length && PRECEDENCE[ops[ops.length - 1].op] >= PRECEDENCE[step.op]) {
        flushTop();
      }
      ops.push(step);
      values.push(step.operand);
    } else {
      // Postfix unary: always binds to the value directly in front of it, so it
      // is applied immediately to the values stack top rather than pushed onto
      // the operator stack.
      const operand = values[values.length - 1];
      const result = applyOperator(step.op, operand, undefined, {
        maxPowExponent: maxPow,
        exponent: step.exponent,
      });
      if (ctx.maxAbsValue !== undefined && exceedsMagnitude(result, ctx.maxAbsValue)) {
        throw new R.OutOfRangeError(`intermediate ${R.format(result)}`);
      }
      values[values.length - 1] = result;
      trace.push(result);
      unaryOperands.push(operand);
    }
  }

  if (flush) {
    while (ops.length) flushTop();
  }

  return { values, ops, trace, unaryOperands };
}

/**
 * The value each unary step acted on, in step order.
 *
 * A root or a power binds to the operand in front of it, and under precedence
 * that operand is not always the running total: in `9 × √9 + 4` the radicand is
 * 9, not 81. This records what the evaluator actually fed each unary step, so
 * callers that need to check a root really was a clean one do not have to
 * reimplement the stack.
 */
export function unaryOperands(recipeObj, ctx = {}) {
  return run(recipeObj, ctx, { flush: true }).unaryOperands;
}

/**
 * Evaluate a recipe using operator precedence.
 *
 * Times and divide bind tighter than plus and minus (kaidah operasi), and unary
 * operators bind to the number directly in front of them.  `2 + 3 × 4 = 14`,
 * `2 + 3² = 11`, `9 × √9 + 4 = 31`.
 *
 * @param {Recipe} recipeObj
 * @param {{maxPowExponent?: number, maxAbsValue?: number}} [ctx]
 * @returns {{n:number,d:number}}
 */
export function evaluate(recipeObj, ctx = {}) {
  if (!recipeObj || !R.isRational(recipeObj.start)) {
    throw new R.RationalError('recipe.start must be a Rational');
  }
  const { values } = run(recipeObj, ctx, { flush: true });
  return values[0];
}

/** Same as `evaluate` but returns null instead of throwing. */
export function tryEvaluate(recipeObj, ctx = {}) {
  try {
    return evaluate(recipeObj, ctx);
  } catch {
    return null;
  }
}

/**
 * The value of the trailing high-precedence term.
 *
 * In `2 + 3 × 4` the trailing term is 12 (from `3 × 4`), not 14. This is the
 * value the player needs to divide by zero, so the game can check `trailingTerm`
 * before committing to a ÷ tile and avoid refusing a legal `5 − 5 ÷ 2 = 2.5`.
 */
export function trailingTerm(recipeObj, ctx = {}) {
  if (!recipeObj || !R.isRational(recipeObj.start)) {
    throw new R.RationalError('recipe.start must be a Rational');
  }
  const { values, ops } = run(recipeObj, ctx, { flush: false });
  // Flush only high-precedence ops (×, ÷).  The first low-precedence op (+, −)
  // marks the start of the preceding term, so everything to its right is the
  // trailing term.
  const maxPow = ctx.maxPowExponent ?? 3;
  while (ops.length && PRECEDENCE[ops[ops.length - 1].op] > 1) {
    const op = ops.pop();
    const b = values.pop();
    const a = values.pop();
    values.push(applyOperator(op.op, a, b, { maxPowExponent: maxPow }));
  }
  return values[values.length - 1];
}

/* ------------------------------------------------------------------ *
 * Recipe introspection helpers
 * ------------------------------------------------------------------ */

/** How many ingredient tiles the recipe consumes (unary ops consume none). */
export function ingredientCount(recipeObj) {
  let count = 1;
  for (const step of recipeObj.steps ?? []) {
    if (consumesOperand(step.op)) count += 1;
  }
  return count;
}

/**
 * Every value the chain produces, starting with the first ingredient.
 *
 * The order follows evaluation, not the written form: in `2 + 3 × 4`, the
 * product is computed first (14), then the sum (16).  Unary operators appear
 * between their operand and the next binary flush: `9 × √9 + 4` traces as
 * [9, 3, 27, 31] — the root of 9 (3), the product (27), the sum (31).
 */
export function traceValues(recipeObj, ctx = {}) {
  if (!recipeObj || !R.isRational(recipeObj.start)) {
    throw new R.RationalError('recipe.start must be a Rational');
  }
  const { trace } = run(recipeObj, ctx, { flush: true });
  return trace;
}

/** Keys of the operators used, in the written order. */
export function operatorKeys(recipeObj) {
  return (recipeObj.steps ?? []).map((step) => step.op);
}

export function unaryOperatorKeys(recipeObj) {
  return operatorKeys(recipeObj).filter((key) => !consumesOperand(key));
}

export function hasUnary(recipeObj) {
  return unaryOperatorKeys(recipeObj).length > 0;
}

/**
 * Human-readable trace, used by the inspector.
 *
 * The root sign sits on the number it wraps (`√9`) and the power sits as a
 * superscript on it (`9²`).  This mirrors how the stand renders the chain
 * after the view merges unary operators into the tile in front of them.
 */
export function formatRecipe(recipeObj, symbolOf = (k) => k) {
  let text = R.format(recipeObj.start);
  let lastNum = text;

  for (const step of recipeObj.steps ?? []) {
    if (consumesOperand(step.op)) {
      text += ` ${symbolOf(step.op)} `;
      lastNum = R.format(step.operand);
      text += lastNum;
    } else if (step.op === 'pow') {
      const exp = step.exponent ?? 2;
      const sup = exp === 2 ? '\u00b2' : exp === 3 ? '\u00b3' : `^${exp}`;
      text = text.slice(0, text.length - lastNum.length) + lastNum + sup;
      lastNum += sup;
    } else if (step.op === 'sqrt') {
      const sym = symbolOf(step.op);
      text = text.slice(0, text.length - lastNum.length) + sym + lastNum;
      lastNum = sym + lastNum;
    }
  }

  return text;
}
