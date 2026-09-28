/**
 * Puzzle generator (PRD section 5.2).
 *
 * Strategy: pick the target first, then walk *backwards* through the secret
 * solution, choosing operands that make each inverse step land on a legal
 * intermediate. The last value we peel down to becomes the starting
 * ingredient, and every operand peeled along the way becomes another
 * ingredient. Distractors are added afterwards.
 *
 * Solvability is therefore guaranteed by construction, not by search: the
 * generator holds a complete, verified recipe, and `evaluate(secretRecipe)`
 * reproducing the target is re-checked before the puzzle is returned.
 *
 * Safety net: if a recipe cannot be built for a target within the attempt
 * budget the target is discarded and a new one is drawn, so the function either
 * returns a fully valid puzzle or throws `GenerationError`.
 */

import * as R from './rational.js';
import { getBand } from './difficulty.js';
import { consumesOperand, PRECEDENCE } from './operators.js';
import { evaluate, traceValues, unaryOperatorKeys } from './evaluate.js';

export class GenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GenerationError';
  }
}

const MAX_TARGET_ATTEMPTS = 300;
const MAX_DISTRACTOR_GUARD = 200;

/* ------------------------------------------------------------------ *
 * Random helpers
 * ------------------------------------------------------------------ */

/** Deterministic xorshift32, so tests can pin an exact sequence of puzzles. */
export function makeRng(seed = 20261026) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];

function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Legal-value guards
 * ------------------------------------------------------------------ */

/** An intermediate value must read well and stay inside the band. */
function isAcceptableValue(value, band, { asTarget = false } = {}) {
  if (!R.isRational(value)) return false;
  if (!R.isFiniteValue(value)) return false;
  if (!R.isDisplayNice(value)) return false;
  if (!band.allowFractions && !R.isInteger(value)) return false;
  if (!band.allowNegatives && R.isNegative(value)) return false;
  if (asTarget && band.targetMustBePositive && R.isNegative(value)) return false;
  if (asTarget && !band.allowFractionTargets && !R.isInteger(value)) return false;
  // A running total of zero dishes is not a useful step, and it only ever comes
  // from cancelling a tile against itself.
  if (R.isZero(value)) return false;

  const magnitude = Math.abs(value.n) / value.d;
  if (magnitude > (asTarget ? band.maxAbsIngredient * 2 : band.maxAbsIntermediate)) return false;
  if (!Number.isFinite(magnitude)) return false;
  return true;
}

/**
 * A step that leaves the running value untouched teaches nothing: `+ 0`, `- 0`,
 * `* 1`, `/ 1`, plus `0^2`, `1^2`, `sqrt(0)` and `sqrt(1)`. They also make the
 * puzzle look solvable in ways it is not, so the generator refuses to emit them.
 */
function isDegenerateStep(op, pre, post) {
  if (R.equals(pre, post)) return true;
  if ((op === 'pow' || op === 'sqrt') && (R.isZero(pre) || Math.abs(pre.n) === 1)) return true;
  return false;
}

/** The starting tile must sit in the ingredient range and be non-zero. */
function isAcceptableIngredient(value, band) {
  if (R.isZero(value)) return false;
  if (!R.isDisplayNice(value)) return false;
  if (!band.allowFractions && !R.isInteger(value)) return false;
  if (R.compare(value, R.rat(band.min)) < 0) return false;
  if (R.compare(value, R.rat(band.max)) > 0) return false;
  return true;
}

/* ------------------------------------------------------------------ *
 * Exact roots (for inverting `pow`)
 * ------------------------------------------------------------------ */

function integerRoot(n, exponent) {
  if (!Number.isInteger(n)) return null;
  if (n < 0) {
    if (exponent % 2 === 0) return null;
    const root = integerRoot(-n, exponent);
    return root === null ? null : -root;
  }
  if (n === 0) return 0;
  if (n === 1) return 1;
  for (let cand = Math.ceil(Math.pow(n, 1 / exponent)); cand >= 0; cand -= 1) {
    const power = Math.pow(cand, exponent);
    if (power === n) return cand;
  }
  return null;
}

function exactRoot(value, exponent) {
  const numRoot = integerRoot(value.n, exponent);
  if (numRoot === null) return null;
  const denRoot = integerRoot(value.d, exponent);
  if (denRoot === null || denRoot === 0) return null;
  return R.rat(numRoot, denRoot);
}

