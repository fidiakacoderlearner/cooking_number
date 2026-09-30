/**
 * DOM rendering. Reads state, writes markup, and reports user intent back to the
 * controller through callbacks. It never mutates game state directly and never
 * does arithmetic (AGENTS.md rule 4).
 */

import { toDisplayString } from '../core/rational.js';
import { customersForLevel, LEVELS_PER_MODE, MAX_ON_SCREEN } from '../core/difficulty.js';
import { t } from './i18n.js';
import { ASSETS, OPERATORS, operatorsForMode, operatorsForLevel, customerFor } from './assets.js';
import * as S from './state.js';
import * as audio from './audio.js';
import { bestResult } from './progress.js';

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

  dom.plate = el('.counter__plate');
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
  dom.overlayConfirm = el('[data-overlay="confirm"]');
  dom.overlayConfirmBody = el('[data-confirm-body]');
  dom.overlayConfirmTitle = el('#confirm-title');
  dom.overlayConfirmStay = el('[data-action="confirm-stay"] [data-i18n]');
  dom.overlayConfirmLeave = el('[data-action="confirm-leave"] [data-i18n]');
  dom.overlayRules = el('[data-overlay="rules"]');
  dom.muteIcon = el('[data-audio-mute-icon]');
  dom.muteLabel = el('[data-audio-mute-label]');
  dom.gameMenu = el('[data-game-menu]');
  dom.hudMenuButton = el('[data-action="toggle-game-menu"]');
}

export function showScreen(name) {
  document.body.dataset.screen = name;
  for (const screen of dom.screens) {
    screen.hidden = screen.dataset.screenName !== name;
  }
}

export function showOverlay(name) {
  dom.overlayLevel.hidden = name !== 'level';
  dom.overlayConfirm.hidden = name !== 'confirm';
  dom.overlayRules.hidden = name !== 'rules';
  if (name === 'level') {
    // Focus moves into the dialog so a stray Enter cannot re-fire the Serve
    // button that is still focused behind the scrim.
    dom.overlayLevel.querySelector('.btn--primary')?.focus();
  }
  if (name === 'confirm') {
    // Focus lands on the safe answer. The dialog exists because tapping a chip
    // discards a dish, so the default has to be the one that keeps the work.
    dom.overlayConfirm.querySelector('[data-confirm="stay"]')?.focus();
  }
  if (name === 'rules') {
    // The rules card is the longest text in the game, so it scrolls. Focus goes
    // to Close, not the first heading, so a keyboard user can dismiss it without
    // tabbing through every rule first.
    dom.overlayRules.querySelector('.btn--primary')?.focus();
  }
}

/**
 * Ask before a customer is swapped out from under a half-built dish.
 *
 * Only reachable past `FREE_SWITCH_TILES`, where there is real work to lose.
 *
 * Title and both button labels are written here even though the markup carries
 * the same strings as its static defaults. The reset question borrows this
 * dialog, so whichever question opened last decides what the words say, and
 * writing all of them every time is what keeps a stale "Erase it" from surviving
 * on top of a later switch question.
 */
export function showSwitchConfirm({ tiles, target }) {
  if (dom.overlayConfirmTitle) {
    dom.overlayConfirmTitle.textContent = t('confirm.switchTitle');
  }
  if (dom.overlayConfirmBody) {
    dom.overlayConfirmBody.textContent = t('confirm.switchBody', { tiles, target });
  }
  if (dom.overlayConfirmStay) {
    dom.overlayConfirmStay.textContent = t('confirm.stay');
  }
  if (dom.overlayConfirmLeave) {
    dom.overlayConfirmLeave.textContent = t('confirm.leave');
  }
  showOverlay('confirm');
}

/**
 * Ask before New Game erases every finished level.
 *
 * Rule 11: throwing away progress is exactly the kind of irreversible, hard to
 * undo action that has to be a deliberate press of a button the player read
 * first, never a side effect of tapping the wrong thing.
 */
export function showResetConfirm() {
  if (dom.overlayConfirmTitle) {
    dom.overlayConfirmTitle.textContent = t('confirm.resetTitle');
  }
  if (dom.overlayConfirmBody) {
    dom.overlayConfirmBody.textContent = t('confirm.resetBody');
  }
  if (dom.overlayConfirmStay) {
    dom.overlayConfirmStay.textContent = t('confirm.keep');
  }
  if (dom.overlayConfirmLeave) {
    dom.overlayConfirmLeave.textContent = t('confirm.lose');
  }
  showOverlay('confirm');
}

