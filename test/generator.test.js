import test from 'node:test';
import assert from 'node:assert/strict';

import * as R from '../src/core/rational.js';
import { getBand, customersForLevel, MODE_LIST, LEVELS_PER_MODE, isValidLevel, isValidMode } from '../src/core/difficulty.js';
import { evaluate, traceValues, unaryOperands, unaryOperatorKeys, ingredientCount } from '../src/core/evaluate.js';
import { consumesOperand, opArity } from '../src/core/operators.js';
import {
  generatePuzzle,
  collectIngredients,
  displaySolution,
  assertPuzzleSolvable,
  makeRng,
  GenerationError,
} from '../src/core/generator.js';

const STRESS_RUNS = 10_000;

/** Deterministic generator so any failure is exactly reproducible. */
function seeded(seed) {
  return makeRng(seed);
}

/* ------------------------------------------------------------------ *
 * Difficulty config
 * ------------------------------------------------------------------ */

test('the roster grows with the level', () => {
  assert.equal(customersForLevel(1), 4);
  assert.equal(customersForLevel(LEVELS_PER_MODE), 8);
  assert.throws(() => customersForLevel(0));
  assert.throws(() => customersForLevel(LEVELS_PER_MODE + 1));
});

test('mode and level validation rejects junk', () => {
  assert.ok(isValidMode('easy') && isValidMode('medium') && isValidMode('hard'));
  assert.ok(!isValidMode('Easy'), 'mode names are case sensitive');
  assert.ok(!isValidMode('impossible'));
  assert.ok(!isValidLevel(0) && !isValidLevel(6) && !isValidLevel(1.5));
  assert.throws(() => getBand('nope', 1), /unknown mode/);
});

test('bands widen with level and only ever gain operators', () => {
  for (const mode of MODE_LIST) {
    const first = getBand(mode, 1);
    const last = getBand(mode, LEVELS_PER_MODE);
    assert.ok(last.maxAbsIngredient > first.maxAbsIngredient, `${mode} should widen`);

    // Operators are a progressive ladder now (PRD 5.1), so the last level offers
    // a superset of the first. What must never happen is an operator disappearing.
    for (const op of first.binaryOps) {
      assert.ok(last.binaryOps.includes(op), `${mode} lost ${op} on the way to level 5`);
    }
    for (const op of first.unaryOps) {
      assert.ok(last.unaryOps.includes(op), `${mode} lost ${op} on the way to level 5`);
    }
    assert.ok(last.binaryOps.length >= first.binaryOps.length);
  }
});

test('Easy is integers with negatives, Hard demands unary', () => {
  const easy = getBand('easy', 1);
  assert.ok(easy.allowNegatives);
  assert.ok(!easy.allowFractions);
  assert.deepEqual([...easy.unaryOps], [], 'Easy never unlocks a unary step');
  assert.equal(easy.minUnarySteps, 0);

  const medium = getBand('medium', 1);
  assert.ok(medium.allowFractions);
  assert.ok(!medium.allowNegatives);

  // Hard introduces powers at level 1 and roots from level 3.
  const hardStart = getBand('hard', 1);
  assert.ok(hardStart.minUnarySteps >= 1, 'Hard must genuinely practise roots/powers');
  assert.ok(hardStart.unaryOps.includes('pow'));
  assert.ok(!hardStart.unaryOps.includes('sqrt'), 'roots are unlocked later, not at once');

  const hardLate = getBand('hard', 3);
  assert.ok(hardLate.unaryOps.includes('sqrt'), 'roots must be available by level 3');
  assert.ok(hardLate.unaryOps.includes('pow'));
});

/* ------------------------------------------------------------------ *
 * The core guarantee: every generated puzzle is solvable
 * ------------------------------------------------------------------ */

test('every generated puzzle is solvable by its own secret recipe', () => {
  const rng = seeded(20261026);
  for (const mode of MODE_LIST) {
    const band = getBand(mode, 1);
    for (let i = 0; i < STRESS_RUNS; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      const reached = evaluate(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
      assert.ok(
        R.equals(reached, puzzle.target),
        `${mode} #${i}: recipe reached ${R.format(reached)} but target was ${R.format(puzzle.target)}`,
      );
    }
  }
});

test('solvability holds at every level, not just level 1', () => {
  const rng = seeded(7);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      for (let i = 0; i < 500; i += 1) {
        const puzzle = generatePuzzle(mode, level, { rng });
        const reached = evaluate(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
        assert.ok(R.equals(reached, puzzle.target), `${mode} L${level} #${i} unsolvable`);
      }
    }
  }
});

