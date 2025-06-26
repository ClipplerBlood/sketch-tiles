import { i18n } from '../utils.js';
import { DEFAULT_SKETCH_SETTINGS } from '../settings.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SketchAppConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    window: {
      title: 'Sketch App',
      contentClasses: ['standard-form'],
    },
    position: {
      width: 480,
      height: 'auto',
    },
    tag: 'form',
  };

  static PARTS = {
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
    },
    form: {
      template: 'modules/sketch-tiles/templates/sketch-configuration.hbs',
    },
    footer: {
      template: 'templates/generic/form-footer.hbs',
    },
  };

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
      left: Math.max(sketchApp.position.left - this.DEFAULT_OPTIONS.position.width, 10),
      top: sketchApp.position.top,
    };
    configurationApp.render(true, renderOptions);
  }

  async _preparePartContext(partId, context) {
    context = foundry.utils.deepClone(context);

    switch (partId) {
      case 'tabs':
        context.tabs = [
          {
            id: 'colors',
            group: 'main',
            icon: 'fa-solid fa-palette',
            active: true,
            label: 'SKETCHTILES.colors',
          },
          {
            id: 'strokeOptions',
            group: 'main',
            icon: 'fa-sharp fa-solid fa-paintbrush-pencil',
            label: 'SKETCHTILES.strokeOptions',
          },
          {
            id: 'otherOptions',
            group: 'main',
            icon: 'fa-solid fa-square-sliders',
            label: 'SKETCHTILES.other',
          },
        ];
        break;
      case 'form':
        context.sketchSettings = this.sketchApp.sketchSettings;
        break;
      case 'footer':
        context.buttons = [
          {
            type: 'button',
            icon: 'fa-solid fa-check',
            label: 'SETTINGS.Save',
            action: 'save',
          },
          {
            type: 'button',
            icon: 'fa-solid fa-save',
            label: 'DRAWING.SubmitDefault',
            action: 'saveDefault',
          },
          {
            type: 'button',
            icon: 'fa-solid fa-undo',
            label: 'SETTINGS.Reset',
            action: 'reset',
          },
        ];
    }
    console.log(partId, context);
    return context;
  }

  _onRender(_context, _options) {
    const html = $(this.element);
    html.find('button[data-action="save"]').click((ev) => this._onSave(ev, false));
    html.find('button[data-action="saveDefault"]').click((ev) => this._onSave(ev, true));
    html.find('button[data-action="reset"]').click(() => this._resetDefaults());
  }

  _onSave(ev, isDefault = false) {
    // Get stuff from the form
    const form = $(this.element.closest('form'));
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
        if (isDefault) formData.backgroundSvg = importSvgFilePath;
      } else ui.notifications.warn(i18n('SKETCHTILES.notifications.fileNotSvg'));
    } else if (isDefault) {
      formData.backgroundSvg = '';
    }

    // Update, close and update render app html
    this.sketchApp.updateSketchSettings(formData, { store: isDefault });
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
