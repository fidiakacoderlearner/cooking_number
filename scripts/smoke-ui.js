/**
 * Drives the real game in a real browser and checks the things unit tests
 * cannot reach: that the modules load, that customers actually arrive over
 * time, that a dish can be built using only what is on screen, and that
 * serving works.
 *
 *   npm run smoke                 # easy L1, medium L1, hard L1, hard L3
 *   npm run smoke -- --only easy  # the quick loop, about 90 seconds
 *   npm run smoke -- --all        # all 15 mode x level combinations
 *   npm run smoke -- --level 3    # the default set, level 3 only
 *   npm install --no-save puppeteer-core@23
 *
 * Every level is played from the menu with nothing but what a player can see and
 * tap, and the level only counts as a pass when the whole roster is served and
 * the level-complete overlay opens. That is why Medium and Hard are in the
 * default set rather than a follow-up: the maths is proven, the *UI path* is
 * not, and the UI path is where the unsolved bugs live.
 *
 * The solver deliberately never touches `secretRecipe`. It reads the target off
 * the customer chip and the tiles off the rack, so a puzzle that only makes
 * sense with knowledge the player does not have will fail here.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { customersForLevel, getBand, MAX_ON_SCREEN } from '../src/core/difficulty.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const PORT = 8099;

/** A level may only take as long as the real thing would, plus slack. */
const LEVEL_DEADLINE_MS = 8 * 60 * 1000;

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/**
 * The levels the default run plays.
 *
 * Hard L3 is in the set because it is the first level that unlocks `sqrt`, and
 * because the generator starts emitting two unary steps in a row there. A
 * default run that stopped at Hard L1 would never touch either.
 */
const DEFAULT_COMBOS = Object.freeze([
  { mode: 'easy', level: 1, detailed: true },
  { mode: 'medium', level: 1 },
  { mode: 'hard', level: 1 },
  { mode: 'hard', level: 3 },
]);

let failures = 0;
let notes = 0;

function ok(message) {
  console.log(`  ok   ${message}`);
}

function fail(message) {
  failures += 1;
  console.log(`  FAIL ${message}`);
}

function note(message) {
  notes += 1;
  console.log(`  note ${message}`);
}

/** Fail the whole run. A silent pass here would hide a broken game. */
function must(condition, message) {
  if (condition) ok(message);
  else fail(message);
  return Boolean(condition);
}

/**
 * Same verdict, but only successes are printed when the run is not verbose.
 *
 * The per-customer checks run once per customer per level; printing every
 * success would bury the failures. A failure is always printed.
 */
function check(condition, message, { verbose }) {
  if (verbose) return must(condition, message);
  if (!condition) fail(message);
  return Boolean(condition);
}

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = path.join(root, url === '/' ? 'index.html' : url);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

/* ------------------------------------------------------------------ *
 * In-page solver
 * ------------------------------------------------------------------ */

/**
 * Everything in this string runs inside the browser.
 *
 * The arithmetic is imported from the real core rather than reimplemented here.
 * An earlier version of this file carried its own rationals and silently dropped
 * the sign of every negative number, which made the solver confidently return
 * chains that did not reach the target. Reusing `src/core` means the test can
 * only ever disagree with the game if the game disagrees with itself.
 *
 * The only thing reimplemented here is reading a tile's label, because that is a
 * view concern: the rack shows decimals for fractions with a finite expansion,
 * and a negative tile is a plain ASCII minus while the subtract operator is a
 * typographic one.
 */
const PAGE_HELPERS = `
  (async () => {
    const R = await import('/src/core/rational.js');
    const O = await import('/src/core/operators.js');

    function parseTile(label) {
      const s = String(label).trim();
      if (s.includes('/')) {
        const [n, d] = s.split('/').map(Number);
        return R.rat(n, d);
      }
      if (s.includes('.')) {
        const [w, f = ''] = s.split('.');
        return R.rat(Number(w + f), 10 ** f.length);
      }
      return R.rat(Number(s), 1);
    }

    function applyStep(value, op) {
      try {
        return O.applyOperator(op.key, value, op.operand, { exponent: op.exponent });
      } catch {
        return null;
      }
    }

    function isZero(v) { return v.n === 0; }

    /**
     * Search for a chain reaching the target using only the tiles on the rack.
     *
     * The search mirrors how the stand evaluates: a chain starts with a value,
     * then alternates operators with values and may take unary steps, and ends
     * on a value. A unary step is tried wherever the running total allows it,
     * which is deliberately more permissive than the stand's own guard rails,
     * because a route the game refuses to accept is a bug worth failing on.
     *
     * \`maxSteps\` comes from the level's own band, so Hard is searched deeper
     * than Easy rather than sharing one number that happens to fit one of them.
     *
     * Dead branches are memoised on (used mask, depth, running value). Hard
     * offers seven tiles and three unary operators, so the un-memoised search
     * reaches hundreds of thousands of nodes on a single dish.
     */
    function solve(targetLabel, valueLabels, opSpecs, maxSteps) {
      const target = parseTile(targetLabel);
      const values = valueLabels.map(parseTile);
      const n = values.length;
      const binary = opSpecs.filter((o) => o.arity === 'binary');
      const unary = opSpecs.filter((o) => o.arity === 'unary');
      const dead = new Set();
      let mask = 0;

      function walk(current, depth, path) {
        if (depth > 0 && R.equals(current, target)) return path;
        if (depth >= maxSteps) return null;
        const key = mask + '|' + depth + '|' + R.toKey(current);
        if (dead.has(key)) return null;
        const found = search(current, depth, path);
        if (!found) dead.add(key);
        return found;
      }

      function search(current, depth, path) {
        for (const op of binary) {
          for (let i = 0; i < n; i += 1) {
            if (mask & (1 << i)) continue;
            mask |= 1 << i;
            const next = applyStep(current, { key: op.key, operand: values[i] });
            const found = next && !isZero(next)
              ? walk(
                  next,
                  depth + 1,
                  path.concat([{ kind: 'operator', label: op.label }, { kind: 'number', label: valueLabels[i] }]),
                )
              : null;
            mask &= ~(1 << i);
            if (found) return found;
          }
        }

        for (const op of unary) {
          if (isZero(current)) continue;
          const next = applyStep(current, { key: op.key, exponent: op.exponent });
          if (next && !isZero(next)) {
            const found = walk(next, depth + 1, path.concat([{ kind: 'operator', label: op.label }]));
            if (found) return found;
          }
        }
        return null;
      }

      for (let i = 0; i < n; i += 1) {
        mask = 1 << i;
        const found = walk(values[i], 0, [{ kind: 'number', label: valueLabels[i] }]);
        if (found) return found;
      }
      return null;
    }

    window.__cn = { solve, parseTile, R, O };
  })();
`;

/* ------------------------------------------------------------------ *
 * Page drivers
 * ------------------------------------------------------------------ */

const READ_QUEUE = () => {
  const chips = [...document.querySelectorAll('.chip')];
  return {
    chips: chips.map((chip) => ({
      orderId: chip.dataset.orderId,
      status: chip.dataset.status,
      target: chip.querySelector('.chip__target')?.textContent ?? '',
      seconds: Number(chip.querySelector('.chip__seconds')?.textContent ?? '0'),
    })),
    next: document.querySelector('[data-queue-next]')?.textContent ?? '',
  };
};

