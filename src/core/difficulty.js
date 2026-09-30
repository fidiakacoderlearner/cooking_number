/**
 * Difficulty configuration for the three modes (PRD section 5.1 / 5.5 / 5.7).
 *
 * Each mode has five levels. A level is described by three dials that all turn
 * in the same direction as the level number:
 *
 *   1. the roster, how many customers the level owes you,
 *   2. the spawner and the patience of each customer (PRD 5.5),
 *   3. the operator ladder, which narrows the arithmetic the player may use
 *      (PRD 5.1).
 *
 * Nothing in here is a final number. Every value below is a starting point for
 * playtesting on a real phone, and changing one must never require touching
 * gameplay logic.
 */

/** Customers owed per level, shared by all three modes. */
export const CUSTOMERS_PER_LEVEL = Object.freeze([4, 5, 6, 7, 8]);

export const LEVELS_PER_MODE = CUSTOMERS_PER_LEVEL.length;

export const MODES = Object.freeze({
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
});

export const MODE_LIST = Object.freeze([MODES.easy, MODES.medium, MODES.hard]);

/**
 * How many customers may wait at the stand at once (PRD 5.5).
 *
 * When every slot is taken the spawner simply stops and resumes when one frees
 * up. A customer that never got to walk in is *not* a walkout: that would
 * punish the player for something they did not do.
 *
 * Three, not four: at a 320px viewport a fourth chip needs a total of 414px, so
 * it sat outside the screen and had to be scrolled to. Measured in a phone
 * playtest, three chips already read as crowded.
 */
export const MAX_ON_SCREEN = 3;

/**
 * The spawner must never feel like a metronome (PRD 5.5), and it must never
 * fall so far below its base interval that a level becomes impossible.
 */
export const ARRIVAL_JITTER = 0.12;
export const ARRIVAL_DECAY = 0.025;
export const ARRIVAL_FLOOR = 0.6;

/**
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

/**
 * The operator ladder (PRD 5.1). Restricting the operators also restricts the
 * arithmetic the generator may use, which is why every entry here has to stay
 * solvable. The generator and the UI both read this list, so the puzzle and the
 * tiles on screen can never drift apart.
 */
