export async function preloadTemplates() {
  const templatePaths = [
    // Add paths to "modules/sketch-tiles/templates"
    'modules/sketch-tiles/templates/sketch-app.hbs',
    'modules/sketch-tiles/templates/sketch-configuration.hbs',
  ];

  return foundry.applications.handlebars.loadTemplates(templatePaths);
}
