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
  const snappedPosition = canvas.grid.getSnappedPosition(
    (x - t.tx) / canvas.stage.scale.x,
    (y - t.ty) / canvas.stage.scale.y,
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
 * @returns {File}
 */
export function getFileFromSvgEl(svgEl, name) {
  // Retrieve element dimensions
  const bRect = svgEl.getBoundingClientRect();
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgEl.setAttribute('width', bRect.width);
  svgEl.setAttribute('height', bRect.height);
  svgEl.setAttribute('viewBox', `0 0 ${bRect.width} ${bRect.height}`);
  var svgData = svgEl.outerHTML;
  var preface = '<?xml version="1.0" standalone="no"?>\r\n';
  const blob = new Blob([preface, svgData], { type: 'image/svg+xml;charset=utf-8' });
  return new File([blob], name);
}

/**
 * Create a tile using the texturePath
 * @param {string} texturePath
 * @param {Element} svgEl
 * @returns {Promise<[TileDocument]>}
 * @private
 */
export async function createTile(texturePath, svgEl) {
  // Prepare the tile data from the texture path
  const bRect = svgEl.getBoundingClientRect();
  const data = mergeObject(getViewedCanvasCenterPosition(), {
    width: bRect.width,
    height: bRect.height,
    'texture.src': texturePath,
    'flags.sketch-tiles.isSketch': true,
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
 * @param newPath
 * @param oldPath
 */
export function editAllTiles(newPath, oldPath) {
  const updateData = { 'texture.src': newPath };
  game.canvas.tiles.tiles
    .map((c) => c.document)
    .filter((td) => td.texture.src === oldPath)
    .forEach((td) => td.update(updateData));
}
