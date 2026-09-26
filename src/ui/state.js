/**
 * Game state for one run: mode, level, order index, lives, score, timer, and
 * the player's current expression.
 *
 * The state object is plain data. All DOM work lives in view.js, and all
 * puzzle math is delegated to src/core. Nothing here computes arithmetic.
 */

import { generatePuzzle, generateLevel } from '../core/generator.js';
import { getBand, ordersForLevel, LEVELS_PER_MODE, LIVES_PER_LEVEL, TIMER_SECONDS } from '../core/difficulty.js';
import { evaluate, ingredientCount } from '../core/evaluate.js';
import { consumesOperand } from '../core/operators.js';
import * as R from '../core/rational.js';

/** Base points per order, by mode. */
export const SCORE_BASE = { easy: 10, medium: 15, hard: 20 };
export const SPEED_BONUS_RATIO = 0.5;
export const PENALTY_TIMEOUT = 10;
export const PENALTY_WRONG = 5;

export const PHASES = {
  IDLE: 'idle',
  PLAYING: 'playing',
  SERVED: 'served',
  LEVEL_DONE: 'levelDone',
  GAME_OVER: 'gameOver',
};

export function createState(mode, level, options = {}) {
  if (!Number.isInteger(level) || level < 1 || level > LEVELS_PER_MODE) {
    throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  }
  const band = getBand(mode, level);
  const levelOrders = generateLevel(mode, level, options);
  const total = levelOrders.puzzles.length;
  const orderIndex = 0;
  const puzzle = levelOrders.puzzles[orderIndex];

  return {
    mode,
    level,
    band,
    phase: PHASES.PLAYING,
    lives: LIVES_PER_LEVEL,
    score: 0,
    levelScore: 0,
    timeTotal: TIMER_SECONDS[mode] ?? 30,
    timeLeft: TIMER_SECONDS[mode] ?? 30,
    totalOrders: total,
    orderIndex,
    ordersCompleted: 0,
    puzzle,
    expression: [],
    customerIndex: 0,
    lastResult: null,
  };
}

/* ------------------------------------------------------------------ *
 * Expression building
 * ------------------------------------------------------------------ */

function isUnaryStep(step) {
  return !consumesOperand(step.op);
}

/** Tiles the player has used up so far, as "n/d" keys. */
function usedKeys(expression) {
  return expression
    .filter((item) => item.kind === 'number')
    .map((item) => R.toKey(item.value));
}

/**
 * What the player should be able to drop next. The UI uses this to grey out
 * tiles and to show the right hint.
 *
 * - empty        -> a value has to come first
 * - after value  -> an operator, either binary or unary
 * - after unary  -> an operator too, because a unary consumes the value it acts
 *                  on and leaves the chain open
 * - after binary -> the operand it is waiting for
 *
 * @returns {'number'|'operator'}
 */
export function expectedKind(state) {
  const expression = state.expression;
  if (expression.length === 0) return 'number';
  const last = expression[expression.length - 1];
  return last.kind === 'operator' ? 'number' : 'operator';
}

/** Unary operators are only legal right after a value, never after an operator. */
export function canAccept(state, kind) {
  const expected = expectedKind(state);
  if (kind === 'number') return expected === 'number';
  if (kind === 'operator') return expected === 'operator';
  if (kind === 'unary') {
    if (state.expression.length === 0) return false;
    return state.expression[state.expression.length - 1].kind === 'number';
  }
  return false;
}

/**
 * Append a tile and return the resulting message.
 * @param {object} state
 * @param {{kind:'number'|'operator'|'unary', value?:object, op?:string, exponent?:number}} item
 * @returns {{ok: boolean, reason?: string, reachedTarget?: boolean}}
 */
