/**
 * Exact rational arithmetic.
 *
 * A Rational is a plain object `{ n, d }` where `n` is the numerator and `d` the
 * denominator, always normalised so that `d > 0`, `gcd(|n|, d) === 1` and
 * `d === 1` for integers. Instances are frozen: every operation returns a new
 * Rational, so recipes stay safe to share and to evaluate more than once.
 *
 * We avoid floating point entirely because the game must never show `0.1 + 0.2`
 * style artefacts to a player. Magnitudes are deliberately small (results are
 * rejected once they leave the safe-integer range), which is all the
 * difficulty levels need.
 */

export class RationalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RationalError';
  }
}

export class DivisionByZeroError extends RationalError {
  constructor() {
    super('division by zero');
    this.name = 'DivisionByZeroError';
  }
}

export class NotPerfectSquareError extends RationalError {
  constructor(value) {
    super(`sqrt of ${value} is not an integer`);
    this.name = 'NotPerfectSquareError';
  }
}

export class NotIntegerError extends RationalError {
  constructor(what) {
    super(`${what} is not an integer`);
    this.name = 'NotIntegerError';
  }
}

export class OutOfRangeError extends RationalError {
  constructor(detail) {
    super(`value out of safe range: ${detail}`);
    this.name = 'OutOfRangeError';
  }
}

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

/** Denominators a 12-15 year old meets constantly in school. Anything else
 * (7, 9, 11, 12, 15, ...) turns a dish into `1/7` and reads as noise. */
const NICE_DENOMINATORS = new Set([1, 2, 3, 4, 5, 6, 8, 10]);

/** A proper fraction also needs a small numerator, otherwise `97/6` slips
 * through on a permitted denominator and looks like noise. */
const MAX_DISPLAY_NUMERATOR = 12;

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/**
 * Build a normalised Rational from integers.
 * @param {number} n numerator
 * @param {number} [d=1] denominator
 * @returns {{n: number, d: number}}
 */
export function rat(n, d = 1) {
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    throw new NotIntegerError(`rational part ${n}/${d}`);
  }
  if (d === 0) throw new DivisionByZeroError();
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) {
    throw new OutOfRangeError(`${n}/${d}`);
  }
  return Object.freeze({ n, d });
}

export const ZERO = rat(0);
export const ONE = rat(1);
export const TWO = rat(2);

/** Convenience: is this value a plain integer (including negative and zero)? */
export function isRational(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isInteger(value.n) &&
    Number.isInteger(value.d) &&
    value.d > 0
  );
}

export function add(a, b) {
  return rat(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a, b) {
  return rat(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a, b) {
  return rat(a.n * b.n, a.d * b.d);
}

export function div(a, b) {
  if (b.n === 0) throw new DivisionByZeroError();
  return rat(a.n * b.d, a.d * b.n);
}

export function neg(a) {
  return rat(-a.n, a.d);
}

export function abs(a) {
  return a.n < 0 ? rat(-a.n, a.d) : a;
}

export function equals(a, b) {
  return a.n === b.n && a.d === b.d;
}

export function compare(a, b) {
  return a.n * b.d - b.n * a.d;
}

export function isZero(a) {
  return a.n === 0;
}

/**
 * Defensive check for values that bypassed `rat()`. The `rat` constructor
 * already rejects NaN and Infinity, so anything reaching this as a "Rational"
 * came from foreign code and must not be trusted.
 */
export function isFiniteValue(a) {
  return isRational(a) && Number.isFinite(a.n) && Number.isFinite(a.d);
}

export function isInteger(a) {
  return a.d === 1;
}

export function isNegative(a) {
  return a.n < 0;
}

export function min(a, b) {
  return compare(a, b) <= 0 ? a : b;
}

export function max(a, b) {
  return compare(a, b) >= 0 ? a : b;
}

/** Integer exponent, positive or negative. */
export function pow(a, exp) {
  if (!Number.isInteger(exp)) throw new NotIntegerError(`exponent ${exp}`);
  if (exp === 0) return ONE;
  if (exp < 0) {
    if (a.n === 0) throw new DivisionByZeroError();
    return pow(rat(a.d, a.n), -exp);
  }
  let n = 1;
  let d = 1;
  for (let i = 0; i < exp; i += 1) {
    n *= a.n;
    d *= a.d;
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) {
      throw new OutOfRangeError(`${a} ^ ${exp}`);
    }
  }
  return rat(n, d);
}

/**
 * Integer square root of a Rational. Requires the result to be a whole number
 * or fraction, which is what the Hard mode "perfect square only" rule needs.
 */
export function sqrt(a) {
  if (a.n < 0) throw new NotPerfectSquareError(format(a));
  const scaled = a.n * a.d; // value = scaled / a.d^2
  if (!Number.isSafeInteger(scaled)) throw new OutOfRangeError(`sqrt ${a}`);
  const dRoot = Math.round(Math.sqrt(a.d));
  if (dRoot * dRoot !== a.d) throw new NotPerfectSquareError(format(a));
  const nRoot = Math.round(Math.sqrt(a.n));
  if (nRoot * nRoot !== a.n) throw new NotPerfectSquareError(format(a));
  return rat(nRoot, dRoot);
}

/**
 * Would this value read well on an ingredient tile? Rejects noisy denominators
 * (7, 9, 11, 12, 15) and sprawling numerators (`97/6`), which are
 * mathematically fine but pedagogically useless for a junior high puzzle.
 */
export function isDisplayNice(a) {
  if (!isRational(a)) return false;
  if (a.d === 1) return Math.abs(a.n) <= 9999;
  if (!NICE_DENOMINATORS.has(a.d)) return false;
  return Math.abs(a.n) <= MAX_DISPLAY_NUMERATOR;
}

/** `n/d`, collapsing to `n` for integers. */
export function toFractionString(a) {
  return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
}

/**
 * Does this value have a finite decimal expansion? True when the reduced
 * denominator has no prime factors other than 2 and 5.
 */
export function hasTerminatingDecimal(a) {
  if (a.d === 1) return true;
  let rest = a.d;
  while (rest % 2 === 0) rest /= 2;
  while (rest % 5 === 0) rest /= 5;
  return rest === 1;
}

/**
 * How a value should be shown to a player.
 *
 * Terminating decimals are shown as decimals (`3/4` -> `0.75`) because they read
 * naturally. Everything else keeps its fraction form, because rounding `2/3` to
 * `0.667` would teach a student an outright lie.
 */
export function toDisplayString(a, maxDecimalPlaces = 3) {
  if (a.d === 1) return String(a.n);
  if (hasTerminatingDecimal(a)) return toDecimalString(a, maxDecimalPlaces);
  return toFractionString(a);
}

/** `n/d` or a rounded decimal, whichever the caller asked for. */
export function toDecimalString(a, maxDecimalPlaces = 3) {
  if (a.d === 1) return String(a.n);
  const value = a.n / a.d;
  if (Math.abs(value) >= 1e6) throw new OutOfRangeError(`decimal ${a}`);
  return trimTrailingZeros(value.toFixed(maxDecimalPlaces));
}

function trimTrailingZeros(text) {
  if (!text.includes('.')) return text;
  return text.replace(/\.?0+$/, '');
}

/** Human readable form used in errors and the puzzle inspector. */
export function format(a) {
  return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
}

/** Compact `n/d`-with-mixed-number-free representation for logs. */
export function toKey(a) {
  return `${a.n}/${a.d}`;
}
