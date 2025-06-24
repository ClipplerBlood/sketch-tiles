export async function preloadTemplates() {
  const templatePaths = [
    // Add paths to "modules/sketch-tiles/templates"
    'modules/sketch-tiles/templates/sketch-app.html',
    'modules/sketch-tiles/templates/sketch-configuration.html',
  ];

  return foundry.applications.handlebars.loadTemplates(templatePaths);
}
