export function registerSettings() {
  // Register any custom module settings here
  game.settings.register('sketch-tiles', 'sketchOptions', {
    name: 'sketch-options',
    hint: '',
    scope: 'world',
    config: false,
    requresReload: false,
    type: Object,
    default: {
      colors: ['#000', '#C02025', '#EAC11D', '#3C91E6', '#50C878', '#bcbcbc'],
      strokeOptions: {
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
      },
    },
  });
}