const READ_RACK = () => {
  const tiles = [...document.querySelectorAll('.rack__numbers .tile')];
  const ops = [...document.querySelectorAll('.rack__operators .tile')];
  return {
    values: tiles.map((n) => n.textContent),
    ops: ops.map((n) => ({
      label: n.textContent,
      key: n.dataset.tileKey,
      kind: n.dataset.tileKind,
      exponent: n.dataset.tileExponent ? Number(n.dataset.tileExponent) : undefined,
      ariaLabel: n.getAttribute('aria-label'),
    })),
    serveEnabled: !document.querySelector('[data-action="serve"]')?.disabled,
    plateValue: document.querySelector('[data-plate-value]')?.textContent ?? '',
    // The stand no longer carries a "Cooking for 7" line. The green chip is now
    // the only thing on screen that says who it is cooking for, so that is what
    // gets read back.
    cookingFor: [...document.querySelectorAll('.chip.is-cooking .chip__target')]
      .map((n) => n.textContent)[0] ?? '',
  };
};

const READ_HUD = () => ({
  level: document.querySelector('[data-hud-level]')?.textContent ?? '',
  served: document.querySelector('[data-hud-served]')?.textContent ?? '',
  score: Number(document.querySelector('[data-hud-score]')?.textContent ?? '0'),
  feedback: document.querySelector('[data-feedback-text]')?.textContent ?? '',
  overlay: [...document.querySelectorAll('.overlay')].find((o) => !o.hidden) ? 'shown' : 'none',
  overlayText: [...document.querySelectorAll('.overlay:not([hidden]) .overlay__text')].map((n) => n.textContent).join(' | '),
});

/**
 * Every control a finger has to hit, with its real size on screen.
 *
 * AGENTS.md sets 44x44px as the touch minimum, so the check is on both axes and
 * on the whole element rather than on a convenient subset. The earlier version
 * of this check only flagged heights under 32px, which is how a 32px "Cook for"
 * button survived in the primary action of every single customer.
 */
const READ_TAP_TARGETS = () => {
  const selector = [
    'button',
    '.chip',
    '.tile',
    '.level-card',
    '.mode-card',
  ].join(', ');
  return [...document.querySelectorAll(selector)]
    .filter((n) => n.getClientRects().length > 0)
    .map((n) => {
      const r = n.getBoundingClientRect();
      return {
        what: `${n.tagName.toLowerCase()}.${n.className}`.replace(/\s+/g, '.'),
        w: Math.round(r.width),
        h: Math.round(r.height),
        text: (n.textContent ?? '').trim().slice(0, 18),
      };
    });
};

/**
 * How a completely full queue fits the viewport.
 *
 * The chips are cloned from a real one so this measures the real CSS, because
 * waiting for a full queue costs a minute of real time. The count comes from
 * `MAX_ON_SCREEN` rather than being written down here, so the probe keeps
 * measuring the game that actually ships. A chip narrower than the touch minimum
 * is a gate failure; a chip pushed out of view is a finding for the playtest on
 * a real phone, not a failure here.
 */
const READ_QUEUE_FIT = (count) => {
  const strip = document.querySelector('.queue__strip');
  const real = strip?.querySelector('.chip');
  if (!real) return { skipped: true };

  const clones = [];
  for (let i = 0; i < count; i += 1) {
    const clone = real.cloneNode(true);
    strip.append(clone);
    clones.push(clone);
  }
  const viewport = document.documentElement.clientWidth;
  const boxes = clones.map((n) => {
    const r = n.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
  });
  const out = {
    viewport,
    scrollW: strip.scrollWidth,
    clientW: strip.clientWidth,
    scrollable: strip.scrollWidth > strip.clientWidth + 1,
    boxes,
  };
  for (const clone of clones) clone.remove();
  return out;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for a customer to be on screen. Returns the queue snapshot or null. */
async function waitForChip(page, timeout = 40000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const queue = await page.evaluate(READ_QUEUE);
    if (queue.chips.length > 0) return queue;
    await wait(250);
  }
  return null;
}

/** AGENTS.md touch minimum, on both axes. */
const TAP_MIN = 44;

async function checkTapTargets(page, where) {
  const targets = await page.evaluate(READ_TAP_TARGETS);
  const small = targets.filter((t) => t.w < TAP_MIN || t.h < TAP_MIN);
  must(
    small.length === 0,
    `every control at ${where} is at least ${TAP_MIN}x${TAP_MIN}px`
    + `${small.length > 0 ? `: ${small.map((t) => `${t.what} "${t.text}" ${t.w}x${t.h}`).join('; ')}` : ''}`,
  );
  const tiniest = [...targets].sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h))[0];
  if (tiniest) {
    note(`   smallest control at ${where}: "${tiniest.text}" ${tiniest.w}x${tiniest.h}px`);
  }
  return small;
}

/**
 * Drag one element onto another with real pointer events, the way a finger does.
 *
 * Everything else in this file uses `element.click()`, which never runs a single
 * line of the `interact.js` listeners in `drag.js`. The movement is broken into
 * steps because a drag that teleports is not a drag as far as interact.js is
 * concerned, and it would hide a real phone-only failure.
 *
 * `source` is `{ selector, label? }` so a tile can be named rather than merely
 * pointed at: a used ingredient is still on screen but disabled, and a disabled
 * button swallows the pointer.
 *
 * `{ midDrag }` receives a callback run while the button is still down, so a
 * caller can look at the element mid-flight. Checking only where a drag lands
 * proved to be blind to the drag being invisible: a phone playtest reported
 * never being able to see a tile move, while this test passed, because the drop
 * is resolved from the pointer position and says nothing about the tile.
 */
async function dragOnto(page, source, target, { midDrag } = {}) {
  const centre = async (spec) => page.evaluate((s) => {
    const node = [...document.querySelectorAll(s.selector)].find((n) => {
      if (n.getClientRects().length === 0 || n.disabled) return false;
      return s.label === undefined || n.textContent === s.label;
    });
    if (!node) return null;
    node.scrollIntoView({ block: 'center', inline: 'center' });
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, spec);

  const to = await centre(target);
  const from = await centre(source);
  if (!from || !to) return false;

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * step) / 8,
      from.y + ((to.y - from.y) * step) / 8,
    );
    await wait(25);
    if (midDrag && step === 5) await midDrag({ from, to });
  }
  await page.mouse.up();
  await wait(150);
  return true;}

/** A rack tile, named by what it says on it. */
function tileSource(kind, label) {
  return {
    selector: kind === 'number' ? '.rack__numbers .tile' : '.rack__operators .tile',
    label,
  };
}

const WORKSPACE = { selector: '[data-workspace]' };

/** The route from the target and the tiles, computed in the page. */
const SOLVE_ON_SCREEN = (target, values, ops, maxSteps) => window.__cn.solve(
  target,
  values,
  ops.map((o) => ({ key: o.key, label: o.label, arity: o.kind === 'unary' ? 'unary' : 'binary', exponent: o.exponent })),
  maxSteps,
);

/** The stand's own contents, in order, as the player would read them. */
const READ_STAND = () => [...document.querySelectorAll('.workspace__line .slot')].map((n) => n.textContent);

/**
 * The stand's contents in the shape the solver's plan uses.
 *
 * A root is displayed wrapped around its value (`√18`) because that is how it is
 * written, while the plan records the value and the sign as two separate steps.
 * Without this the comparison reports a chain that is actually correct as a
 * mismatch, which is how a test ends up failing the thing it was written to
 * prove. The rewrite is inlined because this runs inside the browser.
 */
const STAND_AS_PLAN = () => [...document.querySelectorAll('.workspace__line .slot')].map((n) => {
  const trimmed = String(n.textContent).trim();
  const rooted = /^\u221a(.+)$/.exec(trimmed);
  return rooted ? `${rooted[1]} \u221a` : trimmed;
});

