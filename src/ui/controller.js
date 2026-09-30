/**
 * Game controller: wires the core generator to the view, owns the clock, and
 * enforces the flow menu -> mode select -> level select -> customers -> done.
 */

import { LEVELS_PER_MODE } from '../core/difficulty.js';
import { toDisplayString } from '../core/rational.js';
import { t, toggleLanguage } from './i18n.js';
import { clearProgress, completeLevel, hasProgress, recordScore, unlockedFor } from './progress.js';
import * as S from './state.js';
import * as view from './view.js';
import * as drag from './drag.js';
import * as audio from './audio.js';

let state = null;
let activeMode = 'easy';
let timerHandle = null;
let lastTick = 0;

/**
 * What the confirm dialog on screen is asking about, or null when it is closed.
 *
 * Three questions share one dialog and one pair of buttons: switch customer,
 * erase progress, and abandon the level. Which one is live cannot be inferred
 * from the dialog, so it is recorded here and cleared the moment the question is
 * answered. That clearing is what stops a later, unrelated `confirm-leave` from
 * erasing progress on the strength of a decision the player made about a dish.
 *
 * @type {{ kind: 'switch' | 'reset' | 'leave', orderId?: number } | null}
 */
let pendingConfirm = null;

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
      // One sound per tick, not per customer: three chips giving out on the same
      // second should read as one bad moment rather than three overlapping
      // stings.
      audio.playWalkout();
      view.feedback(t('result.lost'), 'bad');
    }

    view.render(state);
    if (events.phase === S.PHASES.LEVEL_DONE) showLevelDone();
  }, 250);
}

/* ------------------------------------------------------------------ *
 * Serving
 * ------------------------------------------------------------------ */

/**
 * How quickly a customer was served, in words.
 *
 * The points already carry the speed bonus, so without a word for it two
 * different scores read as the same event and the player has no idea that
 * serving fast is what the rest of the number is paying for.
 */
function paceFor(outcome) {
  const base = S.SCORE_BASE[state?.mode] ?? 10;
  const ratio = base > 0 ? (outcome.points - base) / (base * S.SPEED_BONUS_RATIO) : 0;
  if (ratio >= 0.8) return 'result.pace.blazing';
  if (ratio >= 0.5) return 'result.pace.fast';
  if (ratio >= 0.2) return 'result.pace.steady';
  return 'result.pace.slow';
}

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
    audio.playServe();
    view.feedback(
      t('result.served', { points: outcome.points, pace: t(paceFor(outcome)) }),
      'good',
    );
  } else {
    // A walkout is the most destructive thing in the game, so it is never silent.
    view.shake(view.dom.queue);
    audio.playWalkout();
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
  audio.stopMusic();
  // A panel left open when the last customer leaves would sit behind the
  // level-complete overlay, and the next level would start with it still there.
  view.closeGameMenu({ restoreFocus: false });
  const served = S.ordersServed(state);
  const isFinal = state.level >= LEVELS_PER_MODE;
  // Only a finished level may open the next one.
  completeLevel(state.mode, state.level);
  // The best result for this exact level, kept even if the player replays it
  // worse. Stored next to the progress write so the two can never disagree about
  // which levels have been played.
  recordScore(state.mode, state.level, {
    score: state.levelScore,
    served,
    total: state.rosterSize,
  });
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
  pendingConfirm = null;
  // The in-level dropdown must not survive into the next level, or a player who
  // leaves mid-game and starts another arrives with a panel hanging over the HUD.
  view.closeGameMenu({ restoreFocus: false });
  // Order ids restart at 1 for a new level, so the arrival memory has to go too
  // or the first customer of the new level would not animate.
  view.resetChipArrivals();
  view.showOverlay(null);
  view.showScreen('game');
  view.feedback(null);
  view.render(state);
  startTimer();
  audio.startMusic();
}

function backToMenu() {
  stopTimer();
  audio.stopMusic();
  state = null;
  pendingConfirm = null;
  view.closeGameMenu({ restoreFocus: false });
  view.showOverlay(null);
  // Re-read on every arrival, not just at boot. Finishing a level is the only
  // thing that writes progress, so a player who has just cleared Easy 1 must see
  // Continue light up the moment they walk back out, or the button would lie
  // about what the game knows.
  view.setContinueEnabled(hasProgress());
  view.showScreen('menu');
}

/**
 * Leave the level in progress and go to the level select for the mode it was.
 *
 * Not the menu: a player who walks out mid-level usually wants to pick a
 * different level of the same mode, and the mode screen is one tap further back
 * from there.
 */