const OPERATOR_LADDER = Object.freeze({
  [MODES.easy]: Object.freeze([
    Object.freeze(['add', 'sub']),
    Object.freeze(['add', 'sub', 'mul']),
    Object.freeze(['add', 'sub', 'mul']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
  ]),
  [MODES.medium]: Object.freeze([
    Object.freeze(['add', 'sub', 'mul']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
  ]),
  [MODES.hard]: Object.freeze([
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
    Object.freeze(['add', 'sub', 'mul', 'div']),
  ]),
});

/**
 * Unary operators join the ladder level by level, separately from the binary
 * set, because "squares exist" is a different idea from "division exists".
 */
const UNARY_LADDER = Object.freeze({
  [MODES.easy]: Object.freeze([
    Object.freeze([]),
    Object.freeze([]),
    Object.freeze([]),
    Object.freeze([]),
    Object.freeze([]),
  ]),
  [MODES.medium]: Object.freeze([
    Object.freeze([]),
    Object.freeze([]),
    Object.freeze([]),
    Object.freeze(['pow']),
    Object.freeze(['pow']),
  ]),
  [MODES.hard]: Object.freeze([
    Object.freeze(['pow']),
    Object.freeze(['pow']),
    Object.freeze(['pow', 'sqrt']),
    Object.freeze(['pow', 'sqrt']),
    Object.freeze(['pow', 'sqrt']),
  ]),
});

/** Base seconds between arrivals, per mode, per level (PRD 5.5). */
const ARRIVAL_SECONDS = Object.freeze({
  [MODES.easy]: Object.freeze([10, 10, 9, 9, 8]),
  [MODES.medium]: Object.freeze([12, 11, 10, 10, 9]),
  [MODES.hard]: Object.freeze([10, 9, 9, 8, 8]),
});

/**
 * Patience in seconds per customer, per mode, per level (PRD 5.5). This is how
 * long one customer waits, not how long the whole level lasts.
 *
 * These went up by 10% after the second playtest, which reported finishing with
 * the patience bar already red on Medium — the budget worked out in PLAYTEST
 * section 7, about 12s per dish at Medium level 5, was not enough for someone
 * who already has to work the arithmetic out. The arrival interval was lowered
 * in the third pass to make Easy levels feel less empty at the start, while the
 * time budget per dish is still the primary dial for difficulty ordering.
 */
const PATIENCE_SECONDS = Object.freeze({
  [MODES.easy]: Object.freeze([55, 53, 51, 48, 46]),
  [MODES.medium]: Object.freeze([48, 46, 44, 41, 37]),
  [MODES.hard]: Object.freeze([42, 40, 36, 33, 31]),
});

/**
 * Easy, grade 7: integers including negatives, binary operators only.
 * Level 1 starts at 0-6 so a 12 year old can find the answer almost immediately.
 */
const EASY = Object.freeze({
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
  /**
   * How often a sampled ingredient is a fraction.
   *
   * This was 0.4, which made Medium carry more fractions per tile than Hard
   * carries, so the mode mapped to grade 8 turned out harder than the mode
   * mapped to grade 9. A playtest put that in plain words: fractions were
   * overwhelming, Medium level 5 was only half finished, and the top of Medium
   * felt harder than the bottom of Hard. It now sits below Hard's 0.3 so the
   * mode order holds on the material as well as on the operators.
   */
  fractionChance: 0.26,
  maxFractionDenominator: 4,
});

/** Hard, grade 9: powers and square roots, longer chains. */
const HARD = Object.freeze({
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
  fractionChance: 0.45,
  maxFractionDenominator: 4,
  /**
   * Hard must genuinely practise roots and powers, not just big numbers, so
   * once a level unlocks them it insists on using at least one.
   */
  requireUnarySteps: true,
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

function band(level, mode) {
  const base = BAND_FACTORIES[mode];
  const spread = LEVEL_SPREAD[level - 1];
  const maxAbsIngredient = base.maxAbsIngredient + spread * base.spreadStep;
  const unaryOps = UNARY_LADDER[mode][level - 1];

  return Object.freeze({
    ...BASE,
    ...base,
    binaryOps: OPERATOR_LADDER[mode][level - 1],
    unaryOps,
    // Only insist on a unary step once the ladder has actually unlocked one.
    minUnarySteps: base.requireUnarySteps && unaryOps.length > 0 ? 1 : 0,
    maxAbsIngredient,
    min: base.allowNegatives ? -maxAbsIngredient : 0,
    max: maxAbsIngredient,
  });
}

/**
 * Resolve the configuration band for a mode/level pair.
 * @param {string} mode 'easy' | 'medium' | 'hard'
 * @param {number} level 1..5
 */
export function getBand(mode, level) {
  if (!isValidMode(mode)) throw new Error(`unknown mode: ${mode}`);
  if (!isValidLevel(level)) throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  return band(level, mode);
}

/** How many customers a level owes the player. */
export function customersForLevel(level) {
  if (!isValidLevel(level)) throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  return CUSTOMERS_PER_LEVEL[level - 1];
}

/** Base seconds between arrivals, before jitter and decay (PRD 5.5). */
export function baseArrivalSeconds(mode, level) {
  if (!isValidMode(mode)) throw new Error(`unknown mode: ${mode}`);
  if (!isValidLevel(level)) throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  return ARRIVAL_SECONDS[mode][level - 1];
}

/** How long a single customer waits before walking out (PRD 5.5). */
export function patienceSeconds(mode, level) {
  if (!isValidMode(mode)) throw new Error(`unknown mode: ${mode}`);
  if (!isValidLevel(level)) throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  return PATIENCE_SECONDS[mode][level - 1];
}

/**
 * Seconds to wait before the customer with the given index walks in.
 *
 * The first customer arrives right away, so `index` 0 is the gap *after* them.
 * Each later customer is both a little faster than the one before (decay) and a
 * little unpredictable (jitter), because a fixed interval feels like a clock
 * rather than a queue of hungry people.
 *
 * @param {string} mode
 * @param {number} level
 * @param {number} index 0 for the gap after the first customer
 * @param {() => number} [rng]
 */
export function arrivalGapSeconds(mode, level, index, rng = Math.random) {
  const base = baseArrivalSeconds(mode, level);
  const decayed = base * Math.max(0, 1 - ARRIVAL_DECAY * index);
  const jittered = decayed * (1 + ARRIVAL_JITTER * (rng() * 2 - 1));
  return Math.max(base * ARRIVAL_FLOOR, jittered);
}

/** The smallest gap this configuration can ever produce, for the quality gate. */
export function minArrivalGapSeconds(mode, level) {
  const base = baseArrivalSeconds(mode, level);
  const worst = base * Math.max(0, 1 - ARRIVAL_DECAY * LEVELS_PER_MODE) * (1 - ARRIVAL_JITTER);
  return Math.max(base * ARRIVAL_FLOOR, worst);
}

/**
 * How many seconds of work a level actually gives the player, per customer.
 *
 * The last customer to arrive is at `roster - 1` gaps, and they then stay for
 * their own patience, so the level offers that much time divided among everyone
 * in it. This is the number a player feels, and it is the number to compare when
 * asking whether one mode is harder than another.
 *
 * The arrival interval on its own cannot answer that question. It is only half
 * the arithmetic: a mode can bring customers in faster and still be easier if
 * they each wait longer, which is exactly the case for Easy once its interval
 * dropped below Medium's. Comparing the two intervals said Easy was the hardest
 * mode at a given level, which is backwards. PLAYTEST.md section 7 works the
 * budget out by hand; this is the same figure, computed once, here, so the test
 * gate and the tuning document cannot drift apart.
 *
 * Jitter and decay are averaged out rather than sampled, because a budget taken
 * from one lucky or unlucky run of the random number generator is not a property
 * of the configuration.
 */
export function timeBudgetSeconds(mode, level) {
  if (!isValidMode(mode)) throw new Error(`unknown mode: ${mode}`);
  if (!isValidLevel(level)) throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);

  const base = baseArrivalSeconds(mode, level);
  const roster = customersForLevel(level);
  // The first customer is already there, so only the gaps after it are counted.
  const gaps = roster - 1;
  let arrivalSeconds = 0;
  for (let index = 0; index < gaps; index += 1) {
    arrivalSeconds += base * Math.max(0, 1 - ARRIVAL_DECAY * index);
  }
  return (arrivalSeconds + patienceSeconds(mode, level)) / roster;
}
