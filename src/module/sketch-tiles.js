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
  const tileControls = controls['tiles'];
  tileControls.tools['Sketch Tiles'] = {
    name: 'Sketch Tiles',
    title: 'Sketch Tiles',
    icon: 'fa-duotone fa-cards-blank',
    onChange: () => SketchApp.create(),
    button: true,
  };
});

// Tile HUD edit button
Hooks.on('renderTileHUD', (tileHud, elementHud, options) => {
  // Check ig the tile has been created with this module and if ends with .svg
  const textureSrc = options?.texture?.src;
  if (!options?.flags['sketch-tiles']?.isSketch || !textureSrc.endsWith('.svg')) return;

  // Add the edit button
  const title = i18n('SKETCHTILES.editSketch');
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'control-icon';
  editButton.setAttribute('data-action', 'locked');
  editButton.setAttribute('data-tooltip', title);

  const icon = document.createElement('i');
  icon.className = 'fa-duotone fa-cards-blank';
  editButton.appendChild(icon);
  elementHud.querySelector('.col.right').appendChild(editButton);

  // Add the listener
  editButton.addEventListener('click', () =>
    SketchApp.create({ svgFilePath: tileHud.object.document.texture.src, isEdit: true }),
  );
});

// Add a hook to allow external calling
Hooks.on('requestSketchTile', () => SketchApp.create());
