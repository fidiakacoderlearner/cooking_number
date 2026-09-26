/**
 * Game controller: wires the core generator to the view, owns the timer, and
 * enforces the flow menu -> level select -> orders -> level done.
 */

import { LEVELS_PER_MODE } from '../core/difficulty.js';
import { toDisplayString } from '../core/rational.js';
import { t, toggleLanguage } from './i18n.js';
import * as S from './state.js';
import * as view from './view.js';
import * as drag from './drag.js';

const STORAGE_KEY = 'nk.progress';

let state = null;
let activeMode = 'easy';
let timerHandle = null;
let lastTick = 0;

/* ------------------------------------------------------------------ *
 * Progress persistence
 * ------------------------------------------------------------------ */

function readProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeProgress(mode, level) {
  try {
    const all = readProgress();
    all[mode] = Math.max(Number(all[mode] ?? 0), level);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: progress simply will not persist.
  }
}

function unlockedFor(mode) {
  const all = readProgress();
  return Math.min(LEVELS_PER_MODE, Math.max(1, Number(all[mode] ?? 1)));
}

/* ------------------------------------------------------------------ *
 * Timer
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
    lastTick = now;

    // Consume whole seconds only, so a slow frame never eats extra time.
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 1) return;

    const wasPlaying = state.phase === S.PHASES.PLAYING;
    S.tick(state, seconds);
    view.renderHud(state);
    if (wasPlaying && state.phase !== S.PHASES.PLAYING) handleTimeout();
  }, 250);
}

/* ------------------------------------------------------------------ *
 * Order outcomes
 * ------------------------------------------------------------------ */

function handleTimeout() {
  stopTimer();
  S.applyTimeout(state);
  view.feedback(t('result.tooSlow'), 'bad');
  view.shake(view.dom.hudTimer);

  if (state.phase === S.PHASES.GAME_OVER) {
    setTimeout(showGameOver, 700);
  } else {
    setTimeout(() => {
      view.feedback(null);
      S.advanceOrder(state);
      afterOrderLoaded();
    }, 900);
  }
}

function handleServe() {
  if (!state || !S.isServable(state)) {
    if (state) view.feedback(t('work.keepGoing'), 'hint');
    return;
  }
  stopTimer();
  const result = S.applySuccess(state);
  view.steamBurst();
  view.feedback(t('result.correct', { seconds: result.seconds }), 'good');
  view.bump(view.dom.hudScore);
  writeProgress(state.mode, state.level);

  setTimeout(() => {
    S.advanceOrder(state);
    if (state.phase === S.PHASES.LEVEL_DONE) {
      showLevelDone();
    } else {
      afterOrderLoaded();
    }
  }, 1100);
}

/* ------------------------------------------------------------------ *
 * Flow
 * ------------------------------------------------------------------ */

function afterOrderLoaded() {
  state.phase = S.PHASES.PLAYING;
  view.render(state);
  startTimer();
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

function showLevelDone() {
  stopTimer();
  const isFinal = state.level >= LEVELS_PER_MODE;
  view.dom.overlayScore.textContent = isFinal
    ? t('overlay.allDone')
    : t('overlay.levelScore', { score: state.levelScore });
  view.showOverlay('level');
}

function showGameOver() {
  stopTimer();
  view.dom.overlayFinal.textContent = t('overlay.finalScore', { score: state.score });
  view.showOverlay('gameover');
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

function handleDrop(tile, zoneKind) {
  if (!state || state.phase !== S.PHASES.PLAYING) return;

  if (zoneKind === 'serve') {
    handleServe();
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
    return;
  }

  if (state.expression.length === 1) {
    view.feedback(t('work.nextOperator'), 'hint');
  } else if (result.reachedTarget) {
    view.feedback(t('work.targetHit'), 'good');
  } else {
    view.feedback(t('work.keepGoing'), 'hint');
  }
  view.render(state);
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

function handleAction(action) {
  switch (action) {
    case 'toggle-lang':
      toggleLanguage();
      view.applyStaticStrings();
      // Re-render whatever is on screen, but never navigate: switching language
      // from the menu should leave the player on the menu.
      if (state) view.render(state);
      else if (document.body.dataset.screen === 'levels') {
        view.renderLevelGrid(activeMode, unlockedFor(activeMode));
      }
      break;

    case 'back-to-menu':
      backToMenu();
      break;

    case 'serve':
      handleServe();
      break;

    case 'undo':
      if (state && S.undo(state)) view.render(state);
      else view.toast(t('toast.nothingToUndo'));
      break;

    case 'clear':
      if (state && S.clearExpression(state)) view.render(state);
      break;

    case 'next-level':
      if (state && state.level < LEVELS_PER_MODE) startLevel(state.mode, state.level + 1);
      else backToMenu();
      break;

    case 'retry-level':
      if (state) {
        S.resetLevel(state);
        view.showOverlay(null);
        view.feedback(null);
        view.render(state);
        startTimer();
      }
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

  drag.configure({
    onDrop: handleDrop,
    onToast: (message) => view.toast(message),
  });
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

    const action = event.target.closest?.('[data-action]')?.dataset.action;
    if (action) handleAction(action);
  });

  // Pause the clock when the tab is hidden so a backgrounded tab cannot drain
  // an order's time while the player is away.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimer();
    } else if (state && state.phase === S.PHASES.PLAYING) {
      startTimer();
    }
  });

  view.showScreen('menu');

  return { getState: () => state, startLevel, openLevelSelect, backToMenu, handleDrop };
}

export const CONTROLLER = { init, startLevel, openLevelSelect, backToMenu };
