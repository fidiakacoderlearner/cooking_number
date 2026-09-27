/**
 * Prints a sample of puzzles per mode and level so they can be eyeballed for
 * pedagogical sense. Nothing here is used by the game.
 *
 *   npm run inspect
 *   node scripts/inspect-puzzles.js --mode hard --count 15
 */

import {
  MODE_LIST,
  LEVELS_PER_MODE,
  getBand,
  customersForLevel,
  baseArrivalSeconds,
  patienceSeconds,
} from '../src/core/difficulty.js';
import { evaluate, traceValues } from '../src/core/evaluate.js';
import { generatePuzzle, makeRng } from '../src/core/generator.js';
import { toFractionString, toDisplayString } from '../src/core/rational.js';

const argv = process.argv.slice(2);

function option(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return argv[index + 1];
}

const modeFilter = option('mode', null);
const count = Number(option('count', 8));
const seed = Number(option('seed', 20261026));
const modes = modeFilter ? [modeFilter] : MODE_LIST;

const rng = makeRng(seed);

for (const mode of modes) {
  console.log(`\n=== ${mode.toUpperCase()} ===`);
  for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
    const band = getBand(mode, level);
    console.log(
      `\nLevel ${level}  (${customersForLevel(level)} customers, tiles ${band.ingredientMin}-${band.ingredientMax}, ` +
        `ingredients +/-${band.maxAbsIngredient}, arrives every ~${baseArrivalSeconds(mode, level)}s, ` +
        `patience ${patienceSeconds(mode, level)}s, ops: [${band.binaryOps.join(', ')}] ` +
        `unary: [${band.unaryOps.join(', ') || '-'}])`,
    );
    for (let i = 0; i < count; i += 1) {
      const puzzle = generatePuzzle(mode, level, { rng });
      const reached = evaluate(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent });
      const tiles = puzzle.ingredients.map((v) => toFractionString(v)).join('  ');
      const chain = traceValues(puzzle.secretRecipe, { maxPowExponent: band.maxPowExponent })
        .map((v) => toFractionString(v))
        .join(' -> ');
      const solved = reached.n === puzzle.target.n && reached.d === puzzle.target.d;
      console.log(
        `  target ${String(toDisplayString(puzzle.target)).padStart(5)}   ` +
          `rack [ ${tiles} ]   ` +
          `steps ${puzzle.meta.steps} (unary ${puzzle.meta.unarySteps})   ` +
          `distractors ${puzzle.meta.distractorCount}   ` +
          `${solved ? 'OK' : 'BROKEN'}   ${chain}`,
      );
    }
  }
}

console.log('\nOK in the last column means the printed chain actually reaches the target.\n');