export function pushTile(state, item) {
  if (!canAccept(state, item.kind)) {
    return { ok: false, reason: 'work.badStep' };
  }

  if (item.kind === 'number') {
    const key = R.toKey(item.value);
    const available = state.puzzle.ingredients.filter((v) => R.toKey(v) === key).length;
    const used = usedKeys(state.expression).filter((k) => k === key).length;
    if (used >= available) return { ok: false, reason: 'work.badStep' };

    state.expression.push({ kind: 'number', value: item.value });
    return { ok: true, reachedTarget: expressionReachesTarget(state) };
  }

  if (item.kind === 'operator') {
    // Guard against dividing by zero before the player commits to the step.
    if (item.op === 'div') {
      const last = state.expression[state.expression.length - 1];
      if (last.kind === 'number' && R.isZero(last.value)) {
        return { ok: false, reason: 'work.invalidDivision' };
      }
    }
    state.expression.push({ kind: 'operator', op: item.op });
    return { ok: true };
  }

  if (item.kind === 'unary') {
    const last = state.expression[state.expression.length - 1];
    if (last.kind !== 'number') return { ok: false, reason: 'work.unaryFirst' };

    const probe = { start: last.value, steps: [{ op: item.op, exponent: item.exponent }] };
    try {
      evaluate(probe, { maxPowExponent: state.band.maxPowExponent });
    } catch (error) {
      if (error instanceof R.NotPerfectSquareError) return { ok: false, reason: 'work.invalidRoot' };
      if (error instanceof R.NotIntegerError) return { ok: false, reason: 'work.invalidExponent' };
      return { ok: false, reason: 'work.badStep' };
    }

    state.expression.push({ kind: 'unary', op: item.op, exponent: item.exponent });
    return { ok: true, reachedTarget: expressionReachesTarget(state) };
  }

  return { ok: false, reason: 'work.badStep' };
}

/** Does the expression so far already equal the target? */
export function expressionReachesTarget(state) {
  if (!isPlayable(state)) return false;
  return isExpressionValid(state);
}

function isExpressionValid(state) {
  try {
    const value = evaluate(expressionToRecipe(state.expression), {
      maxPowExponent: state.band.maxPowExponent,
    });
    return R.equals(value, state.puzzle.target);
  } catch {
    return false;
  }
}

/** Current running total, or null when the expression is still incomplete. */
export function runningTotal(state) {
  if (!isPlayable(state)) return null;
  try {
    return evaluate(expressionToRecipe(state.expression), {
      maxPowExponent: state.band.maxPowExponent,
    });
  } catch {
    return null;
  }
}

/** Can the player hit Serve right now? */
export function isServable(state) {
  if (!isPlayable(state)) return false;
  if (state.expression.length < 3) return false;
  return isExpressionValid(state);
}

function isPlayable(state) {
  if (state.expression.length === 0) return false;
  if (state.expression[0].kind !== 'number') return false;
  for (let i = 1; i < state.expression.length; i += 1) {
    const item = state.expression[i];
    if (item.kind === 'number' && state.expression[i - 1].kind !== 'operator' && state.expression[i - 1].kind !== 'unary') {
      return false;
    }
    if (item.kind === 'operator' && state.expression[i - 1].kind !== 'number') return false;
    if (item.kind === 'unary' && state.expression[i - 1].kind !== 'number') return false;
  }
  // A trailing operator or unary means the chain is still open.
  const last = state.expression[state.expression.length - 1];
  return last.kind === 'number';
}

/** Flatten the UI expression into the core's chain shape. */
export function expressionToRecipe(expression) {
  if (expression.length === 0) throw new R.RationalError('empty expression');
  const recipe = { start: expression[0].value, steps: [] };

  for (let i = 1; i < expression.length; i += 1) {
    const item = expression[i];
    if (item.kind === 'operator') {
      const operand = expression[i + 1];
      if (!operand || operand.kind !== 'number') break;
      recipe.steps.push({ op: item.op, operand: operand.value });
      i += 1;
    } else if (item.kind === 'unary') {
      recipe.steps.push(item.exponent === undefined ? { op: item.op } : { op: item.op, exponent: item.exponent });
    }
  }
  return recipe;
}

/* ------------------------------------------------------------------ *
 * Undo and clear
 * ------------------------------------------------------------------ */

export function undo(state) {
  if (state.expression.length === 0) return false;
  state.expression.pop();
  while (state.expression.length > 0) {
    const last = state.expression[state.expression.length - 1];
    if (last.kind === 'operator' || last.kind === 'unary') state.expression.pop();
    else break;
  }
  return true;
}

