/**
 * Game state for one level: the customers that are waiting, the customer being
 * cooked right now, and the single dish on the stand.
 *
 * The state object is plain data. All DOM work lives in view.js, all puzzle math
 * is delegated to src/core, and all timing decisions are expressed in *seconds
 * passed in*, never in wall-clock reads, so the whole level can be simulated in
 * a test without waiting for anything.
 */

import { generatePuzzle } from '../core/generator.js';
import {
  getBand,
  customersForLevel,
  patienceSeconds,
  arrivalGapSeconds,
  isValidLevel,
  LEVELS_PER_MODE,
  MAX_ON_SCREEN,
} from '../core/difficulty.js';
import { evaluate, trailingTerm } from '../core/evaluate.js';
import * as R from '../core/rational.js';

/** Base points per served customer, by mode. */
export const SCORE_BASE = { easy: 10, medium: 15, hard: 20 };
export const SPEED_BONUS_RATIO = 0.5;

export const PHASES = {
  PLAYING: 'playing',
  LEVEL_DONE: 'levelDone',
};

/**
 * Customer states, in the order a customer moves through them (PRD 5.8).
 *
 * `COOKING` is exclusive: only one customer can hold it, because there is one
 * stand and one dish. Tapping a chip commits to that customer directly, so the UI
 * no longer has a separate "selected" step; `SELECTED` is kept because the rest
 * of the state machine still tolerates it and removing it would touch every
 * status check for no gain. Nothing sets it any more.
 */
export const ORDER_STATUS = {
  WAITING: 'waiting',
  SELECTED: 'selected',
  COOKING: 'cooking',
  SERVED: 'served',
  WALKED: 'walked',
};

/** A customer is still on screen and can be worked on while only these hold. */
const ACTIVE_STATUSES = new Set([ORDER_STATUS.WAITING, ORDER_STATUS.SELECTED, ORDER_STATUS.COOKING]);

let nextOrderId = 1;

/** Test seam: keeps customer ids stable across independent cases. */
export function resetOrderIds() {
  nextOrderId = 1;
}

function makeOrder(mode, level, index, rng) {
  const total = patienceSeconds(mode, level);
  return {
    id: nextOrderId++,
    customerIndex: index,
    puzzle: generatePuzzle(mode, level, { rng }),
    status: ORDER_STATUS.WAITING,
    timeTotal: total,
    timeLeft: total,
    // The chip slides in from the right before it can be tapped, so patience
    // must not run while it is still moving. Cleared by the first `tick`, which
    // is also the first moment the player is able to act on this customer.
    arriving: true,
  };
}

export function createState(mode, level, options = {}) {
  if (!isValidLevel(level)) {
    throw new Error(`level must be 1..${LEVELS_PER_MODE}, got ${level}`);
  }
  const rng = options.rng ?? Math.random;
  const rosterSize = customersForLevel(level);

  return {
    mode,
    level,
    band: getBand(mode, level),
    phase: PHASES.PLAYING,
    score: options.score ?? 0,
    levelScore: 0,
    rosterSize,
    spawnedCount: 0,
    orders: [],
    cookingOrderId: null,
    selectedOrderId: null,
    expression: [],
    rng,
    // The first customer walks in immediately, so the player never stares at an
    // empty kitchen wondering whether the game started.
    secondsToNextArrival: 0,
    lastResult: null,
  };
}

/* ------------------------------------------------------------------ *
 * Customers
 * ------------------------------------------------------------------ */

export function findOrder(state, orderId) {
  return state.orders.find((order) => order.id === orderId) ?? null;
}

export function activeOrders(state) {
  return state.orders.filter((order) => ACTIVE_STATUSES.has(order.status));
}

export function waitingOrders(state) {
  return state.orders.filter((order) => order.status !== ORDER_STATUS.SERVED && order.status !== ORDER_STATUS.WALKED);
}