function leaveToLevelSelect() {
  const mode = state?.mode ?? activeMode;
  stopTimer();
  audio.stopMusic();
  state = null;
  pendingConfirm = null;
  view.closeGameMenu({ restoreFocus: false });
  view.showOverlay(null);
  view.feedback(null);
  openLevelSelect(mode);
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
    case 'new-game':
      // New Game and Continue both land on the same mode select. The only
      // difference is that this one throws the progress away first, and it asks
      // before doing that. Both are worded as a deliberate choice rather than
      // hidden behind a single Play button, because "start over" and "pick up
      // where I was" are genuinely different intents and a single button cannot
      // guess which one was meant.
      if (hasProgress()) {
        pendingConfirm = { kind: 'reset' };
        view.showResetConfirm();
      } else {
        // Nothing to lose, so nothing to ask. A confirmation about a wipe that
        // would not happen is a dialog that trains players to dismiss dialogs.
        clearProgress();
        view.setContinueEnabled(false);
        view.showScreen('modes');
      }
      break;

    case 'continue':
      // Progress is left alone, so the level select that follows shows the
      // levels already unlocked in every mode.
      view.showScreen('modes');
      break;

    case 'how-to-play':
      view.showOverlay('rules');
      break;

    case 'toggle-mute':
      view.setMuteIcon(audio.toggleMute());
      break;

    case 'close-rules':
      view.showOverlay(null);
      // Focus has to come back to the button that opened the dialog, or a
      // keyboard user is dropped at the top of the document with no idea where
      // they are.
      view.focusRulesOpener();
      break;

    case 'toggle-lang':
      toggleLanguage();
      view.applyStaticStrings();
      // The mute label is a translated string, so the icon has to be re-read
      // after the language changes or the button would read "Mute" while
      // actually unmuting.
      view.setMuteIcon(audio.isMuted());
      view.setContinueEnabled(hasProgress());
      if (state) view.render(state);
      else if (document.body.dataset.screen === 'levels') {
        view.renderLevelGrid(activeMode, unlockedFor(activeMode));
      }
      break;

    case 'back-to-menu':
      backToMenu();
      break;

    case 'back-to-modes':
      // Level select came from the mode screen, so Back returns there rather
      // than jumping over it to the menu.
      view.showScreen('modes');
      break;

    case 'toggle-game-menu':
      view.toggleGameMenu();
      break;

    case 'leave-level':
      // The panel gets out of the way before the question appears, so the player
      // is not looking at two things at once when deciding.
      view.closeGameMenu({ restoreFocus: false });
      if (state) {
        pendingConfirm = { kind: 'leave' };
        // The clock stops for the question. Reading a dialog must never be what
        // makes a customer walk out, and `startTimer` resets the elapsed time so
        // the paused seconds are not charged to whoever is still waiting.
        stopTimer();
        view.showLeaveConfirm();
      }
      break;

    case 'levels-from-overlay':
      // The level-complete overlay's "Choose level" goes to the level select for
      // the mode just played, not the menu. A finished level is a moment to pick
      // what to play next, and the mode screen is one tap further back.
      leaveToLevelSelect();
      break;

    case 'select-order':
      if (state) {
        S.pickCustomer(state, Number(dataset.orderId));
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

    case 'confirm-stay':
      // The safe answer in all three cases: the dish keeps its work, the progress
      // keeps its levels, the level keeps its customers. Only the clock differs
      // between the in-game question and the two menu ones.
      view.showOverlay(null);
      if (pendingConfirm?.kind === 'switch') startTimer();
      pendingConfirm = null;
      break;

    case 'confirm-leave':
      if (!pendingConfirm) break;
      if (pendingConfirm.kind === 'reset') {
        // Rule 11: erasing every finished level is irreversible, and the only
        // thing standing between a stray tap and a wiped save is the question
        // that was just read and answered on purpose.
        clearProgress();
        view.showOverlay(null);
        view.setContinueEnabled(false);
        view.showScreen('modes');
        pendingConfirm = null;
      } else if (pendingConfirm.kind === 'leave') {
        leaveToLevelSelect();
        pendingConfirm = null;
      } else if (state && pendingConfirm.orderId !== null) {
        S.clearStand(state);
        S.pickCustomer(state, pendingConfirm.orderId);
        view.showOverlay(null);
        view.feedback(null);
        view.render(state);
        startTimer();
        pendingConfirm = null;
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
      else leaveToLevelSelect();
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
  audio.init();
  view.setMuteIcon(audio.isMuted());
  view.setContinueEnabled(hasProgress());

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

    // Tapping a chip commits the stand to that customer. That used to be a tap
    // followed by a "Cook for him" button, and the button is gone: a phone
    // playtest asked for fewer elements on screen. Because one tap now costs
    // more, anything past a couple of tiles asks first.
    const chip = event.target.closest?.('.chip');
    if (chip && state) {
      const result = S.pickCustomer(state, Number(chip.dataset.orderId));
      if (result.ok) {
        view.feedback(null);
        view.render(state);
        return;
      }
      if (result.reason === 'confirm.switch') {
        pendingConfirm = { kind: 'switch', orderId: Number(chip.dataset.orderId) };
        // The clock stops for the question. Reading a dialog must never be what
        // makes a customer walk out, and `startTimer` resets the elapsed time so
        // the paused seconds are not charged to whoever is still waiting.
        stopTimer();
        view.showSwitchConfirm({
          tiles: result.tiles,
          target: toDisplayString(result.order.puzzle.target),
        });
        return;
      }
      view.feedback(t(result.reason), 'hint');
      view.render(state);
    }
  });

  // The game menu panel goes away when a finger lands outside it, the same way
  // a real dropdown does. The click handler above already dispatched the action
  // on the item itself, so the panel is still open only when the tap missed it.
  document.addEventListener('pointerdown', (event) => {
    if (!view.isGameMenuOpen()) return;
    const panel = view.dom.gameMenu;
    if (!panel?.contains(event.target) && !view.dom.hudMenuButton?.contains(event.target)) {
      view.closeGameMenu();
    }
  });

  // Escape closes the game menu. The confirm and rules dialogs have their own
  // escape handling; this one is specifically for the dropdown panel.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && view.isGameMenuOpen()) {
      event.preventDefault();
      view.closeGameMenu();
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