/* ------------------------------------------------------------------ *
 * Backward walking with precedence awareness
 * ------------------------------------------------------------------ */

/**
 * Given `op(pre, operand) === value`, recover `pre`.
 */
function invertBinary(op, value, operand) {
  switch (op) {
    case 'add':
      return R.sub(value, operand);
    case 'sub':
      return R.add(value, operand);
    case 'mul':
      return R.isZero(operand) ? null : R.div(value, operand);
    case 'div':
      return R.isZero(operand) ? null : R.mul(value, operand);
    default:
      return null;
  }
}

/**
 * Given `op(pre) === value`, recover `pre` plus the exponent for `pow`.
 */
function invertUnary(op, value) {
  if (op === 'sqrt') {
    if (R.isNegative(value)) return null;
    const pre = R.mul(value, value);
    try {
      return R.equals(R.sqrt(pre), value) ? { value: pre } : null;
    } catch {
      return null;
    }
  }
  if (op === 'pow') return null; // handled by the caller, it needs the exponent
  return null;
}

function invertPow(value, band) {
  for (let exponent = 2; exponent <= band.maxPowExponent; exponent += 1) {
    const pre = exactRoot(value, exponent);
    if (pre === null) continue;
    try {
      if (R.equals(R.pow(pre, exponent), value)) return { value: pre, exponent };
    } catch {
      // keep trying other exponents
    }
  }
  return null;
}

function pickOperand(op, band, rng) {
  if (op === 'div' || op === 'mul') {
    for (let guard = 0; guard < 12; guard += 1) {
      const candidate = pickIngredientValue(band, rng);
      if (!R.isZero(candidate)) return candidate;
    }
    return null;
  }
  return pickIngredientValue(band, rng);
}

function pickIngredientValue(band, rng, { allowZero = false } = {}) {
  // Negative tiles are allowed in Easy but kept rare, so that a puzzle is not
  // made of nothing but minus signs.
  const negativeAllowed = band.allowNegatives && rng() < (band.negativeChance ?? 0.3);
  const min = negativeAllowed ? band.min : Math.max(0, band.min);

  const canUseFraction = band.allowFractions && rng() < (band.fractionChance ?? 0);
  if (canUseFraction) {
    for (let guard = 0; guard < 8; guard += 1) {
      const denominator = randInt(rng, 2, band.maxFractionDenominator);
      const numerator = randInt(rng, 1, denominator * 2);
      let candidate = R.rat(numerator, denominator);
      if (!R.isDisplayNice(candidate)) continue;
      if (Math.abs(candidate.n) / candidate.d > band.maxAbsIngredient) continue;
      if (negativeAllowed) candidate = R.neg(candidate);
      return candidate;
    }
  }
  for (let guard = 0; guard < 12; guard += 1) {
    const candidate = R.rat(randInt(rng, min, band.max));
    if (!allowZero && R.isZero(candidate)) continue;
    return candidate;
  }
  return allowZero ? R.rat(band.max) : R.rat(Math.max(1, band.max));
}

/**
 * A "term" is one number tile plus the unary steps stacked on top of it.
 *
 * `base` is the tile the player picks up, and it is what the recipe step stores,
 * because that is what `collectIngredients` hands to the rack. `value` is what
 * the binary operator on its left actually multiplies or divides by, after the
 * unaries have been applied. Backward peeling has to invert against `value`,
 * or `pre` would be computed from a number no tile can produce.
 */
