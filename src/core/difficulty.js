/**
 * Difficulty configuration for the three modes (PRD section 5.1 / 5.7).
 *
 * Each mode has five levels. Per PRD 5.7 complexity rises *between* modes while
 * levels only add more orders, so a level narrows or widens the number range
 * slightly and never introduces a new operator.
 */

import { rat } from './rational.js';

/** Orders per level, shared by all three modes (2 / 3 / 4 / 4 / 5). */
export const ORDERS_PER_LEVEL = Object.freeze([2, 3, 4, 4, 5]);

export const LEVELS_PER_MODE = ORDERS_PER_LEVEL.length;

export const MODES = Object.freeze({
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
});

export const MODE_LIST = Object.freeze([MODES.easy, MODES.medium, MODES.hard]);

/**
 * A band describes the numeric envelope the generator may work inside.
 * @typedef {{
 *   min: number, max: number,
 *   stepMin: number, stepMax: number,
 *   ingredientMin: number, ingredientMax: number,
 *   allowNegatives: boolean,
 *   allowFractions: boolean,
 *   binaryOps: string[],
 *   unaryOps: string[],
 *   maxPowExponent: number,
 *   maxAbsIntermediate: number
 * }} Band
 */

const BASE = {
  allowFractions: false,
  allowNegatives: false,
  unaryOps: [],
  minUnarySteps: 0,
  maxPowExponent: 3,
  maxAbsIntermediate: 200,
  /**
   * A customer orders a number of dishes, so the target is always positive even
   * when the arithmetic runs through negatives. Keeping `allowNegatives` for
   * the ingredients and intermediates is what satisfies PRD 5.1.
   */
  targetMustBePositive: true,
  /**
   * Targets stay whole ("order 8 dishes"). Fraction practice still happens
   * through the tiles and the running total, and asking for 0.333 dishes makes
   * the restaurant metaphor fall apart. Flip this to true if the team decides
   * that fraction targets are worth the awkwardness.
   */
  allowFractionTargets: false,
};

/**
 * Level multipliers nudge the number range: level 1 plays in a narrower band so
 * early levels feel calm, level 5 opens up a little.
 */
const LEVEL_SPREAD = [0, 1, 2, 3, 4];

function band(level, overrides) {
  const spread = LEVEL_SPREAD[level - 1];
  const base = overrides;
  const maxAbsIngredient = base.maxAbsIngredient + spread * base.spreadStep;
  return Object.freeze({
    ...BASE,
    ...base,
    maxAbsIngredient,
    min: base.allowNegatives ? -maxAbsIngredient : 0,
    max: maxAbsIngredient,
  });
}

/**
 * Easy, grade 7: integers including negatives, binary operators only.
 * Level 1 starts at 0-6 so a 12 year old can find the answer almost immediately.
 */
const EASY = Object.freeze({
  binaryOps: Object.freeze(['add', 'sub', 'mul', 'div']),
  maxAbsIngredient: 6,
  spreadStep: 2,
  stepMin: 2,
  stepMax: 2,
  ingredientMin: 3,
  ingredientMax: 4,
  distractorRatio: 0.4,
  allowNegatives: true,
  /** Negatives are practised, not the whole diet: mostly positive tiles. */
  negativeChance: 0.3,
});

/** Medium, grade 8: fractions and decimals enter the mix, exponent optional. */
const MEDIUM = Object.freeze({
  binaryOps: Object.freeze(['add', 'sub', 'mul', 'div']),
  unaryOps: Object.freeze(['pow']),
  maxAbsIngredient: 9,
  spreadStep: 3,
  stepMin: 2,
  stepMax: 3,
  ingredientMin: 4,
  ingredientMax: 5,
  distractorRatio: 0.5,
  allowNegatives: false,
  allowFractions: true,
  maxPowExponent: 2,
  fractionChance: 0.4,
  maxFractionDenominator: 4,
});

/** Hard, grade 9: powers and square roots, longer chains. */
const HARD = Object.freeze({
  binaryOps: Object.freeze(['add', 'sub', 'mul', 'div']),
  unaryOps: Object.freeze(['pow', 'sqrt']),
  maxAbsIngredient: 12,
  spreadStep: 3,
  stepMin: 3,
  stepMax: 4,
  ingredientMin: 5,
  ingredientMax: 6,
  distractorRatio: 0.5,
  allowNegatives: false,
  allowFractions: true,
  maxPowExponent: 3,
  fractionChance: 0.3,
  maxFractionDenominator: 4,
  /** Hard must genuinely practise roots and powers, not just big numbers. */
  minUnarySteps: 1,
  /**
   * Hard targets are usually the output of a square root, so the target pool is
   * biased towards perfect squares and cubes that a unary operator can invert.
   */
  preferUnary: true,
});

const BAND_FACTORIES = {
  [MODES.easy]: EASY,
  [MODES.medium]: MEDIUM,
  [MODES.hard]: HARD,
};

export function isValidMode(mode) {
  return Object.hasOwn(BAND_FACTORIES, mode);
}

export function isValidLevel(level) {
  return Number.isInteger(level) && level >= 1 && level <= LEVELS_PER_MODE;
}

/**
 * Resolve the configuration band for a mode/level pair.
 * @param {string} mode 'easy' | 'medium' | 'hard'
 * @param {number} level 1..5
 */
export function getBand(mode, level) {
  if (!isValidMode(mode)) throw new Error(`unknown mode: ${mode}`);
  if (!isValidLevel(level)) throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  return band(level, BAND_FACTORIES[mode]);
}

/** How many orders a level contains. */
export function ordersForLevel(level) {
  if (!isValidLevel(level)) throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  return ORDERS_PER_LEVEL[level - 1];
}

/** Timer draft per mode, in seconds. To be calibrated during playtesting (PRD 5.5). */
export const TIMER_SECONDS = Object.freeze({
  [MODES.easy]: 60,
  [MODES.medium]: 45,
  [MODES.hard]: 35,
});

export const LIVES_PER_LEVEL = 3;

export const DIFFICULTY = {
  MODES,
  MODE_LIST,
  LEVELS_PER_MODE,
  ORDERS_PER_LEVEL,
  TIMER_SECONDS,
  LIVES_PER_LEVEL,
  getBand,
  ordersForLevel,
  isValidMode,
  isValidLevel,
  rat,
};
