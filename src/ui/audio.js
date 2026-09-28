/**
 * Sound: the level's music loop and the short effect sounds.
 *
 * The music is one shipped file (`assets/placeholder/theme.mp3`) and it only
 * runs while a level is being played. Browsers refuse to start audio before the
 * page has been touched, so playback is armed on the first interaction rather
 * than on load, and a rejected `play()` is swallowed: a player who never touches
 * the screen, or a browser that blocks audio for its own reasons, must still get
 * a working game with no sound rather than an exception on the first tap.
 *
 * The three effect sounds are synthesised with the Web Audio API instead of
 * being shipped as files. That keeps this commit free of binary assets and makes
 * them instant, which matters because a customer can walk out a second after
 * arriving and a fetched sample would arrive too late to be heard.
 *
 * ponytail: the effects are placeholder tones, not designed sounds. Swap the
 * body of `playArrive`/`playServe`/`playWalkout` for a decoded buffer when the
 * team ships real audio. Nothing else in the file needs to change, and the call
 * sites do not move.
 */

import { t } from './i18n.js';

const MUSIC = 'assets/placeholder/theme.mp3';
const STORAGE_KEY = 'cn.muted';

let music = null;
let context = null;
let muted = readMuted();
/** True once the player has interacted, which is what makes audio legal. */
let armed = false;

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Private mode or storage blocked. Sound still plays for this session; it
    // just will not remember the choice next time.
    return false;
  }
}

function writeMuted(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Nothing to do: losing the preference is better than throwing here.
  }
}

/** The audio context, created on first use so it is never made before a tap. */
function audioContext() {
  if (context) return context;
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/**
 * One short tone, shaped so it does not click on either end.
 *
 * A bare oscillator with a hard start and stop is audible as a tick, which on a
 * phone speaker sounds like a glitch rather than a sound. The tiny ramps below
 * are what keep the edges clean.
 */
function tone({ freq, duration = 0.14, type = 'triangle', peak = 0.09, delay = 0, slideTo = null }) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  // A context created before a gesture starts suspended and never wakes up.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);

  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/* ------------------------------------------------------------------ *
 * Effect sounds
 * ------------------------------------------------------------------ */

/** A customer walking in. Rises, because something is being added. */
export function playArrive() {
  tone({ freq: 523.25, duration: 0.1, peak: 0.07 });
  tone({ freq: 783.99, duration: 0.12, peak: 0.06, delay: 0.08 });
}

/** A dish served. Two stacked notes, the brighter one on top. */
export function playServe() {
  tone({ freq: 659.25, duration: 0.11, peak: 0.09 });
  tone({ freq: 987.77, duration: 0.18, peak: 0.08, delay: 0.09 });
}

/** A walkout, from impatience or from the wrong dish. Falls. */
export function playWalkout() {
  tone({ freq: 392, duration: 0.26, type: 'sawtooth', peak: 0.06, slideTo: 174.61 });
}

/* ------------------------------------------------------------------ *
 * Music
 * ------------------------------------------------------------------ */

/**
 * Start the loop for a level.
 *
 * Safe to call more than once; the element is the same one every time, and
 * seeking to zero is what makes a second level start its music over instead of
 * resuming wherever the last one was cut off.
 */
export function startMusic() {
  if (!music) return;
  music.muted = muted;
  if (!armed) return;
  try {
    music.currentTime = 0;
  } catch {
    // Seeking before the file has metadata can throw. Playback is what matters.
  }
  music.play().catch(() => {});
}

/** Stop the loop. Called when a level ends or the player leaves the game. */
export function stopMusic() {
  if (!music) return;
  music.pause();
}

/** Flip mute, remember it, and apply it to anything already playing. */
export function toggleMute() {
  muted = !muted;
  writeMuted(muted);
  if (music) music.muted = muted;
  if (muted) {
    // Stop the loop outright rather than leaving a silent element running.
    music?.pause();
  }
  return muted;
}

export function isMuted() {
  return muted;
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

/**
 * Find the element, restore the preference, and arm on the first touch.
 *
 * Kept out of module scope so a test or a second screen can call it again
 * without double-wiring the listeners.
 */
export function init() {
  music = document.querySelector('[data-audio-music]');
  if (music) {
    music.muted = muted;
    music.addEventListener('error', () => {
      // A missing or unreadable file must not take the game down with it. The
      // effect sounds are synthesised and still work, and the level plays fine.
      music = null;
    });
  }

  if (armed) return;
  armed = true;

  const arm = () => {
    // The context has to exist inside the gesture, or it is born suspended.
    audioContext();
    if (document.body.dataset.screen === 'game') startMusic();
  };
  document.addEventListener('pointerdown', arm, { once: true });

  // A phone that is pocketed or backgrounded should not keep playing.
  document.addEventListener('visibilitychange', () => {
    if (!music) return;
    if (document.hidden) {
      music.pause();
      return;
    }
    if (document.body.dataset.screen === 'game' && !muted) music.play().catch(() => {});
  });
}