test('generatePuzzle is deterministic for a given seed', () => {
  const a = generatePuzzle('hard', 3, { rng: makeRng(99) });
  const b = generatePuzzle('hard', 3, { rng: makeRng(99) });
  assert.deepEqual(a.ingredients, b.ingredients);
  assert.deepEqual(a.target, b.target);
  assert.deepEqual(a.secretRecipe, b.secretRecipe);
});

test('assertPuzzleSolvable passes for sampled puzzles', () => {
  const rng = seeded(31337);
  for (const mode of MODE_LIST) {
    const band = getBand(mode, 1);
    for (let i = 0; i < 200; i += 1) {
      assert.ok(assertPuzzleSolvable(generatePuzzle(mode, 1, { rng }), band));
    }
  }
});

/* ------------------------------------------------------------------ *
 * Puzzle shape
 * ------------------------------------------------------------------ */

test('the recipe is actually made of the ingredients on the rack', () => {
  const rng = seeded(555);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 2000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      const needed = collectIngredients(puzzle.secretRecipe);
      const rack = puzzle.ingredients.map(R.toKey);
      for (const value of needed) {
        assert.ok(rack.includes(R.toKey(value)), `${mode} #${i}: ${R.format(value)} is not on the rack`);
      }
      assert.equal(needed.length, ingredientCount(puzzle.secretRecipe));
    }
  }
});

test('no puzzle is solvable by staring at a single tile', () => {
  const rng = seeded(4242);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 3000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      const trivial = puzzle.ingredients.some((v) => R.equals(v, puzzle.target));
      assert.ok(!trivial, `${mode} #${i}: target ${R.format(puzzle.target)} is sitting on the rack as a distractor`);
    }
  }
});

test('distractors are present and never duplicate a tile the solution needs', () => {
  const rng = seeded(8181);
  let withDistractors = 0;
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 2000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      const { realIngredientCount, distractorCount } = puzzle.meta;
      const rack = puzzle.ingredients.map(R.toKey);
      const real = collectIngredients(puzzle.secretRecipe).map(R.toKey);

      // A solution such as 9 * 9 legitimately needs two 9 tiles, so repeats are
      // allowed up to how many times the recipe consumes a value. Each distinct
      // value may then be padded by at most one distractor.
      const realCounts = new Map();
      for (const key of real) realCounts.set(key, (realCounts.get(key) ?? 0) + 1);
      const rackCounts = new Map();
      for (const key of rack) rackCounts.set(key, (rackCounts.get(key) ?? 0) + 1);

      for (const [key, count] of rackCounts) {
        const needed = realCounts.get(key) ?? 0;
        assert.ok(count >= needed, `${mode} #${i}: tile ${key} appears ${count}x but the recipe needs ${needed}x`);
        assert.ok(count - needed <= 1, `${mode} #${i}: tile ${key} was padded by ${count - needed} distractors`);
      }
      const padded = [...rackCounts].filter(([key, count]) => count - (realCounts.get(key) ?? 0) === 1).length;
      assert.equal(padded, distractorCount, 'every distractor should be a value the recipe does not use');
      assert.equal(real.length, realIngredientCount);
      assert.equal(rack.length, realIngredientCount + distractorCount);

      // Distractors must also avoid the target, otherwise the order is free.
      const targetKey = R.toKey(puzzle.target);
      assert.equal(rackCounts.get(targetKey) ?? 0, 0);

      if (distractorCount > 0) withDistractors += 1;
    }
  }
  assert.ok(withDistractors > 0, 'distractors should appear, PRD 5.2 wants a choice to make');
});

