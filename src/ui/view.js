/**
 * DOM rendering. Reads state, writes markup, and reports user intent back to the
 * controller through callbacks. It never mutates game state directly and never
 * does arithmetic (AGENTS.md rule 4).
 */

import { toDisplayString } from '../core/rational.js';
import { customersForLevel, MAX_ON_SCREEN } from '../core/difficulty.js';
import { t } from './i18n.js';
import { ASSETS, OPERATORS, operatorsForMode, operatorsForLevel, customerFor } from './assets.js';
import * as S from './state.js';

const el = (sel) => document.querySelector(sel);

const dom = {};

export function cacheDom() {
  dom.screens = [...document.querySelectorAll('[data-screen-name]')];
  dom.menuHat = el('.menu__hat');
  dom.modeOps = [...document.querySelectorAll('[data-mode-ops]')];
  dom.modeTitle = el('[data-mode-title]');
  dom.levelGrid = el('[data-level-grid]');

  dom.hudLevel = el('[data-hud-level]');
  dom.hudServed = el('[data-hud-served]');
  dom.hudScore = el('[data-hud-score]');
  dom.hudProgress = el('[data-hud-progress]');

  dom.queue = el('[data-queue]');
  dom.queueStrip = el('[data-queue-strip]');
  dom.queueNext = el('[data-queue-next]');

  dom.standHead = el('[data-stand-head]');
  dom.standPortrait = el('[data-stand-portrait]');
  dom.standFor = el('[data-stand-for]');

  dom.plate = el('[data-drop-zone="serve"]');
  dom.plateValue = el('[data-plate-value]');
  dom.workspace = el('[data-workspace]');
  dom.workspaceLine = el('[data-workspace-line]');
  dom.workspaceEmpty = el('[data-workspace-empty]');
  dom.feedback = el('[data-feedback]');
  dom.feedbackText = el('[data-feedback-text]');
  dom.serveBtn = el('[data-action="serve"]');
  dom.rackNumbers = el('[data-rack-numbers]');
  dom.rackOperators = el('[data-rack-operators]');
  dom.toast = el('[data-toast]');
  dom.langCurrent = el('[data-lang-current]');

  dom.overlayLevel = el('[data-overlay="level"]');
  dom.overlaySummary = el('[data-overlay-summary]');
  dom.overlayScore = el('[data-overlay-score]');
}

export function showScreen(name) {
  document.body.dataset.screen = name;
  for (const screen of dom.screens) {
    screen.hidden = screen.dataset.screenName !== name;
  }
}

export function showOverlay(name) {
  dom.overlayLevel.hidden = name !== 'level';
  if (name === 'level') {
    // Focus moves into the dialog so a stray Enter cannot re-fire the Serve
    // button that is still focused behind the scrim.
    dom.overlayLevel.querySelector('.btn--primary')?.focus();
  }
}

let toastTimer = null;
export function toast(message) {
  if (!message) return;
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  dom.toast.classList.remove('anim-toast');
  void dom.toast.offsetWidth;
  dom.toast.classList.add('anim-toast');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.hidden = true;
  }, 2200);
}

let feedbackTimer = null;
export function feedback(message, tone = 'hint') {
  if (!message) {
    dom.feedback.hidden = true;
    return;
  }
  dom.feedback.hidden = false;
  dom.feedbackText.textContent = message;
  dom.feedback.className = `feedback is-${tone}`;
  clearTimeout(feedbackTimer);
  if (tone === 'hint') {
    feedbackTimer = setTimeout(() => {
      dom.feedback.hidden = true;
    }, 2600);
  }
}

export function bump(node) {
  if (!node) return;
  node.classList.remove('is-bumped');
  void node.offsetWidth;
  node.classList.add('is-bumped');
}

export function shake(node) {
  if (!node) return;
  node.classList.remove('is-shaking');
  void node.offsetWidth;
  node.classList.add('is-shaking');
}

/* ------------------------------------------------------------------ *
 * Menu and level select
 * ------------------------------------------------------------------ */

export function renderModeCards() {
  for (const node of dom.modeOps) {
    node.textContent = operatorsForLevel(node.dataset.modeOps, 5)
      .map((op) => op.symbol)
      .join(' ');
  }
}

