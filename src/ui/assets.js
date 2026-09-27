/**
 * Asset paths and the operator palette definition.
 *
 * Everything visual that could later be replaced by team art is referenced from
 * here and nowhere else, so swapping in real assets is a one-file change
 * (AGENTS.md rule 5).
 */

import { getBand } from '../core/difficulty.js';

const PLACEHOLDER_DIR = 'assets/placeholder/';

export const ASSETS = {
  background: `${PLACEHOLDER_DIR}bg.webp`,
  table: `${PLACEHOLDER_DIR}table.webp`,
  plate: `${PLACEHOLDER_DIR}plate.webp`,
  chefHat: `${PLACEHOLDER_DIR}chef-hat.webp`,
  customers: [
    `${PLACEHOLDER_DIR}customer-1.webp`,
    `${PLACEHOLDER_DIR}customer-2.webp`,
    `${PLACEHOLDER_DIR}customer-3.webp`,
  ],
};

/**
 * Operator palette.
 *
 * `arity` mirrors the core: binary operators need a right-hand operand tile,
 * unary operators act on the running total alone. `slotHint` keeps the two
 * shapes visually distinct in the UI (PRD 5.3).
 *
 * `labelKey` points into i18n.js rather than holding English text, so the
 * accessible name of every tile changes with the language toggle (rule 8).
 */
export const OPERATORS = {
  add: { key: 'add', symbol: '+', labelKey: 'op.add', arity: 'binary' },
  sub: { key: 'sub', symbol: '\u2212', labelKey: 'op.sub', arity: 'binary' },
  mul: { key: 'mul', symbol: '\u00d7', labelKey: 'op.mul', arity: 'binary' },
  div: { key: 'div', symbol: '\u00f7', labelKey: 'op.div', arity: 'binary' },
  pow2: { key: 'pow', symbol: '\u00b2', labelKey: 'op.pow2', arity: 'unary', exponent: 2 },
  pow3: { key: 'pow', symbol: '\u00b3', labelKey: 'op.pow3', arity: 'unary', exponent: 3 },
  sqrt: { key: 'sqrt', symbol: '\u221a', labelKey: 'op.sqrt', arity: 'unary' },
};

/**
 * Operators offered at one rung of the ladder, binary and unary.
 *
 * Read from the band rather than from a fixed list, because the generator is
 * restricted to the same band. A version of this function that handed out all
 * four binary operators regardless put times and divide on the Easy level 1
 * rack, where no Easy level 1 puzzle ever uses them: solvable, but not the calm
 * tutorial PRD 5.1 asks for, and the tiles on screen no longer matched the
 * puzzle.
 */
export function operatorsForMode(band) {
  const list = (band.binaryOps ?? []).map((key) => OPERATORS[key]);

  for (const opKey of band.unaryOps ?? []) {
    if (opKey === 'pow') {
      for (let exponent = 2; exponent <= (band.maxPowExponent ?? 2); exponent += 1) {
        list.push(OPERATORS[`pow${exponent}`]);
      }
    } else if (opKey === 'sqrt') {
      list.push(OPERATORS.sqrt);
    }
  }
  return list;
}

/** Pick a customer portrait, cycling so long levels do not repeat one face. */
export function customerFor(index) {
  const list = ASSETS.customers;
  return list[index % list.length];
}

/** The widest operator set a mode ever offers, for the menu preview. */
export function operatorsForLevel(mode, level) {
  return operatorsForMode(getBand(mode, level));
}