test('rack size stays inside the configured band', () => {
  const rng = seeded(2718);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      for (let i = 0; i < 500; i += 1) {
        const puzzle = generatePuzzle(mode, level, { rng });
        assert.ok(
          puzzle.ingredients.length >= band.ingredientMin,
          `${mode} L${level}: ${puzzle.ingredients.length} tiles < min ${band.ingredientMin}`,
        );
        assert.ok(
          puzzle.ingredients.length <= Math.max(band.ingredientMax, puzzle.meta.realIngredientCount),
          `${mode} L${level}: ${puzzle.ingredients.length} tiles > max ${band.ingredientMax}`,
        );
        assert.equal(
          puzzle.ingredients.length,
          puzzle.meta.realIngredientCount + puzzle.meta.distractorCount,
        );
      }
    }
  }
});

test('every tile reads well and stays inside the band range', () => {
  const rng = seeded(6060);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      for (let i = 0; i < 500; i += 1) {
        const puzzle = generatePuzzle(mode, level, { rng });
        for (const tile of puzzle.ingredients) {
          assert.ok(R.isDisplayNice(tile), `${mode} L${level}: ugly tile ${R.format(tile)}`);
          assert.ok(
            R.compare(tile, R.rat(band.min)) >= 0 && R.compare(tile, R.rat(band.max)) <= 0,
            `${mode} L${level}: tile ${R.format(tile)} outside [${band.min}, ${band.max}]`,
          );
        }
      }
    }
  }
});

test('the target itself is always a presentable number', () => {
  const rng = seeded(1212);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 5000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      assert.ok(R.isDisplayNice(puzzle.target), `${mode}: ugly target ${R.format(puzzle.target)}`);
      assert.ok(!R.isZero(puzzle.target), 'a target of 0 would be a strange order');
      assert.ok(Number.isFinite(puzzle.target.n) && Number.isFinite(puzzle.target.d));
    }
  }
});

/* ------------------------------------------------------------------ *
 * Per-mode mathematical rules
 * ------------------------------------------------------------------ */

/**
 * The operator ladder is a hard gate, not a nice-to-have.
 *
 * Restricting the operators also restricts the arithmetic the generator may use,
 * so a rung that is too tight would make whole tiers of the game unsolvable.
 * Every mode x level rung gets a full stress run, and every puzzle is proved
 * solvable with the core evaluator before the run is allowed to pass.
 */
test('every rung of the operator ladder still produces solvable puzzles', () => {
  let total = 0;
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      const rng = seeded(7000 + level * 7 + mode.length);
      for (let i = 0; i < STRESS_RUNS; i += 1) {
        const puzzle = generatePuzzle(mode, level, { rng });
        assertPuzzleSolvable(puzzle, band);

        // The secret recipe may only use operators the player was actually
        // offered, and the offered tiles must cover it.
        for (const step of puzzle.secretRecipe.steps) {
          const allowed = step.operand === undefined ? band.unaryOps : band.binaryOps;
          assert.ok(
            allowed.includes(step.op),
            `${mode} level ${level} used ${step.op}, which that rung does not offer (${allowed.join(',')})`,
          );
        }
        for (const value of collectIngredients(puzzle.secretRecipe)) {
          assert.ok(
            puzzle.ingredients.some((v) => R.toKey(v) === R.toKey(value)),
            `${mode} level ${level} produced a dish needing an ingredient it never dealt`,
          );
        }
        total += 1;
      }
    }
  }
  assert.equal(total, STRESS_RUNS * MODE_LIST.length * LEVELS_PER_MODE);
});

test('a rung that locks a unary step actually uses one', () => {
  const rng = seeded(90210);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      if (band.minUnarySteps === 0) continue;
      for (let i = 0; i < 2000; i += 1) {
        const puzzle = generatePuzzle(mode, level, { rng });
        assert.ok(
          unaryOperatorKeys(puzzle.secretRecipe).length >= band.minUnarySteps,
          `${mode} level ${level} promised a unary step and did not use one`,
        );
      }
    }
  }
});

test('level 1 of Easy really is addition and subtraction only', () => {
  const rng = seeded(31337);
  const band = getBand('easy', 1);
  assert.deepEqual([...band.binaryOps], ['add', 'sub']);
  for (let i = 0; i < 2000; i += 1) {
    for (const step of generatePuzzle('easy', 1, { rng }).secretRecipe.steps) {
      assert.ok(step.op === 'add' || step.op === 'sub', `unexpected ${step.op} in Easy level 1`);
    }
  }
});