export function renderLevelGrid(mode, unlocked) {
  dom.modeTitle.textContent = t(`mode.${mode}`);
  dom.levelGrid.replaceChildren();

  for (let level = 1; level <= 5; level += 1) {
    const locked = level > unlocked;
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-card';
    button.dataset.level = String(level);
    button.disabled = locked;
    if (locked) button.classList.add('is-locked');

    const num = document.createElement('span');
    num.className = 'level-card__num';
    num.textContent = locked ? '\u{1F512}' : String(level);

    const meta = document.createElement('span');
    meta.className = 'level-card__meta';
    meta.textContent = locked
      ? t('levels.lockedHint')
      : t('levels.customers', { count: customersForLevel(level) });

    button.append(num, meta);
    item.append(button);
    dom.levelGrid.append(item);
  }
}

export function applyStaticStrings() {
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll('[data-i18n-aria]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nAria));
  }
  dom.langCurrent.textContent = document.documentElement.lang.toUpperCase();
  if (dom.menuHat) dom.menuHat.src = ASSETS.chefHat;
  renderModeCards();
}

/* ------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------ */

export function renderHud(state) {
  const served = S.ordersServed(state);
  const total = state.rosterSize;
  dom.hudLevel.textContent = String(state.level);
  dom.hudServed.textContent = `${served}/${total}`;
  dom.hudScore.textContent = String(state.score);

  const done = served + S.ordersLost(state);
  const ratio = total > 0 ? done / total : 0;
  dom.hudProgress.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

/* ------------------------------------------------------------------ *
 * Customer queue
 * ------------------------------------------------------------------ */

/**
 * How close to the edge a customer's patience is, as a share left.
 *
 * The chip is rebuilt on every render, and the controller renders once a second,
 * so a class that simply said "this customer is on screen" would be re-applied
 * every second. Only a genuinely new arrival may animate.
 */
const arrivedChipIds = new Set();

/** Clear the arrival memory, so the next render treats every chip as new. */
export function resetChipArrivals() {
  arrivedChipIds.clear();
}

export function renderChips(state) {
  const nodes = [];
  const standEmpty = state.expression.length === 0;
  const onScreen = new Set();

  for (const order of state.orders) {
    if (order.status === S.ORDER_STATUS.SERVED || order.status === S.ORDER_STATUS.WALKED) continue;
    onScreen.add(order.id);
    const target = toDisplayString(order.puzzle.target);

    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.orderId = String(order.id);
    chip.dataset.dropZone = 'serve';
    chip.classList.add(`is-${order.status}`);

    // The arrival animation is the only thing that must not repeat. Giving it to
    // every chip on every render made the whole queue blink once a second and
    // left the player unable to tell a new arrival from a waiting one.
    if (!arrivedChipIds.has(order.id)) {
      chip.classList.add('anim-arrive');
      arrivedChipIds.add(order.id);
    }

    const portrait = document.createElement('img');
    portrait.className = 'chip__portrait';
    portrait.src = customerFor(order.customerIndex);
    portrait.alt = '';
    portrait.width = 44;
    portrait.height = 52;

    const targetEl = document.createElement('span');
    targetEl.className = 'chip__target';
    targetEl.textContent = target;

    // The patience bar is the fastest read on the screen: its width is the
    // remaining share, so a shrinking bar is the warning.
    const meter = document.createElement('span');
    meter.className = 'chip__meter';
    meter.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.className = 'chip__meter-fill';
    const left = Math.max(0, order.timeLeft / order.timeTotal);
    fill.style.width = `${Math.max(0, Math.min(1, left)) * 100}%`;
    meter.append(fill);

    const seconds = document.createElement('span');
    seconds.className = 'chip__seconds';
    seconds.textContent = String(Math.ceil(Math.max(0, order.timeLeft)));

    // Two thresholds rather than one, so the bar is a warning before it is a
    // last chance. A player who only ever sees one colour change learns it too
    // late to do anything about it.
    if (left <= 1 / 3) chip.classList.add('is-urgent');
    else if (left <= 2 / 3) chip.classList.add('is-warn');

    chip.append(portrait, targetEl, meter, seconds);

    // Only the stand's own customer can be cooked, so the button is the only
    // way to commit. It disappears once the stand is loaded, which is what
    // makes the two-step flow obvious instead of a mode the player has to learn.
    //
    // The visible label is just "Cook" because the order is already printed
    // large on this same chip, and the full phrase was the widest thing in the
    // queue: at 320px it pushed a full queue of three past the edge of the
    // screen. The full sentence is still the accessible name, so a screen
    // reader hears which customer is being cooked for.
    if (order.status === S.ORDER_STATUS.COOKING) {
      chip.classList.add('is-locked');
    } else if (standEmpty) {
      const cook = document.createElement('button');
      cook.type = 'button';
      cook.className = 'chip__cook';
      cook.dataset.action = 'cook-for';
      cook.dataset.orderId = String(order.id);
      cook.textContent = t('customer.cookFor');
      cook.setAttribute('aria-label', t('customer.cookForTarget', { target }));
      chip.append(cook);
    }

    chip.setAttribute('data-status', order.status);
    nodes.push(chip);
  }

  dom.queueStrip.replaceChildren(...nodes);
  for (const id of arrivedChipIds) {
    if (!onScreen.has(id)) arrivedChipIds.delete(id);
  }
  renderQueueNext(state);
}

function renderQueueNext(state) {
  const next = S.secondsToNextCustomer(state);
  const lastOne = state.spawnedCount >= state.rosterSize - 1;
  // Counted from the customers still on screen, not from the whole roster: a
  // served customer leaves the strip, and the strip should stop saying it is
  // full because of someone who is already gone.
  let text;
  if (S.activeOrders(state).length >= MAX_ON_SCREEN) text = t('queue.full');
  else if (next === null) text = lastOne ? t('queue.nextLast') : t('queue.nextSoon');
  else text = t('queue.nextIn', { seconds: Math.ceil(next) });
  dom.queueNext.textContent = text;
}

/* ------------------------------------------------------------------ *
 * Stand
 * ------------------------------------------------------------------ */

export function renderStand(state) {
  const order = S.cookingOrder(state);
  const dish = S.hasDish(state);
  const total = S.runningTotal(state);

  if (!order) {
    dom.standHead.hidden = true;
    dom.workspaceEmpty.hidden = false;
    dom.workspaceEmpty.textContent = t('stand.pickCustomer');
    dom.plateValue.textContent = '';
    dom.plate.classList.remove('has-dish');
    dom.workspace.classList.remove('has-content');
    dom.workspaceLine.replaceChildren();
    dom.serveBtn.disabled = true;
    return;
  }

  const target = toDisplayString(order.puzzle.target);
  dom.standHead.hidden = false;
  dom.standPortrait.src = customerFor(order.customerIndex);
  dom.standFor.textContent = t('stand.building', { target });
  dom.workspaceEmpty.hidden = state.expression.length > 0;

  // The final value is the safeguard against a walkout the player could not see
  // coming (AGENTS.md rule 11), so it is never hidden behind a hover state.
  dom.plateValue.textContent = total === null ? '' : `= ${toDisplayString(total)}`;
  dom.plate.classList.toggle('has-dish', dish);
  dom.plate.classList.toggle('is-ready', dish);
  dom.serveBtn.disabled = !dish;

  renderWorkspace(state);
}

function slotClass(item) {
  if (item.kind === 'operator') return 'slot slot--operator';
  if (item.kind === 'unary') return 'slot slot--unary';
  return 'slot';
}

const ROOT_SIGN = '\u221a';

function renderWorkspace(state) {
  const nodes = [];
  // The slot a root sign would wrap, if the next item is one. A power does not
  // need this: `16` then `2` already reads as 16 squared, because that is how a
  // power is written. A root is the other way round, `16` then the sign reads
  // as a number followed by an operator, when the written form is the sign
  // around the number. Found in a phone playtest, where the value had to be put
  // in first and only then the sign.
  let openNumberSlot = null;

  for (const item of state.expression) {
    if (item.kind === 'unary' && item.op === 'sqrt' && openNumberSlot) {
      // The modifier is added, not swapped in: dropping the base class would
      // take the slot out of `.slot` entirely, losing its layout and its place
      // in the strip without anything visibly going wrong.
      openNumberSlot.textContent = `${ROOT_SIGN}${openNumberSlot.textContent}`;
      openNumberSlot.classList.add('slot--root');
      continue;
    }

    const slot = document.createElement('div');
    slot.className = slotClass(item);
    if (item.kind === 'number') {
      slot.textContent = toDisplayString(item.value);
    } else if (item.kind === 'operator') {
      slot.textContent = OPERATORS[item.op]?.symbol ?? '?';
    } else {
      slot.textContent = item.op === 'sqrt' ? ROOT_SIGN : (item.exponent === 3 ? '\u00b3' : '\u00b2');
    }
    openNumberSlot = item.kind === 'number' ? slot : null;
    nodes.push(slot);
  }

  if (nodes.length === 0) {
    const dropzone = document.createElement('div');
    dropzone.className = 'slot slot--dropzone';
    dropzone.dataset.dropSlot = 'append';
    nodes.push(dropzone);
  }

  dom.workspaceLine.replaceChildren(...nodes);
  dom.workspace.classList.toggle('has-content', state.expression.length > 0);
}

/* ------------------------------------------------------------------ *
 * Rack
 * ------------------------------------------------------------------ */

function tileClass(kind) {
  if (kind === 'operator') return 'tile tile--operator';
  if (kind === 'unary') return 'tile tile--unary';
  return 'tile';
}

export function renderRack(state) {
  const ingredients = S.standIngredients(state);
  const expected = S.expectedKind(state);
  const hasOrder = ingredients.length > 0;

  const used = new Map();
  for (const item of state.expression) {
    if (item.kind !== 'number') continue;
    const key = `${item.value.n}/${item.value.d}`;
    used.set(key, (used.get(key) ?? 0) + 1);
  }

  const numberNodes = [];
  ingredients.forEach((value, index) => {
    const key = `${value.n}/${value.d}`;
    const remaining = ingredients.filter((v) => `${v.n}/${v.d}` === key).length - (used.get(key) ?? 0);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = tileClass('number');
    button.textContent = toDisplayString(value);
    button.dataset.tileKind = 'number';
    button.dataset.tileIndex = String(index);
    button.dataset.tileKey = key;
    button.dataset.draggable = 'true';
    if (remaining <= 0) button.classList.add('is-used');
    button.disabled = !hasOrder || expected !== 'number' || remaining <= 0;
    numberNodes.push(button);
  });
  dom.rackNumbers.replaceChildren(...numberNodes);

  const opNodes = operatorsForMode(state.band).map((op) => {
    const kind = op.arity === 'unary' ? 'unary' : 'operator';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = tileClass(kind);
    button.textContent = op.symbol;
    button.dataset.tileKind = kind;
    button.dataset.tileKey = op.key;
    button.dataset.tileExponent = op.exponent === undefined ? '' : String(op.exponent);
    button.dataset.draggable = 'true';
    button.disabled = !hasOrder || !S.canAccept(state, kind);
    button.setAttribute('aria-label', t(op.labelKey));
    return button;
  });
  dom.rackOperators.replaceChildren(...opNodes);
}

export function steamBurst() {
  dom.plate.querySelectorAll('.steam').forEach((n) => n.remove());
  for (let i = 0; i < 3; i += 1) {
    const puff = document.createElement('span');
    puff.className = 'steam';
    dom.plate.append(puff);
  }
  setTimeout(() => {
    dom.plate.querySelectorAll('.steam').forEach((n) => n.remove());
  }, 1800);
}

export function render(state) {
  renderHud(state);
  renderChips(state);
  renderStand(state);
  renderRack(state);
}

export { dom };

export const VIEW = {
  cacheDom,
  showScreen,
  showOverlay,
  render,
  renderHud,
  renderChips,
  renderStand,
  renderRack,
  renderLevelGrid,
  renderModeCards,
  applyStaticStrings,
  resetChipArrivals,
  feedback,
  toast,
  bump,
  shake,
  steamBurst,
  dom,
};
