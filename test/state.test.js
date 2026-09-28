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
import { add, rat, toDisplayString } from '../src/core/rational.js';
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
  const state = freshState('easy', 5);
  let busiest = 0;
  let guard = 0;
  while (state.phase === S.PHASES.PLAYING && guard < 2000) {
    guard += 1;
    S.tick(state, 1);
    busiest = Math.max(busiest, S.activeOrders(state).length);

    // Serve whoever is waiting, so the roster keeps moving and the cap is
    // measured while slots are actually being freed.
    const order = state.orders.find((o) => o.status === S.ORDER_STATUS.WAITING);
    if (!order) continue;
    S.startCooking(state, order.id);
    buildSecretRecipe(state, order);
    S.serveTo(state, order.id);
  }
  assert.equal(state.phase, S.PHASES.LEVEL_DONE, 'the level has to be able to end');
  assert.equal(state.spawnedCount, state.rosterSize, 'every customer must have walked in');
  assert.equal(S.ordersServed(state), state.rosterSize);
  assert.ok(
    busiest <= MAX_ON_SCREEN,
    `${busiest} customers were on screen at once, the cap is ${MAX_ON_SCREEN}`,
  );
});

test('a level with a roster longer than the screen cap can still finish (regression)', () => {
  // The cap limits who is on screen, not how many customers a level owes.
  // Counting served customers against it stopped the spawner for good after the
  // fourth customer, which left every level above four impossible to complete.
  // Only level 1 was ever played, and its roster is exactly four.
  for (const level of [2, 3, 4, 5]) {
    const state = freshState('easy', level);
    let guard = 0;
    while (state.phase === S.PHASES.PLAYING && guard < 4000) {
      guard += 1;
      S.tick(state, 1);
    }
    assert.equal(state.phase, S.PHASES.LEVEL_DONE, `easy level ${level} never finished`);
    assert.equal(state.spawnedCount, state.rosterSize, `easy level ${level} left customers unspawned`);
    assert.equal(
      S.ordersServed(state) + S.ordersLost(state),
      state.rosterSize,
      `easy level ${level} lost track of a customer`,
    );
  }
});

test('the next-arrival countdown returns when a slot frees up', () => {
  const state = freshState('easy', 3);
  S.tick(state, 1);
  S.startCooking(state, state.orders[0].id);
  buildSecretRecipe(state, state.orders[0]);
  S.serveTo(state, state.orders[0].id);

  // The roster is not spent and no one is waiting, so the next customer is due
  // and the readout has to say roughly when.
  assert.ok(S.ordersServed(state) === 1);
  assert.ok(S.secondsToNextCustomer(state) !== null, 'a served customer must free a slot');
  assert.equal(S.hasMoreCustomers(state), true);
});

test('a customer who runs out of patience walks out with nothing', () => {
  const state = freshState();
  S.tick(state, 1); // spawns the first customer
  S.tick(state, 1); // lands them, and the arriving tick costs them no patience
  const order = state.orders[0];
  assert.equal(order.arriving, false, 'the second tick lands the customer');

  const events = S.tick(state, order.timeTotal);
  assert.equal(order.status, S.ORDER_STATUS.WALKED);
  assert.equal(order.walkOutReason, 'impatient');
  assert.equal(state.score, 0, 'a walkout must never hand out points');
  assert.ok(events.walked.includes(order), 'the walkout must be reported to the caller');
});