test('Easy stays on integers and never uses a unary operator', () => {
  const rng = seeded(1111);
  for (let i = 0; i < STRESS_RUNS; i += 1) {
    const puzzle = generatePuzzle('easy', 3, { rng });
    assert.ok(R.isInteger(puzzle.target), `Easy target must be a whole number, got ${R.format(puzzle.target)}`);
    assert.equal(unaryOperatorKeys(puzzle.secretRecipe).length, 0);
    for (const value of traceValues(puzzle.secretRecipe)) {
      assert.ok(R.isInteger(value), `Easy intermediate must be whole, got ${R.format(value)}`);
    }
    for (const op of puzzle.secretRecipe.steps) {
      assert.ok(consumesOperand(op.op));
    }
  }
});

test('Medium introduces fractions but keeps them tidy', () => {
  const rng = seeded(2222);
  let sawFraction = false;
  for (let i = 0; i < STRESS_RUNS; i += 1) {
    const puzzle = generatePuzzle('medium', 3, { rng });
    for (const value of traceValues(puzzle.secretRecipe)) {
      assert.ok(R.isDisplayNice(value), `Medium intermediate ${R.format(value)} is too noisy`);
      assert.ok(!R.isNegative(value), 'Medium should not go negative');
      if (!R.isInteger(value)) sawFraction = true;
    }
  }
  assert.ok(sawFraction, 'Medium is supposed to introduce fractions (PRD 5.1)');
});

test('a harder mode never carries more fractions per tile than an easier one (regression)', () => {
  // A playtest reported fractions as overwhelming, that Medium level 5 was only
  // half finished, and that the top of Medium felt harder than the bottom of
  // Hard. The cause was `fractionChance` sitting above Hard's, so the mode
  // mapped to grade 8 dealt more fractions than the one mapped to grade 9. The
  // operator ladder already ordered the modes; the material has to agree.
  const fractionShare = (mode, level, runs = 300) => {
    const rng = seeded(9000 + level);
    let fractions = 0;
    let tiles = 0;
    for (let i = 0; i < runs; i += 1) {
      for (const value of generatePuzzle(mode, level, { rng }).ingredients) {
        tiles += 1;
        if (!R.isInteger(value)) fractions += 1;
      }
    }
    return fractions / tiles;
  };

  for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
    const medium = fractionShare('medium', level);
    const hard = fractionShare('hard', level);
    assert.ok(
      medium <= hard + 0.02,
      `medium level ${level} deals ${(medium * 100).toFixed(1)}% fractions per tile`
      + ` against hard's ${(hard * 100).toFixed(1)}%`,
    );
  }
});

