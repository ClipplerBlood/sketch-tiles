import { createTile, getSvgPathFromStroke, getFileFromSvgEl } from '../utils.js';
import { getStroke } from 'perfect-freehand';

export class SketchApp extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: 'modules/sketch-tiles/templates/sketch-app.html',
      classes: ['sketch-app'],
      width: 420,
      height: 700,
      title: 'Sketch Tiles',
    });
  }

  /**
   * Create a new SketchTile app, then render it
   */
  static async create() {
    const app = new this();
    app.render(true);
  }

  /**
   * Path of where to save the SVG file
   * @returns {string}
   */
  static get path() {
    return `worlds/${game.world.id}/SketchTiles`;
  }

  /**
   * Storage of where to save the SVG file
   * @returns {string}
   */
  static get storageSource() {
    return 'data'; // TODO: s3
  }

  /**
   * Constructor.
   * It also adds some attributes describing the drawn path and the svg path
   * @param props
   * @override
   */
  constructor(...props) {
    super(...props);
    this.svgElement = undefined;
    this.points = [];
    this.pathsPoints = [];
    this.renderedSvgPaths = [];
    this.keyDownListener = (ev) => {
      if (ev.ctrlKey && ev.key === 'z') this._undo();
    };
    document.addEventListener('keydown', this.keyDownListener);
  }

  /**
   * Close the application and remove the keydown listener
   * @param options
   * @override
   */
  close(options = {}) {
    super.close(options);
    document.removeEventListener('keydown', this.keyDownListener);
  }

  /**
   * Buttons
   * @override
   * @private
   */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons.unshift({
      label: 'Upload',
      icon: 'fa-solid fa-up-from-line',
      class: 'upload-sketch',
      onclick: () => this._upload(),
    });
    return buttons;
  }

  /**
   * Activate the listeners
   * @override
   * @param html
   */
  activateListeners(html) {
    super.activateListeners(html);
    const $svgContainer = html.closest('.sketch-app-container');
    $svgContainer.on('pointerdown', (ev) => this.handlePointerDown(ev));
    $svgContainer.on('pointermove', (ev) => this.handlePointerMove(ev));
    this.svgElement = html.find('svg').get(0);
    html.find('[data-action="upload"]').click(() => this._upload());
  }

  /**
   * Pointer DOWN event
   * @param {MouseEvent} ev
   */
  handlePointerDown(ev) {
    ev.target.setPointerCapture(ev.pointerId);
    this._draw(ev, true);
  }

  /**
   * Pointer MOVE event
   * @param {MouseEvent} ev
   */
  handlePointerMove(ev) {
    if (ev.buttons !== 1) return;
    this._draw(ev, false);
  }

  /**
   * Draws the SVG incrementally.
   * This means that only the current drawn path is converted to SVG,
   * while the previous ones are already converted to SVG
   * @param {MouseEvent} ev
   * @param {boolean} isNewPath if true, creates a new draw path
   * @private
   */
  _draw(ev, isNewPath) {
    // Get the current point
    const pos = this._getPosition(ev);
    const currentPoint = [pos.x, pos.y, ev.pressure ?? 1];
    let currentPath;
    // If is a new path, simply add a point to the paths
    if (isNewPath) {
      // Add the point to a new path
      currentPath = [currentPoint];
      this.pathsPoints.push(currentPath);
      this.renderedSvgPaths.push([]);
    } else {
      currentPath = this.pathsPoints.at(-1);
      currentPath.push(currentPoint);
    }

    const stroke = getStroke(currentPath, _strokeOptions);
    this.renderedSvgPaths[this.renderedSvgPaths.length - 1] = getSvgPathFromStroke(stroke);
    this.svgElement.innerHTML = this.renderedSvgPaths.map((pathData) => `<path d="${pathData}"></path>`);
  }

  /**
   * Returns the position of the cursor, relative to the event's current target
   * @param {MouseEvent} ev
   * @returns {{x: number, y: number}}
   * @private
   */
  _getPosition(ev) {
    var rect = ev.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(ev.clientX - rect.left),
      y: Math.round(ev.clientY - rect.top),
    };
  }

  /**
   * Redraws ALL the drawn paths
   * @private
   */
  _forceDraw() {
    this.svgElement.innerHTML = this._toSvgPath().map((pathData) => `<path d="${pathData}"></path>`);
  }

  /**
   * Converts all the DRAWN paths to SVG paths
   * @returns {(string|*)[]}
   * @private
   */
  _toSvgPath() {
    return this.pathsPoints.map((path) => getSvgPathFromStroke(getStroke(path, _strokeOptions)));
  }

  /**
   * Deletes the last path
   * @private
   */
  _undo() {
    if (this.pathsPoints.length === 0) return;
    this.pathsPoints.pop();
    this.renderedSvgPaths.pop();
    this._forceDraw();
  }

  /**
   * Uploads the resulting SVG to the server, then creates a tile using the SVG
   * @returns {Promise<void>}
   * @private
   */
  async _upload() {
    // Prepare the upload data
    const options = { bucket: undefined }; // TODO!
    const source = this.constructor.storageSource;
    const path = this.constructor.path;
    const name = new Date().toISOString().slice(0, 19).replace(/:/g, '') + '.svg';
    const file = getFileFromSvgEl(this.svgElement, name);

    // Create folder if not exists
    try {
      await FilePicker._manageFiles({ action: 'browseFiles', storage: source, target: path }, options);
    } catch (e) {
      await FilePicker._manageFiles({ action: 'createDirectory', storage: source, target: path }, options);
    }

    // Create the file in the folder
    const createResponse = await FilePicker.upload(source, path, file);

    // If success, then create the tile
    if (createResponse.status !== 'success') return;
    await createTile(createResponse.path);
    this.close();
  }
}

const _strokeOptions = {
  size: 12,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t) => t,
  start: {
    taper: 0,
    easing: (t) => t,
    cap: true,
  },
  end: {
    taper: 0,
    easing: (t) => t,
    cap: true,
  },
};
