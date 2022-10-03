import { i18n } from '../utils.js';
import { DEFAULT_SKETCH_SETTINGS } from '../settings.js';

export class SketchAppConfiguration extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['sheet'],
      template: 'modules/sketch-tiles/templates/sketch-configuration.html',
      width: this.width,
      height: 'auto',
      title: i18n('DOCUMENT.Settings') + ': Sketch App',
      tabs: [
        {
          group: 'main',
          navSelector: 'nav.tabs',
          contentSelector: 'form',
          initial: 'colors',
        },
      ],
    });
  }

  static get width() {
    return 480;
  }

  constructor(sketchApp) {
    super();
    this.sketchApp = sketchApp;
  }

  /**
   * Creates a new SketchAppConfiguration and renders it at the left of the sketchApp
   * @param {SketchApp} sketchApp
   */
  static create(sketchApp) {
    const configurationApp = new SketchAppConfiguration(sketchApp);
    const renderOptions = {
      left: Math.max(sketchApp.position.left - this.width, 10),
      top: sketchApp.position.top,
    };
    configurationApp.render(true, renderOptions);
  }

  /**
   * @override
   * @param options
   * @returns {Object|Promise<Object>}
   */
  getData(options = {}) {
    const data = super.getData(options);
    data.sketchSettings = this.sketchApp.sketchSettings;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('button[data-action="save"]').click((ev) => this._onSave(ev));
    html.find('button[data-action="reset"]').click(() => this._resetDefaults());
  }

  _onSave(ev) {
    // Get stuff from the form
    const isSetDefault = $(ev.currentTarget).data('default');
    const form = this.element.find('form');
    let formData = {};
    form.serializeArray().forEach((i) => (formData[i.name] = i.value));
    formData = expandObject(formData);

    // Convert the colors to an array
    const colors = this.sketchApp.sketchSettings.colors;
    Object.entries(formData.colors).forEach(([key, value]) => (colors[key] = value));
    formData.colors = colors;

    // Update, close and render palette
    this.sketchApp.updateSketchSettings(formData, { store: isSetDefault });
    this.close();
    this.sketchApp.renderPalette();
  }

  _resetDefaults() {
    this.sketchApp.updateSketchSettings(DEFAULT_SKETCH_SETTINGS, { store: true });
    this.close();
    this.sketchApp.renderPalette();
  }

  // eslint-disable-next-line no-unused-vars
  async _updateObject(event, formData) {
    return Promise.resolve(undefined);
  }
}