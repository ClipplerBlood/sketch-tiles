export const DEFAULT_SKETCH_SETTINGS = {
  colors: ['#000000', '#C02025', '#EAC11D', '#3C91E6', '#50C878', '#BCBCBC'],
  backgroundColor: null,
  pollingRate: 60,
  backgroundSvg: null,
  autoCrop: false,
  hiddenTile: false,
  strokeOptions: {
    size: 12,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
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
  },
};

export function registerSettings() {
  // Register any custom module settings here
  game.settings.register('sketch-tiles', 'sketchOptions', {
    name: 'sketch-options',
    hint: '',
    scope: 'world',
    config: false,
    requresReload: false,
    type: Object,
    default: DEFAULT_SKETCH_SETTINGS,
  });
}

/**
 * Resets the settings to their defaults
 */
export function hardReset() {
  game.settings.set('sketch-tiles', 'sketchOptions', DEFAULT_SKETCH_SETTINGS);
}
