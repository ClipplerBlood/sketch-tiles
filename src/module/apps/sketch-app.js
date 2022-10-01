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
    this.currentMousePath = undefined; // The current MOUSE path (being drawn)
    this.currentSvgPath = undefined; // The current Path (inside the SVG) which is being drawn, or the last drawn path
    this._drawTime = 0; // Time of last update. Used in limiting the number of points per second
    this.pastHistory = []; // List with all past operation. Maybe bound it to a max size?
    this.futureHistory = []; // List with all the undone operations. The name is a bit of an oxymoron

    // Register the keydown listener (for ctrl+z and maybe something else)
    this.keyDownListener = (ev) => {
      if (ev.ctrlKey && ev.key === 'z') {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        ev.preventDefault();
        this._undo();
      } else if (ev.ctrlKey && ev.key === 'y') {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        ev.preventDefault();
        this._redo();
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
    $svgContainer.on('pointerup', (ev) => this.handlePointerUp(ev));
  }

  /**
   * Pointer DOWN event
   * @param {MouseEvent} ev
   */
  handlePointerDown(ev) {
    ev.target.setPointerCapture(ev.pointerId);
    if (ev.buttons === 1) {
      this._draw(ev, true);
    }
  }

  /**
   * Pointer UP event (release)
   * @param {MouseEvent} _ev
   */
  handlePointerUp(_ev) {
    // If we already have a path, then store the old in the history and erase the future history
    if (this.currentSvgPath != null) {
      this.pastHistory.push({ action: 'draw', path: this.currentSvgPath });
    }
    this.futureHistory = []; // Clear the future history. No paradoxes allowed
    this.currentMousePath = undefined;
    this.currentSvgPath = undefined;
  }

  /**
   * Pointer MOVE event
   * @param {MouseEvent} ev
   */
  handlePointerMove(ev) {
    // Limit the number of calls per sec
    const now = Date.now();
    if (now - this._drawTime < 1000 / 60) return;
    this._drawTime = now;

    if (ev.buttons === 1) {
      this._draw(ev, false);
    } else if (ev.buttons === 2) {
      this._erase(ev);
    }
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
    const currentPoint = [pos.x, pos.y, ev.pressure];

    if (isNewPath) {
      // Add the point to a new drawn path and set the current svg path
      this.currentMousePath = [currentPoint];
      this.currentSvgPath = this.svg.path({
        d: getSvgPathFromStroke(getStroke(this.currentMousePath, _strokeOptions)),
      });
    } else {
      // Add the point to the last drawn path and update the current svg path
      this.currentMousePath.push(currentPoint);
      this.currentSvgPath.plot(getSvgPathFromStroke(getStroke(this.currentMousePath, _strokeOptions)));
    }
  }

  /**
   * Erase the paths intercepting the current mouse position
   * @param ev
   * @private
   */
  _erase(ev) {
    // Get the mouse position and create an SVGPoint
    const pos = this._getPosition(ev);
    const point = this.svg.node.createSVGPoint();
    point.x = pos.x;
    point.y = pos.y;

    // Look through all paths in the svg and check if the point is in
    const toDelete = [];
    for (const path of this.svg.find(':scope > path')) {
      if (!path.node.isPointInFill(point)) continue;
      toDelete.push(path);
    }

    // Delete all intercepting paths, saving them to history
    toDelete.forEach((p) => {
      this.pastHistory.push({ action: 'erase', path: p });
      p.remove();
    });
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
   * Undoes the past action
   * @private
   */
  _undo() {
    // Get the last action
    const lastAction = this.pastHistory.pop();
    if (!lastAction) return;

    // Handle the action types
    if (lastAction.action === 'draw') lastAction.path.remove();
    else if (lastAction.action === 'erase') this.svg.add(lastAction.path);

    // Push the last action to the future history to be "redone"
    this.futureHistory.push(lastAction);
  }

  /**
   * Redoes the previously undone action
   * @private
   */
  _redo() {
    const nextAction = this.futureHistory.pop();
    if (!nextAction) return;
    // The code is the dual of undo
    if (nextAction.action === 'erase') nextAction.path.remove();
    else if (nextAction.action === 'draw') this.svg.add(nextAction.path);
    this.pastHistory.push(nextAction);
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
