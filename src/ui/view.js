/**
 * DOM rendering. Reads state, writes markup, and reports user intent back to the
 * controller through callbacks. It never mutates game state directly and never
 * does arithmetic (AGENTS.md rule 4).
 */

import { toDisplayString } from '../core/rational.js';
import { ordersForLevel } from '../core/difficulty.js';
import { t } from './i18n.js';
import { ASSETS, OPERATORS, operatorsForMode, customerFor } from './assets.js';
import * as S from './state.js';

const el = (sel) => document.querySelector(sel);

const dom = {};

export function cacheDom() {
  dom.screens = [...document.querySelectorAll('[data-screen-name]')];
  dom.menuHat = el('.menu__hat');
  dom.modeTitle = el('[data-mode-title]');
  dom.levelGrid = el('[data-level-grid]');
  dom.hudLevel = el('[data-hud-level]');
  dom.hudLives = el('[data-hud-lives]');
  dom.hudScore = el('[data-hud-score]');
  dom.hudTimer = el('[data-hud-timer]');
  dom.hudProgress = el('[data-hud-progress]');
  dom.orderCustomer = el('[data-order-customer]');
  dom.orderTarget = el('[data-order-target]');
  dom.plate = el('[data-drop-zone="serve"]');
  dom.workspace = el('[data-workspace]');
  dom.workspaceLine = el('[data-workspace-line]');
  dom.running = el('[data-running]');
  dom.runningValue = el('[data-running-value]');
  dom.feedback = el('[data-feedback]');
  dom.feedbackText = el('[data-feedback-text]');
  dom.serveBtn = el('[data-action="serve"]');
  dom.rackNumbers = el('[data-rack-numbers]');
  dom.rackOperators = el('[data-rack-operators]');
  dom.toast = el('[data-toast]');
  dom.langCurrent = el('[data-lang-current]');
  dom.overlayLevel = el('[data-overlay="level"]');
  dom.overlayGameOver = el('[data-overlay="gameover"]');
  dom.overlayScore = el('[data-overlay-score]');
  dom.overlayFinal = el('[data-overlay-final]');
}

export function showScreen(name) {
  document.body.dataset.screen = name;
  for (const screen of dom.screens) {
    screen.hidden = screen.dataset.screenName !== name;
  }
}

export function showOverlay(name) {
  dom.overlayLevel.hidden = name !== 'level';
  dom.overlayGameOver.hidden = name !== 'gameover';
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
  const cell = node.closest('.hud__cell') ?? node;
  cell.classList.remove('is-shaking');
  void cell.offsetWidth;
  cell.classList.add('is-shaking');
}

/* ------------------------------------------------------------------ *
 * Menu and level select
 * ------------------------------------------------------------------ */

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
    meta.textContent = locked ? t('levels.lockedHint') : t('levels.orders', { count: ordersForLevel(level) });

    button.append(num, meta);
    item.append(button);
    dom.levelGrid.append(item);
  }
}

export function applyStaticStrings() {
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  dom.langCurrent.textContent = document.documentElement.lang.toUpperCase();
  if (dom.menuHat) dom.menuHat.src = ASSETS.chefHat;
}

/* ------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------ */

export function renderHud(state) {
  dom.hudLevel.textContent = `${state.orderIndex + 1}/${state.totalOrders}`;
  dom.hudScore.textContent = String(state.score);

  const seconds = Math.ceil(state.timeLeft);
  dom.hudTimer.textContent = String(seconds);
  const ratio = state.timeTotal > 0 ? state.timeLeft / state.timeTotal : 0;
  dom.hudProgress.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  const warning = ratio <= 0.34;
  dom.hudProgress.classList.toggle('is-warning', warning);
  dom.hudTimer.classList.toggle('is-warning', warning);

  const lives = [];
  for (let i = 0; i < 3; i += 1) {
    const span = document.createElement('span');
    span.className = i < state.lives ? 'life' : 'life is-lost';
    span.textContent = i < state.lives ? '\u{1F49A}' : '\u{1F5D1}';
    lives.push(span);
  }
  dom.hudLives.replaceChildren(...lives);
}

/* ------------------------------------------------------------------ *
 * Order
 * ------------------------------------------------------------------ */

