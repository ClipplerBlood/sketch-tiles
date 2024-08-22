import { createTile, editAllTiles, getFileFromSvgEl, getSvgPathFromStroke } from '../utils.js';
import { getStroke } from 'perfect-freehand';
import { SVG } from '@svgdotjs/svg.js';
import { SketchAppConfiguration } from './configuration-dialog.js';

export class SketchApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'modules/sketch-tiles/templates/sketch-app.html',
      classes: ['sketch-app'],
      width: 420,
      height: 700,
      title: 'Sketch Tiles',
      resizable: true,
    });
  }

  /**
   * Create a new SketchApp, then render it
   */
  static async create(options = { svgFilePath: undefined, isEdit: false }) {
    const app = new this();
    await app.render(true);

    if (options.isEdit) app.isEdit = true;
    if (options.svgFilePath) await app.loadSVG(options.svgFilePath);
    if (options.isEdit && options.svgFilePath) app.sourceSvgPath = options.svgFilePath;
    else if (app.sketchSettings.backgroundSvg) app.loadSVG(app.sketchSettings.backgroundSvg);
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
   * The sketch settings
   * @returns {*}
   */
  get sketchSettings() {
    this._sketchSettings = this._sketchSettings ?? game.settings.get('sketch-tiles', 'sketchOptions');
    return this._sketchSettings;
  }

  async updateSketchSettings(changes, options = { store: false }) {
    this._sketchSettings = foundry.utils.mergeObject(this._sketchSettings, changes);
    if (options?.store) {
      return game.settings.set('sketch-tiles', 'sketchOptions', this._sketchSettings);
    }
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
    this.previewCircle = undefined; // The circle used for previewing
    this.currentColor = this.sketchSettings.colors[0]; // The current color

    // Editing stuff
    this.isEdit = false; // If this app has been opened for editing an existing tile
    this.sourceSvgPath = undefined; // The original texture path for the edited tile

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
   * @param {Object} options
   * @override
   */
  async close(options = {}) {
    await super.close(options);
    document.removeEventListener('keydown', this.keyDownListener);
  }

  /**
   * Buttons
   * @override
   * @private
   */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons.unshift(
      {
        label: '',
        icon: '',
        class: 'sketch-color-picker',
        onclick: (ev) => this.onColorPickerClick(ev),
      },
      {
        label: 'Upload',
        icon: 'fa-solid fa-up-from-line',
        class: 'upload-sketch',
        onclick: () => this._upload(),
      },
      {
        label: '',
        icon: 'fa-solid fa-sliders',
        class: 'configure-sketch',
        onclick: () => SketchAppConfiguration.create(this),
      },
    );
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
    $svgContainer.on('pointerleave', (ev) => this.handlePointerLeave(ev));
    $svgContainer.on('wheel', (ev) => this.handleWheel(ev));

    // Render the palette
    this.renderPalette();
    // Set the background color
    this.setSvgBackgroundColor();
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
    if (now - this._drawTime < 1000 / this.sketchSettings.pollingRate) return;
    this._drawTime = now;

    if (ev.buttons === 1) {
      this._draw(ev, false);
      this._removePreview();
    } else if (ev.buttons === 2) {
      this._erase(ev);
      this._removePreview();
    } else {
      this._preview(ev);
    }
  }

  /**
   * Pointer LEAVE event
   * @param {MouseEvent} _ev
   */
  handlePointerLeave(_ev) {
    this._removePreview();
  }

  /**
   * Handles the scroll wheel
   * @param _ev
   */
  handleWheel(_ev) {
    if (_ev.originalEvent.deltaY !== 0) {
      let strokeSize = parseInt(this._sketchSettings.strokeOptions.size);

      if (_ev.originalEvent.deltaY < 0) {
        strokeSize += 4;
      } else {
        strokeSize -= 4;
      }
      strokeSize = Math.clamped(strokeSize, 4, 100);
      this.updateSketchSettings({ 'strokeOptions.size': strokeSize });
      this._preview(_ev);
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
        d: this.getSvgPathFromCurrentMousePath(),
        fill: this.currentColor,
      });
    } else if (this.currentMousePath != null) {
      // Add the point to the last drawn path and update the current svg path
      this.currentMousePath.push(currentPoint);
      this.currentSvgPath.plot(this.getSvgPathFromCurrentMousePath());
    }
  }

  /**
   * Returns the SVG path from the current mouse path
   * @returns {string|*}
   */
  getSvgPathFromCurrentMousePath() {
    return getSvgPathFromStroke(getStroke(this.currentMousePath, this.sketchSettings.strokeOptions));
  }

  /**
   * Previews what will be drawn by drawing a circle using the settings
   * @param ev
   */
  _preview(ev) {
    this.previewCircle = this.previewCircle ?? this.svg.circle();
    const pos = this._getPosition(ev);
    this.previewCircle.attr({
      fill: this.currentColor,
      cx: pos.x,
      cy: pos.y,
      r: this._sketchSettings.strokeOptions.size / 2,
    });
  }

  /**
   * Removes the preview circle
   * @private
   */
  _removePreview() {
    this.previewCircle?.remove();
    this.previewCircle = undefined;
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
    const rect = ev.currentTarget.getBoundingClientRect();
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
    this._removePreview();
    const file = getFileFromSvgEl(this.svg.node, name, this.sketchSettings.autoCrop);

    // Create folder if not exists
    if (game.release.generation < 12) {
      try {
        await FilePicker._manageFiles({ action: 'browseFiles', storage: source, target: path }, options);
      } catch (e) {
        await FilePicker._manageFiles({ action: 'createDirectory', storage: source, target: path }, options);
      }
    } else {
      try {
        await FilePicker.browse(source, path, options);
      } catch (e) {
        await FilePicker.createDirectory(source, path, options);
      }
    }

    // Create the file in the folder
    const createResponse = await FilePicker.upload(source, path, file);

    // If success, then create the tile. If editing, change the tiles src
    // NOTE: it's not possible to simply reupload the file at the same path and trigger a tile reload
    // due to foundry's texture caching. Simple alternative used: create new file and modify textures.
    // TODO: better alternative: custom Tile class that doesn't use caching
    if (createResponse.status !== 'success') return;
    if (!this.isEdit) await createTile(createResponse.path, this.svg.node, this.sketchSettings);
    else editAllTiles(createResponse.path, this.sourceSvgPath, this.svg.node, this.sketchSettings.autoCrop);
    await this.close();
  }

  /**
   * Handles the click of the color picker, setting the current selected color
   * @param ev
   */
  onColorPickerClick(ev) {
    const t = $(ev.target);
    if (!t.hasClass('sketch-color')) return;

    // Get the color from the bg (alternatively could be done using indices)
    this.currentColor = t.css('backgroundColor');

    // Toggle the selected class for UX purposes
    t.parent().children().removeClass('selected');
    t.addClass('selected');
  }

  /**
   * Renders the palette as a header button
   */
  renderPalette() {
    const colorPicker = this.element.find('.sketch-color-picker');
    colorPicker.html(
      this.sketchSettings.colors
        .map((c) => {
          const selected = c === this.currentColor ? 'selected' : '';
          return `<div class="sketch-color ${selected}" style="background-color: ${c}"></div>`;
        })
        .join('\n'),
    );
    colorPicker.find('>:first-child').addClass('selected');
  }

  /**
   * Sets the SVG Background
   * @param {string} bg optional color (#HEX)
   */
  setSvgBackgroundColor(bg = undefined) {
    bg = bg ?? this.sketchSettings.backgroundColor;
    this.svg.css({ 'background-color': bg });

    if (this.sketchSettings.transparentBackground) {
      const sketchApp = document.querySelector('.sketch-app');
      sketchApp.style.setProperty('--window-bg', '#ffffff38');
    }
  }

  /**
   * Set the position of the Application.
   * @override
   * @param left
   * @param top
   * @param width
   * @param height
   * @param scale
   * @returns {{left: number, top: number, width: number, height: number, scale: number}|void}
   */
  setPosition({ left, top, width, height, scale } = {}) {
    // If the width is small, remove stuff from the bar
    if (width < 300) {
      this.element.find('.window-title').hide();
      this.element.find('.header-button.close').hide();
    } else if (width < 350) {
      this.element.find('.window-title').hide();
    } else {
      this.element.find('.window-title').show();
      this.element.find('.header-button.close').show();
    }
    super.setPosition({ left, top, width, height, scale });
  }

  /**
   * Load an svg into the current svg
   * @param {string} svgFilePath
   * @returns {Promise<void>}
   */
  async loadSVG(svgFilePath) {
    // Get the response
    if (!svgFilePath.endsWith('.svg')) return; // TODO: better errors
    const response = await fetch(svgFilePath);
    if (!response.ok) return; // TODO: better errors

    // Parse the response text, making it into a DOM element for content extraction
    const svgText = await response.text();
    const svgData = new DOMParser().parseFromString(svgText, 'text/html').body.childNodes[0];
    const innerSvg = svgData.innerHTML;

    // Inject the current svg with the fetched innerSvg
    this.svg.node.insertAdjacentHTML('beforeend', innerSvg);

    // If is edit, resize the application to fit the content
    if (!this.isEdit) return;

    let viewBox = svgData
      .getAttribute('viewBox')
      ?.split(' ')
      .map((v) => parseInt(v));

    if (viewBox) {
      const bRect = {
        x: viewBox[0],
        y: viewBox[1],
        width: viewBox[2],
        height: viewBox[3],
      };
      this.setPosition({ width: bRect.width + bRect.x + 8, height: bRect.height + bRect.y + 32 });
    } else {
      this.setPosition({
        width: parseInt(svgData.getAttribute('width')) + 8,
        height: parseInt(svgData.getAttribute('height')) + 32,
      });
    }
  }
}
