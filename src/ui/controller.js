/**
 * Game controller: wires the core generator to the view, owns the clock, and
 * enforces the flow menu -> level select -> customers -> level done.
 */

import { LEVELS_PER_MODE } from '../core/difficulty.js';
import { toDisplayString } from '../core/rational.js';
import { t, toggleLanguage } from './i18n.js';
import { completeLevel, unlockedFor } from './progress.js';
import * as S from './state.js';
import * as view from './view.js';
import * as drag from './drag.js';

let state = null;
let activeMode = 'easy';
let timerHandle = null;
let lastTick = 0;

/* ------------------------------------------------------------------ *
 * Clock
 * ------------------------------------------------------------------ */

function stopTimer() {
  if (timerHandle !== null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function startTimer() {
  stopTimer();
  lastTick = Date.now();
  timerHandle = setInterval(() => {
    if (!state || state.phase !== S.PHASES.PLAYING) return;
    const now = Date.now();
    const elapsed = Math.max(0, now - lastTick);

    // Whole seconds only, so a slow frame never drains extra patience. The
    // bookkeeping below has to come *after* this bail-out: resetting lastTick
    // first would throw away the partial second on every 250ms frame and the
    // clock would never reach a whole second at all.
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 1) return;
    lastTick = now;

    const events = S.tick(state, seconds);

    // React to what happened *this* tick. Reading lastResult instead would
    // replay the same walkout message once a second, forever.
    if (events.walked.length > 0) {
      view.shake(view.dom.queue);
      view.feedback(t('result.lost'), 'bad');
    }

    view.render(state);
    if (events.phase === S.PHASES.LEVEL_DONE) showLevelDone();
  }, 250);
}

/* ------------------------------------------------------------------ *
 * Serving
 * ------------------------------------------------------------------ */

function handleServeTo(orderId) {
  if (!state || state.phase !== S.PHASES.PLAYING) return;
  const outcome = S.serveTo(state, orderId);
  if (!outcome.ok) {
    if (outcome.reason) view.feedback(t(outcome.reason), 'hint');
    view.render(state);
    return;
  }

  if (outcome.correct) {
    view.steamBurst();
    view.bump(view.dom.hudScore);
    view.feedback(t('result.served', { points: outcome.points }), 'good');
  } else {
    // A walkout is the most destructive thing in the game, so it is never silent.
    view.shake(view.dom.queue);
    view.feedback(
      t('work.wrong', {
        value: toDisplayString(outcome.value),
        target: toDisplayString(outcome.order.puzzle.target),
      }),
      'bad',
    );
  }
  view.render(state);
  if (state.phase === S.PHASES.LEVEL_DONE) showLevelDone();
}

/* ------------------------------------------------------------------ *
 * Flow
 * ------------------------------------------------------------------ */

function showLevelDone() {
  stopTimer();
  const served = S.ordersServed(state);
  const isFinal = state.level >= LEVELS_PER_MODE;
  // Only a finished level may open the next one.
  completeLevel(state.mode, state.level);
  view.dom.overlaySummary.textContent = served === state.rosterSize
    ? t('overlay.allDone')
    : t('overlay.summary', { served, total: state.rosterSize });
  view.dom.overlayScore.textContent = t('overlay.levelScore', { score: state.levelScore });
  view.dom.overlayScore.hidden = isFinal;
  view.showOverlay('level');
}

function startLevel(mode, level) {
  stopTimer();
  state = S.createState(mode, level);
  view.showOverlay(null);
  view.showScreen('game');
  view.feedback(null);
  view.render(state);
  startTimer();
}

function backToMenu() {
  stopTimer();
  state = null;
  view.showOverlay(null);
  view.showScreen('menu');
}

function openLevelSelect(mode) {
  activeMode = mode;
  view.renderLevelGrid(mode, unlockedFor(mode));
  view.showScreen('levels');
}

/* ------------------------------------------------------------------ *
 * Tile drops
 * ------------------------------------------------------------------ */

function handleDrop(tile, zoneKind, orderId) {
  if (!state || state.phase !== S.PHASES.PLAYING) return;

  if (zoneKind === 'serve') {
    if (tile.kind === 'serve') {
      // The plate is the tap-to-serve path: it always serves whoever is cooking.
      const order = S.cookingOrder(state);
      if (!order) {
        view.feedback(t('work.noCustomer'), 'hint');
        return;
      }
      handleServeTo(order.id);
    } else if (orderId !== null) {
      handleServeTo(orderId);
    }
    return;
  }

  const item =
    tile.kind === 'number'
      ? { kind: 'number', value: tile.value }
      : tile.kind === 'operator'
        ? { kind: 'operator', op: tile.op }
        : { kind: 'unary', op: tile.op, exponent: tile.exponent };

  const result = S.pushTile(state, item);
  if (!result.ok) {
    view.feedback(t(result.reason ?? 'work.badStep'), 'bad');
    view.render(state);
    return;
  }

  if (state.expression.length === 1) view.feedback(t('work.nextOperator'), 'hint');
  else view.feedback(t('work.keepGoing'), 'hint');
  view.render(state);
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

function handleAction(action, dataset) {
  switch (action) {
    case 'toggle-lang':
      toggleLanguage();
      view.applyStaticStrings();
      if (state) view.render(state);
      else if (document.body.dataset.screen === 'levels') {
        view.renderLevelGrid(activeMode, unlockedFor(activeMode));
      }
      break;

    case 'back-to-menu':
      backToMenu();
      break;

    case 'select-order':
      if (state) {
        S.selectOrder(state, Number(dataset.orderId));
        view.render(state);
      }
      break;

    case 'cook-for':
      if (state) {
        const result = S.startCooking(state, Number(dataset.orderId));
        if (!result.ok) view.feedback(t(result.reason), 'hint');
        else view.feedback(null);
        view.render(state);
      }
      break;

    case 'serve':
      if (state) {
        const order = S.cookingOrder(state);
        if (order) handleServeTo(order.id);
        else view.feedback(t('work.noCustomer'), 'hint');
      }
      break;

    case 'undo':
      if (state && S.undo(state)) view.render(state);
      else view.toast(t('toast.nothingToUndo'));
      break;

    case 'clear':
      if (state && S.clearStand(state)) view.render(state);
      break;

    case 'next-level':
      if (state && state.level < LEVELS_PER_MODE) startLevel(state.mode, state.level + 1);
      else backToMenu();
      break;

    default:
      break;
  }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

export function init() {
  view.cacheDom();
  view.applyStaticStrings();

  drag.configure({ onDrop: handleDrop });
  drag.init(document);

  document.addEventListener('click', (event) => {
    const modeCard = event.target.closest?.('[data-mode]');
    if (modeCard) {
      openLevelSelect(modeCard.dataset.mode);
      return;
    }

    const levelCard = event.target.closest?.('.level-card');
    if (levelCard && !levelCard.disabled) {
      startLevel(activeMode, Number(levelCard.dataset.level));
      return;
    }

    // Buttons win over their container, so the "Cook for" button on a chip is
    // never swallowed by the chip's own select behaviour.
    const trigger = event.target.closest?.('[data-action]');
    if (trigger) {
      handleAction(trigger.dataset.action, trigger.dataset);
      return;
    }

    // Tapping a chip only marks it. Selecting must never cost the player a
    // half-built dish (AGENTS.md rule 11).
    const chip = event.target.closest?.('.chip');
    if (chip && state) {
      S.selectOrder(state, Number(chip.dataset.orderId));
      view.render(state);
    }
  });

  // Pause the clock when the tab is hidden so a backgrounded tab cannot drain
  // anyone's patience while the player is away.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimer();
    } else if (state && state.phase === S.PHASES.PLAYING) {
      startTimer();
    }
  });

  view.showScreen('menu');

  return { getState: () => state, startLevel, openLevelSelect, backToMenu, handleDrop, handleServeTo };
}