function pickTerm(band, rng) {
  // A root is written `√N`, so the tile on the rack is N and the number the
  // binary operator sees is the root of it. The candidate is built by picking a
  // base number and squaring it. This goes through `pickIngredientValue` so it
  // respects the band's fraction settings, but the root itself stays a whole
  // number: a square root is meant to land on a count of dishes (PRD 5.1), and
  // `√9/4 = 3/2` is a fraction where the player ordered a portion.
  if (band.unaryOps.includes('sqrt') && rng() < 0.3) {
    for (let guard = 0; guard < 8; guard += 1) {
      const root = randInt(rng, 2, Math.max(2, Math.min(band.maxAbsIngredient, 14)));
      const squared = R.rat(root * root);
      if (!isAcceptableValue(squared, band)) continue;
      if (!isAcceptableIngredient(squared, band)) continue;
      return { base: squared, unaries: [{ op: 'sqrt' }], value: R.rat(root) };
    }
  }

  const base = pickIngredientValue(band, rng);
  if (base === null) return null;

  let value = base;
  const unaries = [];

  if (band.unaryOps.includes('pow') && rng() < 0.3) {
    for (let exponent = 2; exponent <= band.maxPowExponent; exponent += 1) {
      try {
        const powered = R.pow(value, exponent);
        if (isAcceptableValue(powered, band) && !isDegenerateStep('pow', value, powered)) {
          unaries.push({ op: 'pow', exponent });
          value = powered;
          break;
        }
      } catch {
        // exponent past the band, try the next
      }
    }
  }

  return { base, unaries, value };
}

/**
 * Recursively peel one operation off `value`.
 * Returns `{ start, steps, unaryUsed }` or null when this branch is a dead end.
 *
 * `allowLow` controls the operator-precedence restriction:
 *   - true  → we are still in the low-precedence prefix (+, −). The next binary
 *             step may be +, −, ×, or ÷.
 *   - false → we have already placed a × or ÷. The next binary step may only
 *             be × or ÷. This enforces "× and ÷ are never followed by + or −",
 *             which is exactly the rule that makes the backward peel produce
 *             chains that evaluate correctly under precedence.
 *
 * `seen` carries the values the running total has already occupied further down
 * the chain, so a branch that revisits one is dropped. That rules out two kinds
 * of filler: reaching the target early and wandering off again, and pointless
 * round trips such as `3 -> 9 -> 3` (square, then root straight back).
 */
function peel(value, stepsLeft, unaryLeft, minUnaryLeft, allowLow, band, rng, seen) {
  if (stepsLeft === 0) {
    // No binary steps left. But a band that owes a unary needs one placed
    // before the chain is done. The start tile can carry a unary, which is
    // the only way to satisfy `minUnaryLeft` when no more binary steps remain.
    if (minUnaryLeft > 0) {
      for (const op of shuffle(rng, band.unaryOps)) {
        const inverted = op === 'pow' ? invertPow(value, band) : invertUnary(op, value);
        if (!inverted) continue;
        // A root lands on a count of dishes, so its base stays a whole number
        // (PRD 5.1). A power has no such rule: `(3/2)² = 9/4` is fine, and
        // refusing it here was why Hard dealt fewer fraction tiles per card
        // than Medium and broke the mode order.
        if (op === 'sqrt' && !R.isInteger(inverted.value)) continue;
        if (!isAcceptableIngredient(inverted.value, band)) continue;
        if (!isAcceptableValue(inverted.value, band)) continue;
        if (isDegenerateStep(op, inverted.value, value)) continue;
        const step = op === 'pow' ? { op, exponent: inverted.exponent } : { op };
        return { start: inverted.value, steps: [step], unaryUsed: 1 };
      }
      return null;
    }
    return isAcceptableIngredient(value, band) ? { start: value, steps: [], unaryUsed: 0 } : null;
  }

  // Binary operators.
  const availableBinary = allowLow
    ? band.binaryOps
    : band.binaryOps.filter((op) => PRECEDENCE[op] > 1);

  for (const op of shuffle(rng, availableBinary)) {
    const term = pickTerm(band, rng);
    if (!term) continue;
    // A result equal to its own right operand means the left side is a
    // multiplicative identity: `1 × 8` is 8, so the step teaches nothing.
    if (R.equals(value, term.value)) continue;
    const pre = invertBinary(op, value, term.value);
    if (pre === null) continue;
    if (!isAcceptableValue(pre, band)) continue;
    if (isDegenerateStep(op, pre, value)) continue;
    if (seen.has(R.toKey(pre))) continue;

    const inner = peel(
      pre,
      stepsLeft - 1,
      unaryLeft,
      Math.max(0, minUnaryLeft - term.unaries.length),
      PRECEDENCE[op] > 1 ? false : allowLow,
      band,
      rng,
      withSeen(seen, pre),
    );
    if (!inner) continue;

    // The recipe stores the base tile and lets the unaries ride on top of it, so
    // the rack carries a number the player can actually pick up. The binary
    // operator on its left sees `term.value`, which is why the inversion above
    // used that and not `term.base`.
    const fullSteps = [
      ...inner.steps,
      { op, operand: term.base },
      ...term.unaries,
    ];

    return { start: inner.start, steps: fullSteps, unaryUsed: inner.unaryUsed + term.unaries.length };
  }

  return null;
}