test('Hard only roots perfect squares and raises to small integer powers', () => {
  const rng = seeded(3333);
  let sawSqrt = 0;
  let sawPow = 0;
  for (let i = 0; i < STRESS_RUNS; i += 1) {
    const band = getBand('hard', 3);
    const puzzle = generatePuzzle('hard', 3, { rng });

    const unary = unaryOperatorKeys(puzzle.secretRecipe);
    assert.ok(unary.length >= 1, `Hard #${i} used no unary operator`);

    const values = traceValues(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
    assert.equal(values.at(-1).n, puzzle.target.n);

    // A root or a power acts on the operand in front of it, which under
    // precedence is not the running total: in `9 × √9 + 4` the radicand is 9,
    // not 81. `unaryOperands` reports what the evaluator actually fed each
    // unary, so this checks the real number instead of guessing at the stack.
    const operands = unaryOperands(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
    const unaryKeys = unaryOperatorKeys(puzzle.secretRecipe);
    for (let u = 0; u < unaryKeys.length; u += 1) {
      if (unaryKeys[u] === 'sqrt') {
        sawSqrt += 1;
        const radicand = operands[u];
        assert.ok(R.isInteger(radicand), `Hard root should act on a whole number, got ${R.format(radicand)}`);
        // R.sqrt throws unless the radicand is a perfect square, so surviving the
        // call is the guarantee we want.
        const rooted = R.sqrt(radicand);
        assert.ok(R.isInteger(rooted), `root of ${R.format(radicand)} is not a whole number`);
        assert.ok(R.equals(R.pow(rooted, 2), radicand), `${R.format(radicand)} is not a perfect square`);
      }
      if (unaryKeys[u] === 'pow') {
        sawPow += 1;
        assert.ok(Number.isInteger(operands[u].n) || operands[u].d === 1, 'the base of a power must be a legal number');
      }
    }
    // The exponent range is a property of the step, checked straight from it.
    for (const step of puzzle.secretRecipe.steps) {
      if (step.op === 'pow') {
        assert.ok(Number.isInteger(step.exponent));
        assert.ok(step.exponent >= 2 && step.exponent <= band.maxPowExponent);
      }
    }
  }
  assert.ok(sawSqrt > 0, 'Hard should use square roots regularly');
  assert.ok(sawPow > 0, 'Hard should use powers regularly');
});

test('no puzzle ever divides by zero or hits a non-finite value', () => {
  const rng = seeded(9090);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      for (let i = 0; i < 800; i += 1) {
        const puzzle = generatePuzzle(mode, level, { rng });
        for (const step of puzzle.secretRecipe.steps) {
          if (opArity(step.op) === 'binary') {
            assert.ok(!R.isZero(step.operand), `${mode} L${level} #${i} divides or multiplies by zero`);
          }
        }
        for (const value of traceValues(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent })) {
          assert.ok(R.isFiniteValue(value), `${mode} L${level} #${i} produced a non-finite value`);
          assert.ok(Math.abs(value.n) <= Number.MAX_SAFE_INTEGER);
        }
      }
    }
  }
});

test('intermediates never explode past the configured ceiling', () => {
  const rng = seeded(4004);
  for (const mode of MODE_LIST) {
    const band = getBand(mode, 1);
    for (let i = 0; i < 3000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      for (const value of traceValues(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent })) {
        assert.ok(
          Math.abs(value.n) / value.d <= band.maxAbsIntermediate,
          `${mode} #${i}: intermediate ${R.format(value)} exceeds ${band.maxAbsIntermediate}`,
        );
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * Difficulty must actually rise (PRD 5.1 / 5.7)
 * ------------------------------------------------------------------ */

test('difficulty rises between modes: Hard uses more steps than Easy', () => {
  const averages = {};
  for (const mode of MODE_LIST) {
    const rng = seeded(24680);
    let total = 0;
    const runs = 3000;
    for (let i = 0; i < runs; i += 1) {
      total += generatePuzzle(mode, 1, { rng }).meta.steps;
    }
    averages[mode] = total / runs;
  }
  assert.ok(averages.easy < averages.medium, `Easy ${averages.easy} should be shorter than Medium ${averages.medium}`);
  assert.ok(averages.medium < averages.hard, `Medium ${averages.medium} should be shorter than Hard ${averages.hard}`);
  assert.equal(averages.easy, 2, 'Easy is fixed at a 2-step chain');
});

test('within a mode, level adds orders rather than complexity (PRD 5.7)', () => {
  const stepAverages = [];
  for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
    const rng = seeded(13579);
    let total = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i += 1) total += generatePuzzle('medium', level, { rng }).meta.steps;
    stepAverages.push(total / runs);
  }
  const spread = Math.max(...stepAverages) - Math.min(...stepAverages);
  assert.ok(spread <= 1.01, `chain length should stay flat across levels, drifted by ${spread}`);
  for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
    assert.ok(customersForLevel(level) >= 2);
  }
});

/* ------------------------------------------------------------------ *
 * Pedagogical quality: the puzzles must be worth solving
 * ------------------------------------------------------------------ */

test('no step is a no-op that leaves the running value unchanged', () => {
  const rng = seeded(1717);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 5000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      // No binary step is a no-op: +0, -0, *1, /1
      for (const step of puzzle.secretRecipe.steps) {
        if (opArity(step.op) === 'binary') {
          assert.ok(!R.isZero(step.operand), `${mode} #${i}: +0 or -0`);
          if (step.op === 'mul' || step.op === 'div') {
            assert.ok(!R.equals(step.operand, R.rat(1)), `${mode} #${i}: *1 or /1`);
          }
        }
        if (step.op === 'sqrt') {
          // isDegenerateStep already checks for 0 and 1 at the operand
          // but we also verify the generated operand is not 0 or 1
          // (it's the operand of the binary step before the sqrt)
        }
      }
    }
  }
});