export function ordersServed(state) {
  return state.orders.filter((order) => order.status === ORDER_STATUS.SERVED).length;
}

export function ordersLost(state) {
  return state.orders.filter((order) => order.status === ORDER_STATUS.WALKED).length;
}

/** The customer whose ingredients are loaded on the stand, if any. */
export function cookingOrder(state) {
  return state.cookingOrderId === null ? null : findOrder(state, state.cookingOrderId);
}

/**
 * Commit the stand to a customer and load that customer's ingredients.
 *
 * Refused while another dish is already on the stand, so the player has to serve
 * or clear first. Losing a built expression to a mis-tap is a design failure, not
 * a difficulty setting.
 */
export function startCooking(state, orderId) {
  if (state.phase !== PHASES.PLAYING) return { ok: false, reason: 'work.standBusy' };
  if (state.expression.length > 0) return { ok: false, reason: 'work.standBusy' };
  const order = findOrder(state, orderId);
  if (!order) return { ok: false, reason: 'work.badStep' };
  if (order.status === ORDER_STATUS.COOKING) return { ok: true, order };
  if (order.status !== ORDER_STATUS.WAITING && order.status !== ORDER_STATUS.SELECTED) {
    return { ok: false, reason: 'work.badStep' };
  }

  // Whichever customer the stand used to be cooking for is just a waiter again.
  // Only demoting SELECTED was enough while reaching this needed a button that
  // refused a busy stand, and it left two customers flagged as being cooked for
  // the moment a tap could switch them directly.
  for (const other of state.orders) {
    if (other.id === order.id) continue;
    if (other.status === ORDER_STATUS.SELECTED || other.status === ORDER_STATUS.COOKING) {
      other.status = ORDER_STATUS.WAITING;
    }
  }
  order.status = ORDER_STATUS.COOKING;
  state.cookingOrderId = order.id;
  state.selectedOrderId = null;
  return { ok: true, order };
}

/**
 * How much of a dish may be thrown away by a single tap without asking.
 *
 * Tapping a customer chip is the whole commitment now, so the guard that used to
 * be a separate "Cook for him" button has to live here. Two tiles is the point
 * where the work is still nothing, and asking about every early tap would train
 * the player to dismiss the dialog without reading it.
 */
export const FREE_SWITCH_TILES = 2;

/**
 * Tap a customer chip: that is the whole commitment.
 *
 * The old flow asked for two things, a tap and then a button, so the button is
 * gone and the chip carries the weight. That makes a mis-tap more expensive than
 * it used to be, so anything past `FREE_SWITCH_TILES` of a built dish is refused
 * with `confirm.switch` and the caller has to ask before the work is cleared.
 * Clearing on the free path is deliberate: below the threshold the player has
 * barely started, and holding the stand hostage would make the queue feel stuck.
 */
export function pickCustomer(state, orderId) {
  if (state.phase !== PHASES.PLAYING) return { ok: false, reason: 'work.badStep' };
  const order = findOrder(state, orderId);
  if (!order) return { ok: false, reason: 'work.badStep' };
  if (order.status === ORDER_STATUS.COOKING) return { ok: true, order };
  if (order.status !== ORDER_STATUS.WAITING && order.status !== ORDER_STATUS.SELECTED) {
    return { ok: false, reason: 'work.badStep' };
  }

  const switching = state.cookingOrderId !== null && state.cookingOrderId !== order.id;
  if (switching && state.expression.length > FREE_SWITCH_TILES) {
    return { ok: false, reason: 'confirm.switch', order, tiles: state.expression.length };
  }
  if (switching) clearStand(state);

  return startCooking(state, orderId);
}

/** Empty the stand without serving anyone. */
export function clearStand(state) {
  if (state.expression.length === 0) return false;
  state.expression = [];
  return true;
}

/* ------------------------------------------------------------------ *
 * Expression building
 * ------------------------------------------------------------------ */