/**
 * Tap a customer chip, which is the whole commitment.
 *
 * There used to be a "Cook for him" button after this tap. It is gone, so this is
 * the only way the stand gets loaded, and the reason the switch question lives in
 * `state.js` instead of in a second control.
 */
async function cookFor(page, orderId) {
  await page.evaluate((id) => {
    document.querySelector(`.chip[data-order-id="${id}"]`)?.click();
  }, String(orderId));
  await wait(150);
}

async function clickTile(page, kind, label) {
  const clicked = await page.evaluate(
    (k, l) => {
      const selector = k === 'number' ? '.rack__numbers .tile' : '.rack__operators .tile';
      const node = [...document.querySelectorAll(selector)].find((n) => n.textContent === l && !n.disabled);
      if (!node) return false;
      node.click();
      return true;
    },
    kind,
    label,
  );
  await wait(70);
  return clicked;
}

async function serveDish(page) {
  await page.evaluate(() => document.querySelector('[data-action="serve"]')?.click());
  await wait(200);
}

async function clearStand(page) {
  await page.evaluate(() => document.querySelector('[data-action="clear"]')?.click());
  await wait(150);
}

/** Return to the menu from wherever the game was left, overlay or not. */
async function backToMenu(page) {
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('[data-action="back-to-menu"]')) {
      if (node.getClientRects().length > 0) {
        node.click();
        return;
      }
    }
  });
  await wait(200);
}

/**
 * Flip the language from anywhere.
 *
 * The button is only rendered on the menu, so the click is dispatched rather
 * than tapped. The handler is the same one the menu button runs, and a
 * dispatched click is what makes "the labels follow the language" testable at
 * all, since the rack only exists once a level is open.
 */
async function toggleLanguage(page) {
  await page.evaluate(() => document.querySelector('[data-action="toggle-lang"]')?.click());
  await wait(200);
}

/**
 * Walk from the menu into one level, unlocking it first if it is not the first.
 *
 * Levels 2 and up are locked by progress, and finishing a level to reach the
 * next one would make the test depend on the test before it. The stored value
 * is the highest unlocked level, so seeding it is the same thing the game does
 * when a level is completed, and it only ever touches the mode under test.
 *
 * Every level gets a freshly loaded page, not just the locked ones. A run of
 * fifteen levels keeps one renderer alive for the better part of an hour on
 * this machine, and letting that session run long enough is what made the page
 * die mid-level in the first place. Reloading costs a second per level and
 * removes the whole class of flakiness.
 */
async function openLevel(page, mode, level) {
  if (level > 1) {
    await page.evaluate(
      (m, l) => {
        let all = {};
        try {
          all = JSON.parse(localStorage.getItem('cn.progress') ?? '{}') ?? {};
        } catch {
          all = {};
        }
        all[m] = Math.max(Number(all[m] ?? 1), l);
        localStorage.setItem('cn.progress', JSON.stringify(all));
      },
      mode,
      level,
    );
  }
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(PAGE_HELPERS);

  await backToMenu(page);
  await page.click(`[data-mode="${mode}"]`);
  await wait(150);
  must(await page.$('[data-screen-name="levels"]:not([hidden])') !== null, `${mode}: the level select opens`);

  // Whether the level is playable is the thing that matters. How many others
  // are locked also depends on what the run already finished, so it is not
  // asserted here; the boot check covers that on a fresh profile.
  const playable = await page.$eval(`.level-card[data-level="${level}"]`, (n) => !n.disabled);
  must(playable, `${mode} L${level}: the level is selectable`);

  await page.click(`.level-card[data-level="${level}"]`);
  await wait(300);
  return page.$('[data-screen-name="game"]:not([hidden])') !== null;
}

/**
 * Build one dish for one customer using only what is on screen.
 *
 * Returns `{ plan, plate }` on success, or a short reason string on failure.
 * The chain the stand actually holds is compared against the planned one,
 * because without that check the test can quietly pass a wrong dish to the
 * serve step and blame the game for it.
 */
async function buildDish(page, chip, { maxSteps, verbose, band, mode, level }) {
  const rack = await page.evaluate(READ_RACK);
  if (rack.values.length === 0) return { reason: 'no-stand' };

  // The rack and the generator have to read the same operator band. A rack that
  // offers tiles no puzzle in this level ever uses is a broken ladder, and this
  // is the only check standing between that and a player's screen.
  if (band) {
    const offered = rack.ops.filter((o) => o.kind !== 'unary').map((o) => o.key);
    const allowed = [...band.binaryOps];
    check(
      offered.join(' ') === allowed.join(' '),
      `${mode} L${level}: the rack offers exactly the operators this level allows`
      + ` (${offered.join(' ')} offered, ${allowed.join(' ')} expected)`,
      { verbose },
    );
    const strays = rack.ops.filter((o) => o.kind === 'unary' && !band.unaryOps.includes(o.key));
    check(
      strays.length === 0,
      `${mode} L${level}: the rack offers no unary operator this level has not unlocked`
      + `${strays.length > 0 ? ` (${strays.map((o) => o.label).join(' ')})` : ''}`,
      { verbose },
    );
  }

  const plan = await page.evaluate(
    SOLVE_ON_SCREEN,
    chip.target,
    rack.values,
    rack.ops,
    maxSteps,
  );

  if (plan === null) {
    return { reason: 'unsolvable', detail: `no on-screen route to ${chip.target} with [${rack.values.join(' ')}]` };
  }

  const planned = plan.map((p) => p.label);
  for (const step of plan) {
    if (!(await clickTile(page, step.kind, step.label))) {
      return { reason: 'tap', detail: `could not tap the ${step.kind} tile "${step.label}" for ${chip.target} (chain: ${planned.join(' ')})` };
    }
  }

  const standNow = await page.evaluate(STAND_AS_PLAN);
  if (!check(
    standNow.join(' ') === planned.join(' '),
    `${chip.target}: the stand holds exactly the planned chain (built "${standNow.join(' ')}", planned "${planned.join(' ')}")`,
    { verbose },
  )) {
    return { reason: 'chain', detail: `built "${standNow.join(' ')}" instead of "${planned.join(' ')}"` };
  }

  const built = await page.evaluate(READ_RACK);
  if (!check(built.serveEnabled, `${chip.target}: Serve lights up once the dish is built`, { verbose })) {
    return { reason: 'not-servable', detail: `the dish for ${chip.target} never became servable: plate "${built.plateValue}" from ${planned.join(' ')} over [${rack.values.join(' ')}]` };
  }
  check(built.plateValue.startsWith('='), `${chip.target}: the finished value is readable on the plate ("${built.plateValue}")`, { verbose });

  // The value has to sit on the plate without covering it. An earlier version
  // filled the plate with an opaque panel, which hid plate.webp entirely and was
  // reported as the plate image having disappeared.
  const onPlate = await page.evaluate(() => {
    const plate = document.querySelector('.counter__plate');
    const image = document.querySelector('.counter__plate-img');
    const value = document.querySelector('.counter__plate-value');
    if (!plate || !image || !value) return { found: false };
    const p = plate.getBoundingClientRect();
    const i = image.getBoundingClientRect();
    const v = value.getBoundingClientRect();
    return {
      found: true,
      imageVisible: i.width > 0 && v.width < i.width,
      plateAbove: v.top - i.top,
      plateBelow: (i.top + i.height) - (v.top + v.height),
      value: Math.round(v.width),
      image: Math.round(i.width),
    };
  });
  if (onPlate.found) {
    check(
      onPlate.imageVisible && onPlate.plateAbove > 0 && onPlate.plateBelow > 0,
      `${chip.target}: the value sits on the plate and the plate is still visible`
      + ` (value ${onPlate.value}px over a ${onPlate.image}px plate, ${Math.round(onPlate.plateAbove)}px above and ${Math.round(onPlate.plateBelow)}px below)`,
      { verbose },
    );
  }

  const onScreen = await page.evaluate(
    (t, v) => window.__cn.R.equals(window.__cn.parseTile(v.replace('=', '').trim()), window.__cn.parseTile(t)),
    chip.target,
    built.plateValue,
  );
  if (!check(onScreen, `${chip.target}: the plate reads the target (plate says "${built.plateValue}")`, { verbose })) {
    return { reason: 'wrong-value', detail: `plate says "${built.plateValue}" for target ${chip.target}` };
  }

  return { plan, plate: built.plateValue };
}

