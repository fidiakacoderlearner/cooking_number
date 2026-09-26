/**
 * Tile interaction: drag-and-drop via interact.js, plus tap-to-place as the
 * mobile fallback agreed in PRD 5.4 discussion.
 *
 * A tap always works. Drag is the richer path, but on a small phone a dragged
 * tile can be dropped in the wrong place or fight the page scroll, so every
 * action here is reachable with two taps.
 */

import { t } from './i18n.js';

let selectedTile = null;
let dropCallback = null;
let toastCallback = null;
let zoneEnterCallback = null;
let zoneLeaveCallback = null;

const DRAG_THRESHOLD = 6;

export function configure(options) {
  dropCallback = options.onDrop;
  toastCallback = options.onToast ?? (() => {});
  zoneEnterCallback = options.onZoneEnter ?? (() => {});
  zoneLeaveCallback = options.onZoneLeave ?? (() => {});
}

/* ------------------------------------------------------------------ *
 * Tile identity
 * ------------------------------------------------------------------ */

function tileFromNode(node) {
  const kind = node.dataset.tileKind;
  if (!kind) return null;

  if (kind === 'number') {
    const key = node.dataset.tileKey;
    const [n, d] = key.split('/').map(Number);
    return { kind: 'number', key, value: { n, d: d || 1 }, node };
  }
  if (kind === 'operator') {
    return { kind: 'operator', op: node.dataset.tileKey, node };
  }
  if (kind === 'unary') {
    const exponent = node.dataset.tileExponent;
    return {
      kind: 'unary',
      op: node.dataset.tileKey,
      exponent: exponent ? Number(exponent) : undefined,
      node,
    };
  }
  return null;
}

const tileFromEvent = (event) => tileFromNode(event.currentTarget);

function clearSelection() {
  if (selectedTile) {
    selectedTile.node.classList.remove('is-selected');
    selectedTile = null;
  }
}

export function hasSelection() {
  return selectedTile !== null;
}

export function cancelSelection() {
  clearSelection();
}

/* ------------------------------------------------------------------ *
 * Drop zones
 * ------------------------------------------------------------------ */

const ZONES = ['[data-workspace]', '[data-drop-zone="serve"]'];

function zoneFor(target) {
  return target instanceof Element ? target.closest(ZONES.join(',')) : null;
}

function highlightZone(target, on) {
  for (const selector of ZONES) {
    const node = document.querySelector(selector);
    if (!node) continue;
    const isTarget = target instanceof Element && target.closest(selector);
    node.classList.toggle('is-over', on && Boolean(isTarget));
  }
}

function clearZoneHighlights() {
  for (const selector of ZONES) {
    document.querySelector(selector)?.classList.remove('is-over');
  }
}

/* ------------------------------------------------------------------ *
 * Committing a tile
 * ------------------------------------------------------------------ */

function commit(tile, zone) {
  if (!tile || !zone) return;
  const kind = zone.dataset.dropZone === 'serve' ? 'serve' : 'workspace';
  dropCallback?.(tile, kind, zone);
  clearSelection();
  clearZoneHighlights();
}

/**
 * Tap on a rack tile.
 *
 * Every tap appends straight into the workspace, so tapping `4`, `x`, `7`
 * builds `4 x 7` in three taps and Serve lights up immediately. Nothing is held
 * in a "selected" state between taps, which is what previously left the last
 * tile stranded outside the expression.
 *
 * Invalid tiles are disabled in the rack, so a tap that cannot be placed simply
 * does nothing. The short flash is the only confirmation needed, since the
 * feedback line already says what to pick next.
 */
function handleRackTap(node) {
  const tile = tileFromNode(node);
  if (!tile || node.disabled) return;

  if (selectedTile) {
    const previous = selectedTile;
    clearSelection();
    if (previous.node !== node) dropCallback?.(previous, 'workspace');
  }

  dropCallback?.(tile, 'workspace');

  node.classList.add('is-selected');
  setTimeout(() => node.classList.remove('is-selected'), 200);
}

/** Tap on the workspace or the plate. */
function handleZoneTap(node) {
  if (node.dataset.dropZone === 'serve') {
    dropCallback?.({ kind: 'serve' }, 'serve');
    return;
  }
  if (selectedTile) {
    const tile = selectedTile;
    clearSelection();
    dropCallback?.(tile, 'workspace');
  }
}

function handleZoneEnter(event) {
  if (!selectedTile) return;
  highlightZone(event.currentTarget, true);
  zoneEnterCallback?.(event.currentTarget);
}

function handleZoneLeave(event) {
  clearZoneHighlights();
  zoneLeaveCallback?.(event.currentTarget);
}

/* ------------------------------------------------------------------ *
 * Drag handling via interact.js
 * ------------------------------------------------------------------ */

function installDrag() {
  if (typeof window.interact === 'undefined') return false;

  window.interact('.tile, .slot').draggable({
    inertia: false,
    autoScroll: true,
    listeners: {
      start(event) {
        const tile = tileFromEvent(event);
        if (!tile) return;
        event.interactable.tile = tile;
        tile.node.classList.add('is-dragging');
        clearSelection();
      },
      move(event) {
        const tile = event.interactable.tile;
        if (!tile) return;
        const x = (event.dx ?? 0) / 2;
        const y = (event.dy ?? 0) / 2;
        tile.node.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
        tile.node.style.zIndex = '30';
        tile.node.style.pointerEvents = 'none';

        const under = document.elementFromPoint(event.client.x ?? 0, event.client.y ?? 0);
        const zone = zoneFor(under);
        if (zone) {
          highlightZone(zone, true);
        } else {
          clearZoneHighlights();
        }
      },
      end(event) {
        const tile = event.interactable.tile;
        if (!tile) return;
        tile.node.classList.remove('is-dragging');
        tile.node.style.transform = '';
        tile.node.style.zIndex = '';
        tile.node.style.pointerEvents = '';

        const under = document.elementFromPoint(event.client.x ?? 0, event.client.y ?? 0);
        const zone = zoneFor(under);
        if (zone) {
          commit(tile, zone);
        } else {
          clearZoneHighlights();
        }
      },
    },
  });

  return true;
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

export function init(root = document) {
  installDrag();

  // Tiles and zones are delegated, so re-rendering the rack never needs rebinding.
  root.addEventListener('click', (event) => {
    const tileNode = event.target.closest?.('.tile');
    if (tileNode) {
      handleRackTap(tileNode);
      return;
    }
    const zoneNode = event.target.closest?.('.slot--dropzone, .counter__plate');
    if (zoneNode) handleZoneTap(zoneNode);
  });

  for (const selector of ZONES) {
    for (const node of document.querySelectorAll(selector)) {
      node.addEventListener('dragenter', handleZoneEnter);
      node.addEventListener('dragleave', handleZoneLeave);
      node.addEventListener('mouseenter', handleZoneEnter);
      node.addEventListener('mouseleave', handleZoneLeave);
    }
  }

  // Escape cancels a pending tap selection, which helps keyboard and desktop use.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      clearSelection();
      clearZoneHighlights();
    }
  });

  return { dragReady: typeof window.interact !== 'undefined', threshold: DRAG_THRESHOLD };
}

export const DRAG = {
  init,
  configure,
  cancelSelection,
  hasSelection,
};