/** What the player should be able to drop next. */
export function expectedKind(state) {
  const expression = state.expression;
  if (expression.length === 0) return 'number';
  const last = expression[expression.length - 1];
  return last.kind === 'operator' ? 'number' : 'operator';
}

export function canAccept(state, kind) {
  const expected = expectedKind(state);
  if (kind === 'number') return expected === 'number';
  if (kind === 'operator') return expected === 'operator';
  if (kind === 'unary') {
    // After a unary another unary is allowed, because `2 ² ²` is a chain the
    // core can evaluate and the generator can hand out. Refusing it would strand
    // a customer whose only route needs two squares in a row.
    const last = state.expression[state.expression.length - 1];
    return last?.kind === 'number' || last?.kind === 'unary';
  }
  return false;
}

/** Ingredients the stand currently holds: the customer's own, never pooled. */
export function standIngredients(state) {
  const order = cookingOrder(state);
  return order ? order.puzzle.ingredients : [];
}

function usedKeys(expression) {
  return expression
    .filter((item) => item.kind === 'number')
    .map((item) => R.toKey(item.value));
}

export function pushTile(state, item) {
  const order = cookingOrder(state);
  if (!order) return { ok: false, reason: 'work.noCustomer' };
  if (state.phase !== PHASES.PLAYING) return { ok: false, reason: 'work.badStep' };

  // A unary step acts on the value in front of it, so it needs one. Reported
  // before the generic alternation check, otherwise the player only ever sees
  // "that step does not work here" for a mistake they can easily correct.
  if (item.kind === 'unary') {
    const last = state.expression[state.expression.length - 1];
    if (last?.kind !== 'number' && last?.kind !== 'unary') {
      return { ok: false, reason: 'work.unaryFirst' };
    }
  }

  if (!canAccept(state, item.kind)) {
    return { ok: false, reason: 'work.badStep' };
  }

  if (item.kind === 'number') {
    // A zero divisor is caught where it is committed rather than on the ÷ tile.
    // The ÷ is placed first and the operand second, so the operator tile has no
    // way to know what is coming. This runs before the rack lookup because it is
    // a rule about the chain, not about what was dealt: a zero divisor is a
    // problem whoever put it there.
    const previous = state.expression[state.expression.length - 1];
    if (previous?.kind === 'operator' && previous.op === 'div' && R.isZero(item.value)) {
      return { ok: false, reason: 'work.invalidDivision' };
    }

    const key = R.toKey(item.value);
    const available = order.puzzle.ingredients.filter((v) => R.toKey(v) === key).length;
    const used = usedKeys(state.expression).filter((k) => k === key).length;
    if (used >= available) return { ok: false, reason: 'work.badStep' };

    state.expression.push({ kind: 'number', value: item.value });
    return { ok: true };
  }

  if (item.kind === 'operator') {
    // The left side of a ÷ is the trailing *term*, not the whole running total.
    // Under precedence `5 - 5 ÷ 2` is 2.5, not a division by zero: the ÷ binds
    // to the 5, not to the 0 that 5 - 5 produced. Checking the running total
    // would refuse that move, and the player would be stuck holding a chain the
    // rules allow and cannot build.
    if (item.op === 'div') {
      const last = state.expression[state.expression.length - 1];
      if (last.kind === 'number' && R.isZero(last.value)) {
        return { ok: false, reason: 'work.invalidDivision' };
      }
      const left = trailingTermOf(state);
      if (left !== null && R.isZero(left)) {
        return { ok: false, reason: 'work.invalidDivision' };
      }
    }
    state.expression.push({ kind: 'operator', op: item.op });
    return { ok: true };
  }

  if (item.kind === 'unary') {
    // The step is checked against the operand it will actually act on, which is
    // the number tile in front of it with any unaries already stacked on top.
    // In `1 + 3 ²` the square belongs to 3, so the plate reads 1 + 9 = 10; a
    // check on the running total would refuse it and let through a root the
    // rules forbid.
    const base = pendingOperand(state);
    if (base === null) return { ok: false, reason: 'work.badStep' };
    const probe = { start: base, steps: [{ op: item.op, exponent: item.exponent }] };
    try {
      evaluate(probe, { maxPowExponent: state.band.maxPowExponent });
    } catch (error) {
      if (error instanceof R.NotPerfectSquareError) return { ok: false, reason: 'work.invalidRoot' };
      if (error instanceof R.NotIntegerError) return { ok: false, reason: 'work.invalidExponent' };
      return { ok: false, reason: 'work.badStep' };
    }

    state.expression.push({ kind: 'unary', op: item.op, exponent: item.exponent });
    return { ok: true };
  }

  return { ok: false, reason: 'work.badStep' };
}