export function clearExpression(state) {
  if (state.expression.length === 0) return false;
  state.expression = [];
  return true;
}

/* ------------------------------------------------------------------ *
 * Scoring and outcomes
 * ------------------------------------------------------------------ */

export function pointsForOrder(state) {
  const base = SCORE_BASE[state.mode] ?? 10;
  const ratio = state.timeTotal > 0 ? state.timeLeft / state.timeTotal : 0;
  const bonus = Math.floor(base * Math.max(0, Math.min(1, ratio)) * SPEED_BONUS_RATIO);
  return base + bonus;
}

export function applySuccess(state) {
  const points = pointsForOrder(state);
  state.score += points;
  state.levelScore += points;
  state.ordersCompleted += 1;
  state.phase = PHASES.SERVED;
  state.lastResult = { kind: 'success', points, seconds: Math.round(state.timeTotal - state.timeLeft) };
  return state.lastResult;
}

export function applyTimeout(state) {
  state.score = Math.max(0, state.score - PENALTY_TIMEOUT);
  state.levelScore = Math.max(0, state.levelScore - PENALTY_TIMEOUT);
  state.lives -= 1;
  state.lastResult = { kind: 'timeout', penalty: PENALTY_TIMEOUT };
  state.phase = state.lives > 0 ? PHASES.PLAYING : PHASES.GAME_OVER;
  return state.lastResult;
}

export function applyWrong(state) {
  state.score = Math.max(0, state.score - PENALTY_WRONG);
  state.levelScore = Math.max(0, state.levelScore - PENALTY_WRONG);
  state.lives -= 1;
  state.lastResult = { kind: 'wrong', penalty: PENALTY_WRONG };
  state.phase = state.lives > 0 ? PHASES.PLAYING : PHASES.GAME_OVER;
  return state.lastResult;
}

/* ------------------------------------------------------------------ *
 * Order progression
 * ------------------------------------------------------------------ */

export function isLastOrder(state) {
  return state.orderIndex >= state.totalOrders - 1;
}

/** Move to the next order, or finish the level. */
export function advanceOrder(state, options = {}) {
  if (isLastOrder(state)) {
    state.phase = PHASES.LEVEL_DONE;
    return PHASES.LEVEL_DONE;
  }
  state.orderIndex += 1;
  state.customerIndex += 1;
  state.puzzle = generatePuzzle(state.mode, state.level, options);
  state.expression = [];
  state.timeLeft = state.timeTotal;
  state.phase = PHASES.PLAYING;
  return PHASES.PLAYING;
}

/** Retry the same level with lives restored and a fresh order list. */
export function resetLevel(state, options = {}) {
  const fresh = createState(state.mode, state.level, options);
  state.band = fresh.band;
  state.phase = PHASES.PLAYING;
  state.lives = LIVES_PER_LEVEL;
  state.levelScore = 0;
  state.timeLeft = state.timeTotal;
  state.totalOrders = fresh.totalOrders;
  state.orderIndex = 0;
  state.puzzle = fresh.puzzle;
  state.expression = [];
  return state;
}

export function tick(state, seconds = 1) {
  if (state.phase !== PHASES.PLAYING) return state.phase;
  state.timeLeft = Math.max(0, state.timeLeft - seconds);
  if (state.timeLeft <= 0) {
    applyTimeout(state);
  }
  return state.phase;
}

export const STATE = {
  createState,
  pushTile,
  undo,
  clearExpression,
  tick,
  advanceOrder,
  resetLevel,
  applySuccess,
  applyTimeout,
  applyWrong,
  pointsForOrder,
  runningTotal,
  isServable,
  isLastOrder,
  expectedKind,
  canAccept,
  expressionToRecipe,
  expressionReachesTarget,
  PHASES,
  SCORE_BASE,
  SPEED_BONUS_RATIO,
  PENALTY_TIMEOUT,
  PENALTY_WRONG,
  ordersForLevel,
  ingredientCount,
};