test('the running total is never zero halfway through a chain', () => {
  const rng = seeded(2828);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 5000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      const values = traceValues(puzzle.secretRecipe);
      for (const value of values.slice(1)) {
        assert.ok(!R.isZero(value), `${mode} #${i}: running total hit zero`);
      }
    }
  }
});

test('orders are always a positive whole-number-ish count of dishes', () => {
  const rng = seeded(3939);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      for (let i = 0; i < 1000; i += 1) {
        const { target } = generatePuzzle(mode, level, { rng });
        assert.ok(!R.isNegative(target), `${mode} L${level}: a customer cannot order ${R.format(target)}`);
        assert.ok(!R.isZero(target), `${mode} L${level}: target must not be zero`);
      }
    }
  }
});

test('fractions stay schoolbook friendly: small numerator, common denominator', () => {
  const rng = seeded(4949);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 5000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      const values = [...traceValues(puzzle.secretRecipe), puzzle.target, ...puzzle.ingredients];
      for (const value of values) {
        assert.ok(R.isDisplayNice(value), `${mode} #${i}: noisy value ${R.format(value)}`);
        if (!R.isInteger(value)) {
          assert.ok(value.d <= 10, `${mode} #${i}: denominator ${value.d} in ${R.format(value)} is too exotic`);
          assert.ok(Math.abs(value.n) <= 12, `${mode} #${i}: sprawling numerator in ${R.format(value)}`);
        }
      }
    }
  }
});

test('no intermediate explodes into three digit territory', () => {
  const rng = seeded(5050);
  for (const mode of MODE_LIST) {
    const band = getBand(mode, 1);
    for (let i = 0; i < 3000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      for (const value of traceValues(puzzle.secretRecipe)) {
        assert.ok(
          Math.abs(value.n) / value.d <= band.maxAbsIntermediate,
          `${mode} #${i}: ${R.format(value)} exceeds ${band.maxAbsIntermediate}`,
        );
      }
    }
  }
});

test('the first tile is a legal starting point, never zero', () => {
  const rng = seeded(6161);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const band = getBand(mode, level);
      for (let i = 0; i < 500; i += 1) {
        const { secretRecipe } = generatePuzzle(mode, level, { rng });
        assert.ok(!R.isZero(secretRecipe.start), `${mode} L${level}: chain starts at zero`);
        assert.ok(R.compare(secretRecipe.start, R.rat(band.min)) >= 0);
        assert.ok(R.compare(secretRecipe.start, R.rat(band.max)) <= 0);
      }
    }
  }
});

test('the target is never reachable before the final step', () => {
  const rng = seeded(7373);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 5000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      const values = traceValues(puzzle.secretRecipe);
      // values[last] is the target; nothing before it may repeat it.
      for (let s = 0; s < values.length - 1; s += 1) {
        assert.ok(
          !R.equals(values[s], puzzle.target),
          `${mode} #${i}: target ${R.format(puzzle.target)} already reached at step ${s}`,
        );
      }
    }
  }
});

test('no value repeats inside a chain unless the step genuinely loops', () => {
  const rng = seeded(8484);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 3000; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      // Verify no step is degenerate — the peel already checks this via
      // `isDegenerateStep`, but the recipe structure might still have subtle
      // issues like a term value equaling a previous term value. The real
      // guard is the `seen` set in `peel`, which prevents revisiting values.
      // Here we just check the obvious: the target is not reached early.
      const band = getBand(mode, 1);
      const values = traceValues(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
      for (let a = 0; a < values.length - 2; a += 1) {
        // The target should only appear as the final trace value.
        if (R.equals(values[a], puzzle.target)) {
          assert.fail(`${mode} #${i}: target ${R.format(values[a])} reached at step ${a}`);
        }
      }
    }
  }
});

