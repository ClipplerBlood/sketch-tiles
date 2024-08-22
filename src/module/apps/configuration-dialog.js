import { i18n } from '../utils.js';
import { DEFAULT_SKETCH_SETTINGS } from '../settings.js';

export class SketchAppConfiguration extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
    formData = foundry.utils.expandObject(formData);

    // Handle checkboxes
    form
      .get(0)
      .querySelectorAll('input[type="checkbox"]')
      .forEach((i) => (formData[i.name] = i.checked));

    // Handle the color pickers
    let formColors = {};
    for (const formColor of form.find('color-picker').get()) {
      formColors[formColor.name] = formColor.value;
    }
    formColors = foundry.utils.expandObject(formColors);
    formData = foundry.utils.mergeObject(formData, formColors);

    // Convert the .colors to an array
    formData.colors = Object.values(formData.colors);

    // Extract the "importSvg"
    const importSvgFilePath = formData.importSvg;
    delete formData.importSvg;
    if (importSvgFilePath.length > 3) {
      if (importSvgFilePath.endsWith('.svg')) {
        if (importSvgFilePath !== this.sketchApp.sketchSettings.backgroundSvg)
          this.sketchApp.loadSVG(importSvgFilePath);
        if (isSetDefault) formData.backgroundSvg = importSvgFilePath;
      } else ui.notifications.warn(i18n('SKETCHTILES.notifications.fileNotSvg'));
    } else if (isSetDefault) {
      formData.backgroundSvg = '';
    }

    // Update, close and update render app html
    this.sketchApp.updateSketchSettings(formData, { store: isSetDefault });
    this.close();
    this.sketchApp.renderPalette();
    this.sketchApp.setSvgBackgroundColor();
  }

  _resetDefaults() {
    this.sketchApp.updateSketchSettings(DEFAULT_SKETCH_SETTINGS, { store: true });
    this.close();
    this.sketchApp.renderPalette();
    this.sketchApp.setSvgBackgroundColor();
  }

  // eslint-disable-next-line no-unused-vars
  async _updateObject(event, formData) {
    return Promise.resolve(undefined);
  }
}
