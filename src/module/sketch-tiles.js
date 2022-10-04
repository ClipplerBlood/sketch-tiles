import { hardReset, registerSettings } from './settings.js';
import { preloadTemplates } from './preloadTemplates.js';
import { SketchApp } from './apps/sketch-app.js';
import { i18n } from './utils.js';

// Initialize module
Hooks.once('init', async () => {
  console.log('sketch-tiles | Initializing sketch-tiles');

  // Expose some api
  game.sketchTiles = {
    hardReset: hardReset,
    create: SketchApp.create,
  };

  registerSettings();
  await preloadTemplates();
});

// Setup module
Hooks.once('setup', async () => {});

Hooks.once('ready', async () => {});

// Button registration
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  const tileControls = controls.find((c) => c.name === 'tiles');
  tileControls.tools.push({
    name: 'Sketch Tiles',
    title: 'Sketch Tiles',
    icon: 'fa-duotone fa-cards-blank',
    onClick: () => SketchApp.create(),
  });
});

// Tile HUD edit button
Hooks.on('renderTileHUD', (tileHud, elementHud, options) => {
  // Check ig the tile has been created with this module and if ends with .svg
  const textureSrc = options?.texture?.src;
  if (!options?.flags['sketch-tiles']?.isSketch || !textureSrc.endsWith('.svg')) return;

  // Add the edit button
  const title = i18n('SKETCHTILES.editSketch');
  const editButton = $(`
  <div class="control-icon " data-action="locked">
    <i class="fa-duotone fa-cards-blank" style="width: 36px; height: 36px;" title="${title}"></i>
  </div>
  `);
  elementHud.find('.col.right').append(editButton);

  // Add listener to button that renders a SketchApp with the current texture
  editButton.click(() => SketchApp.create({ svgFilePath: tileHud.object.document.texture.src, isEdit: true }));
});

// Add a hook to allow external calling
Hooks.on('requestSketchTile', () => SketchApp.create());