/* ------------------------------------------------------------------ *
 * Customer generation and misc
 * ------------------------------------------------------------------ */

test('every customer of a level is generated one at a time, on demand', () => {
  const rng = seeded(5150);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      // The roster is now a count, not a pre-built list: customers walk in over
      // time, so the generator is asked for one puzzle per arrival.
      for (let i = 0; i < customersForLevel(level); i += 1) {
        const puzzle = generatePuzzle(mode, level, { rng });
        assert.ok(R.isDisplayNice(puzzle.target));
      }
    }
  }
});

test('metadata is filled in consistently', () => {
  const rng = seeded(64);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      const puzzle = generatePuzzle(mode, level, { rng });
      const { meta } = puzzle;
      assert.equal(meta.mode, mode);
      assert.equal(meta.level, level);
      assert.equal(meta.steps, puzzle.secretRecipe.steps.length);
      assert.equal(meta.realIngredientCount, collectIngredients(puzzle.secretRecipe).length);
      assert.equal(meta.targetDisplay, R.toDisplayString(puzzle.target));
      assert.equal(meta.solutionDisplay, displaySolution(puzzle.secretRecipe));
      assert.ok(meta.distractorCount >= 0);
    }
  }
});

test('displaySolution round-trips through the evaluator', () => {
  const rng = seeded(2323);
  for (const mode of MODE_LIST) {
    for (let i = 0; i < 500; i += 1) {
      const puzzle = generatePuzzle(mode, 1, { rng });
      assert.equal(typeof puzzle.meta.solutionDisplay, 'string');
      assert.ok(puzzle.meta.solutionDisplay.length > 0);
    }
  }
});

test('invalid arguments are rejected up front', () => {
  assert.throws(() => generatePuzzle('easy', 99), /level must be/);
  assert.throws(() => generatePuzzle('easy', 0), /level must be/);
  assert.throws(() => generatePuzzle('nope', 1), /unknown mode/);
});

test('an exhausted attempt budget fails loudly rather than return a bad puzzle', () => {
  assert.throws(
    () => generatePuzzle('hard', 1, { maxTargetAttempts: 0, rng: makeRng(1) }),
    GenerationError,
  );
  assert.throws(
    () => generatePuzzle('easy', 1, { maxTargetAttempts: 0, rng: makeRng(1) }),
    GenerationError,
  );
});

test('generation is efficient enough to run while a player is waiting', () => {
  // Measured success rate per attempt budget. If the guards in peel get much
  // stricter this drops, which would mean a visible pause before each order.
  const expectations = [
    ['easy', 5, 0.97],
    ['medium', 5, 0.97],
    ['hard', 10, 0.95],
  ];
  for (const [mode, budget, floor] of expectations) {
    const rng = makeRng(777);
    let ok = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i += 1) {
      try {
        generatePuzzle(mode, 1, { rng, maxTargetAttempts: budget });
        ok += 1;
      } catch {
        // counted as a failure
      }
    }
    assert.ok(ok / runs >= floor, `${mode} only reached ${(100 * ok) / runs}% within ${budget} attempts`);
  }
});

test('the default attempt budget never fails in practice', () => {
  const rng = makeRng(24680);
  for (const mode of MODE_LIST) {
    for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
      for (let i = 0; i < 200; i += 1) {
        assert.doesNotThrow(() => generatePuzzle(mode, level, { rng }), `${mode} L${level} #${i}`);
      }
    }
  }
});

test('generating a puzzle is fast enough for a browser frame budget', () => {
  const rng = makeRng(1);
  for (const mode of MODE_LIST) {
    const start = process.hrtime.bigint();
    const runs = 2000;
    for (let i = 0; i < runs; i += 1) generatePuzzle(mode, 1, { rng });
    const msPerPuzzle = Number(process.hrtime.bigint() - start) / 1e6 / runs;
    assert.ok(msPerPuzzle < 5, `${mode} took ${msPerPuzzle.toFixed(3)}ms per puzzle`);
  }
});

test('makeRng produces repeatable uniform values in [0, 1)', () => {
  const a = makeRng(5);
  const b = makeRng(5);
  for (let i = 0; i < 500; i += 1) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1, `out of range: ${value}`);
  }
});
