/**
 * Game rules for one level: who is waiting, who is being cooked, what the stand
 * holds, and what a walkout costs.
 *
 * The whole level is driven by passing seconds in, so these tests never wait for
 * anything and can cover paths that are awkward to reach by hand.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LEVELS_PER_MODE, MAX_ON_SCREEN } from '../src/core/difficulty.js';
import { makeRng } from '../src/core/generator.js';
import { rat, toDisplayString } from '../src/core/rational.js';
import * as S from '../src/ui/state.js';

/** A deterministic level, so a failure is always reproducible. */
function freshState(mode = 'easy', level = 1, seed = 4242) {
  S.resetOrderIds();
  return S.createState(mode, level, { rng: makeRng(seed) });
}

/** Run the clock forward until at least one customer has walked in. */
function tickUntilCustomer(state, maxSeconds = 600) {
  for (let i = 0; i < maxSeconds; i += 1) {
    S.tick(state, 1);
    if (state.orders.length > 0) return true;
  }
  return false;
}

/** Load the stand for the first customer and build whatever reaches the target. */
function cookFirstCorrectly(state) {
  const order = state.orders.find((o) => o.status === S.ORDER_STATUS.WAITING);
  assert.ok(order, 'expected a waiting customer');
  assert.ok(S.startCooking(state, order.id).ok);
  buildSecretRecipe(state, order);
  return order;
}

/**
 * Replay the secret recipe through the stand, operators and all. The stand only
 * accepts the customer's own ingredients, so a test cannot invent its own tiles.
 */
function buildSecretRecipe(state, order) {
  const recipe = order.puzzle.secretRecipe;
  assert.ok(
    S.pushTile(state, { kind: 'number', value: recipe.start }).ok,
    'the starting ingredient should be on the stand',
  );
  for (const step of recipe.steps) {
    if (step.operand === undefined) {
      assert.ok(
        S.pushTile(state, { kind: 'unary', op: step.op, exponent: step.exponent }).ok,
        `unary ${step.op} should be placeable`,
      );
      continue;
    }
    assert.ok(S.pushTile(state, { kind: 'operator', op: step.op }).ok, `operator ${step.op} should be placeable`);
    assert.ok(S.pushTile(state, { kind: 'number', value: step.operand }).ok, 'operand should be on the stand');
  }
}

test('a new level starts with an empty queue and no customer on screen', () => {
  const state = freshState();
  assert.equal(state.orders.length, 0);
  assert.equal(state.spawnedCount, 0);
  assert.equal(state.cookingOrderId, null);
  assert.equal(state.expression.length, 0);
  assert.equal(state.score, 0);
  assert.equal(state.phase, S.PHASES.PLAYING);
});

test('the first customer walks in without the player waiting', () => {
  const state = freshState();
  const events = S.tick(state, 1);
  assert.equal(events.spawned !== null, true, 'a customer should arrive on the first tick');
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].status, S.ORDER_STATUS.WAITING);
});

test('customers arrive one at a time, not all at once', () => {
  const state = freshState('easy', 3);
  tickUntilCustomer(state);
  assert.equal(state.orders.length, 1);
  // Far too early for anyone else: the base gap is many seconds.
  S.tick(state, 2);
  assert.equal(state.orders.length, 1, 'a second customer must not appear immediately');
});

test('the spawner holds instead of overflowing the screen', () => {
  const state = freshState('easy', 1);
  // Run well past the roster time without serving anyone, sampling the spawner.
  for (let i = 0; i < 400; i += 1) S.tick(state, 1);
  assert.ok(
    state.orders.length <= MAX_ON_SCREEN,
    `screen held ${state.orders.length} customers, cap is ${MAX_ON_SCREEN}`,
  );
});

test('a customer who runs out of patience walks out with nothing', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];

  const events = S.tick(state, order.timeTotal);
  assert.equal(order.status, S.ORDER_STATUS.WALKED);
  assert.equal(order.walkOutReason, 'impatient');
  assert.equal(state.score, 0, 'a walkout must never hand out points');
  assert.ok(events.walked.includes(order), 'the walkout must be reported to the caller');
});

test('a walkout is reported once, not on every tick afterwards', () => {
  const state = freshState();
  S.tick(state, 1);
  S.tick(state, state.orders[0].timeTotal);

  const quiet = S.tick(state, 1);
  assert.deepEqual(quiet.walked, [], 'the same walkout must not be announced again');
});