/**
 * The value of the stand right now, whether or not the chain is finished.
 *
 * Returns null when the stand is empty or the chain so far cannot be evaluated.
 */
function chainValue(state) {
  if (state.expression.length === 0) return null;
  try {
    return evaluate(expressionToRecipe(state.expression), {
      maxPowExponent: state.band.maxPowExponent,
    });
  } catch {
    return null;
  }
}

/**
 * The value a unary step would act on: the last number tile with the unaries
 * already stacked on it.
 *
 * Under precedence a square or a root belongs to the operand in front of it, so
 * `1 + 3 ²` squares the 3 and not the 4. Returns null when there is no number
 * yet, or when the unaries on it already failed to evaluate.
 */
function pendingOperand(state) {
  const expression = state.expression;
  let index = expression.length - 1;
  while (index >= 0 && expression[index].kind !== 'number') index -= 1;
  if (index < 0) return null;

  const steps = [];
  for (let i = index + 1; i < expression.length; i += 1) {
    const item = expression[i];
    if (item.kind !== 'unary') break;
    steps.push({ op: item.op, exponent: item.exponent });
  }

  try {
    return evaluate(
      { start: expression[index].value, steps },
      { maxPowExponent: state.band.maxPowExponent },
    );
  } catch {
    return null;
  }
}

/**
 * The value on the left of a × or ÷ about to be placed.
 *
 * Same reasoning as `pendingOperand`, one level up: the left side of a product
 * is the trailing term, not the whole running total. Null when the chain so far
 * cannot be read, which leaves the divide guard to the operand check alone.
 */
function trailingTermOf(state) {
  if (state.expression.length === 0) return null;
  try {
    return trailingTerm(expressionToRecipe(state.expression), {
      maxPowExponent: state.band.maxPowExponent,
    });
  } catch {
    return null;
  }
}

/**
 * Is the chain on the stand structurally sound?
 *
 * The alternation is the same one `canAccept` enforces while the player builds,
 * and the two have to agree exactly: a step that `canAccept` welcomes and this
 * rejects leaves the player holding a chain that can never be served.
 *
 * A unary step does not break the number/operator alternation, it only ever
 * follows one. So after a square the chain waits for an operator just as it
 * would after a number, and `2 ² − 7` is as legal as `2 + 7`.
 */
function isPlayable(state) {
  const expression = state.expression;
  if (expression.length === 0) return false;
  if (expression[0].kind !== 'number') return false;
  for (let i = 1; i < expression.length; i += 1) {
    const item = expression[i];
    const previous = expression[i - 1];
    if (item.kind === 'number' && previous.kind !== 'operator' && previous.kind !== 'unary') return false;
    if (item.kind === 'operator' && previous.kind !== 'number' && previous.kind !== 'unary') return false;
    if (item.kind === 'unary' && previous.kind !== 'number' && previous.kind !== 'unary') return false;
  }
  // A chain is finished when it is not waiting for an operand, so it may end on
  // a square or a root. Requiring a number at the end made 42% of Hard level 1
  // and two thirds of Hard level 3 unservable: the player would build the right
  // dish and Serve would never light up.
  return expression[expression.length - 1].kind !== 'operator';
}