/** Sibling branches must not see each other's history, so the set is copied. */
function withSeen(seen, value) {
  const next = new Set(seen);
  next.add(R.toKey(value));
  return next;
}

/* ------------------------------------------------------------------ *
 * Target selection
 * ------------------------------------------------------------------ */

function pickTarget(band, rng) {
  if (band.preferUnary && band.unaryOps.length > 0 && rng() < 0.6) {
    // Bias towards perfect squares so a root can be peeled off cleanly.
    const rootLimit = Math.max(2, Math.min(band.maxAbsIngredient, 12));
    const root = randInt(rng, 2, rootLimit);
    const candidate = R.rat(root * root);
    if (isAcceptableValue(candidate, band, { asTarget: true })) return candidate;
  }

  for (let guard = 0; guard < 24; guard += 1) {
    const candidate = pickIngredientValue(band, rng, { allowZero: false });
    if (isAcceptableValue(candidate, band, { asTarget: true })) return candidate;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

/**
 * Re-run the chain the way a player would and confirm every rule still holds.
 * This is the belt to `peel`'s braces: if a future change loosens a guard in
 * `peel`, this is what catches it before a broken puzzle reaches a player.
 *
 * Every check goes through `evaluate` rather than a hand-rolled accumulator.
 * Under precedence there is no single running total to walk: `2 + 3 × 4` goes
 * through 12 before it goes through 14, and a value that is legal mid-chain can
 * be illegal as a final answer. The one thing a local walk still buys is
 * catching a bad intermediate, so the trace is checked term by term.
 */
function verifyChain(recipeObj, band, target) {
  if (!isAcceptableIngredient(recipeObj.start, band)) return false;
  if (recipeObj.steps.length === 0) return false;

  let reached;
  let values;
  try {
    reached = evaluate(recipeObj, { maxPowExponent: band.maxPowExponent });
    values = traceValues(recipeObj, { maxPowExponent: band.maxPowExponent });
  } catch {
    return false;
  }

  if (!R.equals(reached, target)) return false;

  // Every value the chain passes through has to be one the player could legally
  // read off the plate. `trace` repeats the start value and ends on the target,
  // so the last entry is the answer and the first is where it started.
  for (const value of values.slice(1, -1)) {
    // Landing on the target before the final step would make the rest of the
    // chain a detour the player could skip.
    if (R.equals(value, target)) return false;
    if (!isAcceptableValue(value, band)) return false;
  }

  return true;
}

/* ------------------------------------------------------------------ *
 * Distractors
 * ------------------------------------------------------------------ */

function addDistractors(leaves, target, band, rng) {
  const realCount = leaves.length;
  let total = realCount + Math.round(realCount * band.distractorRatio);
  total = Math.max(total, band.ingredientMin);
  total = Math.min(total, Math.max(band.ingredientMax, realCount));

  const wanted = Math.max(0, total - realCount);
  const used = new Set(leaves.map(R.toKey));
  const distractors = [];

  let guard = 0;
  while (distractors.length < wanted && guard < MAX_DISTRACTOR_GUARD) {
    guard += 1;
    const candidate = pickIngredientValue(band, rng, { allowZero: true });
    const key = R.toKey(candidate);
    if (used.has(key)) continue;
    if (R.equals(candidate, target)) continue;
    used.add(key);
    distractors.push(candidate);
  }
  return distractors;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Build one puzzle.
 *
 * @param {string} mode 'easy' | 'medium' | 'hard'
 * @param {number} level 1..5
 * @param {{rng?: () => number, maxTargetAttempts?: number}} [options]
 * @returns {{
 *   target: {n:number,d:number},
 *   ingredients: Array<{n:number,d:number}>,
 *   secretRecipe: { start: {n:number,d:number}, steps: Array<object> },
 *   meta: {
 *     mode: string, level: number, steps: number,
 *     unarySteps: number, realIngredientCount: number,
 *     distractorCount: number, targetDisplay: string, solutionDisplay: string
 *   }
 * }}
 */
export function generatePuzzle(mode, level, options = {}) {
  const rng = options.rng ?? Math.random;
  const maxTargetAttempts = options.maxTargetAttempts ?? MAX_TARGET_ATTEMPTS;
  const band = getBand(mode, level);

  const stepSpan = band.stepMax - band.stepMin + 1;
  const minUnarySteps = Math.min(band.minUnarySteps, Math.max(0, band.stepMin - 1));

  for (let attempt = 0; attempt < maxTargetAttempts; attempt += 1) {
    const target = pickTarget(band, rng);
    if (target === null) continue;

    const stepCount = band.stepMin + randInt(rng, 0, stepSpan - 1);
    const unaryBudget = Math.min(band.unaryOps.length, Math.max(0, stepCount - 1));

    const built = peel(
      target,
      stepCount,
      unaryBudget,
      Math.min(minUnarySteps, unaryBudget),
      true, // start in low-precedence zone
      band,
      rng,
      new Set([R.toKey(target)]),
    );
    if (!built) continue;
    if (built.unaryUsed < minUnarySteps) continue;

    const recipeObj = { start: built.start, steps: built.steps };
    if (!verifyChain(recipeObj, band, target)) {
      continue;
    }

    const realIngredients = collectIngredients(recipeObj);
    if (realIngredients.length < 2) continue;
    if (realIngredients.some((value) => R.equals(value, target))) continue;

    const distractors = addDistractors(realIngredients, target, band, rng);
    const ingredients = shuffle(rng, [...realIngredients, ...distractors]);

    return {
      target,
      ingredients,
      secretRecipe: recipeObj,
      meta: {
        mode,
        level,
        steps: recipeObj.steps.length,
        unarySteps: unaryOperatorKeys(recipeObj).length,
        realIngredientCount: realIngredients.length,
        distractorCount: distractors.length,
        targetDisplay: R.toDisplayString(target),
        solutionDisplay: displaySolution(recipeObj),
      },
    };
  }

  throw new GenerationError(
    `could not generate a solvable puzzle for ${mode} level ${level} after ${maxTargetAttempts} attempts`,
  );
}

/**
 * The tiles a recipe actually needs, in the order the chain consumes them.
 *
 * Under precedence, a term is one tile (the base) plus its unaries. The rack
 * only ever shows the base numbers, because the unaries are separate tiles
 * the player applies. So `collectIngredients` returns the bases, not the
 * post-unary values.
 */
export function collectIngredients(recipeObj) {
  const out = [recipeObj.start];
  for (const step of recipeObj.steps) {
    if (consumesOperand(step.op)) out.push(step.operand);
  }
  return out;
}

/** Human readable solution, matching the new format (postfix unary). */
export function displaySolution(recipeObj) {
  let text = R.toFractionString(recipeObj.start);
  for (const step of recipeObj.steps) {
    if (consumesOperand(step.op)) {
      const symbol = { add: '+', sub: '-', mul: '*', div: '/' }[step.op];
      text = `${text} ${symbol} ${R.toFractionString(step.operand)}`;
    } else if (step.op === 'pow') {
      text = `${text}^${step.exponent ?? 2}`;
    } else {
      text = `\u221a${text}`;
    }
  }
  return text;
}

/**
 * Sanity helper used by tests and the inspector: does the secret recipe really
 * reach the target, and is the whole chain within the band?
 */
export function assertPuzzleSolvable(puzzle, band) {
  const result = evaluate(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
  if (!R.equals(result, puzzle.target)) {
    throw new GenerationError(
      `recipe evaluates to ${R.format(result)} but target is ${R.format(puzzle.target)}`,
    );
  }
  const values = traceValues(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
  for (const value of values) {
    if (!R.isFiniteValue(value) || !Number.isFinite(value.n) || !Number.isFinite(value.d)) {
      throw new GenerationError(`non-finite value ${JSON.stringify(value)} in chain`);
    }
  }
  return true;
}

export const GENERATOR = {
  generatePuzzle,
  collectIngredients,
  displaySolution,
  assertPuzzleSolvable,
  makeRng,
  GenerationError,
};