/**
 * Ask before the in-level menu abandons a level in progress.
 *
 * The customers are not punished for the player leaving; they simply go home
 * when the level ends. But the dish on the stand is work that is not coming back,
 * so rule 11 applies to it the same way it applies to erasing progress.
 */
export function showLeaveConfirm() {
  if (dom.overlayConfirmTitle) {
    dom.overlayConfirmTitle.textContent = t('confirm.leaveTitle');
  }
  if (dom.overlayConfirmBody) {
    dom.overlayConfirmBody.textContent = t('confirm.leaveBody');
  }
  if (dom.overlayConfirmStay) {
    dom.overlayConfirmStay.textContent = t('confirm.keepPlaying');
  }
  if (dom.overlayConfirmLeave) {
    dom.overlayConfirmLeave.textContent = t('confirm.leaveAnyway');
  }
  showOverlay('confirm');
}

/* ------------------------------------------------------------------ *
 * Game menu (the dropdown that appears on the in-game hamburger)
 * ------------------------------------------------------------------ */

/**
 * Toggle the game menu. The panel is a small dropdown under the hamburger. Focus
 * goes into the panel when it opens, and back to the hamburger when it closes.
 *
 * `aria-expanded` on the button mirrors the panel, so a screen reader announces
 * that a panel is now showing rather than leaving the state implicit.
 */
export function toggleGameMenu() {
  if (!dom.gameMenu) return;
  const open = dom.gameMenu.hidden;
  dom.gameMenu.hidden = !open;
  dom.hudMenuButton?.setAttribute('aria-expanded', String(open));
  if (open) dom.gameMenu.querySelector('button')?.focus();
}

/**
 * Put the panel away.
 *
 * `restoreFocus` is false when the panel is being closed by something that moves
 * the player somewhere else anyway, like leaving the level or starting the next
 * one. Stealing focus back to a hamburger on a screen that is no longer being
 * shown would drop a keyboard player at the top of the document.
 */
export function closeGameMenu({ restoreFocus = true } = {}) {
  if (!dom.gameMenu || dom.gameMenu.hidden) return;
  dom.gameMenu.hidden = true;
  dom.hudMenuButton?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) dom.hudMenuButton?.focus();
}

/** Is the in-level panel open? The click handler needs this to spot a stray tap. */
export function isGameMenuOpen() {
  return Boolean(dom.gameMenu && !dom.gameMenu.hidden);
}

/**
 * Grey out Continue when there is nothing to continue.
 *
 * The button stays on screen rather than disappearing, because a menu whose
 * buttons appear and vanish as progress accumulates is a menu the player has to
 * re-read every visit. `aria-disabled` is set alongside `disabled` so a screen
 * reader says why the button is dead, and the label explains it in words.
 */
export function setContinueEnabled(hasProgress) {
  const button = document.querySelector('.menu__continue');
  if (!button) return;
  button.disabled = !hasProgress;
  button.setAttribute('aria-disabled', String(!hasProgress));
  button.setAttribute(
    'aria-label',
    hasProgress ? t('action.continue') : t('action.continueLocked'),
  );
}

/**
 * Return focus to the menu button that opened the rules dialog.
 *
 * The "How to play" button is a direct child of `menu__footer` with its own
 * class, so it is found by that class rather than by counting positions. The
 * footer used to hold two buttons and the second was always this one, which
 * stopped being true once New Game and Continue were added above it.
 */
