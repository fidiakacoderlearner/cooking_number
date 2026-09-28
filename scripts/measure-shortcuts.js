/**
 * How often a puzzle can be solved with fewer tiles than the chain it was built
 * from.
 *
 * The generator guarantees solvability: it holds a complete recipe and checks it
 * reaches the target. What it does not guarantee is that the recipe is the
 * *shortest* way there. A rack of [3, 4, 5] and a target of 20 might be designed
 * around a three-tile chain, while `4 * 5` is two tiles and the same number, so
 * the designed chain is decoration the player never has to cook.
 *
 * This matters because the evaluation rule is about to change. Precedence gives
 * the player more ways to reach a number, so it can only make shortcuts more
 * common, and PLAN.md section 4 refuses to land that change without a
 * before/after number. This script is that number.
 *
 *   node scripts/measure-shortcuts.js
 *   node scripts/measure-shortcuts.js --count 40 --seed 7
 *
 * The search is exhaustive per puzzle rather than sampled, so each percentage is
 * the real one for the puzzles drawn. It stays out of `npm test` because an
 * exhaustive walk over every arrangement is far too slow to run on every test.
 */

import {
  MODE_LIST,
  LEVELS_PER_MODE,
  getBand,
} from '../src/core/difficulty.js';
import { generatePuzzle, makeRng } from '../src/core/generator.js';
import { evaluate, ingredientCount } from '../src/core/evaluate.js';
import { consumesOperand } from '../src/core/operators.js';
import * as R from '../src/core/rational.js';

const argv = process.argv.slice(2);

function option(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? fallback : argv[index + 1];
}

const count = Number(option('count', 20));
const seed = Number(option('seed', 20261026));
const nodeBudget = Number(option('budget', 400000));

/**
 * Why the search stops at 4 tiles rather than running to the end of the rack.
 *
 * The largest chain the generator builds is 5 ingredients, so a solution using
 * 4 or fewer tiles is already shorter than the designed one, and that is the
 * whole question. Going deeper costs roughly the branching factor again per
 * level and only ever returns chains that are the same length as the designed
 * one, which is not the number anyone needs.
 */
const MAX_TILES = 4;

/**
 * Every value a rack tile can stand for once unaries are folded into it.
 *
 * Unary steps consume no ingredient, so `9` with a root on it is still one tile.
 * Building the list once up front turns "where does a unary go" into "which of
 * these values", which is what makes the exhaustive walk affordable.
 */
function variantsOf(value, band) {
  const out = [value];
  for (const op of band.unaryOps) {
    for (let exponent = 2; exponent <= (band.maxPowExponent ?? 2); exponent += 1) {
      try {
        const next = evaluate(
          { start: value, steps: [{ op, exponent }] },
          { maxPowExponent: band.maxPowExponent },
        );
        if (R.isDisplayNice(next)) out.push(next);
      } catch {
        // A root of a non-square and an exponent past the band are both ordinary
        // outcomes here, not failures worth stopping for.
      }
    }
  }
  return out;
}

/** Can `target` be reached using at most `tiles` rack tiles? */
function reachable(rack, target, band, tiles) {
  const limit = Math.abs(band.maxAbsIntermediate);
  const binary = band.binaryOps.filter((op) => consumesOperand(op));
  const variants = rack.map((value) => variantsOf(value, band));
  const used = new Array(rack.length).fill(false);
  let budget = nodeBudget;

  const fits = (value) => Math.abs(value.n) / value.d <= limit;

  function step(depth, value) {
    if (depth === 0) return R.equals(value, target);

    for (let i = 0; i < rack.length; i += 1) {
      if (used[i]) continue;
      for (const candidate of variants[i]) {
        if (R.equals(candidate, target)) return true;
        if (depth === 1) continue;

        for (const op of binary) {
          let next;
          try {
            next = evaluate(
              { start: value, steps: [{ op, operand: candidate }] },
              { maxPowExponent: band.maxPowExponent },
            );
          } catch {
            continue;
          }
          // The magnitude prune is not an optimisation. `maxAbsIntermediate` is
          // the limit the generator holds its own chains to, so a prefix outside
          // it could never be part of a legal solution. Searching past it would
          // find chains the game itself calls invalid.
          if (!fits(next)) continue;
          if (budget-- <= 0) throw new Error('node budget exhausted');
          used[i] = true;
          if (step(depth - 1, next)) {
            used[i] = false;
            return true;
          }
          used[i] = false;
        }
      }
    }
    return false;
  }

  try {
    for (let i = 0; i < rack.length; i += 1) {
      for (const candidate of variants[i]) {
        if (R.equals(candidate, target)) return true;
        if (tiles === 1) continue;
        for (const op of binary) {
          let next;
          try {
            next = evaluate(
              { start: rack[i], steps: [{ op, operand: candidate }] },
              { maxPowExponent: band.maxPowExponent },
            );
          } catch {
            continue;
          }
          if (!fits(next)) continue;
          if (budget-- <= 0) throw new Error('node budget exhausted');
          used[i] = true;
          if (step(tiles - 1, next)) {
            used[i] = false;
            return true;
          }
          used[i] = false;
        }
      }
    }
  } catch {
    return null;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const rng = makeRng(seed);

console.log(
  `shortcut measurement  seed ${seed}  ${count} puzzles per level  up to ${MAX_TILES} tiles\n`,
);
console.log('mode  lvl  chain  shorter  within  inconclusive');
console.log('---------------------------------------------------');

let inconclusiveTotal = 0;

for (const mode of MODE_LIST) {
  for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
    const band = getBand(mode, level);
    let chainTotal = 0;
    let shorter = 0;
    let inconclusive = 0;

    for (let i = 0; i < count; i += 1) {
      const puzzle = generatePuzzle(mode, level, { rng });
      const designed = ingredientCount(puzzle.secretRecipe);
      chainTotal += designed;

      let found = false;
      let exhausted = false;
      for (let tiles = 1; tiles <= Math.min(MAX_TILES, designed - 1); tiles += 1) {
        const hit = reachable(puzzle.ingredients, puzzle.target, band, tiles);
        if (hit === null) {
          exhausted = true;
          break;
        }
        if (hit) {
          found = true;
          break;
        }
      }
      if (exhausted) inconclusive += 1;
      else if (found) shorter += 1;
    }

    inconclusiveTotal += inconclusive;
    const pct = (n) => String(Math.round((n / count) * 100)).padStart(4) + '%';
    console.log(
      mode.padEnd(6)
      + String(level).padEnd(4)
      + (chainTotal / count).toFixed(1).padStart(6)
      + '  ' + pct(shorter)
      + '  ' + pct(count - shorter - inconclusive)
      + '  ' + String(inconclusive).padStart(7),
    );
  }
}

console.log('\n"chain"   mean number of ingredients in the designed solution.');
console.log('"shorter" puzzles a player can solve using fewer tiles than that.');
console.log('"within"  puzzles where the designed chain is already the shortest.');
if (inconclusiveTotal > 0) {
  console.log(`\n${inconclusiveTotal} puzzle(s) exhausted the node budget and are excluded.`);
  console.log('A real number needs a bigger budget, not a guess.');
}
