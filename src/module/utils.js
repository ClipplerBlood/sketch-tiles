export function i18n(s) {
  return game.i18n.localize(s);
}

/**
 * Returns the canvs position at the center of the screen
 * @returns {*}
 */
export function getViewedCanvasCenterPosition() {
  const [x, y] = [window.innerWidth / 2, window.innerHeight / 2];
  const t = canvas.stage.worldTransform;
  const snappedPosition = canvas.grid.getSnappedPoint(
    {
      x: (x - t.tx) / canvas.stage.scale.x,
      y: (y - t.ty) / canvas.stage.scale.y,
    },
    { mode: CONST.GRID_SNAPPING_MODES.BOTTOM_LEFT_CORNER },
  );
  return { x: snappedPosition.x, y: snappedPosition.y };
}

/**
 * Creates an SVG path from a STROKE
 * src: https://codesandbox.io/s/perfect-freehand-example-biwyi?fontsize=14&hidenavigation=1&theme=dark&file=/src/App.js
 * @param stroke
 * @returns {string|*}
 */
export function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'],
  );

  d.push('Z');
  return d.join(' ');
}

/**
 * Converts an SVG HTML ELEMENT into an SVG FILE DATA
 * @param {Element} svgEl
 * @param {string} name
 * @param {boolean} autoCrop
 * @returns {File}
 */
export function getFileFromSvgEl(svgEl, name, autoCrop) {
  // Retrieve element dimensions
  const bRect = getCroppedDimensions(svgEl, autoCrop);
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgEl.setAttribute('width', bRect.width.toString());
  svgEl.setAttribute('height', bRect.height.toString());
  svgEl.setAttribute('viewBox', `${autoCrop ? bRect.x : 0} ${autoCrop ? bRect.y : 0} ${bRect.width} ${bRect.height}`);
  var svgData = svgEl.outerHTML;
  var preface = '<?xml version="1.0" standalone="no"?>\r\n';
  const blob = new Blob([preface, svgData], { type: 'image/svg+xml;charset=utf-8' });
  return new File([blob], name);
}

/**
 * Create a tile using the texturePath
 * @param {string} texturePath
 * @param {Element} svgEl
 * @param {object} sketchSettings
 * @returns {Promise<[TileDocument]>}
 * @private
 */
export async function createTile(texturePath, svgEl, sketchSettings) {
  // Prepare the tile data from the texture path
  const bRect = getCroppedDimensions(svgEl, sketchSettings.autoCrop);
  const data = foundry.utils.mergeObject(getViewedCanvasCenterPosition(), {
    width: bRect.width,
    height: bRect.height,
    'texture.src': texturePath,
    'flags.sketch-tiles.isSketch': true,
    hidden: sketchSettings.hiddenTile,
  });

  // Create the tile, and if successful activate the TilesLayer, select the tile and close this app.
  const createdTiles = await game.scenes.viewed.createEmbeddedDocuments('Tile', [data]);
  if (createdTiles.length > 0) {
    game.canvas.tiles.activate();
    game.canvas.tiles.placeables.find((p) => p.document.id === createdTiles[0].id).control();
  }
  return createdTiles;
}

/**
 * Edits all tiles present in the TilesLayer with textures src that share the same oldPath, with the new src paths
 * @param {string} newPath
 * @param {string} oldPath
 * @param {Element} svgEl
 * @param {boolean} autoCrop
 */
export async function editAllTiles(newPath, oldPath, svgEl, autoCrop) {
  const bRect = getCroppedDimensions(svgEl, autoCrop);
  const updateData = { 'texture.src': newPath, width: bRect.width, height: bRect.height };
  const linkedTokenDocs = game.canvas.tiles.tiles.map((c) => c.document).filter((td) => td.texture.src === oldPath);
  for (const td1 of linkedTokenDocs) {
    await td1.update(updateData);
  }
}

/**
 * Returns a DOMRect of the svg actual contents
 * @param {Element} svgEl
 * @param {boolean} enabled if autoCrop is enabled
 * @returns {DOMRect | Object}
 */
export function getCroppedDimensions(svgEl, enabled) {
  const bRect = svgEl.getBoundingClientRect();
  if (!enabled || svgEl.children == null || svgEl.children?.length === 0) return bRect;

  let left = Infinity;
  let right = 0;
  let top = Infinity;
  let bottom = 0;

  for (const c of svgEl.children) {
    const r = c.getBoundingClientRect();
    left = Math.min(r.x - bRect.x, left);
    right = Math.max(r.x - bRect.x + r.width, right);
    top = Math.min(r.y - bRect.y, top);
    bottom = Math.max(r.y - bRect.y + r.height, bottom);
  }

  bRect.x = left;
  bRect.y = top;
  bRect.width = right - left;
  bRect.height = bottom - top;
  return bRect;
}