export function renderOrder(state) {
  dom.orderTarget.textContent = toDisplayString(state.puzzle.target);
  dom.orderCustomer.src = customerFor(state.customerIndex);
  dom.orderCustomer.classList.remove('anim-pop');
  void dom.orderCustomer.offsetWidth;
  dom.orderCustomer.classList.add('anim-pop');
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
  const expected = S.expectedKind(state);

  const used = new Map();
  for (const key of state.expression.filter((i) => i.kind === 'number').map((i) => `${i.value.n}/${i.value.d}`)) {
    used.set(key, (used.get(key) ?? 0) + 1);
  }

  const numberNodes = [];
  state.puzzle.ingredients.forEach((value, index) => {
    const key = `${value.n}/${value.d}`;
    const remaining = (state.puzzle.ingredients.filter((v) => `${v.n}/${v.d}` === key).length) - (used.get(key) ?? 0);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = tileClass('number');
    button.textContent = toDisplayString(value);
    button.dataset.tileKind = 'number';
    button.dataset.tileIndex = String(index);
    button.dataset.tileKey = key;
    button.dataset.remaining = String(remaining);
    button.dataset.draggable = 'true';
    if (remaining <= 0) button.classList.add('is-used');
    if (expected !== 'number' || remaining <= 0) button.disabled = true;
    button.setAttribute('aria-label', `${toDisplayString(value)}`);
    numberNodes.push(button);
  });
  dom.rackNumbers.replaceChildren(...numberNodes);

  const opNodes = operatorsForMode(state.band).map((op) => {
    const button = document.createElement('button');
    button.type = 'button';
    // `arity` is 'binary' in the core vocabulary but the tile kind is 'operator'.
    button.className = tileClass(op.arity === 'unary' ? 'unary' : 'operator');
    button.textContent = op.symbol;
    button.dataset.tileKind = op.arity === 'unary' ? 'unary' : 'operator';
    button.dataset.tileKey = op.key;
    button.dataset.tileExponent = op.exponent === undefined ? '' : String(op.exponent);
    button.dataset.draggable = 'true';
    button.disabled = !S.canAccept(state, op.arity === 'unary' ? 'unary' : 'operator');
    button.setAttribute('aria-label', op.label);
    return button;
  });
  dom.rackOperators.replaceChildren(...opNodes);
}

/* ------------------------------------------------------------------ *
 * Workspace
 * ------------------------------------------------------------------ */

function slotClass(item, isResult) {
  if (isResult) return 'slot slot--result';
  if (item.kind === 'operator') return 'slot slot--operator';
  if (item.kind === 'unary') return 'slot slot--unary';
  return 'slot';
}

export function renderWorkspace(state) {
  const nodes = [];

  state.expression.forEach((item, index) => {
    if (item.kind === 'number') {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.textContent = toDisplayString(item.value);
      slot.dataset.slotIndex = String(index);
      slot.dataset.draggable = 'true';
      nodes.push(slot);
      return;
    }
    if (item.kind === 'operator') {
      const slot = document.createElement('div');
      slot.className = 'slot slot--operator';
      slot.textContent = OPERATORS[item.op]?.symbol ?? '?';
      slot.dataset.slotIndex = String(index);
      slot.dataset.draggable = 'true';
      nodes.push(slot);
      return;
    }
    const slot = document.createElement('div');
    slot.className = 'slot slot--unary';
    slot.textContent = item.op === 'sqrt' ? '\u221a' : (item.exponent === 3 ? '\u00b3' : '\u00b2');
    slot.dataset.slotIndex = String(index);
    slot.dataset.draggable = 'true';
    nodes.push(slot);
  });

  const total = S.runningTotal(state);
  if (total !== null) {
    const chip = document.createElement('div');
    const low = total.n !== 0 && total.n < 0;
    chip.className = low ? 'slot slot--result is-low' : 'slot slot--result';
    chip.textContent = `= ${toDisplayString(total)}`;
    chip.dataset.result = 'true';
    nodes.push(chip);
  } else {
    const dropzone = document.createElement('div');
    dropzone.className = 'slot slot--dropzone';
    dropzone.dataset.dropSlot = 'append';
    nodes.push(dropzone);
  }

  dom.workspaceLine.replaceChildren(...nodes);
  dom.workspace.classList.toggle('has-content', state.expression.length > 0);
  dom.running.hidden = total === null;
  if (total !== null) dom.runningValue.textContent = toDisplayString(total);
  dom.serveBtn.disabled = !S.isServable(state);
}

export function highlight(selector, on) {
  const node = el(selector);
  if (node) node.classList.toggle('is-over', on);
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
  renderOrder(state);
  renderRack(state);
  renderWorkspace(state);
}

/** Cached node references, so the controller can reach specific elements. */
export { dom };

export const VIEW = {
  cacheDom,
  showScreen,
  showOverlay,
  render,
  renderHud,
  renderRack,
  renderWorkspace,
  renderLevelGrid,
  applyStaticStrings,
  feedback,
  toast,
  bump,
  shake,
  highlight,
  steamBurst,
  dom,
};