export function focusRulesOpener() {
  const footer = document.querySelector('.menu__footer');
  const howTo = footer?.querySelector('.menu__howto');
  if (howTo) howTo.focus();
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

  for (let level = 1; level <= LEVELS_PER_MODE; level += 1) {
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

    // Only a level the player has actually finished carries a result. The next
    // level up is unlocked but not yet played, so it shows nothing rather than
    // a zero that would read as a bad result.
    const best = bestResult(mode, level);
    if (!locked && best) {
      // The ratio comes first because it is the honest measure of the level:
      // score can be high off three quick customers, while `6/7` says how
      // close the player came to clearing the room. `served` is null for a
      // result recorded before the ratio was stored, so the line is skipped
      // rather than shown as `0/0`.
      if (best.served !== null) {
        const served = document.createElement('span');
        served.className = 'level-card__served';
        served.textContent = t('levels.served', { served: best.served, total: best.total });
        button.append(served);
      }
      const score = document.createElement('span');
      score.className = 'level-card__score';
      score.textContent = t('levels.best', { score: best.score });
      button.append(score);
    }

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

/**
 * Show whether sound is on, as a note head with a slash when it is not.
 *
 * The label is read out as well as drawn, so a screen reader hears "Mute sound"
 * or "Unmute sound" rather than an unpronounceable music symbol. The icon is
 * `aria-hidden` in the markup and the button carries the real name.
 */
export function setMuteIcon(muted) {
  const icon = dom.muteIcon;
  if (!icon) return;
  icon.innerHTML = muted
    ? '&#9834;<span class="hud__mute-slash" aria-hidden="true">/</span>'
    : '&#9834;';

  // The visible label names the action, the way a toggle button is expected to
  // read: "Music: Off" means sound is on and tapping turns it off. The state
  // itself is on `aria-pressed`, so both halves are available without the label
  // having to be ambiguous to be truthful.
  if (dom.muteLabel) {
    dom.muteLabel.textContent = muted ? t('gameMenu.musicOn') : t('gameMenu.musicOff');
  }

  const button = icon.closest('button');
  if (button) {
    const key = muted ? 'action.unmute' : 'action.toggleMute';
    button.setAttribute('aria-label', t(key));
    button.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }
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

/**
 * Slide the chips that changed slot, the way a queue actually closes up.
 *
 * Every render rebuilds the strip from scratch, so there is no element left to
 * transition: the browser never sees the old one move, only the new one appear
 * in a different place. FLIP fixes that by measuring where each chip was before
 * the rebuild, measuring where it ended up after, and animating the difference
 * with a transform.
 *
 * Newly arrived chips are skipped. They carry their own arrival animation, and
 * both write `transform`, so running them together would have the keyframes
 * overwrite the FLIP offset and the chip would jump.
 */
function slideIntoPlace(beforeRects) {
  for (const chip of dom.queueStrip.querySelectorAll('.chip:not(.anim-arrive)')) {
    const before = beforeRects.get(chip.dataset.orderId);
    if (!before) continue;
    const after = chip.getBoundingClientRect();
    const dx = before.left - after.left;
    if (Math.abs(dx) < 0.5) continue;

    chip.style.transition = 'none';
    chip.style.transform = `translateX(${dx}px)`;
    // The offset has to be committed before the transition is turned on, or the
    // browser has nothing to animate from and the chip simply appears.
    void chip.offsetWidth;
    chip.style.transition = 'transform 350ms ease-out';
    chip.style.transform = 'translateX(0)';
    chip.addEventListener('transitionend', () => {
      chip.style.transition = '';
      chip.style.transform = '';
    }, { once: true });
  }
}

export function renderChips(state) {
  // Measured before the strip is rebuilt, and only the horizontal position:
  // chips share a row, so vertical movement here would mean a layout change the
  // queue animation is not meant to paper over.
  const beforeRects = new Map();
  for (const chip of dom.queueStrip.querySelectorAll('.chip')) {
    beforeRects.set(chip.dataset.orderId, chip.getBoundingClientRect().left);
  }

  const nodes = [];
  const onScreen = new Set();

  for (const order of state.orders) {
    if (order.status === S.ORDER_STATUS.SERVED || order.status === S.ORDER_STATUS.WALKED) continue;
    onScreen.add(order.id);
    const target = toDisplayString(order.puzzle.target);

    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.orderId = String(order.id);
    chip.classList.add(`is-${order.status}`);

    // The arrival animation is the only thing that must not repeat. Giving it to
    // every chip on every render made the whole queue blink once a second and
    // left the player unable to tell a new arrival from a waiting one.
    if (!arrivedChipIds.has(order.id)) {
      chip.classList.add('anim-arrive');
      arrivedChipIds.add(order.id);
      // Fired here, at the moment the chip starts walking in, not on the
      // animation's end: the sound belongs to the door opening, not to the
      // customer reaching their place. `arrivedChipIds` is what keeps this to
      // one per customer.
      audio.playArrive();
      // Tappable the moment the chip stops moving, which is well before its
      // patience clock starts: the clock is driven by the once-a-second tick and
      // the animation is not. Letting the player act on what they can already
      // see is the right way round, and `tick` grants the second of grace that
      // keeps the clock from charging for time the chip was still in flight.
      chip.addEventListener('animationend', () => {
        chip.classList.remove('anim-arrive');
      }, { once: true });
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

    // Tapping the chip is the whole commitment now: it loads the stand and turns
    // this customer green, so there is no button to press and nothing else to
    // read. The green chip is also what says who the stand is cooking for, which
    // is why the stand used to carry a "Building a dish for..." line as well.
    if (order.status === S.ORDER_STATUS.COOKING) chip.classList.add('is-cooking');

    chip.setAttribute('data-status', order.status);
    nodes.push(chip);
  }

  dom.queueStrip.replaceChildren(...nodes);
  slideIntoPlace(beforeRects);

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
    dom.workspaceEmpty.hidden = false;
    dom.workspaceEmpty.textContent = t('stand.pickCustomer');
    dom.plateValue.textContent = '';
    dom.plate.classList.remove('has-dish');
    dom.workspace.classList.remove('has-content');
    dom.workspaceLine.replaceChildren();
    dom.serveBtn.disabled = true;
    return;
  }

  // The stand used to carry a "Building a dish for 7" line and a second copy of
  // the customer's portrait. The green chip in the queue says both, and a phone
  // playtest asked for fewer elements on one screen, so both are gone.
  dom.workspaceEmpty.hidden = state.expression.length > 0;

  // The final value is the safeguard against a walkout the player could not see
  // coming (AGENTS.md rule 11), so it is never hidden behind a hover state.
  dom.plateValue.textContent = total === null ? '' : `= ${toDisplayString(total)}`;
  dom.plate.classList.toggle('has-dish', dish);
  dom.serveBtn.disabled = !dish;

  renderWorkspace(state);
}

function slotClass(item) {
  if (item.kind === 'operator') return 'slot slot--operator';
  if (item.kind === 'unary') return 'slot slot--unary';
  return 'slot';
}

const ROOT_SIGN = '\u221a';

const SUPERSCRIPT = { 2: '\u00b2', 3: '\u00b3', 4: '\u2074' };

function superscriptFor(exponent) {
  return SUPERSCRIPT[exponent] ?? `^${exponent}`;
}

function renderWorkspace(state) {
  const nodes = [];
  // The slot a modifier would wrap, if the next item is one. A power does not
  // need a sign of its own, because `16` then a superscript already reads as 16
  // squared: that is how a power is written. A root is the other way round, `16`
  // then the sign reads as a number followed by an operator, when the written
  // form is the sign around the number. Found in a phone playtest, where the
  // value had to be put in first and only then the sign.
  let openNumberSlot = null;
  // The number inside it, kept apart from the rendered text so a second square
  // can restate the slot as `16⁴` instead of appending to `16²`, and 0 when the
  // slot has no power on it yet.
  let openBase = '';
  let openExponent = 0;

  const closeSlot = () => {
    openNumberSlot = null;
    openBase = '';
    openExponent = 0;
  };

  const restatePower = (exponent) => {
    openExponent = exponent;
    openNumberSlot.textContent = `${openBase}${superscriptFor(exponent)}`;
    openNumberSlot.classList.add('slot--power');
  };

  for (const item of state.expression) {
    if (item.kind === 'unary' && openNumberSlot) {
      if (item.op === 'sqrt') {
        if (openExponent > 0) {
          // A root is written around the value it applies to, so a power has to
          // be restated first: `16² √` would read as 256 under the root, while
          // the chain really is `√(16²)`. Closing the slot lets the sign stand
          // on its own rather than claim a side of the number that is taken.
          closeSlot();
        } else {
          // The modifier is added, not swapped in: dropping the base class would
          // take the slot out of `.slot` entirely, losing its layout and its
          // place in the strip without anything visibly going wrong.
          openNumberSlot.textContent = `${ROOT_SIGN}${openBase}`;
          openNumberSlot.classList.add('slot--root');
          continue;
        }
      } else {
        // Powers stack, and the core evaluates them as separate steps, so a
        // second square is a fourth power rather than a second mark. Past a
        // single digit there is no superscript glyph, and those runs keep one
        // slot each rather than inventing a caret notation the tile rack never
        // taught.
        const next = openExponent === 0 ? (item.exponent ?? 2) : openExponent * (item.exponent ?? 2);
        if (SUPERSCRIPT[next]) {
          restatePower(next);
          continue;
        }
      }
    }

    const slot = document.createElement('div');
    slot.className = slotClass(item);
    if (item.kind === 'number') {
      openBase = toDisplayString(item.value);
      slot.textContent = openBase;
    } else if (item.kind === 'operator') {
      slot.textContent = OPERATORS[item.op]?.symbol ?? '?';
    } else {
      slot.textContent = item.op === 'sqrt' ? ROOT_SIGN : superscriptFor(item.exponent ?? 2);
    }

    if (item.kind === 'number') {
      openNumberSlot = slot;
      openExponent = 0;
    } else {
      closeSlot();
    }
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
