import { registerSettings } from './settings.js';
import { preloadTemplates } from './preloadTemplates.js';
import { SketchApp } from './apps/sketch-app.js';

// Initialize module
Hooks.once('init', async () => {
  console.log('sketch-tiles | Initializing sketch-tiles');

  // Assign custom classes and constants here

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
    icon: 'fa-duotone fa-cards-blank',
    onClick: () => SketchApp.create(),
  });
});