test('serving the right dish scores and closes the customer', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = cookFirstCorrectly(state);
  assert.ok(S.isCorrect(state, order), 'the built dish should match the order');

  const outcome = S.serveTo(state, order.id);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.correct, true);
  assert.ok(outcome.points >= 10);
  assert.equal(state.score, outcome.points);
  assert.equal(order.status, S.ORDER_STATUS.SERVED);
  assert.equal(state.expression.length, 0, 'the dish is consumed');
  assert.equal(state.cookingOrderId, null);
});

test('serving the wrong dish walks them out and scores nothing', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);

  // A legal chain that deliberately misses the target.
  const ingredients = order.puzzle.ingredients;
  const a = ingredients[0];
  const b = ingredients.find((v) => v.n !== a.n) ?? ingredients[0];
  S.pushTile(state, { kind: 'number', value: a });
  S.pushTile(state, { kind: 'operator', op: 'add' });
  S.pushTile(state, { kind: 'number', value: b });
  assert.equal(S.hasDish(state), true, 'a complete chain is a dish even when it is wrong');
  assert.equal(S.isCorrect(state, order), false);

  const outcome = S.serveTo(state, order.id);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.points, 0);
  assert.equal(state.score, 0);
  assert.equal(order.status, S.ORDER_STATUS.WALKED);
  assert.equal(order.walkOutReason, 'wrong');
  assert.equal(state.expression.length, 0);
});

test('an unfinished dish cannot be served', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);
  S.pushTile(state, { kind: 'number', value: order.puzzle.ingredients[0] });

  assert.equal(S.hasDish(state), false);
  const outcome = S.serveTo(state, order.id);
  assert.equal(outcome.ok, false);
  assert.equal(order.status, S.ORDER_STATUS.COOKING, 'a refused serve must not cost the customer');
});

test('a customer can only be served once', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = cookFirstCorrectly(state);
  assert.equal(S.serveTo(state, order.id).ok, true);
  assert.equal(S.serveTo(state, order.id).ok, false, 'a served customer is closed for good');
});

test('the stand is empty until a customer is picked for cooking', () => {
  const state = freshState();
  S.tick(state, 1);
  assert.deepEqual(S.standIngredients(state), []);

  const order = state.orders[0];
  S.pushTile(state, { kind: 'number', value: order.puzzle.ingredients[0] });
  assert.equal(S.pushTile(state, { kind: 'number', value: order.puzzle.ingredients[1] }).ok, false);

  S.startCooking(state, order.id);
  assert.ok(S.standIngredients(state).length > 0);
});

test('selecting a customer never destroys work (AGENTS.md rule 11)', () => {
  const state = freshState();
  S.tick(state, 1);
  const first = state.orders[0];
  S.startCooking(state, first.id);
  S.pushTile(state, { kind: 'number', value: first.puzzle.ingredients[0] });
  const built = state.expression.length;
  assert.ok(built > 0);

  // Browsing other customers must be free.
  S.tick(state, 1);
  const second = state.orders[0].id === first.id ? null : state.orders[0];
  if (second) {
    const picked = S.selectOrder(state, second.id);
    assert.ok(picked);
    assert.equal(state.expression.length, built, 'browsing must not clear the stand');
  }
});

test('cooking for a second customer is refused while a dish is on the stand', () => {
  const state = freshState();
  S.tick(state, 1);
  const first = state.orders[0];
  S.startCooking(state, first.id);
  S.pushTile(state, { kind: 'number', value: first.puzzle.ingredients[0] });

  for (let i = 0; i < 30; i += 1) S.tick(state, 1);
  const other = state.orders.find((o) => o.status === S.ORDER_STATUS.WAITING);
  if (!other) return;

  const refused = S.startCooking(state, other.id);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'work.standBusy');
  assert.equal(state.cookingOrderId, first.id, 'the stand still belongs to the first customer');
});

test('clearing the stand frees it for another customer', () => {
  const state = freshState();
  S.tick(state, 1);
  const first = state.orders[0];
  S.startCooking(state, first.id);
  S.pushTile(state, { kind: 'number', value: first.puzzle.ingredients[0] });
  assert.equal(S.clearStand(state), true);

  for (let i = 0; i < 30; i += 1) S.tick(state, 1);
  const other = state.orders.find((o) => o.status === S.ORDER_STATUS.WAITING);
  if (!other) return;
  assert.equal(S.startCooking(state, other.id).ok, true);
});

test('only one customer can be cooking at a time', () => {
  const state = freshState();
  S.tick(state, 1);
  assert.equal(S.cookingOrder(state), null, 'nobody is cooking before the player picks');

  S.startCooking(state, state.orders[0].id);
  const cooking = state.orders.filter((o) => o.status === S.ORDER_STATUS.COOKING);
  assert.equal(cooking.length, 1);
  assert.equal(S.cookingOrder(state).id, cooking[0].id);
});