/** Flatten the stand into the core's chain shape. */
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

export function runningTotal(state) {
  if (!isPlayable(state)) return null;
  return chainValue(state);
}

/**
 * Is there a dish worth serving?
 *
 * The test is "did the player use at least one operator", not "how many tiles
 * are on the stand". A bare number is not a dish, but `2³` and `√16` are complete
 * answers to "8 dishes" and "4 dishes", and requiring three tiles refused both.
 * A phone playtest found it on a customer who wanted 8: the player built 2³,
 * read the value off the plate, and could not serve it.
 *
 * A bare number can never be correct anyway: the generator refuses to put the
 * target on a tile (see `generatePuzzle`), so the guard is about not lighting
 * the button on an empty reading, not about blocking a real solution.
 *
 * Deliberately does *not* check the value. Serving the wrong dish is a real
 * mechanic and the player must be allowed to do it (PRD 4).
 */
export function hasDish(state) {
  if (!isPlayable(state)) return false;
  const usedOperator = state.expression.some((item) => item.kind === 'operator' || item.kind === 'unary');
  if (!usedOperator) return false;
  return runningTotal(state) !== null;
}

/** Does the dish match this customer's number? */
export function isCorrect(state, order) {
  if (!hasDish(state)) return false;
  const total = runningTotal(state);
  try {
    return R.equals(total, order.puzzle.target);
  } catch {
    return false;
  }
}

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

/* ------------------------------------------------------------------ *
 * Serving
 * ------------------------------------------------------------------ */

export function pointsForCustomer(state, order) {
  const base = SCORE_BASE[state.mode] ?? 10;
  const ratio = order.timeTotal > 0 ? order.timeLeft / order.timeTotal : 0;
  const bonus = Math.floor(base * Math.max(0, Math.min(1, ratio)) * SPEED_BONUS_RATIO);
  return base + bonus;
}

/**
 * Hand the dish to a customer.
 *
 * The dish is consumed either way, because a wrong dish is a real mistake the
 * player has to live with. A walkout is never silent, though: the result always
 * says which customer went and why.
 */
export function serveTo(state, orderId) {
  if (state.phase !== PHASES.PLAYING) return { ok: false, reason: 'work.badStep' };
  const order = findOrder(state, orderId);
  if (!order) return { ok: false, reason: 'work.badStep' };
  if (order.status !== ORDER_STATUS.COOKING) return { ok: false, reason: 'work.badStep' };
  if (!hasDish(state)) return { ok: false, reason: 'work.notReady' };

  const total = runningTotal(state);
  const correct = R.equals(total, order.puzzle.target);
  state.expression = [];
  state.cookingOrderId = null;

  if (!correct) {
    order.status = ORDER_STATUS.WALKED;
    order.walkOutReason = 'wrong';
    state.lastResult = { kind: 'walked', orderId: order.id, served: 0, reason: 'wrong' };
    return { ok: true, correct: false, order, points: 0, value: total };
  }

  const points = pointsForCustomer(state, order);
  order.status = ORDER_STATUS.SERVED;
  order.servedValue = total;
  state.score += points;
  state.levelScore += points;
  state.lastResult = { kind: 'served', orderId: order.id, points, seconds: order.timeTotal - order.timeLeft };
  return { ok: true, correct: true, order, points, value: total };
}

export function walkOut(state, order, reason) {
  if (order.status === ORDER_STATUS.SERVED || order.status === ORDER_STATUS.WALKED) return false;
  order.status = ORDER_STATUS.WALKED;
  order.walkOutReason = reason;
  if (state.cookingOrderId === order.id) {
    state.cookingOrderId = null;
    state.expression = [];
  }
  if (state.selectedOrderId === order.id) state.selectedOrderId = null;
  state.lastResult = { kind: 'walked', orderId: order.id, served: 0, reason };
  return true;
}

