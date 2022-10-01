import { createTile, getSvgPathFromStroke, getFileFromSvgEl } from '../utils.js';
import { getStroke } from 'perfect-freehand';
import { SVG } from '@svgdotjs/svg.js';

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
    // Some definitions:
    this.svg = undefined; // The wrapper using SVG.js lib
    this.drawnPaths = []; // The list of raw (pointX, pointY, pressure) which need to be converted into a stroke
    this.currentSvgPath = undefined; // The current Path (inside the SVG) which is being drawn, or the last drawn path
    this._drawTime = 0; // Time of last update. Used in limiting the number of points per second

    // Register the keydown listener (for ctrl+z and maybe something else)
    this.keyDownListener = (ev) => {
      if (ev.ctrlKey && ev.key === 'z') {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        ev.preventDefault();
        this._undo();
      }
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
    this.svg = SVG(html.find('svg').get(0));

    // Mouse Event listeners for the container
    const $svgContainer = html.closest('.sketch-app-container');
    $svgContainer.on('pointerdown', (ev) => this.handlePointerDown(ev));
    $svgContainer.on('pointermove', (ev) => this.handlePointerMove(ev));
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
    // Limit the number of draw calls per sec
    const now = Date.now();
    if (now - this._drawTime < 1000 / 60) return;
    this._drawTime = now;

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

    if (isNewPath) {
      // Add the point to a new drawn path
      currentPath = [currentPoint];
      this.drawnPaths.push(currentPath);
      // Set the current drawn path to a newly created path in the svg
      this.currentSvgPath = this.svg.path({
        d: getSvgPathFromStroke(getStroke(currentPath, _strokeOptions)),
        'data-index': this.drawnPaths.length - 1,
      });
    } else {
      // Add the point to the last drawn path
      currentPath = this.drawnPaths.at(-1);
      currentPath.push(currentPoint);
      // Update the current svg path with the current drawn path
      this.currentSvgPath.plot(getSvgPathFromStroke(getStroke(currentPath, _strokeOptions)));
    }
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
   * Deletes the last path
   * @private
   */
  _undo() {
    if (this.drawnPaths.length === 0) return;
    this.drawnPaths.pop();
    const lastIndex = this.drawnPaths.length;
    this.svg.find(`[data-index="${lastIndex}"]`).remove();
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
    const file = getFileFromSvgEl(this.svg.node, name);

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
