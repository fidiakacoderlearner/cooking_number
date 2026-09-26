/**
 * Drives the real game in Chrome to prove the UI works end to end.
 *
 * The solver here only uses what a player can see on screen (the target and
 * the tiles) plus the public core evaluator. It never reads `secretRecipe`, so
 * a pass means the puzzle really is solvable from the player's point of view.
 *
 * Development aid: not part of the game, not part of `npm test`.
 *
 *   python -m http.server 8099
 *   node scripts/smoke-ui.js
 */

import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH
  ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:8099/index.html';
const SHOTS = process.env.SHOT_DIR ?? 'C:/Users/ASUS/AppData/Local/Temp/opencode';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
const note = (message) => {
  problems.push(message);
  console.log(`  ! ${message}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

page.on('console', (m) => {
  if (m.type() === 'error') note(`console error: ${m.text()}`);
});
page.on('pageerror', (e) => note(`page error: ${e.message}`));
page.on('requestfailed', (r) => note(`request failed: ${r.url()}`));

const shot = async (name) => {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log(`  shot ${name}.png`);
};

const snapshot = () =>
  page.evaluate(() => ({
    screen: document.body.dataset.screen,
    level: document.querySelector('[data-hud-level]')?.textContent,
    score: Number(document.querySelector('[data-hud-score]')?.textContent),
    timer: document.querySelector('[data-hud-timer]')?.textContent,
    lives: document.querySelectorAll('.life:not(.is-lost)').length,
    target: document.querySelector('[data-order-target]')?.textContent,
    numbers: document.querySelectorAll('.rack__numbers .tile').length,
    operators: document.querySelectorAll('.rack__operators .tile--operator').length,
    unaries: document.querySelectorAll('.rack__operators .tile--unary').length,
    slots: document.querySelectorAll('.slot:not(.slot--dropzone)').length,
    result: document.querySelector('[data-result]')?.textContent ?? null,
    serveEnabled: !document.querySelector('[data-action="serve"]')?.disabled,
    hint: document.querySelector('[data-feedback-text]')?.textContent,
  }));

/**
 * Find a left-to-right chain to the target using only the tiles on the rack.
 *
 * Runs in the page so it can import the real core evaluator, and mirrors the
 * game's own alternation rules: a value first, then operator + value pairs, with
 * unary operators allowed only right after a value. It never reads
 * `secretRecipe`, so a pass means the puzzle really is winnable by a player.
 */
const solve = () =>
  page.evaluate(async () => {
    const { evaluate, recipe } = await import('/src/core/evaluate.js');
    const { rat, equals, isZero } = await import('/src/core/rational.js');

    const targetText = document.querySelector('[data-order-target]').textContent.trim();
    const pool = [...document.querySelectorAll('.rack__numbers .tile')].map((n) => n.textContent.trim());
    const ops = [...document.querySelectorAll('.rack__operators .tile--operator')].map((n) => ({
      symbol: n.textContent.trim(),
      key: n.dataset.tileKey,
    }));
    const unaries = [...document.querySelectorAll('.rack__operators .tile--unary')].map((n) => ({
      symbol: n.textContent.trim(),
      key: n.dataset.tileKey,
      exponent: n.dataset.tileExponent ? Number(n.dataset.tileExponent) : undefined,
    }));

    const toValue = (text) => {
      if (text.includes('/')) {
        const [n, d] = text.split('/').map(Number);
        return rat(n, d);
      }
      return rat(Number(text));
    };
    const target = toValue(targetText);
    const values = pool.map(toValue);
    const MAX_OPS = Math.min(3, values.length - 1);

    const applyBinary = (opKey, a, b) => {
      if (opKey === 'div' && isZero(b)) return null;
      try {
        return evaluate(recipe(a, [{ op: opKey, operand: b }]));
      } catch {
        return null;
      }
    };
    const applyUnary = (u, a) => {
      try {
        const step = u.exponent === undefined ? { op: u.key } : { op: u.key, exponent: u.exponent };
        return evaluate(recipe(a, [step]));
      } catch {
        return null;
      }
    };

    /** expect: 'operator' means the next tile must be a binary operator. */
    function search(startIndex, acc, used, expect, opsLeft, path) {
      if (expect === 'number') {
        for (let i = 0; i < values.length; i += 1) {
          if (used.has(i)) continue;
          const v = values[i];
          if (equals(v, target)) return [...path, { kind: 'number', text: pool[i] }];
          if (opsLeft === 0) continue;

          for (const u of unaries) {
            const after = applyUnary(u, v);
            if (!after) continue;
            const step = { kind: 'unary', symbol: u.symbol };
            if (equals(after, target)) return [...path, { kind: 'number', text: pool[i] }, step];
            const used2 = new Set(used).add(i);
            const tail = search(-1, after, used2, 'operator', opsLeft - 1, [...path, { kind: 'number', text: pool[i] }, step]);
            if (tail) return tail;
          }

          for (const op of ops) {
            for (let j = 0; j < values.length; j += 1) {
              if (used.has(j) || j === i) continue;
              const after = applyBinary(op.key, v, values[j]);
              if (!after) continue;
              const head = [
                { kind: 'number', text: pool[i] },
                { kind: 'operator', symbol: op.symbol },
                { kind: 'number', text: pool[j] },
              ];
              if (equals(after, target)) return [...path, ...head];
              const used2 = new Set(used).add(i).add(j);
              const tail = search(-1, after, used2, 'operator', opsLeft - 1, [...path, ...head]);
              if (tail) return tail;
            }
          }
        }
        return null;
      }

      for (const op of ops) {
        for (let j = 0; j < values.length; j += 1) {
          if (used.has(j)) continue;
          const after = applyBinary(op.key, acc, values[j]);
          if (!after) continue;
          const head = [
            { kind: 'operator', symbol: op.symbol },
            { kind: 'number', text: pool[j] },
          ];
          if (equals(after, target)) return [...path, ...head];
          if (opsLeft <= 1) continue;
          const used2 = new Set(used).add(j);
          const tail = search(-1, after, used2, 'operator', opsLeft - 1, [...path, ...head]);
          if (tail) return tail;
        }
      }
      return null;
    }

    for (let i = 0; i < values.length; i += 1) {
      if (equals(values[i], target)) return { steps: [], target: targetText };
      const found = search(
        i,
        values[i],
        new Set([i]),
        'operator',
        MAX_OPS,
        [{ kind: 'number', text: pool[i] }],
      );
      if (found) return { steps: found, target: targetText };
    }
    return null;
  });

async function clickTile(group, symbol) {
  const clicked = await page.evaluate(
    (sel, want) => {
      const node = [...document.querySelectorAll(sel)].find(
        (n) => !n.disabled && !n.classList.contains('is-used') && n.textContent.trim() === want,
      );
      if (!node) return false;
      node.click();
      return true;
    },
    group,
    symbol,
  );
  if (!clicked) note(`could not click tile "${symbol}" in ${group}`);
  await wait(90);
  return clicked;
}

async function playOrder() {
  const plan = await solve();
  if (!plan) {
    note(`no solution found on screen for target ${(await snapshot()).target}`);
    return false;
  }

  for (const step of plan.steps) {
    if (step.kind === 'operator') await clickTile('.rack__operators .tile--operator', step.symbol);
    else if (step.kind === 'unary') await clickTile('.rack__operators .tile--unary', step.symbol);
    else await clickTile('.rack__numbers .tile', step.text);
  }

  const state = await snapshot();
  if (!state.serveEnabled) {
    note(`serve stayed disabled for target ${state.target} (slots=${state.slots}, result=${state.result})`);
    return false;
  }
  if (state.result === null || !state.result.startsWith('=')) {
    note(`running total chip missing for target ${state.target}`);
  }
  return true;
}

/* ------------------------------------------------------------------ */

console.log(`Opening ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle0' });
await wait(300);
await shot('ui-01-menu');

await page.evaluate(() => document.querySelector('[data-mode="easy"]').click());
await wait(250);
await shot('ui-02-levels');

const levelButtons = await page.$$eval('.level-card', (nodes) =>
  nodes.map((n) => ({ level: n.dataset.level, disabled: n.disabled })),
);
console.log(`  levels: ${JSON.stringify(levelButtons)}`);
if (!levelButtons.some((l) => l.level === '1' && !l.disabled)) note('level 1 should be unlocked');

await page.evaluate(() => document.querySelector('.level-card[data-level="1"]').click());
await wait(450);
await shot('ui-03-game');
console.log(`  game start: ${JSON.stringify(await snapshot())}`);

if (await playOrder()) {
  await shot('ui-04-built');
  console.log(`  built: ${JSON.stringify(await snapshot())}`);

  await page.evaluate(() => document.querySelector('[data-action="serve"]').click());
  await wait(400);
  await shot('ui-05-served');
  const served = await snapshot();
  console.log(`  served: ${JSON.stringify(served)}`);
  if (!/Perfect|Served/i.test(served.hint ?? '')) {
    note(`serving a correct order should show success feedback, got "${served.hint}"`);
  }

  // Score is banked when the controller advances to the next order.
  await wait(1200);
  const next = await snapshot();
  console.log(`  next order: ${JSON.stringify(next)}`);
  if (next.score <= 0) note('serving a correct order should raise the score');
  if (next.level === served.level) note('the order counter should advance after serving');
  if (next.slots !== 0) note('the workspace should be empty for a fresh order');
  await shot('ui-06-next-order');

  if (await playOrder()) {
    await page.evaluate(() => document.querySelector('[data-action="serve"]').click());
    await wait(1600);
    await shot('ui-07-level-done');
    const done = await page.evaluate(() => ({
      overlay: document.querySelector('[data-overlay="level"]')?.hidden === false,
      text: document.querySelector('[data-overlay-score]')?.textContent,
    }));
    console.log(`  level done: ${JSON.stringify(done)}`);
    if (!done.overlay) note('completing the last order should show the level-complete overlay');
  }
}

// Undo, then quit back to the menu via the HUD button.
await page.evaluate(() => document.querySelector('[data-action="undo"]').click());
await wait(150);
console.log(`  after undo: ${JSON.stringify(await snapshot())}`);

await page.evaluate(() => document.querySelector('.hud__quit').click());
await wait(300);
console.log(`  after quit: screen "${await page.evaluate(() => document.body.dataset.screen)}"`);

// Language toggle: must not navigate away from the menu.
await page.evaluate(() => document.querySelector('[data-action="toggle-lang"]').click());
await wait(250);
const lang = await page.evaluate(() => document.documentElement.lang);
const screenAfter = await page.evaluate(() => document.body.dataset.screen);
const tagline = await page.evaluate(() => document.querySelector('[data-i18n="app.tagline"]')?.textContent);
console.log(`  language after toggle: ${lang} (screen still "${screenAfter}")`);
console.log(`  tagline: ${tagline}`);
if (lang !== 'id') note(`expected id after toggle, got ${lang}`);
if (screenAfter !== 'menu') note(`toggling language should stay on the menu, jumped to ${screenAfter}`);
if (!/Masak/.test(tagline ?? '')) note(`tagline did not switch to Indonesian: ${tagline}`);
await shot('ui-08-bahasa');

// Hard mode: unary operators must be offered.
await page.evaluate(() => document.querySelector('[data-mode="hard"]').click());
await wait(200);
await page.evaluate(() => document.querySelector('.level-card[data-level="1"]').click());
await wait(400);
const hard = await snapshot();
console.log(`  hard: ${JSON.stringify(hard)}`);
if (hard.unaries < 1) note('Hard mode should offer at least one unary operator tile');
if (hard.operators < 4) note(`Hard should offer 4 binary operators, saw ${hard.operators}`);
await shot('ui-09-hard');

// Medium mode: fractions.
await page.evaluate(() => {
  [...document.querySelectorAll('[data-action="back-to-menu"]')].find((b) => b.offsetParent !== null)?.click();
});
await wait(250);
await page.evaluate(() => document.querySelector('[data-mode="medium"]').click());await wait(200);
await page.evaluate(() => document.querySelector('.level-card[data-level="1"]').click());
await wait(400);
const medium = await snapshot();
console.log(`  medium: ${JSON.stringify(medium)}`);
if (medium.operators < 4) note(`Medium should offer 4 binary operators, saw ${medium.operators}`);
await shot('ui-10-medium');

// Desktop layout.
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
await wait(300);
await shot('ui-11-desktop');

console.log(problems.length ? `\nFAILED (${problems.length} problem(s))` : '\nAll checks passed.');
await browser.close();
process.exit(problems.length ? 1 : 0);