/* ------------------------------------------------------------------ *
 * Spawner and patience
 * ------------------------------------------------------------------ */

function spawn(state) {
  const order = makeOrder(state.mode, state.level, state.spawnedCount, state.rng);
  state.orders.push(order);
  state.spawnedCount += 1;
  return order;
}

/**
 * Advance the level by `seconds`.
 *
 * Order matters: a customer who is about to walk out gets their chance before a
 * new one walks in, so serving someone at the last moment never costs the player
 * a customer they were not yet offered.
 *
 * Returns what happened during *this* call, so the caller can react once rather
 * than re-reading state that is still lying around from a previous tick.
 *
 * @returns {{phase: string, spawned: object|null, walked: object[]}}
 */
export function tick(state, seconds = 1) {
  const events = { phase: state.phase, spawned: null, walked: [] };
  if (state.phase !== PHASES.PLAYING || seconds <= 0) return events;

  // 1. Patience runs down for everyone still waiting.
  for (const order of state.orders) {
    if (order.status === ORDER_STATUS.SERVED || order.status === ORDER_STATUS.WALKED) continue;
    // A customer that is still walking in does not burn patience. The chip is on
    // screen but not yet tappable, and AGENTS.md rule 11 forbids a walkout the
    // player had no way to prevent or even see coming. Skipping the tick gives
    // every customer one extra second, which is the cost of that rule.
    if (order.arriving) {
      order.arriving = false;
      continue;
    }
    order.timeLeft -= seconds;
    if (order.timeLeft <= 0) {
      order.timeLeft = 0;
      if (walkOut(state, order, 'impatient')) events.walked.push(order);
    }
  }

  // 2. The spawner counts down, but only fires when a slot is actually free.
  state.secondsToNextArrival -= seconds;
  if (state.secondsToNextArrival <= 0) {
    // The cap is about who is *on screen*, not about how many customers the
    // level owes. Served and walked customers stay in `orders` for the score and
    // the summary, so counting the array itself stopped the spawner for good
    // after the fourth customer and left every level with a roster above four
    // impossible to finish.
    const roomLeft = activeOrders(state).length < MAX_ON_SCREEN && state.spawnedCount < state.rosterSize;
    if (roomLeft) {
      events.spawned = spawn(state);
      state.secondsToNextArrival = arrivalGapSeconds(state.mode, state.level, state.spawnedCount - 1, state.rng);
    } else {
      // Held, not skipped: the next customer walks in the moment a slot frees.
      state.secondsToNextArrival = 0;
    }
  }

  // 3. The level is over once the roster is spent and nobody is left waiting.
  const rosterSpent = state.spawnedCount >= state.rosterSize;
  if (rosterSpent && waitingOrders(state).length === 0) {
    state.phase = PHASES.LEVEL_DONE;
  }

  events.phase = state.phase;
  return events;
}

/** Seconds until the next customer walks in, or null when the roster is spent. */
export function secondsToNextCustomer(state) {
  if (state.spawnedCount >= state.rosterSize) return null;
  if (activeOrders(state).length >= MAX_ON_SCREEN) return null;
  return Math.max(0, state.secondsToNextArrival);
}

export function hasMoreCustomers(state) {
  return secondsToNextCustomer(state) !== null;
}

export function resetLevel(state, options = {}) {
  const fresh = createState(state.mode, state.level, { ...options, score: state.score });
  state.band = fresh.band;
  state.phase = PHASES.PLAYING;
  state.levelScore = 0;
  state.rosterSize = fresh.rosterSize;
  state.spawnedCount = 0;
  state.orders = [];
  state.cookingOrderId = null;
  state.selectedOrderId = null;
  state.expression = [];
  state.secondsToNextArrival = 0;
  state.lastResult = null;
  return state;
}