/* ------------------------------------------------------------------ *
 * One level, start to finish
 * ------------------------------------------------------------------ */

/**
 * The first customer of the first level, checked step by step.
 *
 * This is the part a player actually walks through once, so it gets the verbose
 * treatment: the queue, the two-step "cook for" flow, the dish, and the serve.
 * Everything after it is the same thing again and faster, so those checks are
 * silent unless they break.
 */
async function detailedFirstCustomer(page, { maxSteps, band, mode, level }) {
  const first = await waitForChip(page);
  if (!must(first !== null, 'a customer walks in on its own')) throw new Error('no customer arrived');
  ok(`   first customer wants ${first.chips[0].target}, patience ${first.chips[0].seconds}s`);
  must(first.chips.length === 1, `only one customer at the start (${first.chips.length})`);

  const later = await page.evaluate(READ_QUEUE);
  must(
    later.chips.length === 1,
    `still one customer after a few seconds, not a pile (${later.chips.length})`,
  );
  must(later.next.length > 0, `the next arrival is shown to the player: "${later.next}"`);

  const chip = first.chips[0];
  await page.evaluate((id) => document.querySelector(`.chip[data-order-id="${id}"]`)?.click(), chip.orderId);
  await wait(100);
  await cookFor(page, chip.orderId);

  const rack = await page.evaluate(READ_RACK);
  must(rack.values.length > 0, `the stand loaded the customer's ingredients: [${rack.values.join(' ')}]`);
  must(rack.cookingFor.includes(chip.target), `the customer being cooked for is the one that turned green (chip shows "${rack.cookingFor}", wanted "${chip.target}")`);
  must(
    rack.ops.every((o) => typeof o.ariaLabel === 'string' && o.ariaLabel.length > 0),
    'every operator tile has an accessible name',
  );
  must(rack.ops.length >= 2, `the rack offers operators: ${rack.ops.map((o) => o.label).join(' ')}`);

  const built = await buildDish(page, chip, { maxSteps, verbose: true, band, mode, level });
  if (built.reason) throw new Error(`${built.reason}: ${built.detail}`);
  ok(`   solution on screen: ${built.plan.map((p) => p.label).join(' ')}`);

  const before = await page.evaluate(READ_HUD);
  await serveDish(page);
  const after = await page.evaluate(READ_HUD);
  must(after.score > before.score, `serving the right dish scores (${before.score} -> ${after.score})`);
  must(/served|Poorly|served/i.test(after.feedback) || after.score > before.score, 'the player is told what happened');

  const queue = await page.evaluate(READ_QUEUE);
  must(!queue.chips.some((c) => c.orderId === chip.orderId), 'the served customer leaves');

  const afterRack = await page.evaluate(READ_RACK);
  must(afterRack.values.length === 0, 'the stand is empty again');

  const second = await waitForChip(page);
  if (must(second !== null, 'a second customer arrives')) {
    ok(`   second customer wants ${second.chips.map((c) => c.target).join(', ')}`);
  }
  return 1;
}

/**
 * Tiles actually on the stand.
 *
 * The empty stand renders a dashed placeholder that also carries the `slot`
 * class, so counting `.slot` counts one extra tile on an empty stand and the
 * free-switch threshold would read one too high. The selector is spelled out
 * again inside every `page.evaluate` rather than interpolated, because a closure
 * over this module does not reach the page.
 */
const STAND_TILES = '.workspace__line .slot:not(.slot--dropzone)';

/** Wait until at least `count` customers are on screen. */
async function waitForChips(page, count, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let queue = await page.evaluate(READ_QUEUE);
  while (Date.now() < deadline && queue.chips.length < count) {
    await wait(500);
    queue = await page.evaluate(READ_QUEUE);
  }
  return queue;
}

/**
 * Switching customer asks before it throws work away.
 *
 * Tapping a chip is the whole commitment now, so one tap can cost a dish. Past a
 * couple of tiles it has to ask, and the clock has to stop while it does:
 * reading a dialog must never be what makes somebody walk out.
 */