test('a customer that has just walked in does not burn patience on the first tick', () => {
  // AGENTS.md rule 11: a walkout must not be triggerable by something the
  // player never had a chance to see or act on. The chip slides in over 350ms and
  // is not tappable while it moves, so that tick must not charge for it.
  const state = freshState();
  S.tick(state, 1); // spawns the customer, still `arriving`
  const order = state.orders[0];
  assert.equal(order.arriving, true, 'a new customer starts out still arriving');
  assert.equal(order.timeLeft, order.timeTotal, 'and their clock has not moved');

  S.tick(state, 1);
  assert.equal(order.arriving, false, 'the next tick lands the customer');
  assert.equal(order.timeLeft, order.timeTotal, 'and still does not charge that tick');

  S.tick(state, 1);
  assert.equal(order.timeLeft, order.timeTotal - 1, 'only the tick after that counts');
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

test('tapping a customer chip is the whole commitment', () => {
  const state = freshState();
  S.tick(state, 1);
  const order = state.orders[0];
  assert.equal(state.cookingOrderId, null, 'nobody is being cooked for before the tap');

  const result = S.pickCustomer(state, order.id);
  assert.equal(result.ok, true);
  assert.equal(state.cookingOrderId, order.id, 'one tap loads the stand');
  assert.equal(order.status, S.ORDER_STATUS.COOKING);
  assert.ok(S.standIngredients(state).length > 0, 'the ingredients are already loaded');
});

test('a built dish is never destroyed without asking (AGENTS.md rule 11)', () => {
  // Tapping a chip used to be a first step followed by a "Cook for him" button.
  // The button is gone, so one tap now costs more, and the guard that used to
  // live in that button has to hold the work instead.
  const state = freshState('easy', 3);
  S.tick(state, 1);
  const first = state.orders[0];
  S.pickCustomer(state, first.id);

  // Enough of a dish that discarding it is worth a question: past the free
  // threshold, which is two tiles.
  buildSecretRecipe(state, first);
  const built = state.expression.length;
  assert.ok(built > S.FREE_SWITCH_TILES, `needs a dish past ${S.FREE_SWITCH_TILES} tiles, got ${built}`);

  // A second customer has to exist for the switch to mean anything.
  let second = null;
  for (let i = 0; i < 120 && !second; i += 1) {
    S.tick(state, 1);
    second = state.orders.find((o) => o.status === S.ORDER_STATUS.WAITING) ?? null;
  }
  assert.ok(second, 'a second customer turned up');

  const refused = S.pickCustomer(state, second.id);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'confirm.switch', 'the caller has to ask, not clear');
  assert.equal(state.expression.length, built, 'the dish is still on the stand');
  assert.equal(state.cookingOrderId, first.id, 'the stand still belongs to the first customer');
});

test('switching is free while the dish is still small', () => {
  const state = freshState('easy', 3);
  S.tick(state, 1);
  const first = state.orders[0];
  S.pickCustomer(state, first.id);
  S.pushTile(state, { kind: 'number', value: first.puzzle.ingredients[0] });
  assert.equal(state.expression.length, 1);
  if (S.FREE_SWITCH_TILES >= 2) {
    S.pushTile(state, { kind: 'operator', op: 'add' });
  }
  assert.ok(state.expression.length <= S.FREE_SWITCH_TILES, 'small enough to discard');

  let second = null;
  for (let i = 0; i < 120 && !second; i += 1) {
    S.tick(state, 1);
    second = state.orders.find((o) => o.status === S.ORDER_STATUS.WAITING) ?? null;
  }
  assert.ok(second, 'a second customer turned up');

  const result = S.pickCustomer(state, second.id);
  assert.equal(result.ok, true, 'no question asked over a tile or two');
  assert.equal(state.expression.length, 0, 'the stand was cleared for the new customer');
  assert.equal(state.cookingOrderId, second.id);
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
  // divide-by-zero is the divisor itself. Under precedence `5 - 5 ÷ 2` is 2.5,
  // not 0 ÷ 2: the ÷ binds to the trailing 5, not to the running total. That
  // means the guard has to catch the zero when it is committed as the operand,
  // because the ÷ tile alone cannot know what is coming after it.
  state.expression = [
    { kind: 'number', value: rat(5) },
    { kind: 'operator', op: 'div' },
  ];
  const zero = S.pushTile(state, { kind: 'number', value: rat(0) });
  assert.equal(zero.ok, false, 'a zero divisor must be refused');
  assert.equal(zero.reason, 'work.invalidDivision');
  assert.equal(state.expression.length, 2, 'the refused step must not be left on the stand');
  assert.equal(S.hasDish(state), false, 'an unfinished chain is not servable');
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

test('two unary steps in a row are a chain the player can build', () => {
  const state = freshState('hard', 3);
  S.tick(state, 1);
  S.startCooking(state, state.orders[0].id);

  // Seeded directly because the stand only offers this customer's own
  // ingredients, and the case is about two squares in a row rather than about
  // which tiles happened to be dealt.
  state.expression = [{ kind: 'number', value: rat(2) }];

  assert.equal(S.canAccept(state, 'unary'), true);
  assert.ok(S.pushTile(state, { kind: 'unary', op: 'pow', exponent: 2 }).ok, 'the first square goes on');
  assert.equal(S.canAccept(state, 'unary'), true, 'a second square must be offered, not greyed out');
  assert.ok(S.pushTile(state, { kind: 'unary', op: 'pow', exponent: 2 }).ok, 'the second square goes on too');

  // 2 squared is 4, squared again is 16, and a chain that ends on a square is
  // already a finished dish.
  assert.equal(S.hasDish(state), true, 'a chain may end on a square, not only on a number');
  assert.equal(S.runningTotal(state).n, 16);
});

test('a chain may end on a square or a root', () => {
  // The generator hands out recipes whose last step is a unary operator in 42%
  // of Hard level 1 and 66% of Hard level 3. A stand that refused to serve them
  // made most of Hard unplayable even though the maths stayed correct.
  const state = freshState('hard', 3);
  S.tick(state, 1);
  S.startCooking(state, state.orders[0].id);

  state.expression = [
    { kind: 'number', value: rat(2) },
    { kind: 'operator', op: 'add' },
    { kind: 'number', value: rat(2) },
  ];
  assert.ok(S.pushTile(state, { kind: 'unary', op: 'pow', exponent: 2 }).ok);
  assert.equal(state.expression[state.expression.length - 1].kind, 'unary');
  assert.equal(S.hasDish(state), true, '2 + 2 squared is a finished dish');
  assert.equal(S.runningTotal(state).n, 6, 'kaidah operasi: the square belongs to the 2, so 2 + 4');
  assert.equal(S.canAccept(state, 'number'), false, 'a chain waiting for nothing takes no more tiles');
  assert.equal(S.canAccept(state, 'operator'), true, 'but the player may keep going');

  // A unary step must not break the number/operator alternation, or the stand
  // accepts a step it then refuses to serve. `2 ² + 7` is as legal as `2 + 7`.
  state.expression = [
    { kind: 'number', value: rat(2) },
    { kind: 'unary', op: 'pow', exponent: 2 },
  ];
  assert.ok(S.pushTile(state, { kind: 'operator', op: 'add' }).ok);
  const extra = state.orders[0].puzzle.ingredients[0];
  assert.ok(S.pushTile(state, { kind: 'number', value: extra }).ok, 'the stand only offers this customer their own tiles');
  assert.equal(S.hasDish(state), true, 'a chain that continues after a square is still a dish');
  assert.equal(
    toDisplayString(S.runningTotal(state)),
    toDisplayString(add(rat(4), extra)),
    'the square belongs to the 2, so the running total is 2² + the next tile',
  );
});

test('a single unary chain is a dish that can be served', () => {
  // 2³ is a complete answer to "I want 8 dishes".  The tile run is short —
  // just [2, ³] — and before this fix `hasDish` refused anything shorter
  // than three tiles.  Found in a phone playtest where the player read 8 off
  // the plate and pressed Serve, and nothing happened.
  const state = freshState('hard', 3);
  S.tick(state, 1);
  S.startCooking(state, state.orders[0].id);

  state.expression = [
    { kind: 'number', value: rat(2) },
    { kind: 'unary', op: 'pow', exponent: 3 },
  ];
  assert.equal(S.hasDish(state), true, '2 cubed = 8 must be servable, not stranded');
  assert.equal(S.runningTotal(state).n, 8);

  // A bare number is never a dish: the player cannot have accidentally
  // cooked a customer's number with zero operators.
  state.expression = [
    { kind: 'number', value: rat(5) },
  ];
  assert.equal(S.hasDish(state), false, 'a bare number is not a dish');
});

test('a unary step is judged by the tile it acts on, not by the running total', () => {
  const state = freshState('hard', 3);
  S.tick(state, 1);
  S.startCooking(state, state.orders[0].id);

  // `1 + 4` → √4 = 2. Under precedence the root belongs to the 4, not the
  // running total (5), so this is a legal move.
  state.expression = [
    { kind: 'number', value: rat(1) },
    { kind: 'operator', op: 'add' },
    { kind: 'number', value: rat(4) },
  ];
  assert.equal(S.runningTotal(state).n, 5);
  const res = S.pushTile(state, { kind: 'unary', op: 'sqrt' });
  assert.equal(res.ok, true, '√4 is legal because 4 is a perfect square');
  assert.equal(S.runningTotal(state).n, 3, '1 + √4 = 1 + 2 = 3');

  // And the mirror image: a root of 3 is refused because the square belongs to
  // 3, not to the running total.
  state.expression = [
    { kind: 'number', value: rat(1) },
    { kind: 'operator', op: 'add' },
    { kind: 'number', value: rat(3) },
  ];
  const bad = S.pushTile(state, { kind: 'unary', op: 'sqrt' });
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'work.invalidRoot');
  assert.equal(state.expression.length, 3, 'the refused step must not be left on the stand');
});

test('every puzzle the stand is offered can actually be built on it', () => {
  // The regression that matters most: the core guarantees a route exists, and
  // this is the only test that holds the stand to the same promise. Unit tests
  // used to cover Easy only, where there are no unary operators at all, so a
  // stand that refused a legal square or could not hold two in a row went
  // unnoticed while the maths stayed provably correct.
  for (const [mode, level] of [['medium', 1], ['hard', 1], ['hard', 2], ['hard', 3], ['hard', 4], ['hard', 5]]) {
    for (let seed = 1; seed <= 120; seed += 1) {
      const state = freshState(mode, level, seed);
      S.tick(state, 1);
      const order = state.orders[0];
      if (!order) continue;
      S.startCooking(state, order.id);
      const recipe = order.puzzle.secretRecipe;

      const steps = [{ label: toDisplayString(recipe.start), res: S.pushTile(state, { kind: 'number', value: recipe.start }) }];
      for (const step of recipe.steps) {
        if (step.operand !== undefined) {
          steps.push({ label: step.op, res: S.pushTile(state, { kind: 'operator', op: step.op }) });
          steps.push({
            label: toDisplayString(step.operand),
            res: S.pushTile(state, { kind: 'number', value: step.operand }),
          });
        } else {
          steps.push({
            label: `${step.op}${step.exponent ?? ''}`,
            res: S.pushTile(state, { kind: 'unary', op: step.op, exponent: step.exponent }),
          });
        }
      }

      const refused = steps.filter((s) => !s.res.ok);
      assert.deepEqual(
        refused.map((s) => `${s.label} -> ${s.res.reason}`),
        [],
        `${mode} L${level} seed ${seed}: the stand refused part of the route to ${toDisplayString(order.puzzle.target)}`,
      );
      assert.ok(S.hasDish(state), `${mode} L${level} seed ${seed}: the finished chain is not a dish`);
      assert.ok(
        S.isCorrect(state, order),
        `${mode} L${level} seed ${seed}: the finished chain does not reach the target`,
      );
    }
  }
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

test('the chain follows kaidah operasi, matching the core rules', () => {
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
  assert.equal(toDisplayString(total), '14', '2 + 3 x 4 must be 14, not 20');
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