test('the stand only ever offers the cooking customer\'s own ingredients', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);
  const onStand = S.standIngredients(state);
  const own = order.puzzle.ingredients;

  assert.equal(onStand.length, own.length);
  for (const value of onStand) {
    assert.ok(
      own.some((v) => v.n === value.n && v.d === value.d),
      'the stand offered an ingredient this customer never ordered',
    );
  }
});

test('a tile the customer never ordered is refused', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);
  const mine = new Set(order.puzzle.ingredients.map((v) => `${v.n}/${v.d}`));

  // Walk outward until we find a value that is definitely not on offer.
  let stranger = null;
  for (let n = 1; n < 400 && !stranger; n += 1) {
    const candidate = rat(n);
    if (!mine.has(`${candidate.n}/${candidate.d}`)) stranger = candidate;
  }
  assert.ok(stranger);
  const refused = S.pushTile(state, { kind: 'number', value: stranger });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'work.badStep');
});

test('the same ingredient cannot be used more times than it exists', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);

  const value = order.puzzle.ingredients[0];
  const key = `${value.n}/${value.d}`;
  const available = order.puzzle.ingredients.filter((v) => `${v.n}/${v.d}` === key).length;
  const seen = new Set();
  let accepted = 0;
  for (let i = 0; i < available + 3; i += 1) {
    const res = S.pushTile(state, { kind: 'number', value });
    if (res.ok) {
      accepted += 1;
      seen.add(key);
    } else {
      // An odd number of slots left the chain waiting for an operator.
      S.pushTile(state, { kind: 'operator', op: 'add' });
    }
  }
  assert.equal(accepted, available, `ingredient ${key} was used ${accepted} times, had ${available}`);
});

test('dividing by a collapsed total is refused with a readable reason', () => {
  const state = freshState('easy', 1);
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);

  // The generator never puts a zero tile on the rack, so the only reachable
  // divide-by-zero is a running total that cancels itself out, like 5 - 5.
  // The stand is seeded directly here so the case does not depend on the
  // generator happening to deal a cancelling pair.
  state.expression = [
    { kind: 'number', value: rat(5) },
    { kind: 'operator', op: 'sub' },
    { kind: 'number', value: rat(5) },
  ];
  assert.equal(S.runningTotal(state).n, 0, 'the stand should be sitting on zero');

  const res = S.pushTile(state, { kind: 'operator', op: 'div' });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'work.invalidDivision');
  assert.equal(state.expression.length, 3, 'the bad operator must not be on the stand');

  // Any other operator is still fine on top of a zero total.
  assert.equal(S.pushTile(state, { kind: 'operator', op: 'add' }).ok, true);
  void order;
});

test('unary steps are only legal after a value', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);
  assert.equal(S.pushTile(state, { kind: 'unary', op: 'sqrt' }).reason, 'work.unaryFirst');

  S.pushTile(state, { kind: 'number', value: order.puzzle.ingredients[0] });
  S.pushTile(state, { kind: 'operator', op: 'add' });
  assert.equal(S.pushTile(state, { kind: 'unary', op: 'sqrt' }).reason, 'work.unaryFirst',
    'a unary after an operator must still be refused');
});

test('a root of a non-square is refused with a readable reason', () => {
  const state = freshState('easy', 1);
  S.tick(state, 1);
  const order = state.orders[0];
  S.startCooking(state, order.id);
  S.pushTile(state, { kind: 'number', value: rat(2) });
  const res = S.pushTile(state, { kind: 'unary', op: 'sqrt' });
  // Easy has no unary operators, so this must simply not be accepted.
  assert.equal(res.ok, false);
  assert.ok(['work.invalidRoot', 'work.badStep', 'work.unaryFirst'].includes(res.reason));
});

test('undo and clear empty the stand without touching the customer', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = cookFirstCorrectly(state);
  const before = order.status;

  assert.equal(S.undo(state), true);
  assert.equal(S.undo(state), true);
  assert.equal(S.undo(state), true);
  assert.equal(S.undo(state), false, 'nothing left to undo');
  assert.equal(S.clearStand(state), false);

  assert.equal(order.status, before, 'undoing must not cost the customer');
  assert.equal(state.cookingOrderId, order.id);
});

