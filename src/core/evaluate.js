/**
 * Left-to-right expression evaluation (agreed decision: no operator precedence,
 * every operator weighs the same and is applied in the order the player builds).
 *
 * A recipe is a flat chain, which is exactly what the "chaining" UI shows:
 *
 *   { start: Rational, steps: [{ op: 'add', operand: Rational }, { op: 'sqrt' }] }
 *
 * `2 + 3 * 4` therefore evaluates to 20, not 14.
 */

import * as R from './rational.js';
import { applyOperator, consumesOperand } from './operators.js';

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

/**
 * Evaluate a chain strictly left to right.
 * @param {Recipe} recipeObj
 * @param {{maxPowExponent?: number, maxAbsValue?: number}} [ctx]
 * @returns {{n:number,d:number}}
 */
export function evaluate(recipeObj, ctx = {}) {
  if (!recipeObj || !R.isRational(recipeObj.start)) {
    throw new R.RationalError('recipe.start must be a Rational');
  }
  let acc = recipeObj.start;
  const steps = recipeObj.steps ?? [];
  for (const step of steps) {
    acc = applyOperator(step.op, acc, step.operand, {
      maxPowExponent: ctx.maxPowExponent ?? 3,
      exponent: step.exponent,
    });
    if (ctx.maxAbsValue !== undefined && exceedsMagnitude(acc, ctx.maxAbsValue)) {
      throw new R.OutOfRangeError(`intermediate ${R.format(acc)}`);
    }
  }
  return acc;
}

function exceedsMagnitude(value, limit) {
  return Math.abs(value.n) > limit * value.d;
}

/** Same as `evaluate` but returns null instead of throwing. */
export function tryEvaluate(recipeObj, ctx = {}) {
  try {
    return evaluate(recipeObj, ctx);
  } catch {
    return null;
  }
}

/** How many ingredient tiles the recipe consumes (unary ops consume none). */
export function ingredientCount(recipeObj) {
  let count = 1;
  for (const step of recipeObj.steps ?? []) {
    if (consumesOperand(step.op)) count += 1;
  }
  return count;
}

/** Every value the chain passes through, starting with the first ingredient. */
export function traceValues(recipeObj, ctx = {}) {
  const values = [recipeObj.start];
  let acc = recipeObj.start;
  for (const step of recipeObj.steps ?? []) {
    acc = applyOperator(step.op, acc, step.operand, {
      maxPowExponent: ctx.maxPowExponent ?? 3,
      exponent: step.exponent,
    });
    values.push(acc);
  }
  return values;
}

/** Keys of the operators used, in application order. */
export function operatorKeys(recipeObj) {
  return (recipeObj.steps ?? []).map((step) => step.op);
}

export function unaryOperatorKeys(recipeObj) {
  return operatorKeys(recipeObj).filter((key) => !consumesOperand(key));
}

export function hasUnary(recipeObj) {
  return unaryOperatorKeys(recipeObj).length > 0;
}

/** Human readable `4 * 7` / `sqrt(9 * 9) + 4` trace, used by the inspector. */
export function formatRecipe(recipeObj, symbolOf = (k) => k) {
  let text = R.format(recipeObj.start);
  for (const step of recipeObj.steps ?? []) {
    if (consumesOperand(step.op)) {
      text = `${text} ${symbolOf(step.op)} ${R.format(step.operand)}`;
    } else if (step.op === 'pow') {
      text = symbolOf(step.op) === '^' ? `${text}^${step.exponent ?? 2}` : `${text}${symbolOf(step.op)}`;
    } else {
      text = `${symbolOf(step.op)}(${text})`;
    }
  }
  return text;
}

export const EVALUATE = {
  recipe,
  evaluate,
  tryEvaluate,
  ingredientCount,
  operatorKeys,
  unaryOperatorKeys,
  hasUnary,
  traceValues,
  formatRecipe,
};
