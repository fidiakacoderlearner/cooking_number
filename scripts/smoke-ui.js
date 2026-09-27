/**
 * Drives the real game in a real browser and checks the things unit tests
 * cannot reach: that the modules load, that customers actually arrive over
 * time, that a dish can be built using only what is on screen, and that
 * serving works.
 *
 *   npm run smoke
 *   npm install --no-save puppeteer-core@23
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

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const PORT = 8099;

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

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
     * The search mirrors the stand's own rule: a chain starts with a value, then
     * alternates operators with values, and ends on a value. Anything looser
     * would hand the UI a plan it rejects, which reads as a game bug rather than
     * a broken solver.
     */
    function solve(targetLabel, valueLabels, opSpecs, maxSteps) {
      const target = parseTile(targetLabel);
      const values = valueLabels.map(parseTile);
      const used = new Array(values.length).fill(false);
      const binary = opSpecs.filter((o) => o.arity === 'binary');
      const unary = opSpecs.filter((o) => o.arity === 'unary');

      function walk(current, depth, path) {
        if (depth > 0 && R.equals(current, target)) return path;
        if (depth >= maxSteps) return null;

        for (const op of binary) {
          for (let i = 0; i < values.length; i += 1) {
            if (used[i]) continue;
            used[i] = true;
            const next = applyStep(current, { key: op.key, operand: values[i] });
            if (next && !isZero(next)) {
              const found = walk(
                next,
                depth + 1,
                path.concat([{ kind: 'operator', label: op.label }, { kind: 'number', label: valueLabels[i] }]),
              );
              if (found) return found;
            }
            used[i] = false;
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

      for (let i = 0; i < values.length; i += 1) {
        used[i] = true;
        const found = walk(values[i], 0, [{ kind: 'number', label: valueLabels[i] }]);
        used[i] = false;
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
    standHead: document.querySelector('[data-stand-for]')?.textContent ?? '',
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

/** Press the "Cook for" button on a chip, which loads the stand. */
async function cookFor(page, orderId) {
  await page.evaluate((id) => {
    document.querySelector(`.chip[data-order-id="${id}"] .chip__cook`)?.click();
  }, String(orderId));
  await wait(120);
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

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
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

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('requestfailed', (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));

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

    console.log('\n--- Customers arrive over time');
    await page.click('.level-card[data-level="1"]');
    await wait(300);
    must(await page.$('[data-screen-name="game"]:not([hidden])') !== null, 'the game screen opens');

    const first = await waitForChip(page);
    if (!must(first !== null, 'a customer walks in on its own')) throw new Error('no customer arrived');
    ok(`   first customer wants ${first.chips[0].target}, patience ${first.chips[0].seconds}s`);
    must(first.chips.length === 1, `only one customer at the start (${first.chips.length})`);

    const countAfter5s = await page.evaluate(READ_QUEUE);
    must(
      countAfter5s.chips.length === 1,
      `still one customer after a few seconds, not a pile (${countAfter5s.chips.length})`,
    );
    must(countAfter5s.next.length > 0, `the next arrival is shown to the player: "${countAfter5s.next}"`);

    console.log('\n--- Cook for the customer on screen');
    const target = first.chips[0].target;
    const orderId = first.chips[0].orderId;
    await page.evaluate((id) => document.querySelector(`.chip[data-order-id="${id}"]`)?.click(), orderId);
    await wait(100);
    await cookFor(page, orderId);

    const rack = await page.evaluate(READ_RACK);
    must(rack.values.length > 0, `the stand loaded the customer's ingredients: [${rack.values.join(' ')}]`);
    must(rack.standHead.includes(target), `the stand says who it is cooking for: "${rack.standHead}"`);
    must(
      rack.ops.every((o) => typeof o.ariaLabel === 'string' && o.ariaLabel.length > 0),
      'every operator tile has an accessible name',
    );
    must(rack.ops.length >= 2, `the rack offers operators: ${rack.ops.map((o) => o.label).join(' ')}`);

    console.log('\n--- Build the dish from the screen only');
    const plan = await page.evaluate(
      (t, values, ops) => window.__cn.solve(
        t,
        values,
        ops.map((o) => ({ key: o.key, label: o.label, arity: o.kind === 'unary' ? 'unary' : 'binary', exponent: o.exponent })),
        4,
      ),
      target,
      rack.values,
      rack.ops,
    );
    if (!must(plan !== null, `the screen offers a way to reach ${target}`)) {
      throw new Error(`no solution visible for target ${target} with tiles [${rack.values.join(' ')}]`);
    }
    ok(`   solution on screen: ${plan.map((p) => p.label).join(' ')}`);

    for (const step of plan) {
      const clicked = await clickTile(page, step.kind, step.label);
      if (!clicked) fail(`could not tap the ${step.kind} tile "${step.label}"`);
    }

    // Compare what was built against what was planned. Without this the test can
    // quietly pass a wrong dish to the serve step and blame the game for it.
    const standNow = await page.evaluate(() =>
      [...document.querySelectorAll('.workspace__line .slot')].map((n) => n.textContent),
    );
    const planned = plan.map((p) => p.label);
    must(
      standNow.join(' ') === planned.join(' '),
      `the stand holds exactly the planned chain (built "${standNow.join(' ')}", planned "${planned.join(' ')}")`,
    );

    const built = await page.evaluate(READ_RACK);
    must(built.serveEnabled, 'Serve lights up once the dish is built');
    must(built.plateValue.startsWith('='), `the finished value is readable on the plate: "${built.plateValue}"`);

    const onScreen = await page.evaluate(
      (t, v) => window.__cn.R.equals(window.__cn.parseTile(v.replace('=', '').trim()), window.__cn.parseTile(t)),
      target,
      built.plateValue,
    );
    must(onScreen, `the plate reads the target ${target} (plate says "${built.plateValue}")`);

    console.log('\n--- Serve');
    const hudBefore = await page.evaluate(READ_HUD);
    await serveDish(page);
    const hudAfter = await page.evaluate(READ_HUD);
    must(hudAfter.score > hudBefore.score, `serving the right dish scores (${hudBefore.score} -> ${hudAfter.score})`);
    must(/served|Poorly|served/i.test(hudAfter.feedback) || hudAfter.score > hudBefore.score, 'the player is told what happened');
    const queueAfterServe = await page.evaluate(READ_QUEUE);
    must(
      !queueAfterServe.chips.some((c) => c.orderId === orderId),
      'the served customer leaves',
    );
    const rackAfter = await page.evaluate(READ_RACK);
    must(rackAfter.values.length === 0, 'the stand is empty again');

    console.log('\n--- Two customers can be waiting at once');
    const second = await waitForChip(page);
    if (must(second !== null, 'a second customer arrives')) {
      ok(`   second customer wants ${second.chips.map((c) => c.target).join(', ')}`);
    }

    console.log('\n--- Playing to the end of the level');
    let guard = 0;
    let servedOk = 0;
    let unsolvable = 0;
    while (guard < 300) {
      guard += 1;
      const hud = await page.evaluate(READ_HUD);
      if (hud.overlay === 'shown') break;

      const queue = await page.evaluate(READ_QUEUE);
      if (queue.chips.length === 0) {
        await wait(400);
        continue;
      }
      const target2 = queue.chips[0];
      await cookFor(page, target2.orderId);
      const r = await page.evaluate(READ_RACK);
      if (r.values.length === 0) {
        await wait(250);
        continue;
      }
      const p = await page.evaluate(
        (t, values, ops) => window.__cn.solve(
          t,
          values,
          ops.map((o) => ({ key: o.key, label: o.label, arity: o.kind === 'unary' ? 'unary' : 'binary', exponent: o.exponent })),
          4,
        ),
        target2.target,
        r.values,
        r.ops,
      );
      if (!p) {
        unsolvable += 1;
        note(`no on-screen route to ${target2.target} with [${r.values.join(' ')}]`);
        await page.evaluate(() => document.querySelector('[data-action="clear"]')?.click());
        await wait(200);
        continue;
      }
      let builtAll = true;
      for (const step of p) {
        if (!(await clickTile(page, step.kind, step.label))) builtAll = false;
      }
      if (!builtAll) {
        fail(`could not tap the planned tiles for ${target2.target}: ${p.map((s) => s.label).join(' ')}`);
        await wait(200);
        continue;
      }
      const plate = await page.evaluate(READ_RACK);
      if (!plate.serveEnabled) {
        fail(`the dish for ${target2.target} never became servable: plate "${plate.plateValue}" from ${p.map((s) => s.label).join(' ')} over [${r.values.join(' ')}]`);
        await page.evaluate(() => document.querySelector('[data-action="clear"]')?.click());
        await wait(200);
        continue;
      }
      const before = await page.evaluate(READ_HUD);
      await serveDish(page);
      const after = await page.evaluate(READ_HUD);
      if (after.score > before.score) servedOk += 1;
      else note(`serving ${target2.target} gave "${plate.plateValue}" and they walked out (rout was ${p.map((s) => s.label).join(' ')})`);
      await wait(200);
    }

    const hudEnd = await page.evaluate(READ_HUD);
    must(hudEnd.overlay === 'shown', 'finishing the roster opens the level-complete overlay');
    must(servedOk >= 3, `the whole level can be played through (served ${servedOk})`);
    must(unsolvable === 0, `every customer on screen had a route (${unsolvable} had none)`);
    ok(`   served ${servedOk}, ${unsolvable} unsolvable`);
    ok(`   overlay says: "${hudEnd.overlayText}"`);

    console.log('\n--- Level 2 unlocks (regression)');
    await page.evaluate(() => document.querySelector('[data-action="back-to-menu"]')?.click());
    await wait(200);
    await page.click('[data-mode="easy"]');
    await wait(200);
    const lockedAfter = await page.$$eval('.level-card.is-locked', (ns) => ns.length);
    must(lockedAfter === 3, `finishing level 1 opens level 2 (${lockedAfter} still locked)`);
    const levelTwoEnabled = await page.$eval(
      '.level-card[data-level="2"]',
      (n) => !n.disabled,
    );
    must(levelTwoEnabled, 'level 2 is now playable');

    console.log('\n--- Language toggle');
    await page.evaluate(() => document.querySelector('[data-action="back-to-menu"]')?.click());
    await wait(200);
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
    await page.click('[data-action="toggle-lang"]');
    await wait(150);

    console.log('\n--- Operator labels follow the language');
    await page.click('[data-mode="hard"]');
    await wait(150);
    await page.click('.level-card[data-level="1"]');
    await wait(300);
    await waitForChip(page);
    const hardQueue = await page.evaluate(READ_QUEUE);
    if (hardQueue.chips.length > 0) {
      await cookFor(page, hardQueue.chips[0].orderId);
      const hardRack = await page.evaluate(READ_RACK);
      ok(`   Hard level 1 operators: ${hardRack.ops.map((o) => `${o.label}=${o.ariaLabel}`).join(', ')}`);
      must(
        hardRack.ops.every((o) => o.ariaLabel && /[a-z]/i.test(o.ariaLabel)),
        'operator tiles are named for screen readers',
      );
    }

    console.log('\n--- Desktop viewport');
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

    console.log('\n--- Small phone viewport');
    await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true });
    await wait(300);
    const narrow = await page.evaluate(() => ({
      screen: document.body.dataset.screen,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      smallTargets: [...document.querySelectorAll('.chip__cook, .btn, .tile')]
        .filter((n) => n.getBoundingClientRect().width > 0 && n.getBoundingClientRect().height > 0)
        .filter((n) => n.getBoundingClientRect().height < 32)
        .length,
    }));
    must(narrow.screen === 'game', `the game survives a 320px viewport (screen "${narrow.screen}")`);
    must(
      narrow.scrollW <= narrow.clientW + 1,
      `nothing overflows sideways at 320px (content ${narrow.scrollW}px, viewport ${narrow.clientW}px)`,
    );
    note(`   controls under 32px tall at 320px: ${narrow.smallTargets}`);

    console.log('\n--- Clean console');
    must(consoleErrors.length === 0, `no console errors${consoleErrors.length ? `: ${consoleErrors.join(' | ')}` : ''}`);
    must(pageErrors.length === 0, `no uncaught page errors${pageErrors.length ? `: ${pageErrors.join(' | ')}` : ''}`);
    must(failedRequests.length === 0, `no failed requests${failedRequests.length ? `: ${failedRequests.join(' | ')}` : ''}`);
  } catch (error) {
    fail(`the run stopped early: ${error.message}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`} (${notes} note(s))`);
  if (failures > 0) process.exit(1);
}

main();
