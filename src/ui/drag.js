/**
 * Tile interaction: drag-and-drop via interact.js, plus tap-to-place as the
 * mobile fallback agreed in PRD 5.4.
 *
 * A tap always works. Drag is the richer path, but on a small phone a dragged
 * tile can be dropped in the wrong place or fight the page scroll, so every
 * action here is reachable with taps alone.
 *
 * Only tiles are draggable, and only onto the stand. Dragging a finished dish
 * onto a customer was removed after a playtest: the player tapped the customer
 * instead, and one way to serve is easier to learn than three. Serving is now the
 * Serve button or a tap on the plate.
 *
 * The stand is the only place a dish is built. Nothing here can destroy work on
 * its own (AGENTS.md rule 11).
 */

let dropCallback = null;
let dragReady = false;

/** Where a drag may be dropped. Cached, because it is read on every pointer move. */
let zones = [];

export function configure(options) {
  dropCallback = options.onDrop;
}

export function isDragReady() {
  return dragReady;
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

/* ------------------------------------------------------------------ *
 * Drop zones
 * ------------------------------------------------------------------ */

/** The only place a drag can land: the stand. */
const ZONE_SELECTORS = ['[data-workspace]'];

function zoneFor(target) {
  if (!(target instanceof Element)) return null;
  return target.closest(ZONE_SELECTORS.join(','));
}

/** Re-read the zone list, which cannot be computed once because the view rebuilds it. */
function refreshZones() {
  zones = [];
  for (const selector of ZONE_SELECTORS) {
    for (const node of document.querySelectorAll(selector)) {
      zones.push({ node, selector });
    }
  }
}

function highlightZone(target, on) {
  for (const zone of zones) {
    const isTarget = on && target instanceof Element && Boolean(target.closest(zone.selector));
    zone.node.classList.toggle('is-over', isTarget);
  }
}

function clearZoneHighlights() {
  for (const zone of zones) zone.node.classList.remove('is-over');
}

/* ------------------------------------------------------------------ *
 * Committing a tile
 * ------------------------------------------------------------------ */

function commit(tile, zone) {
  if (!tile || !zone) return;
  dropCallback?.(tile, 'workspace', null);
  clearZoneHighlights();
}

/* ------------------------------------------------------------------ *
 * Taps
 * ------------------------------------------------------------------ */

/**
 * Tap a rack tile. Every tap appends straight to the stand, so `4`, `x`, `7` is
 * three taps. Invalid tiles are disabled in the rack, so a tap that cannot be
 * placed simply does nothing.
 */
function handleRackTap(node) {
  const tile = tileFromNode(node);
  if (!tile || node.disabled) return;
  dropCallback?.(tile, 'workspace', null);
}

/* ------------------------------------------------------------------ *
 * Drag handling via interact.js
 * ------------------------------------------------------------------ */

function installDrag() {
  if (typeof window.interact === 'undefined') return false;

  window.interact('.tile').draggable({
    inertia: false,
    autoScroll: true,
    listeners: {
      start(event) {
        const tile = tileFromEvent(event);
        if (!tile) return;
        event.interactable.tile = tile;
        // The offset has to be remembered across move events. interact.js
        // reports dx and dy as the change since the *previous* event, so writing
        // them straight into `transform` moved the tile by one step and put it
        // straight back, over and over. A phone playtest reported being unable
        // to see that a tile was being dragged at all, and this is why.
        event.interactable.offset = { x: 0, y: 0 };
        tile.node.classList.add('is-dragging');
        refreshZones();
      },
      move(event) {
        const tile = event.interactable.tile;
        if (!tile) return;
        const offset = event.interactable.offset ?? { x: 0, y: 0 };
        offset.x += event.dx ?? 0;
        offset.y += event.dy ?? 0;
        event.interactable.offset = offset;
        tile.node.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(1.08) rotate(-3deg)`;
        tile.node.style.zIndex = '30';
        tile.node.style.pointerEvents = 'none';

        const zone = zoneFor(document.elementFromPoint(event.client.x ?? 0, event.client.y ?? 0));
        highlightZone(zone, true);
      },
      end(event) {
        const tile = event.interactable.tile;
        if (!tile) return;

        // The drop target has to be read while the dragged tile is still
        // transparent to the pointer. Restoring it first hands the hit test to
        // the tile, which is sitting exactly under the finger, and a tile lives
        // in the rack rather than in a drop zone, so the drop does nothing at
        // all. This stayed hidden for as long as the drag itself was broken,
        // because a tile that never moved was never under the finger.
        const zone = zoneFor(document.elementFromPoint(event.client.x ?? 0, event.client.y ?? 0));

        tile.node.classList.remove('is-dragging');
        tile.node.style.transform = '';
        tile.node.style.zIndex = '';
        tile.node.style.pointerEvents = '';

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

const tileFromEvent = (event) => tileFromNode(event.currentTarget);

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

export function init(root = document) {
  dragReady = installDrag();
  refreshZones();

  // Delegated, so re-rendering the rack never needs rebinding.
  root.addEventListener('click', (event) => {
    const tileNode = event.target.closest?.('.tile');
    if (tileNode) {
      handleRackTap(tileNode);
      return;
    }
    // Tapping the plate is one of the two ways to serve; the Serve button is the
    // other. Scoped to the plate itself so a tap that lands on the dish value
    // inside it is still read as a tap on the plate.
    const plate = event.target.closest?.('.counter__plate');
    if (plate) {
      dropCallback?.({ kind: 'serve' }, 'serve', null);
    }
  });

  return { dragReady };
}