async function switchChecks(page) {
  console.log('\n--- Switching customer asks before it throws work away');
  await openLevel(page, 'hard', 1);
  const queue = await waitForChips(page, 2);
  if (!must(queue.chips.length >= 2, `two customers on screen (${queue.chips.length})`)) {
    note('   not exercised, so this run cannot vouch for it');
    return;
  }
  const [first, second] = queue.chips;

  await cookFor(page, first.orderId);
  const rack = await page.evaluate(READ_RACK);
  await clickTile(page, 'number', rack.values[0]);

  // One tile is still free: there is nothing to lose, and a dialog on every tap
  // would only teach the player to dismiss it without reading.
  const small = await page.evaluate(() => document.querySelectorAll('.workspace__line .slot:not(.slot--dropzone)').length);
  must(small <= 2, `a dish of ${small} tile(s) is under the free-switch threshold`);
  await cookFor(page, second.orderId);
  const free = await page.evaluate(() => ({
    confirm: !document.querySelector('[data-overlay="confirm"]').hidden,
    cooking: document.querySelector('.chip.is-cooking .chip__target')?.textContent ?? '',
  }));
  must(!free.confirm, 'no question is asked over a tile or two');
  must(free.cooking === second.target, `the stand simply moved to the other customer (${free.cooking})`);

  // Now build something real and try again.
  const busy = (await page.evaluate(READ_QUEUE)).chips.find((c) => c.orderId !== second.orderId);
  if (!must(busy !== undefined, 'a third customer turns up for the real test')) return;

  const rackNow = await page.evaluate(READ_RACK);
  await clickTile(page, 'number', rackNow.values[0]);
  await clickTile(page, 'operator', '\u00d7');
  await clickTile(page, 'number', rackNow.values[1] ?? rackNow.values[0]);
  const built = await page.evaluate(() => document.querySelectorAll('.workspace__line .slot:not(.slot--dropzone)').length);
  must(built > 2, `the stand holds ${built} tiles, past the threshold`);

  const secondsBefore = await page.evaluate(() => Math.max(
    ...[...document.querySelectorAll('.chip__seconds')].map((n) => Number(n.textContent)),
  ));
  await cookFor(page, busy.orderId);

  const asked = await page.evaluate(() => ({
    confirm: !document.querySelector('[data-overlay="confirm"]').hidden,
    body: document.querySelector('[data-confirm-body]')?.textContent ?? '',
    focused: document.activeElement?.dataset?.confirm ?? '',
    stand: document.querySelectorAll('.workspace__line .slot:not(.slot--dropzone)').length,
    cooking: document.querySelector('.chip.is-cooking .chip__target')?.textContent ?? '',
  }));
  must(asked.confirm, 'switching with a real dish on the stand asks first');
  must(
    asked.stand === built && asked.cooking === second.target,
    `the dish and the customer survive the question (${asked.stand} tiles, cooking for "${asked.cooking}")`,
  );
  must(asked.body.length > 0, `the question actually says something ("${asked.body}")`);
  must(asked.focused === 'stay', `the safe answer has the keyboard focus (got "${asked.focused}")`);

  // The clock has to be stopped, and whoever is still waiting must be no closer
  // to walking out than before the question was opened.
  await wait(2500);
  const secondsAfter = await page.evaluate(() => Math.max(
    ...[...document.querySelectorAll('.chip__seconds')].map((n) => Number(n.textContent)),
  ));
  must(
    secondsAfter >= secondsBefore - 1,
    `nobody's patience drains while the question is open (${secondsBefore}s before, ${secondsAfter}s after)`,
  );

  await page.evaluate(() => document.querySelector('[data-confirm="stay"]')?.click());
  await wait(250);
  const stayed = await page.evaluate(() => ({
    confirm: !document.querySelector('[data-overlay="confirm"]').hidden,
    cooking: document.querySelector('.chip.is-cooking .chip__target')?.textContent ?? '',
    stand: document.querySelectorAll('.workspace__line .slot:not(.slot--dropzone)').length,
  }));
  must(!stayed.confirm, 'the question closes');
  must(
    stayed.cooking === second.target && stayed.stand === built,
    'answering "keep cooking" changes nothing at all',
  );

  // The clock has to be running again afterwards, or the rest of the level
  // would quietly stop.
  const secondsStart = await page.evaluate(() => Math.max(
    ...[...document.querySelectorAll('.chip__seconds')].map((n) => Number(n.textContent)),
  ));
  await wait(2500);
  const secondsRunning = await page.evaluate(() => Math.max(
    ...[...document.querySelectorAll('.chip__seconds')].map((n) => Number(n.textContent)),
  ));
  must(
    secondsRunning < secondsStart,
    `the clock runs again after the question (${secondsStart}s then ${secondsRunning}s)`,
  );

  // The question has to be usable on a small phone, and it is the one piece of
  // the interface that was never seen at that width: the switch check runs at the
  // default phone size, and the narrow-phone section of the run happens later
  // with no dialog open.
  console.log('\n--- The question is usable on a small phone');
  await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true });
  await wait(300);
  await cookFor(page, busy.orderId);
  const narrowQuestion = await page.evaluate(() => {
    const dialog = document.querySelector('[data-overlay="confirm"]');
    if (!dialog || dialog.hidden) return { open: false };
    const card = dialog.querySelector('.overlay__card');
    const buttons = [...dialog.querySelectorAll('.btn')].map((n) => {
      const r = n.getBoundingClientRect();
      return { text: n.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) };
    });
    const r = card.getBoundingClientRect();
    return {
      open: true,
      buttons,
      fits: r.left >= 0 && r.right <= document.documentElement.clientWidth,
      overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  must(narrowQuestion.open, 'the question opens on a 320px screen too');
  must(narrowQuestion.fits && !narrowQuestion.overflows, 'the question fits a 320px screen with nothing cut off');
  must(
    narrowQuestion.buttons.every((b) => b.w >= TAP_MIN && b.h >= TAP_MIN),
    `both answers are at least ${TAP_MIN}x${TAP_MIN}px on a small phone`
    + ` (${narrowQuestion.buttons.map((b) => `"${b.text}" ${b.w}x${b.h}`).join(', ')})`,
  );
  await page.evaluate(() => document.querySelector('[data-confirm="stay"]')?.click());
  await wait(200);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await wait(300);
}

/**
 * Drag and drop, which is the half of the input model the rest of this file
 * never touches.
 *
 * Tap-to-place is the mobile fallback and is covered everywhere else, so this is
 * the only place the `interact.js` listeners in `drag.js` actually run. Three
 * things have to work: a number tile dragged onto the stand, a unary tile
 * dragged onto the stand, and the plate dragged onto a customer to serve.
 */
async function dragChecks(page) {
  console.log('\n--- Drag and drop (pointer path)');
  await openLevel(page, 'easy', 1);
  const queue = await waitForChip(page);
  if (!must(queue !== null, 'a customer walks in before the drag test')) return;
  const chip = queue.chips[0];
  await cookFor(page, chip.orderId);

  const band = getBand('easy', 1);
  const rack = await page.evaluate(READ_RACK);
  const plan = await page.evaluate(SOLVE_ON_SCREEN, chip.target, rack.values, rack.ops, band.stepMax + 1);
  if (!must(plan !== null, `the screen offers a route to ${chip.target} to drag along`)) return;
  const planned = plan.map((p) => p.label);

  for (const step of plan) {
    must(
      await dragOnto(page, tileSource(step.kind, step.label), WORKSPACE),
      `the ${step.kind} tile "${step.label}" can be dragged onto the stand`,
    );
  }

  const built = await page.evaluate(() => ({
    stand: [...document.querySelectorAll('.workspace__line .slot')].map((n) => n.textContent),
    serveEnabled: !document.querySelector('[data-action="serve"]')?.disabled,
    plate: document.querySelector('[data-plate-value]')?.textContent ?? '',
  }));
  must(
    (await page.evaluate(STAND_AS_PLAN)).join(' ') === planned.join(' '),
    `a chain built only by dragging reads "${built.stand.join(' ')}"`,
  );
  must(built.serveEnabled, `a dragged chain can be served (plate "${built.plate}")`);

  // Dragging the plate onto the customer is gone. A playtest used the Serve
  // button every time and reported the drag as needless, so serving is now the
  // button or a tap on the plate, and the drag path only carries tiles.
  const before = await page.evaluate(READ_HUD);
  await page.evaluate(() => document.querySelector('.counter__plate')?.click());
  await wait(200);
  const after = await page.evaluate(READ_HUD);
  must(
    after.score > before.score,
    `tapping the plate serves the dish (${before.score} -> ${after.score})`,
  );
  const queueAfter = await page.evaluate(READ_QUEUE);
  must(
    !queueAfter.chips.some((c) => c.orderId === chip.orderId),
    'the served customer leaves after a tap-served dish',
  );
  const plateStillThere = await page.evaluate(() => Boolean(document.querySelector('.counter__plate')));
  must(plateStillThere, 'the plate survives being served from');

  console.log('\n--- Drag a square onto the stand (Hard)');
  await openLevel(page, 'hard', 1);
  const hardQueue = await waitForChip(page);
  if (!must(hardQueue !== null, 'a customer walks in for the Hard drag test')) return;
  await cookFor(page, hardQueue.chips[0].orderId);

  const hardRack = await page.evaluate(READ_RACK);
  const square = hardRack.ops.find((o) => o.kind === 'unary');
  if (!must(square !== undefined, `Hard offers a unary tile to drag: ${hardRack.ops.map((o) => o.label).join(' ')}`)) return;

  // The tile has to be seen moving, not just land in the right place. The drop
  // is resolved from the pointer position, so a drag where the tile never left
  // its origin still dropped correctly and this section passed, while a player
  // had reported being unable to see a tile move at all.
  let travel = null;
  const DRAG_STEPS = 8;
  const PROBE_STEP = 5;
  must(
    await dragOnto(page, tileSource('number'), WORKSPACE, {
      midDrag: async ({ from, to }) => {
        travel = await page.evaluate((points) => {
          const tile = document.querySelector('.tile.is-dragging');
          if (!tile) return { found: false };
          const r = tile.getBoundingClientRect();
          return {
            found: true,
            dx: r.left + r.width / 2 - points.from.x,
            dy: r.top + r.height / 2 - points.from.y,
            wantX: (points.to.x - points.from.x) * points.fraction,
            wantY: (points.to.y - points.from.y) * points.fraction,
            opacity: getComputedStyle(tile).opacity,
            transition: getComputedStyle(tile).transitionDuration,
          };
        }, { from, to, fraction: PROBE_STEP / DRAG_STEPS });
      },
    }),
    'a number can be dragged onto the stand',
  );
  if (travel?.found) {
    const movedX = Math.abs(travel.dx);
    const movedY = Math.abs(travel.dy);
    must(
      movedX >= Math.abs(travel.wantX) - 10,
      `the dragged tile follows the pointer horizontally (moved ${Math.round(movedX)}px of ${Math.round(Math.abs(travel.wantX))}px by step ${PROBE_STEP} of ${DRAG_STEPS})`,
    );
    must(
      movedY >= Math.abs(travel.wantY) - 10,
      `the dragged tile follows the pointer vertically (moved ${Math.round(movedY)}px of ${Math.round(Math.abs(travel.wantY))}px by step ${PROBE_STEP} of ${DRAG_STEPS})`,
    );
    must(
      Number(travel.opacity) >= 0.95,
      `the dragged tile stays fully visible (opacity ${travel.opacity})`,
    );
    must(
      /^0s/.test(travel.transition),
      `the dragged tile has no transition to lag behind (transform ${travel.transition})`,
    );
  } else {
    fail('the dragged tile was not marked as dragging mid-gesture');
  }
  must(
    await dragOnto(page, tileSource('operator', square.label), WORKSPACE),
    `a "${square.label}" tile can be dragged`,
  );
  const unaryStand = await page.evaluate(READ_STAND);
  must(
    unaryStand.length === 2 && unaryStand[1] === square.label,
    `the square lands on the stand as a unary step ("${unaryStand.join(' ')}")`,
  );
  const unaryRack = await page.evaluate(READ_RACK);
  must(
    unaryRack.plateValue.startsWith('='),
    `the plate shows the squared value straight away ("${unaryRack.plateValue}")`,
  );

  console.log('\n--- A root is written around the number, not after it (Hard L3)');
  await openLevel(page, 'hard', 3);
  const rootQueue = await waitForChip(page);
  if (!must(rootQueue !== null, 'a customer walks in for the root test')) return;
  await cookFor(page, rootQueue.chips[0].orderId);

  const rootRack = await page.evaluate(READ_RACK);
  const rootSign = rootRack.ops.find((o) => o.kind === 'unary' && o.label === '\u221a');
  if (!must(rootSign !== undefined, `Hard L3 offers a root to place: ${rootRack.ops.map((o) => o.label).join(' ')}`)) return;

  // A root of a value that is not a perfect square is refused, which is correct
  // but useless here, so a square has to be reached first. The pair is searched
  // for rather than stumbled into, because whether the running total happens to
  // pass through a square depends on the rack the dealer dealt and the test has
  // to mean the same thing every run.
  const isSquare = (n) => Number.isInteger(n) && n >= 0 && Number.isInteger(Math.sqrt(n));
  const whole = rootRack.values
    .map((label) => ({ label, value: Number(label) }))
    .filter((e) => Number.isInteger(e.value) && e.value >= 0);
  // Single squares first, and zero excluded: rooting zero is a no-op and would
  // make the plate look like nothing happened.
  const routes = whole.filter((e) => isSquare(e.value) && e.value > 0).map((e) => [e.label]);
  for (const a of whole) {
    for (const b of whole) {
      if (a === b) continue;
      for (const [symbol, result] of [['+', a.value + b.value], ['\u2212', a.value - b.value]]) {
        if (isSquare(result) && result > 0) routes.push([a.label, symbol, b.label]);
      }
    }
  }
  if (!must(routes.length > 0, `the rack can reach a perfect square: [${rootRack.values.join(' ')}]`)) return;

  const route = routes[0];
  for (const [step, piece] of route.entries()) {
    const kind = step % 2 === 0 ? 'number' : 'operator';
    await dragOnto(page, tileSource(kind, piece), WORKSPACE);
  }
  const squarePlate = await page.evaluate(READ_RACK);
  must(isSquare(Number(squarePlate.plateValue.replace('=', '').trim())),
    `the stand reads a perfect square before the root ("${route.join(' ')}" is "${squarePlate.plateValue}")`);

  const numbers = route.filter((_, i) => i % 2 === 0).length;
  must(
    await dragOnto(page, tileSource('operator', '\u221a'), WORKSPACE),
    'a root can be placed',
  );
  const rooted = await page.evaluate(() => ({
    stand: [...document.querySelectorAll('.workspace__line .slot')].map((n) => n.textContent),
    roots: document.querySelectorAll('.workspace__line .slot--root').length,
    plate: document.querySelector('[data-plate-value]')?.textContent ?? '',
  }));
  must(
    rooted.roots === 1,
    `a root wraps the number instead of sitting in its own box (${rooted.stand.join(' ')})`,
  );
  must(
    rooted.stand.length === numbers * 2 - 1,
    `the root merged into the existing slot rather than adding one (${rooted.stand.length} slots for ${numbers} numbers and ${numbers - 1} operators)`,
  );
  must(
    rooted.stand.some((s) => s.startsWith('\u221a')),
    `the root is written in front of its value ("${rooted.stand.join(' ')}")`,
  );
  must(
    !rooted.stand.some((s) => s.endsWith('\u221a')),
    `no slot is left as a value followed by a stray root ("${rooted.stand.join(' ')}")`,
  );
  ok(`   rooted "${squarePlate.plateValue}" reads as "${rooted.stand.join(' ')}", plate "${rooted.plate}"`);
}

/**
 * The whole level, start to finish.
 *
 * The level only passes when every customer in the roster is served, no customer
 * on screen lacked a route, and the overlay opens. Anything less is a level the
 * player cannot finish, which is the whole reason this function exists.
 */

async function runOneLevel(page, { mode, level, detailed = false }) {
  const band = getBand(mode, level);
  const roster = customersForLevel(level);
  const maxSteps = band.stepMax + 1;
  const label = `${mode} L${level}`;

  console.log(`\n--- Play ${label} (roster ${roster}, operators ${band.binaryOps.join(' ')} ${band.unaryOps.join(' ')}, up to ${maxSteps} steps)`);
  must(await openLevel(page, mode, level), `${label}: the game screen opens`);

  let served = detailed ? await detailedFirstCustomer(page, { maxSteps, band, mode, level }) : 0;
  let lost = 0;
  let unsolvable = 0;
  let failuresHere = 0;
  let consecutiveBuildFailures = 0;
  const deadline = Date.now() + LEVEL_DEADLINE_MS;

  while (Date.now() < deadline) {
    const hud = await page.evaluate(READ_HUD);
    if (hud.overlay === 'shown') break;

    const queue = await page.evaluate(READ_QUEUE);
    if (queue.chips.length === 0) {
      await wait(350);
      continue;
    }

    const chip = queue.chips[0];
    const before = await page.evaluate(READ_HUD);
    await cookFor(page, chip.orderId);

    const failuresBefore = failures;
    const built = await buildDish(page, chip, { maxSteps, verbose: false, band, mode, level });
    if (failures !== failuresBefore) failuresHere += 1;
    if (built.reason) {
      if (built.reason === 'no-stand') {
        await wait(200);
        continue;
      }
      if (built.reason === 'unsolvable') unsolvable += 1;
      // A customer whose dish will not build is retried a couple of times in
      // case it was a stale stand, then the level gives up. Retrying forever
      // turns one real failure into a thousand identical lines and buries the
      // reason.
      consecutiveBuildFailures += 1;
      note(`${label}: could not build a dish for ${chip.target} (${built.reason}): ${built.detail}`);
      if (consecutiveBuildFailures >= 3) {
        fail(`${label}: giving up after three failed builds in a row (${built.reason})`);
        break;
      }
      await clearStand(page);
      continue;
    }
    consecutiveBuildFailures = 0;

    const plate = await page.evaluate(READ_RACK);
    await serveDish(page);
    const after = await page.evaluate(READ_HUD);
    if (after.score > before.score) served += 1;
    else {
      lost += 1;
      note(`${label}: serving ${chip.target} gave "${plate.plateValue}" and they walked out (route: ${built.plan.map((s) => s.label).join(' ')})`);
    }
    await wait(150);
  }

  const hud = await page.evaluate(READ_HUD);
  must(hud.overlay === 'shown', `${label}: finishing the roster opens the level-complete overlay`);
  must(
    unsolvable === 0,
    `${label}: every customer on screen had a route using only the tiles shown (${unsolvable} had none)`,
  );
  must(
    served === roster,
    `${label}: the whole roster was served (${served}/${roster}, ${lost} walked out)`,
  );
  ok(`   ${label}: served ${served}/${roster}, ${unsolvable} with no route, ${failuresHere} build failures`);
  ok(`   ${label} overlay: "${hud.overlayText}"`);

  return { served, lost, unsolvable };
}

/** Thrown when the page or its frame is gone, as opposed to the game failing. */
class BrowserDied extends Error {}

/** Does this error mean the browser went away rather than the game misbehaving? */
const BROWSER_DEATH = /detached Frame|Execution context|Target closed|Protocol error|Navigating frame|Node is either not clickable|frame was detached/i;

function guardDeath(error) {
  if (BROWSER_DEATH.test(String(error?.message ?? ''))) {
    throw new BrowserDied(String(error.message));
  }
  throw error;
}

/**
 * A page wired up to the same error sinks as the original.
 *
 * Recovery has to build a new page rather than reload the old one: a detached
 * frame is gone for good, and reloading it fails with the very error that caused
 * the retry in the first place.
 */
async function openGamePage(browser, sink) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('console', (m) => { if (m.type() === 'error') sink.consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => sink.pageErrors.push(String(e)));
  page.on('error', (e) => sink.pageCrashes.push(String(e)));
  page.on('requestfailed', (r) => sink.failedRequests.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
  return page;
}

/**
 * Run a section, and run it again on a new page if the browser dies.
 *
 * A long run keeps one tab alive for the best part of an hour and on this machine
 * the renderer occasionally dies part-way through: a detached frame, a destroyed
 * execution context, a closed target. None of those say anything about the game,
 * so a section that dies that way is retried once on a fresh page. A real game
 * failure never looks like this, so nothing is hidden by the retry.
 *
 * Recovery has to build a new page rather than reload the old one: a detached
 * frame is gone for good, and reloading it fails with the very error that caused
 * the retry. Returns the page to keep using, because a recovery replaces it.
 */
async function withRecovery(page, browser, sink, label, section) {
  try {
    return { page, result: await section(page) };
  } catch (error) {
    if (!(error instanceof BrowserDied)) guardDeath(error);
    note(`${label}: the browser dropped the page (${error.message}), retrying on a new page`);
    await page.close().catch(() => {});
    const fresh = await openGamePage(browser, sink);
    await fresh.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await fresh.evaluate(PAGE_HELPERS);
    return { page: fresh, result: await section(fresh) };
  }
}

/* ------------------------------------------------------------------ *
 * Command line
 * ------------------------------------------------------------------ */

/**
 * Which levels to play.
 *
 * The flags compose the way someone would expect: `--only hard --level 4` is
 * Hard level 4, not "Hard, intersected with the default list". The bare run
 * stays the four level default so the quick gate does not quietly become a
 * forty minute one.
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const valueOf = (flag) => {
    const at = args.indexOf(flag);
    return at === -1 ? null : args[at + 1] ?? null;
  };

  const all = args.includes('--all');
  const only = valueOf('--only');
  const level = valueOf('--level');

  let combos;
  if (!all && !only && !level) {
    combos = DEFAULT_COMBOS.map((c) => ({ ...c }));
  } else if (only && level) {
    combos = [{ mode: only, level: Number(level) }];
  } else if (all) {
    combos = [];
    for (const mode of ['easy', 'medium', 'hard']) {
      for (let n = 1; n <= 5; n += 1) combos.push({ mode, level: n });
    }
    if (only) combos = combos.filter((c) => c.mode === only);
    if (level) combos = combos.filter((c) => c.level === Number(level));
  } else {
    combos = DEFAULT_COMBOS.map((c) => ({ ...c }));
    if (only) combos = combos.filter((c) => c.mode === only);
    if (level) combos = combos.filter((c) => c.level === Number(level));
  }

  if (combos.length === 0) {
    console.error(`no level matches --only ${only ?? '*'} --level ${level ?? '*'}`);
    process.exit(1);
  }
  if (combos.length > 1 && !combos.some((c) => c.detailed)) {
    combos[0] = { ...combos[0], detailed: true };
  }
  return combos;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const combos = parseArgs(process.argv);
  const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));
  if (!executablePath) {
    console.error('Chrome or Edge not found. Set CHROME_PATH or install one of:');
    console.error(CHROME_PATHS.join('\n'));
    process.exit(1);
  }

  const server = await serve();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const pageCrashes = [];

  const sink = { consoleErrors, pageErrors, pageCrashes, failedRequests };

  try {
    let page = await openGamePage(browser, sink);

    console.log('\n--- Boot');
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(PAGE_HELPERS);

    must(await page.$('[data-screen-name="menu"]:not([hidden])') !== null, 'menu is the first screen');
    must(
      (await page.$eval('.menu__title', (n) => n.textContent)) === 'Cooking Number',
      'the game is called Cooking Number',
    );
    const modeOps = await page.$$eval('[data-mode-ops]', (ns) => ns.map((n) => n.textContent.trim()));
    must(modeOps.every((o) => o.length > 0), `mode previews list their operators: ${modeOps.join(' / ')}`);

    console.log('\n--- Level select');
    await page.click('[data-mode="easy"]');
    await wait(150);
    must(await page.$('[data-screen-name="levels"]:not([hidden])') !== null, 'level select opens');
    const levelMeta = await page.$$eval('.level-card__meta', (ns) => ns.map((n) => n.textContent));
    must(/4 customers/.test(levelMeta[0]), `level 1 owes customers: "${levelMeta[0]}"`);
    const lockedBefore = await page.$$eval('.level-card.is-locked', (ns) => ns.length);
    must(lockedBefore === 4, `only level 1 is unlocked at first (${lockedBefore} locked)`);

    for (const combo of combos) {
      // A fresh tab per level rather than a reload. The renderer on this machine
      // tends to die after a long-lived tab, and a dead tab takes the whole run
      // down with it; one page load per level is a second and buys back a gate
      // that can be trusted over fifteen levels.
      await page.close().catch(() => {});
      page = await openGamePage(browser, sink);
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
      await page.evaluate(PAGE_HELPERS);

      const label = `${combo.mode} L${combo.level}`;
      ({ page } = await withRecovery(page, browser, sink, label, (p) => runOneLevel(p, combo)));
    }

    for (const [name, section] of [['switch checks', switchChecks], ['drag checks', dragChecks]]) {
      await page.close().catch(() => {});
      page = await openGamePage(browser, sink);
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
      await page.evaluate(PAGE_HELPERS);
      ({ page } = await withRecovery(page, browser, sink, name, section));
    }

    console.log('\n--- Language toggle');
    await backToMenu(page);
    await page.click('[data-action="toggle-lang"]');
    await wait(200);
    const lang = await page.evaluate(() => document.documentElement.lang);
    must(lang === 'id', `the toggle switches to Indonesian (lang="${lang}")`);
    must(
      await page.$('[data-screen-name="menu"]:not([hidden])') !== null,
      'toggling on the menu stays on the menu',
    );
    const idTagline = await page.$eval('[data-i18n="app.tagline"]', (n) => n.textContent);
    must(/Masak/.test(idTagline), `the tagline is localised: "${idTagline}"`);

    console.log('\n--- Operator labels follow the language');
    // Read the rack in English, toggle, read it again, and compare. A label that
    // never changes is an accessibility regression no other check would catch,
    // because the tiles still look exactly right.
    //
    // The toggle lives on the menu, so it is dispatched through the DOM rather
    // than tapped. It is the same handler a player gets, and it is also a
    // reminder that there is no language switch inside a level.
    await openLevel(page, 'medium', 1);
    await waitForChip(page);
    await page.evaluate(() => document.querySelector('.chip')?.click());
    await wait(200);
    const englishOps = await page.evaluate(READ_RACK);
    await toggleLanguage(page);
    const indonesianOps = await page.evaluate(READ_RACK);
    must(englishOps.ops.length > 0, `the rack offers operators to name: ${englishOps.ops.map((o) => o.label).join(' ')}`);
    must(
      englishOps.ops.every((o) => o.ariaLabel && /[a-z]/i.test(o.ariaLabel)),
      'operator tiles are named for screen readers',
    );
    must(
      indonesianOps.ops.every((o, i) => o.ariaLabel && o.ariaLabel !== englishOps.ops[i]?.ariaLabel),
      `switching language renames every operator tile (${indonesianOps.ops.map((o) => `${o.label}=${o.ariaLabel}`).join(', ')})`,
    );
    must(
      indonesianOps.ops.map((o) => o.label).join(' ') === englishOps.ops.map((o) => o.label).join(' '),
      'switching language does not change the operators themselves',
    );
    must(
      indonesianOps.values.join(' ') === englishOps.values.join(' '),
      'switching language leaves the ingredients alone',
    );
    await toggleLanguage(page);
    note('   the language toggle only exists on the menu, not inside a level');

    console.log('\n--- Level 2 unlocks (regression)');
    await backToMenu(page);
    await page.click('[data-mode="easy"]');
    await wait(200);
    // Read the lock count against the stored high-water mark rather than a fixed
    // number, so this holds for a quick run and for a full fifteen-level sweep
    // alike.
    const easyProgress = await page.evaluate(() => Number(JSON.parse(localStorage.getItem('cn.progress') ?? '{}').easy ?? 1));
    const lockedAfter = await page.$$eval('.level-card.is-locked', (ns) => ns.length);
    must(
      lockedAfter === 5 - easyProgress,
      `the level grid matches the progress that was earned (${lockedAfter} locked, easy level ${easyProgress} unlocked)`,
    );

    // Finishing Easy level 1 is what unlocks Easy level 2. A filtered run may
    // never have played it, and then there is nothing to assert beyond the grid
    // agreeing with the stored progress, which is checked above.
    if (combos.some((c) => c.mode === 'easy' && c.level === 1)) {
      must(easyProgress >= 2, `finishing Easy level 1 recorded progress (${easyProgress})`);
      const levelTwoEnabled = await page.$eval('.level-card[data-level="2"]', (n) => !n.disabled);
      must(levelTwoEnabled, 'level 2 is now playable');
    } else {
      note('   this run did not play Easy level 1, so there is no progress to check');
    }

    console.log('\n--- Desktop viewport');
    await page.click('.level-card[data-level="1"]');
    await wait(300);
    await waitForChip(page);
    // Load the stand so the measurement covers a real rack and not an empty one.
    await page.evaluate(() => document.querySelector('.chip')?.click());
    await wait(200);
    // isMobile/hasTouch are kept deliberately. Puppeteer reloads the page when
    // those change, which would just prove the app boots to the menu again. The
    // layout responds to width through media queries, not to the mobile flag.
    const screenBefore = await page.evaluate(() => document.body.dataset.screen);
    await page.setViewport({ width: 1280, height: 900, isMobile: true, hasTouch: true });
    await wait(300);
    const wide = await page.evaluate(() => ({
      screen: document.body.dataset.screen,
      chips: document.querySelectorAll('.chip').length,
      rack: document.querySelectorAll('.rack__numbers .tile').length,
    }));
    must(
      wide.screen === 'game' && screenBefore === 'game',
      `the game survives a resize to desktop width (was "${screenBefore}", now "${wide.screen}")`,
    );
    note(`   at 1280px: ${wide.chips} customer chip(s), ${wide.rack} ingredient tile(s)`);
    checkTapTargets(page, '1280px');

    console.log('\n--- Small phone viewport');
    await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true });
    await wait(300);
    const narrow = await page.evaluate(() => ({
      screen: document.body.dataset.screen,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    must(narrow.screen === 'game', `the game survives a 320px viewport (screen "${narrow.screen}")`);
    must(
      narrow.scrollW <= narrow.clientW + 1,
      `nothing overflows sideways at 320px (content ${narrow.scrollW}px, viewport ${narrow.clientW}px)`,
    );
    checkTapTargets(page, '320px');

    const fit = await page.evaluate(READ_QUEUE_FIT, MAX_ON_SCREEN);
    if (fit.skipped) {
      note('   could not measure a full queue: no customer chip on screen');
    } else {
      must(
        fit.boxes.every((b) => b.width >= 44),
        `every customer chip stays a comfortable tap target at 320px (${fit.boxes.map((b) => b.width).join(', ')}px wide)`,
      );
      const offscreen = fit.boxes.filter((b) => b.left < 0 || b.right > fit.viewport);
      // A full queue has to be fully visible. Scrolling sideways to find the
      // customer who is running out of patience is exactly the walkout the
      // player never saw coming, which AGENTS.md rule 11 rules out.
      must(
        offscreen.length === 0,
        `a full queue of ${MAX_ON_SCREEN} customers fits a 320px screen with nothing off it`
        + `${offscreen.length > 0 ? ` (${fit.scrollW}px needed, ${offscreen.length} chip(s) outside the view)` : ''}`,
      );
      note(`   a full queue needs ${fit.scrollW}px of a ${fit.viewport}px viewport`);
    }

    console.log('\n--- Clean console');
    must(consoleErrors.length === 0, `no console errors${consoleErrors.length ? `: ${consoleErrors.join(' | ')}` : ''}`);
    must(pageErrors.length === 0, `no uncaught page errors${pageErrors.length ? `: ${pageErrors.join(' | ')}` : ''}`);
    must(failedRequests.length === 0, `no failed requests${failedRequests.length ? `: ${failedRequests.join(' | ')}` : ''}`);
    // A crashed renderer is not a game failure, but it must never hide as a
    // silent pass either.
    must(pageCrashes.length === 0, `the page never crashed${pageCrashes.length ? `: ${pageCrashes.join(' | ')}` : ''}`);
  } catch (error) {
    fail(`the run stopped early: ${error.message}`);
    for (const crash of pageCrashes) fail(`the page crashed: ${crash}`);
  } finally {
    // A browser that is already gone can refuse to close, and that error must
    // not hide the one that actually matters.
    await browser.close().catch(() => {});
    server.close();
  }

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`} (${notes} note(s))`);
  if (failures > 0) process.exit(1);
}

main();