test('the chain evaluates left to right, matching the core rules', () => {
  // Checked on the stand's own chain shape, because the stand only accepts the
  // customer's own ingredients and cannot be handed 2, 3 and 4 on demand.
  const expression = [
    { kind: 'number', value: rat(2) },
    { kind: 'operator', op: 'add' },
    { kind: 'number', value: rat(3) },
    { kind: 'operator', op: 'mul' },
    { kind: 'number', value: rat(4) },
  ];
  const recipe = S.expressionToRecipe(expression);
  assert.equal(recipe.start.n, 2);
  assert.equal(recipe.steps.length, 2);
  assert.equal(recipe.steps[0].op, 'add');
  assert.equal(recipe.steps[1].op, 'mul');

  const state = freshState();
  state.expression = expression;
  const total = S.runningTotal(state);
  assert.equal(toDisplayString(total), '20', '2 + 3 x 4 must be 20, not 14');
});

test('the level ends only once the roster is spent and nobody is left', () => {
  const state = freshState('easy', 1);
  assert.ok(tickUntilCustomer(state));

  for (let i = 0; i < 3000 && state.phase === S.PHASES.PLAYING; i += 1) {
    S.tick(state, 1);
  }
  assert.equal(state.phase, S.PHASES.LEVEL_DONE);
  assert.equal(state.spawnedCount, state.rosterSize, 'every customer must have arrived');
  assert.equal(S.ordersServed(state) + S.ordersLost(state), state.rosterSize);
});

test('a player who serves everyone still finishes the level', () => {
  const state = freshState('easy', 1);
  let guard = 0;
  while (state.phase === S.PHASES.PLAYING && guard < 2000) {
    guard += 1;
    S.tick(state, 1);
    const order = state.orders.find((o) => o.status === S.ORDER_STATUS.WAITING);
    if (!order) continue;
    S.startCooking(state, order.id);
    buildSecretRecipe(state, order);
    assert.ok(S.hasDish(state), 'the secret recipe must be buildable on the stand');
    S.serveTo(state, order.id);
  }
  assert.equal(state.phase, S.PHASES.LEVEL_DONE);
  assert.equal(S.ordersServed(state), state.rosterSize, 'every customer should have been served');
  assert.equal(S.ordersLost(state), 0);
  assert.ok(state.score > 0);
});

test('score never falls and a lost customer never subtracts', () => {
  const state = freshState();
  S.tick(state, 1);
  const before = state.score;
  S.tick(state, state.orders[0].timeTotal);
  assert.equal(state.score, before);
  assert.ok(before >= 0);
});

test('faster service is worth more points', () => {
  const eager = freshState();
  eager.rng = makeRng(1);
  S.tick(eager, 1);
  const fastOrder = cookFirstCorrectly(eager);
  const fast = S.serveTo(eager, fastOrder.id).points;

  const patient = freshState();
  patient.rng = makeRng(1);
  S.tick(patient, 1);
  const slowOrder = patient.orders[0];
  S.startCooking(patient, slowOrder.id);
  buildSecretRecipe(patient, slowOrder);
  slowOrder.timeLeft = 1;
  const slow = S.serveTo(patient, slowOrder.id).points;

  assert.ok(fast > slow, `served with patience ${fast}, served at the last moment ${slow}`);
});

test('the next-arrival readout is null once the roster is spent', () => {
  const state = freshState('easy', 1);
  assert.equal(S.secondsToNextCustomer(state), 0, 'the first customer is due immediately');

  let guard = 0;
  while (state.spawnedCount < state.rosterSize && guard < 500) {
    guard += 1;
    S.tick(state, 1);
  }
  assert.equal(S.secondsToNextCustomer(state), null);
  assert.equal(S.hasMoreCustomers(state), false);
});

test('resetting a level restores the roster and keeps the running score', () => {
  const state = freshState('easy', 2);
  S.tick(state, 1);
  cookFirstCorrectly(state);
  S.serveTo(state, state.cookingOrderId);
  const score = state.score;
  assert.ok(score > 0);

  S.tick(state, 200);
  S.resetLevel(state);

  assert.equal(state.orders.length, 0);
  assert.equal(state.spawnedCount, 0);
  assert.equal(state.levelScore, 0);
  assert.equal(state.expression.length, 0);
  assert.equal(state.cookingOrderId, null);
  assert.equal(state.score, score, 'the running score is kept across a retry');
  assert.equal(state.phase, S.PHASES.PLAYING);
});

test('invalid levels are rejected loudly', () => {
  S.resetOrderIds();
  assert.throws(() => S.createState('easy', 0), /level must be/);
  assert.throws(() => S.createState('easy', LEVELS_PER_MODE + 1), /level must be/);
});

test('a level that is already done refuses further play', () => {
  const state = freshState('easy', 1);
  state.phase = S.PHASES.LEVEL_DONE;
  const events = S.tick(state, 5);
  assert.equal(events.phase, S.PHASES.LEVEL_DONE);
  assert.equal(S.pushTile(state, { kind: 'number', value: rat(1) }).ok, false);
});
